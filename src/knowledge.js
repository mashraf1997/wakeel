// Knowledge retrieval with no embeddings and no external service.
// Small knowledge bases are sent whole; larger ones are searched with BM25,
// using Arabic-aware normalization so "أسعار" matches "اسعار".

const FULL_CONTEXT_LIMIT = 24000; // characters
const CHUNK_SIZE = 900;

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

const STOP = new Set([
  'the', 'a', 'an', 'is', 'are', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'do', 'you', 'i', 'it', 'what', 'how',
  'في', 'من', 'على', 'الى', 'الي', 'عن', 'هل', 'ما', 'ماذا', 'و', 'يا', 'انا', 'انت', 'ده', 'دي', 'ايه', 'عايز', 'عاوز', 'لو', 'كام',
]);

export function tokenize(text) {
  const words = normalize(text).match(/[\p{L}\p{N}]+/gu) || [];
  const out = [];
  for (let w of words) {
    if (STOP.has(w)) continue;
    // light Arabic prefix stripping: ال / وال / بال / لل
    w = w.replace(/^(وال|بال|كال|فال|لل|ال)(?=\p{L}{2,})/u, '');
    if (w.length < 2 && !/\d/.test(w)) continue;
    out.push(w);
  }
  return out;
}

export function chunk(doc) {
  const paragraphs = String(doc.text || '').split(/\n\s*\n|\r\n\s*\r\n/);
  const chunks = [];
  let buf = '';
  for (const p of paragraphs) {
    if ((buf + '\n\n' + p).length > CHUNK_SIZE && buf) {
      chunks.push(buf.trim());
      buf = '';
    }
    if (p.length > CHUNK_SIZE) {
      for (let i = 0; i < p.length; i += CHUNK_SIZE) chunks.push(p.slice(i, i + CHUNK_SIZE).trim());
    } else {
      buf += (buf ? '\n\n' : '') + p;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter(Boolean).map((text) => ({ title: doc.title, text }));
}

export function search(docs, query, k = 5) {
  const chunks = docs.flatMap(chunk);
  if (!chunks.length) return [];
  const tokenized = chunks.map((c) => tokenize(c.title + ' ' + c.text));
  const avgLen = tokenized.reduce((s, t) => s + t.length, 0) / tokenized.length || 1;
  const df = new Map();
  for (const toks of tokenized) for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1);
  const q = [...new Set(tokenize(query))];
  const N = chunks.length;
  const k1 = 1.4, b = 0.75;
  const scored = tokenized.map((toks, i) => {
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    let score = 0;
    for (const term of q) {
      // allow prefix matches so "سعر" finds "سعره"
      let f = tf.get(term) || 0;
      if (!f && term.length >= 3) for (const [t, n] of tf) if (t.startsWith(term)) f += n * 0.6;
      if (!f) continue;
      const n = df.get(term) || 1;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * toks.length) / avgLen)));
    }
    return { ...chunks[i], score };
  });
  return scored.filter((c) => c.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

// Returns { stable, dynamic }: `stable` never changes between messages
// (good for prompt caching); `dynamic` holds per-question search results.
export function buildKnowledgeContext(docs, query) {
  const total = docs.reduce((s, d) => s + d.text.length, 0);
  if (!docs.length) return { stable: '', dynamic: '' };
  if (total <= FULL_CONTEXT_LIMIT) {
    return { stable: docs.map((d) => `### ${d.title}\n${d.text}`).join('\n\n'), dynamic: '' };
  }
  const hits = search(docs, query, 6);
  return { stable: '', dynamic: hits.map((h) => `### ${h.title}\n${h.text}`).join('\n\n') };
}
