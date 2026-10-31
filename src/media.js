// Voice notes and images: download from a channel, transcribe audio,
// and prepare images for vision-capable models.

export const MAX_AUDIO_BYTES = 16 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function download(url, headers = {}, maxBytes = MAX_AUDIO_BYTES) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > maxBytes) throw new Error('File is too large');
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('File is too large');
  return { buffer: buf, mime: (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim() };
}

/**
 * Transcribe audio with any OpenAI-compatible speech-to-text API
 * (Groq, OpenAI, a self-hosted faster-whisper server, ...).
 */
export async function transcribe(config, buffer, mime) {
  if (!config?.baseUrl || !config?.model) {
    const err = new Error('Voice notes are not set up');
    err.code = 'no_transcription';
    throw err;
  }
  const ext = { 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/webm': 'webm', 'audio/wav': 'wav', 'audio/amr': 'amr' }[mime] || 'ogg';
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mime || 'audio/ogg' }), `voice.${ext}`);
  form.append('model', config.model);
  form.append('response_format', 'json');
  const res = await fetch(`${config.baseUrl.replace(/\/+$/, '')}/audio/transcriptions`, {
    method: 'POST',
    headers: config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {},
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Transcription failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return String(data.text || '').trim();
}

export function sniffImageType(buffer, fallback) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
  if (buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buffer.slice(0, 3).toString() === 'GIF') return 'image/gif';
  return fallback;
}
