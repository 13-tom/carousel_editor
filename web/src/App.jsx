import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import PageSelector from './components/PageSelector.jsx';
import TopicPicker from './components/TopicPicker.jsx';
import SlideThumbnails from './components/SlideThumbnails.jsx';
import EditorCanvas from './components/EditorCanvas.jsx';
import Toolbar from './components/Toolbar.jsx';
import MediaLibrary from './components/MediaLibrary.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import Brand from './components/Brand.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

function withSlideDefaults(project, slideId) {
  if (project.slides[slideId]) return project;
  return { ...project, slides: { ...project.slides, [slideId]: { text: {}, images: {}, videos: {}, styles: {} } } };
}

export default function App() {
  const [pages, setPages] = useState([]);
  const [pageId, setPageId] = useState(null);
  const [topic, setTopic] = useState(undefined); // undefined = not chosen yet, null = explicit "untitled"
  const [project, setProject] = useState(null);
  const [slideId, setSlideId] = useState(null);
  const [selected, setSelected] = useState(null); // { key, editType }
  const [cropKey, setCropKey] = useState(null);
  const [palette, setPalette] = useState([]);
  const fileInputRef = useRef(null);
  const pendingUploadKey = useRef(null);
  const pendingMediaRef = useRef(null);
  const postToCanvasRef = useRef(() => {});

  useEffect(() => {
    api.listPages().then(setPages);
  }, []);

  const page = pageId ? pages.find((pg) => pg.id === pageId) : null;

  useEffect(() => {
    if (!pageId) return;
    api.getPageColors(pageId).then((res) => setPalette(res.colors)).catch(() => setPalette([]));
  }, [pageId]);

  useEffect(() => {
    if (!page || topic === undefined) return;
    const p = page;
    setSlideId(p.slides[0].id);
    api.getProject(pageId, topic).then((proj) => {
      let withDefaults = proj;
      for (const s of p.slides) withDefaults = withSlideDefaults(withDefaults, s.id);
      const pendingMedia = pendingMediaRef.current;
      pendingMediaRef.current = null;
      if (pendingMedia?.length) {
        withDefaults = { ...withDefaults, mediaLibrary: [...(withDefaults.mediaLibrary || []), ...pendingMedia] };
        api.saveProject(pageId, withDefaults, topic).catch(console.error);
      }
      setProject(withDefaults);
    });
    setSelected(null);
    setCropKey(null);
  }, [pageId, topic, pages]);

  function selectElement(next) {
    setSelected(next);
    if (cropKey && next?.key !== cropKey) setCropKey(null);
  }

  function selectPage(id) {
    setPageId(id);
    setTopic(undefined);
    setProject(null);
  }

  function backToPages() {
    setPageId(null);
    setTopic(undefined);
    setProject(null);
  }

  function confirmTopic(topicName, mediaUrls) {
    pendingMediaRef.current = mediaUrls;
    setTopic(topicName);
  }

  function updateSlide(mutator) {
    setProject((prev) => {
      const next = withSlideDefaults(prev, slideId);
      const slide = { ...next.slides[slideId] };
      mutator(slide);
      const updated = { ...next, slides: { ...next.slides, [slideId]: slide } };
      api.saveProject(pageId, updated, topic).catch(console.error);
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

  function handleResize(key, width, height, top, left) {
    updateSlide((slide) => {
      slide.styles = { ...slide.styles, [key]: { ...slide.styles[key], width, height, top, left } };
    });
  }

  function handleCrop(key, crop) {
    updateSlide((slide) => {
      slide.styles = { ...slide.styles, [key]: { ...slide.styles[key], crop } };
    });
  }

  function toggleCrop(key) {
    const next = cropKey === key ? null : key;
    if (cropKey) postToCanvasRef.current({ type: 'set-crop-mode', key: cropKey, active: false });
    if (next) postToCanvasRef.current({ type: 'set-crop-mode', key: next, active: true });
    setCropKey(next);
  }

  function setCropZoom(key, scale) {
    const current = project.slides[slideId]?.styles?.[key]?.crop || { x: 0, y: 0, scale: 1 };
    const crop = { ...current, scale };
    handleCrop(key, crop);
    postToCanvasRef.current({ type: 'apply-crop', key, ...crop });
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

  function assignImage(key, url) {
    updateSlide((slide) => {
      slide.images = { ...slide.images, [key]: url };
    });
    postToCanvasRef.current({ type: 'set-image', key, url });
  }

  async function handleFileChosen(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !selected) return;
    const key = pendingUploadKey.current;
    const { url } = await api.upload(file, { pageName: page.name, topic });
    if (selected.editType === 'video') {
      updateSlide((slide) => {
        slide.videos = { ...slide.videos, [key]: url };
      });
      postToCanvasRef.current({ type: 'set-video', key, url });
    } else {
      assignImage(key, url);
    }
  }

  if (!pageId || !page) {
    return <PageSelector pages={pages} onSelect={selectPage} onImported={() => api.listPages().then(setPages)} />;
  }

  if (topic === undefined) {
    return <TopicPicker page={page} onConfirm={confirmTopic} onBack={backToPages} />;
  }

  if (!project || !slideId) {
    return null;
  }

  const currentSlideOverrides = project.slides[slideId] || {};
  const currentStyle = selected ? currentSlideOverrides.styles?.[selected.key] || {} : {};

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <Brand />
          <span className="header-divider" />
          <button className="link-btn" onClick={backToPages}>← Pages</button>
          <h1>{page.name}</h1>
          {topic && <span className="theme-badge">{topic}</span>}
          <span className="theme-badge">{page.theme}</span>
        </div>
        <ThemeToggle />
      </header>
      <div className="app-body">
        <SlideThumbnails
          slides={page.slides}
          currentId={slideId}
          onSelect={(id) => {
            setSlideId(id);
            setSelected(null);
            setCropKey(null);
          }}
        />
        <div className="canvas-column">
          <Toolbar
            selected={selected}
            style={currentStyle}
            palette={palette}
            cropActive={cropKey === selected?.key}
            onColor={(color) => {
              // Whether this colors the whole block or just a highlighted
              // selection is a DOM fact only the iframe can see (is there a
              // live text selection right now?) — it reports back via
              // 'style-changed' (whole block) or 'text-change' (a
              // <span> around just the selection), and either one is what
              // actually gets persisted, so we don't persist a whole-block
              // override here that a partial selection would contradict.
              postToCanvasRef.current({ type: 'apply-style', key: selected.key, color });
            }}
            onAlign={(textAlign) => {
              handleStyle(selected.key, { textAlign });
              postToCanvasRef.current({ type: 'apply-style', key: selected.key, textAlign });
            }}
            onBorder={(border) => {
              handleStyle(selected.key, { border });
              postToCanvasRef.current({ type: 'apply-style', key: selected.key, border });
            }}
            onToggleCrop={() => toggleCrop(selected.key)}
            onZoom={(scale) => setCropZoom(selected.key, scale)}
          />
          <EditorCanvas
            pageId={pageId}
            slideId={slideId}
            topic={topic}
            canvas={page.canvas}
            onSelect={selectElement}
            onTextChange={handleTextChange}
            onMove={handleMove}
            onResize={handleResize}
            onCrop={handleCrop}
            onStyleChange={handleStyle}
            onRequestUpload={requestUpload}
            registerPost={(fn) => (postToCanvasRef.current = fn)}
          />
          <MediaLibrary items={project.mediaLibrary} selected={selected} onAssign={(url) => assignImage(selected.key, url)} />
        </div>
        <ExportPanel pageId={pageId} topic={topic} />
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" style={{ display: 'none' }} onChange={handleFileChosen} />
    </div>
  );
}
