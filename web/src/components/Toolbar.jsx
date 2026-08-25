export default function Toolbar({ selected, style, onColor, onAlign }) {
  const isText = selected?.editType === 'text';

  return (
    <div className="toolbar">
      {!selected && <span className="muted">Click any text, image, or video area on the slide to edit it.</span>}
      {selected && !isText && <span className="muted">Selected: {selected.key} — click to replace {selected.editType}.</span>}
      {isText && (
        <>
          <label className="toolbar-item">
            Color
            <input type="color" value={style.color || '#000000'} onChange={(e) => onColor(e.target.value)} />
          </label>
          <div className="toolbar-item align-group">
            <button className={style.textAlign === 'left' ? 'active' : ''} onClick={() => onAlign('left')}>Left</button>
            <button className={style.textAlign === 'center' ? 'active' : ''} onClick={() => onAlign('center')}>Center</button>
            <button className={style.textAlign === 'right' ? 'active' : ''} onClick={() => onAlign('right')}>Right</button>
          </div>
          <span className="muted">Drag text on the canvas to reposition it.</span>
        </>
      )}
    </div>
  );
}
