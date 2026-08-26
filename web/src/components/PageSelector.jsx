import { useRef, useState } from 'react';
import { api } from '../api.js';
import Brand from './Brand.jsx';
import Brackets from './Brackets.jsx';
import ThemeToggle from './ThemeToggle.jsx';

export default function PageSelector({ pages, onSelect, onImported }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null); // { state: 'loading'|'error' }

  async function handleFileChosen(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setStatus({ state: 'loading' });
    try {
      const result = await api.importTemplate(file);
      setStatus(null);
      await onImported();
      onSelect(result.pageId);
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <div className="page-selector">
      <div className="top-bar">
        <Brand />
        <ThemeToggle />
      </div>
      <div className="page-selector-header">
        <h1>Choose a page to edit</h1>
        <button className="ghost-btn" disabled={status?.state === 'loading'} onClick={() => fileInputRef.current?.click()}>
          {status?.state === 'loading' ? 'Importing…' : '+ Import template'}
        </button>
      </div>
      {status?.state === 'error' && <div className="export-status error">Import failed: {status.message}</div>}
      {pages.length === 0 && <p className="muted">No pages found in /templates/pages.</p>}
      <div className="page-grid">
        {pages.map((p) => (
          <button key={p.id} className="page-card" onClick={() => onSelect(p.id)}>
            <Brackets />
            <div className="page-card-name">{p.name}</div>
            <div className="page-card-meta">{p.theme} theme · {p.slides.length} slides</div>
          </button>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        style={{ display: 'none' }}
        onChange={handleFileChosen}
      />
    </div>
  );
}
