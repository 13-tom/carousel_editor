export default function Toolbar({ selected, style, palette, cropActive, onColor, onAlign, onToggleCrop, onZoom }) {
  const isText = selected?.editType === 'text';
  const isMedia = selected?.editType === 'image' || selected?.editType === 'video';

  return (
    <div className="toolbar">
      {!selected && <span className="muted">Click any text, image, or video area on the slide to edit it.</span>}
      {isText && (
        <>
          <div className="toolbar-row">
            <label className="toolbar-item">
              Color
              <input type="color" value={style.color || '#000000'} onChange={(e) => onColor(e.target.value)} />
            </label>
            <div className="toolbar-item align-group">
              <button className={style.textAlign === 'left' ? 'active' : ''} onClick={() => onAlign('left')}>Left</button>
              <button className={style.textAlign === 'center' ? 'active' : ''} onClick={() => onAlign('center')}>Center</button>
              <button className={style.textAlign === 'right' ? 'active' : ''} onClick={() => onAlign('right')}>Right</button>
            </div>
          </div>
          {palette?.length > 0 && (
            <div className="palette">
              {palette.map((color) => (
                <button
                  key={color}
                  className={`palette-swatch ${style.color === color ? 'active' : ''}`}
                  style={{ background: color }}
                  title={color}
                  onClick={() => onColor(color)}
                />
              ))}
            </div>
          )}
          <span className="muted">Drag text on the canvas to reposition it.</span>
        </>
      )}
      {isMedia && (
        <div className="toolbar-row">
          <button className={`toolbar-item crop-toggle ${cropActive ? 'active' : ''}`} onClick={onToggleCrop}>
            {cropActive ? 'Done cropping' : 'Crop'}
          </button>
          {cropActive ? (
            <label className="toolbar-item">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={style.crop?.scale || 1}
                onChange={(e) => onZoom(parseFloat(e.target.value))}
              />
            </label>
          ) : (
            <span className="muted">Drag a corner/edge handle to resize. Click to replace, or Crop to reposition the {selected.editType} inside its frame.</span>
          )}
        </div>
      )}
    </div>
  );
}
