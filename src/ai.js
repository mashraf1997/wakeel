// Model providers. Claude goes through the official Anthropic SDK.
// Everything else (Ollama on your VPS, OpenRouter, Groq, DeepSeek, ...)
// goes through the OpenAI-compatible chat completions endpoint.
import Anthropic from '@anthropic-ai/sdk';

const MAX_TOOL_ROUNDS = 6;

// Models that accept the server-side refusal fallback ("default" form).
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);
// Models that accept output_config.effort.
const EFFORT_MODELS = /^claude-(fable-5|mythos-5|opus-5|opus-4-[5678]|sonnet-5|sonnet-4-6|haiku-5)/;

export const CLAUDE_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best quality)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (balanced)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (lowest cost)' },
];

export class AIError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/**
 * Run one assistant turn with tools.
 * @param {object} ai        settings.ai
 * @param {object} opts      { system: {stable, dynamic}, history: [{role:'user'|'assistant', text}], tools, executeTool }
 * @returns {Promise<string>} final reply text
 */
export async function runTurn(ai, opts) {
  if (ai.provider === 'openai') return runOpenAI(ai, opts);
  return runAnthropic(ai, opts);
}

// ---------------- Anthropic (Claude) ----------------

const clients = new Map();
function anthropicClient(ai) {
  const key = `${ai.apiKey}|${ai.baseUrl || ''}`;
  if (!clients.has(key)) {
    const options = { apiKey: ai.apiKey || process.env.ANTHROPIC_API_KEY, maxRetries: 2, timeout: 120_000 };
    if (ai.baseUrl) options.baseURL = ai.baseUrl;
    clients.set(key, new Anthropic(options));
  }
  return clients.get(key);
}

function toAnthropicMessages(history) {
  const out = [];
  for (const m of history) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    if (!out.length && role === 'assistant') continue; // must start with user
    const last = out[out.length - 1];
    if (last && last.role === role) last.content += '\n' + m.text;
    else out.push({ role, content: m.text });
  }
  return out;
}

async function runAnthropic(ai, { system, history, tools, executeTool }) {
  if (!ai.apiKey && !process.env.ANTHROPIC_API_KEY) throw new AIError('No Anthropic API key configured', 'no_key');
  const client = anthropicClient(ai);
  const model = ai.model || 'claude-opus-5-5';

  const systemBlocks = [];
  if (system.stable) systemBlocks.push({ type: 'text', text: system.stable, cache_control: { type: 'ephemeral' } });
  if (system.dynamic) systemBlocks.push({ type: 'text', text: system.dynamic });

  const messages = toAnthropicMessages(history);
  const toolDefs = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const params = {
      model,
      max_tokens: 16000,
      system: systemBlocks,
      messages,
      tools: toolDefs,
    };
    if (EFFORT_MODELS.test(model) && ai.effort) params.output_config = { effort: ai.effort };
    if (FALLBACK_MODELS.has(model)) {
      params.betas = ['server-side-fallback-2026-07-01'];
      params.fallbacks = 'default';
    }

    let response;
    try {
      response = FALLBACK_MODELS.has(model)
        ? await client.beta.messages.create(params)
        : await client.messages.create(params);
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError) throw new AIError('Anthropic rejected the API key', 'bad_key');
      if (err instanceof Anthropic.NotFoundError) throw new AIError(`Model "${model}" was not found`, 'bad_model');
      if (err instanceof Anthropic.RateLimitError) throw new AIError('Anthropic rate limit reached, try again shortly', 'rate_limit');
      if (err instanceof Anthropic.APIConnectionError) throw new AIError('Could not reach the Anthropic API', 'network');
      if (err instanceof Anthropic.APIError) throw new AIError(`Anthropic API error ${err.status}: ${err.message}`, 'api');
      throw err;
    }

    if (response.stop_reason === 'refusal') return '';

    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    const toolUses = response.content.filter((b) => b.type === 'tool_use');

    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }
    if (response.stop_reason !== 'tool_use' || !toolUses.length) return text;

    // Keep the assistant content exactly as returned (thinking blocks included).
    messages.push({ role: 'assistant', content: response.content });
    const results = [];
    for (const tu of toolUses) {
      const { output, isError } = await safeExecute(executeTool, tu.name, tu.input);
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: output, ...(isError ? { is_error: true } : {}) });
    }
    // All results go back in a single user message.
    messages.push({ role: 'user', content: results });
  }
  return '';
}

// ---------------- OpenAI-compatible ----------------

async function runOpenAI(ai, { system, history, tools, executeTool }) {
  const baseUrl = (ai.baseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
  const messages = [{ role: 'system', content: [system.stable, system.dynamic].filter(Boolean).join('\n\n') }];
  for (const m of history) messages.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text });
  const toolDefs = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let res;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(ai.apiKey ? { authorization: `Bearer ${ai.apiKey}` } : {}),
        },
        body: JSON.stringify({ model: ai.model, messages, tools: toolDefs }),
        signal: AbortSignal.timeout(180_000),
      });
    } catch {
      throw new AIError(`Could not reach ${baseUrl}`, 'network');
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      if (res.status === 401 || res.status === 403) throw new AIError('The model provider rejected the API key', 'bad_key');
      throw new AIError(`Model provider error ${res.status}: ${body.slice(0, 300)}`, 'api');
    }
    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new AIError('Model provider returned no message', 'api');
    const calls = msg.tool_calls || [];
    if (!calls.length) return (msg.content || '').trim();

    messages.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
    for (const call of calls) {
      let input = {};
      try {
        input = JSON.parse(call.function?.arguments || '{}');
      } catch {
        messages.push({ role: 'tool', tool_call_id: call.id, content: 'Error: arguments were not valid JSON' });
        continue;
      }
      const { output } = await safeExecute(executeTool, call.function.name, input);
      messages.push({ role: 'tool', tool_call_id: call.id, content: output });
    }
  }
  return '';
}

async function safeExecute(executeTool, name, input) {
  try {
    const out = await executeTool(name, input || {});
    return { output: typeof out === 'string' ? out : JSON.stringify(out), isError: false };
  } catch (err) {
    return { output: `Error: ${err.message}`, isError: true };
  }
}
