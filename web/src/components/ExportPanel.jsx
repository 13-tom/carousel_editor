import { useState } from 'react';
import { api } from '../api.js';

export default function ExportPanel({ pageId, topic }) {
  const [status, setStatus] = useState(null); // { state: 'loading'|'done'|'error', ... }

  async function handleExport() {
    setStatus({ state: 'loading' });
    try {
      const result = await api.exportPage(pageId, topic);
      setStatus({ state: 'done', result });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <div className="export-panel">
      <h3>Export</h3>
      <p className="muted">Renders every slide — PNG for static slides, MP4 for slides with a looping video.</p>
      <button className="primary-btn" disabled={status?.state === 'loading'} onClick={handleExport}>
        {status?.state === 'loading' ? 'Exporting…' : 'Export carousel'}
      </button>
      {status?.state === 'done' && (
        <div className="export-status success">
          <div>{status.result.slideCount} file(s) exported.</div>
          {status.result.mode === 'local-folder' && <div>Saved to: {status.result.localDir}</div>}
          {status.result.mode === 'local-folder' && (
            <div>{status.result.dropboxCopied ? 'Copied into your Dropbox folder ✓' : 'Dropbox folder not configured — see config/config.json.'}</div>
          )}
          {status.result.mode === 'dropbox-api' && <div>Uploaded to Dropbox: {status.result.uploaded?.join(', ')}</div>}
        </div>
      )}
      {status?.state === 'error' && <div className="export-status error">Export failed: {status.message}</div>}
    </div>
  );
}
