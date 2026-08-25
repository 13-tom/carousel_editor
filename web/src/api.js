const BASE = '/api';

async function json(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listPages: () => fetch(`${BASE}/pages`).then(json),
  getProject: (pageId) => fetch(`${BASE}/projects/${pageId}`).then(json),
  saveProject: (pageId, project) =>
    fetch(`${BASE}/projects/${pageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    }).then(json),
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${BASE}/upload`, { method: 'POST', body: form }).then(json);
  },
  exportPage: (pageId) => fetch(`${BASE}/export/${pageId}`, { method: 'POST' }).then(json),
};
