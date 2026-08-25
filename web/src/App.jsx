import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import PageSelector from './components/PageSelector.jsx';
import SlideThumbnails from './components/SlideThumbnails.jsx';
import EditorCanvas from './components/EditorCanvas.jsx';
import Toolbar from './components/Toolbar.jsx';
import ExportPanel from './components/ExportPanel.jsx';

function withSlideDefaults(project, slideId) {
  if (project.slides[slideId]) return project;
  return { ...project, slides: { ...project.slides, [slideId]: { text: {}, images: {}, videos: {}, styles: {} } } };
}

export default function App() {
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState(null);
  const [page, setPage] = useState(null);
  const [project, setProject] = useState(null);
  const [slideId, setSlideId] = useState(null);
  const [selected, setSelected] = useState(null); // { key, editType }
  const fileInputRef = useRef(null);
  const pendingUploadKey = useRef(null);
  const postToCanvasRef = useRef(() => {});

  useEffect(() => {
    api.listPages().then(setPages);
  }, []);

  useEffect(() => {
    if (!pageId) return;
    const p = pages.find((pg) => pg.id === pageId);
    setPage(p);
    setSlideId(p.slides[0].id);
    api.getProject(pageId).then((proj) => {
      let withDefaults = proj;
      for (const s of p.slides) withDefaults = withSlideDefaults(withDefaults, s.id);
      setProject(withDefaults);
    });
    setSelected(null);
  }, [pageId, pages]);

  function updateSlide(mutator) {
    setProject((prev) => {
      const next = withSlideDefaults(prev, slideId);
      const slide = { ...next.slides[slideId] };
      mutator(slide);
      const updated = { ...next, slides: { ...next.slides, [slideId]: slide } };
      api.saveProject(pageId, updated).catch(console.error);
      return updated;
    });
  }

  function handleTextChange(key, html) {
    updateSlide((slide) => {
      slide.text = { ...slide.text, [key]: html };
    });
  }

  function handleMove(key, x, y) {
    updateSlide((slide) => {
      slide.styles = { ...slide.styles, [key]: { ...slide.styles[key], x, y } };
    });
  }

  function handleStyle(key, patch) {
    updateSlide((slide) => {
      slide.styles = { ...slide.styles, [key]: { ...slide.styles[key], ...patch } };
    });
  }

  function requestUpload(key) {
    pendingUploadKey.current = key;
    fileInputRef.current?.click();
  }

  async function handleFileChosen(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !selected) return;
    const key = pendingUploadKey.current;
    const { url } = await api.upload(file);
    const kind = selected.editType === 'video' ? 'videos' : 'images';
    updateSlide((slide) => {
      slide[kind] = { ...slide[kind], [key]: url };
    });
    postToCanvasRef.current({ type: selected.editType === 'video' ? 'set-video' : 'set-image', key, url });
  }

  if (!pageId || !page || !project || !slideId) {
    return <PageSelector pages={pages} onSelect={setPageId} />;
  }

  const currentSlideOverrides = project.slides[slideId] || {};
  const currentStyle = selected ? currentSlideOverrides.styles?.[selected.key] || {} : {};

  return (
    <div className="app">
      <header className="app-header">
        <button className="link-btn" onClick={() => setPageId(null)}>← Pages</button>
        <h1>{page.name}</h1>
        <span className="theme-badge">{page.theme}</span>
      </header>
      <div className="app-body">
        <SlideThumbnails slides={page.slides} currentId={slideId} onSelect={setSlideId} />
        <div className="canvas-column">
          <Toolbar
            selected={selected}
            style={currentStyle}
            onColor={(color) => {
              handleStyle(selected.key, { color });
              postToCanvasRef.current({ type: 'apply-style', key: selected.key, color });
            }}
            onAlign={(textAlign) => {
              handleStyle(selected.key, { textAlign });
              postToCanvasRef.current({ type: 'apply-style', key: selected.key, textAlign });
            }}
          />
          <EditorCanvas
            pageId={pageId}
            slideId={slideId}
            canvas={page.canvas}
            onSelect={setSelected}
            onTextChange={handleTextChange}
            onMove={handleMove}
            onRequestUpload={requestUpload}
            registerPost={(fn) => (postToCanvasRef.current = fn)}
          />
        </div>
        <ExportPanel pageId={pageId} />
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" style={{ display: 'none' }} onChange={handleFileChosen} />
    </div>
  );
}
