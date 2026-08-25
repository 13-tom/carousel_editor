import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

export default function TopicPicker({ page, onConfirm, onBack }) {
  const [topics, setTopics] = useState(null);
  const [newTopic, setNewTopic] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.listTopics(page.id).then(setTopics);
  }, [page.id]);

  async function startNewTopic() {
    const topic = newTopic.trim();
    if (!topic) {
      setError('Give this carousel a topic name first.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const mediaUrls = [];
      for (const file of files) {
        const { url } = await api.upload(file, { pageName: page.name, topic });
        mediaUrls.push(url);
      }
      onConfirm(topic, mediaUrls);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="topic-picker">
      <button className="link-btn" onClick={onBack}>← Pages</button>
      <h1>{page.name}</h1>
      <p className="muted">Pick a carousel to keep working on, or start a new one.</p>

      {topics === null && <p className="muted">Loading…</p>}

      {topics && topics.topics.length > 0 && (
        <div className="topic-list">
          {topics.topics.map((t) => (
            <button key={t.slug} className="topic-card" onClick={() => onConfirm(t.name, [])}>
              <div className="topic-card-name">{t.name}</div>
              <div className="topic-card-meta">Last edited {new Date(t.updatedAt).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
      )}

      {topics?.hasUntitled && (
        <button className="topic-card topic-card-untitled" onClick={() => onConfirm(null, [])}>
          <div className="topic-card-name">Untitled (before topics existed)</div>
        </button>
      )}

      <div className="topic-new">
        <h3>Start a new carousel</h3>
        <input
          type="text"
          placeholder="Topic, e.g. “OpenAI news roundup”"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
        />
        <div className="topic-new-upload" onClick={() => fileInputRef.current?.click()}>
          {files.length === 0
            ? 'Click to add photos for this carousel (optional — you can also add them per-slide later)'
            : `${files.length} photo(s) selected`}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => setFiles(Array.from(e.target.files))}
        />
        {error && <div className="export-status error">{error}</div>}
        <button className="primary-btn" disabled={uploading} onClick={startNewTopic}>
          {uploading ? 'Uploading…' : 'Start editing'}
        </button>
      </div>
    </div>
  );
}
