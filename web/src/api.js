const BASE = '/api';

async function json(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function withTopic(url, topic) {
  return topic ? `${url}?topic=${encodeURIComponent(topic)}` : url;
}

export const api = {
  listPages: () => fetch(`${BASE}/pages`).then(json),
  listTopics: (pageId) => fetch(`${BASE}/projects/${pageId}/topics`).then(json),
  getProject: (pageId, topic) => fetch(withTopic(`${BASE}/projects/${pageId}`, topic)).then(json),
  saveProject: (pageId, project, topic) =>
    fetch(withTopic(`${BASE}/projects/${pageId}`, topic), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    }).then(json),
  upload: (file, { pageName, topic } = {}) => {
    const form = new FormData();
    // pageName/topic must be appended before the file — the server reads
    // them mid-stream to decide which folder to save the file into.
    if (pageName) form.append('pageName', pageName);
    if (topic) form.append('topic', topic);
    form.append('file', file);
    return fetch(`${BASE}/upload`, { method: 'POST', body: form }).then(json);
  },
  exportPage: (pageId, topic) => fetch(withTopic(`${BASE}/export/${pageId}`, topic), { method: 'POST' }).then(json),
  importTemplate: (file, pageName) => {
    const form = new FormData();
    form.append('zip', file);
    if (pageName) form.append('pageName', pageName);
    return fetch(`${BASE}/templates/import`, { method: 'POST', body: form }).then(json);
  },
};
