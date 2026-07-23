const API_ROOT = 'https://api.connecteam.com';

export async function connecteamFetch(path, apiKey, options = {}) {
  if (!apiKey) throw new Error('Connecteam API key is required.');
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'X-API-KEY': apiKey,
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    const detail = data?.message || data?.detail || data?.error || text || `HTTP ${response.status}`;
    throw new Error(`Connecteam API error (${response.status}): ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
  }
  return data;
}

export function findArray(value, preferredKeys = []) {
  if (!value || typeof value !== 'object') return [];
  for (const key of preferredKeys) if (Array.isArray(value[key])) return value[key];
  for (const child of Object.values(value)) {
    if (Array.isArray(child) && child.length) return child;
    if (child && typeof child === 'object') {
      const found = findArray(child, preferredKeys);
      if (found.length) return found;
    }
  }
  return [];
}

export function normalizeForms(payload) {
  const items = findArray(payload, ['forms', 'items', 'data', 'results']);
  return items.map((item) => ({
    id: Number(item.formId ?? item.id ?? item._id),
    name: String(item.name ?? item.title ?? item.formName ?? `Form ${item.formId ?? item.id ?? ''}`),
    raw: item
  })).filter((item) => Number.isFinite(item.id));
}

function looksLikeQuestion(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const id = obj.questionId ?? obj.id ?? obj._id;
  const type = obj.questionType ?? obj.type ?? obj.kind;
  return id != null && type != null;
}

export function extractQuestions(payload) {
  const seen = new Set();
  const output = [];
  function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== 'object') return;
    if (looksLikeQuestion(value)) {
      const id = String(value.questionId ?? value.id ?? value._id);
      if (!seen.has(id)) {
        seen.add(id);
        output.push({
          id,
          label: String(value.title ?? value.name ?? value.text ?? value.question ?? value.label ?? `Question ${id}`),
          type: String(value.questionType ?? value.type ?? value.kind),
          raw: value
        });
      }
    }
    Object.values(value).forEach(walk);
  }
  walk(payload);
  return output;
}

export function detectMapping(questions) {
  const score = (q, words) => {
    const text = `${q.label} ${q.type}`.toLowerCase();
    return words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  };
  const best = (words, type) => {
    const ranked = questions
      .filter((q) => !type || q.type.toLowerCase().includes(type))
      .map((q) => ({ q, score: score(q, words) }))
      .sort((a,b) => b.score - a.score);
    return ranked[0]?.score > 0 ? ranked[0].q.id : '';
  };
  return {
    firstName: best(['first name','firstname','given name','first']),
    lastName: best(['last name','lastname','surname','family name','last']),
    courseName: best(['course name','training name','course','training','class','program']),
    completionDate: best(['completion date','date completed','completed on','date'], 'datetime'),
    signature: best(['signature','sign'], 'signature') || questions.find(q => q.type.toLowerCase().includes('signature'))?.id || ''
  };
}
