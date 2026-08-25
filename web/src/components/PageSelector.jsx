export default function PageSelector({ pages, onSelect }) {
  return (
    <div className="page-selector">
      <h1>Choose a page to edit</h1>
      {pages.length === 0 && <p className="muted">No pages found in /templates/pages.</p>}
      <div className="page-grid">
        {pages.map((p) => (
          <button key={p.id} className="page-card" onClick={() => onSelect(p.id)}>
            <div className="page-card-name">{p.name}</div>
            <div className="page-card-meta">{p.theme} theme · {p.slides.length} slides</div>
          </button>
        ))}
      </div>
    </div>
  );
}
