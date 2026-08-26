export default function Brand() {
  return (
    <div className="brand">
      <svg className="brand-mark" width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M2 8V3a1 1 0 0 1 1-1h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 8V3a1 1 0 0 0-1-1h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M2 16v5a1 1 0 0 0 1 1h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 16v5a1 1 0 0 1-1 1h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="brand-word">Carousel</span>
    </div>
  );
}
