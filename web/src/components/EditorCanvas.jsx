import { useEffect, useRef } from 'react';

const DISPLAY_WIDTH = 420;

export default function EditorCanvas({ pageId, slideId, canvas, onSelect, onTextChange, onMove, onResize, onRequestUpload, registerPost }) {
  const iframeRef = useRef(null);
  const scale = DISPLAY_WIDTH / canvas.width;
  const displayHeight = canvas.height * scale;

  useEffect(() => {
    registerPost((msg) => {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    });
  }, [registerPost]);

  useEffect(() => {
    function handleMessage(e) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      const msg = e.data;
      switch (msg.type) {
        case 'select':
          onSelect({ key: msg.key, editType: msg.editType });
          break;
        case 'text-change':
          onTextChange(msg.key, msg.html);
          break;
        case 'move':
          onMove(msg.key, msg.x, msg.y);
          break;
        case 'resize':
          onResize(msg.key, msg.width, msg.height);
          break;
        case 'request-image':
        case 'request-video':
          onRequestUpload(msg.key);
          break;
        default:
          break;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelect, onTextChange, onMove, onResize, onRequestUpload]);

  return (
    <div className="canvas-wrapper" style={{ width: DISPLAY_WIDTH, height: displayHeight }}>
      <iframe
        key={`${pageId}-${slideId}`}
        ref={iframeRef}
        title="slide"
        src={`/api/render/${pageId}/${slideId}?mode=editor`}
        width={canvas.width}
        height={canvas.height}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none' }}
      />
    </div>
  );
}
