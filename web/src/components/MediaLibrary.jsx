export default function MediaLibrary({ items, selected, onAssign }) {
  if (!items || items.length === 0) return null;
  const canAssign = selected?.editType === 'image';

  return (
    <div className="media-library">
      <div className="media-library-label">
        {canAssign ? `Click a photo to use it for ${selected.key}` : 'Select an image area first, then click a photo below to use it'}
      </div>
      <div className="media-library-strip">
        {items.map((url) => (
          <button
            key={url}
            className="media-thumb"
            disabled={!canAssign}
            onClick={() => onAssign(url)}
            title={canAssign ? 'Use this photo' : 'Select an image/video slot first'}
          >
            <img src={url} alt="" />
          </button>
        ))}
      </div>
    </div>
  );
}
