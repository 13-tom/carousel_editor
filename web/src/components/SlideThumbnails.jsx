export default function SlideThumbnails({ slides, currentId, onSelect }) {
  return (
    <div className="slide-list">
      {slides.map((s, i) => (
        <button
          key={s.id}
          className={`slide-thumb ${s.id === currentId ? 'active' : ''}`}
          onClick={() => onSelect(s.id)}
        >
          <span className="slide-thumb-num">{i + 1}</span>
          <span>{s.label || s.id}</span>
          {s.hasVideo && <span className="video-badge">video</span>}
        </button>
      ))}
    </div>
  );
}
