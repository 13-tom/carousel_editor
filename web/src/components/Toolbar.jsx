import { useEffect, useState } from 'react';

export default function Toolbar({ selected, style, palette, cropActive, onColor, onAlign, onToggleCrop, onZoom, onBorder }) {
  const isText = selected?.editType === 'text';
  const isMedia = selected?.editType === 'image' || selected?.editType === 'video';
  const [mediaTab, setMediaTab] = useState('image');
  const border = style.border || {};

  // A newly selected image/video always starts on the Image tab — otherwise
  // switching slots could leave Border showing for a slot that has none.
  useEffect(() => setMediaTab('image'), [selected?.key]);

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
                  // A plain click first focuses this button, which blurs
                  // the canvas's contenteditable and collapses whatever
                  // text was highlighted — losing the selection the color
                  // is supposed to apply to. Suppressing that default
                  // focus-steal on mousedown is what lets a mid-word
                  // selection survive long enough for onClick's apply-style
                  // message to reach it still intact.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onColor(color)}
                />
              ))}
            </div>
          )}
          <span className="muted">Highlight a word first to color just that word, or click a swatch with nothing selected to color the whole block. Drag text on the canvas to reposition it.</span>
        </>
      )}
      {isMedia && (
        <>
          <div className="toolbar-item media-tabs">
            <button className={mediaTab === 'image' ? 'active' : ''} onClick={() => setMediaTab('image')}>Image</button>
            <button className={mediaTab === 'border' ? 'active' : ''} onClick={() => setMediaTab('border')}>Border</button>
          </div>
          {mediaTab === 'image' && (
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
          {mediaTab === 'border' && (
            <div className="toolbar-row">
              <label className="toolbar-item">
                Width
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={border.width || 0}
                  onChange={(e) => onBorder({ width: parseInt(e.target.value, 10), color: border.color || '#ffffff' })}
                />
              </label>
              <label className="toolbar-item">
                Color
                <input
                  type="color"
                  value={border.color || '#ffffff'}
                  onChange={(e) => onBorder({ width: border.width || 8, color: e.target.value })}
                />
              </label>
              {!border.width && <span className="muted">Drag the width slider to add a frame.</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
