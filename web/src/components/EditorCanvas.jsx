import { useEffect, useRef } from 'react';

const DISPLAY_WIDTH = 420;

export default function EditorCanvas({ pageId, slideId, topic, canvas, onSelect, onTextChange, onMove, onResize, onCrop, onStyleChange, onRequestUpload, registerPost }) {
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
          onResize(msg.key, msg.width, msg.height, msg.top, msg.left);
          break;
        case 'crop-pan':
          onCrop(msg.key, { x: msg.x, y: msg.y, scale: msg.scale });
          break;
        case 'style-changed':
          onStyleChange(msg.key, { color: msg.color });
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
  }, [onSelect, onTextChange, onMove, onResize, onCrop, onStyleChange, onRequestUpload]);

  const topicParam = topic ? `&topic=${encodeURIComponent(topic)}` : '';

  return (
    <div className="canvas-wrapper" style={{ width: DISPLAY_WIDTH, height: displayHeight }}>
      <iframe
        key={`${pageId}-${slideId}-${topic || ''}`}
        ref={iframeRef}
        title="slide"
        src={`/api/render/${pageId}/${slideId}?mode=editor${topicParam}`}
        width={canvas.width}
        height={canvas.height}
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left', border: 'none' }}
      />
    </div>
  );
}
