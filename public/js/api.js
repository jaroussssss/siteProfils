export function getLinksByModel(name) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/models/${encodeURIComponent(name)}/links`).then(r => {
    if (!r.ok) throw new Error('API links failed');
    return r.json();
  });
}

export function getVisitsByRange(tempURLs, range) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/visits/by-range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tempURLs, range })
  }).then(r => {
    if (!r.ok) throw new Error('API visits failed');
    return r.json();
  });
}

export function getClicksByRange(finalURLs, range) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/clicks/by-range`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ finalURLs, range })
  }).then(r => {
    if (!r.ok) throw new Error('API clicks failed');
    return r.json();
  });
}

export function uploadImage(formData) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/upload-image`, { method: 'POST', body: formData });
}

export function createModel(name) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

export function createLink(payload) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function updateLink(tempURL, payload) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/links/${encodeURIComponent(tempURL)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function deleteLink(tempURL) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/links/${encodeURIComponent(tempURL)}`, {
    method: 'DELETE'
  });
}

export function deleteModel(name) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/models/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  });
}

export function listModelLinks(modelName) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/models/${encodeURIComponent(modelName)}/links`).then(r => {
    if (!r.ok) throw new Error('API list model links failed');
    return r.json();
  });
}

export function getLink(tempURL) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/links/${encodeURIComponent(tempURL)}`).then(async r => {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('API get link failed');
    return r.json();
  });
}

export function checkLinkExists(tempURL) {
  const prefix = window.ADMIN_PREFIX || '';
  return fetch(`${prefix}/api/links/exists/${encodeURIComponent(tempURL)}`).then(r => {
    if (!r.ok) throw new Error('API check link failed');
    return r.json();
  });
}

export function listFiles(dir, model) {
  const prefix = window.ADMIN_PREFIX || '';
  const url = new URL(`${prefix}/api/files`, window.location.origin);
  url.searchParams.set('dir', String(dir));
  if (model) url.searchParams.set('model', String(model));
  return fetch(url.toString()).then(r => {
    if (!r.ok) throw new Error('API list files failed');
    return r.json();
  });
}

export function deleteFile(dir, name, model) {
  const prefix = window.ADMIN_PREFIX || '';
  const url = new URL(`${prefix}/api/file`, window.location.origin);
  url.searchParams.set('dir', String(dir));
  url.searchParams.set('name', String(name));
  if (model) url.searchParams.set('model', String(model));
  return fetch(url.toString(), {
    method: 'DELETE'
  });
}

 
