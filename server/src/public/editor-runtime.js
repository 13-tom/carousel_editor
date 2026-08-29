(function () {
  if (document.body.dataset.mode !== 'editor') return;

  // <img> elements are natively draggable by default — the moment a mouse
  // drag on one moves a few pixels, the browser hijacks it into an HTML5
  // drag-and-drop operation, which stops delivering pointermove events to
  // us entirely (breaking crop panning and resize on images). Suppress it
  // globally rather than remembering draggable="false" on every img.
  document.addEventListener('dragstart', function (e) {
    e.preventDefault();
  });

  var DRAG_THRESHOLD = 4;
  var MIN_SIZE = 40;
  var EDGES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  var offsets = {}; // key -> {x, y}, current translate() applied to the frame element
  var cropActiveKey = null;

  function parseTranslate(el) {
    var m = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/.exec(el.style.transform || '');
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  }

  function parseCropTransform(el) {
    var t = el.style.transform || '';
    var m = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)\s*scale\(\s*([\d.]+)\s*\)/.exec(t);
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]), scale: parseFloat(m[3]) } : { x: 0, y: 0, scale: 1 };
  }

  function applyTranslate(el, x, y) {
    var rest = (el.style.transform || '').replace(/translate\([^)]*\)/, '').trim();
    el.style.transform = 'translate(' + x + 'px, ' + y + 'px) ' + rest;
  }

  function post(msg) {
    window.parent.postMessage(Object.assign({ source: 'carousel-editor-iframe' }, msg), '*');
  }

  function mediaElFor(key) {
    var slot = document.querySelector('[data-key="' + key + '"]');
    return slot ? slot.querySelector('.slot-img, .bg-video') : null;
  }

  document.querySelectorAll('[data-key]').forEach(function (el) {
    offsets[el.getAttribute('data-key')] = parseTranslate(el);
  });

  // Images/videos are fixed in place (only resizable, via the handles below,
  // and croppable) and replaceable — free dragging-to-reposition is a
  // text-only feature, so a layout can't drift out of place slide to slide.
  function edgeStyle(edge) {
    var style = {};
    if (edge.indexOf('n') !== -1) style.top = '0';
    if (edge.indexOf('s') !== -1) style.bottom = '0';
    if (edge.indexOf('e') !== -1) style.right = '0';
    if (edge.indexOf('w') !== -1) style.left = '0';
    if (edge === 'n' || edge === 's') style.left = '50%';
    if (edge === 'e' || edge === 'w') style.top = '50%';
    return style;
  }

  document.querySelectorAll('[data-edit="image"], [data-edit="video"]').forEach(function (el) {
    EDGES.forEach(function (edge) {
      var handle = document.createElement('div');
      handle.className = 'resize-handle';
      handle.setAttribute('data-edge', edge);
      handle.setAttribute('data-resize-for', el.getAttribute('data-key'));
      var style = edgeStyle(edge);
      Object.keys(style).forEach(function (k) {
        handle.style[k] = style[k];
      });
      el.appendChild(handle);
    });
  });

  // Given the pointer delta since resize started, compute the new frame
  // box (in absolute px, from getBoundingClientRect — which equals slide-
  // local coordinates since the slide fills the iframe from 0,0) so the
  // OPPOSITE edge stays fixed. We deliberately resize via explicit
  // top/left/width/height rather than a translate() offset: templates
  // anchor slots from whichever side they like (this app's own demo page
  // anchors an image slot from the BOTTOM via `bottom:100px`), and only
  // absolute top/left reliably wins over an unknown original anchor —
  // CSS ignores `bottom`/`right` once `top`/`left` and a height/width are
  // all present, regardless of which the template originally set.
  function computeResize(edge, start, dx, dy) {
    var top = start.top, left = start.left, w = start.w, h = start.h;
    if (edge.indexOf('e') !== -1) w = Math.max(MIN_SIZE, start.w + dx);
    if (edge.indexOf('w') !== -1) {
      w = Math.max(MIN_SIZE, start.w - dx);
      left = start.left + (start.w - w);
    }
    if (edge.indexOf('s') !== -1) h = Math.max(MIN_SIZE, start.h + dy);
    if (edge.indexOf('n') !== -1) {
      h = Math.max(MIN_SIZE, start.h - dy);
      top = start.top + (start.h - h);
    }
    return { top: top, left: left, w: w, h: h };
  }

  var dragState = null;
  var resizeState = null;
  var cropState = null;

  document.addEventListener('pointerdown', function (e) {
    var handle = e.target.closest('.resize-handle');
    if (handle) {
      var key = handle.getAttribute('data-resize-for');
      var target = document.querySelector('[data-key="' + key + '"]');
      var rect = target.getBoundingClientRect();
      // A slot positioned via normal flow (e.g. a flex item sized only by
      // width/height, never given its own absolute position) can't be
      // resized with top/left at all — freeze it into absolute positioning
      // at its current on-screen spot first, so nothing jumps. A same-size
      // invisible placeholder left in its old spot keeps flex/flow siblings
      // (e.g. the caption text next to an avatar) from sliding into the gap.
      if (getComputedStyle(target).position !== 'absolute') {
        var placeholder = document.createElement('div');
        placeholder.style.width = rect.width + 'px';
        placeholder.style.height = rect.height + 'px';
        placeholder.style.flex = 'none';
        placeholder.style.visibility = 'hidden';
        target.parentNode.insertBefore(placeholder, target);

        target.style.position = 'absolute';
        target.style.top = rect.top + 'px';
        target.style.left = rect.left + 'px';
        target.style.right = 'auto';
        target.style.bottom = 'auto';
        target.style.margin = '0';
        rect = target.getBoundingClientRect();
      }
      resizeState = {
        target: target,
        key: key,
        edge: handle.getAttribute('data-edge'),
        startX: e.clientX,
        startY: e.clientY,
        start: { top: rect.top, left: rect.left, w: rect.width, h: rect.height },
        live: null,
      };
      return;
    }

    if (cropActiveKey) {
      var activeSlot = e.target.closest('[data-key="' + cropActiveKey + '"]');
      if (activeSlot) {
        var mediaEl = activeSlot.querySelector('.slot-img, .bg-video');
        if (mediaEl && (mediaEl === e.target || mediaEl.contains(e.target))) {
          var current = parseCropTransform(mediaEl);
          cropState = { el: mediaEl, key: cropActiveKey, startX: e.clientX, startY: e.clientY, baseX: current.x, baseY: current.y, scale: current.scale, liveX: current.x, liveY: current.y };
          return;
        }
      }
    }

    var el = e.target.closest('[data-key]');
    if (!el) return;
    dragState = {
      el: el,
      key: el.getAttribute('data-key'),
      startX: e.clientX,
      startY: e.clientY,
      base: offsets[el.getAttribute('data-key')] || { x: 0, y: 0 },
      moved: false,
    };
  });

  document.addEventListener('pointermove', function (e) {
    if (resizeState) {
      var r = computeResize(resizeState.edge, resizeState.start, e.clientX - resizeState.startX, e.clientY - resizeState.startY);
      resizeState.target.style.top = r.top + 'px';
      resizeState.target.style.left = r.left + 'px';
      resizeState.target.style.width = r.w + 'px';
      resizeState.target.style.height = r.h + 'px';
      resizeState.live = r;
      return;
    }
    if (cropState) {
      var nx = cropState.baseX + (e.clientX - cropState.startX);
      var ny = cropState.baseY + (e.clientY - cropState.startY);
      cropState.el.style.transform = 'translate(' + nx + 'px, ' + ny + 'px) scale(' + cropState.scale + ')';
      cropState.liveX = nx;
      cropState.liveY = ny;
      return;
    }
    if (!dragState) return;
    if (dragState.el.getAttribute('data-edit') !== 'text') return;
    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragState.moved = true;
    if (dragState.el.getAttribute('contenteditable') === 'true') return;
    applyTranslate(dragState.el, dragState.base.x + dx, dragState.base.y + dy);
  });

  document.addEventListener('pointerup', function (e) {
    if (resizeState) {
      var r = resizeState.live || resizeState.start;
      post({ type: 'resize', key: resizeState.key, width: Math.round(r.w), height: Math.round(r.h), top: Math.round(r.top), left: Math.round(r.left) });
      resizeState = null;
      return;
    }
    if (cropState) {
      post({ type: 'crop-pan', key: cropState.key, x: cropState.liveX, y: cropState.liveY, scale: cropState.scale });
      cropState = null;
      return;
    }
    if (!dragState) return;
    var el = dragState.el;
    var key = dragState.key;
    var editType = el.getAttribute('data-edit');

    if (dragState.moved) {
      var pos = parseTranslate(el);
      offsets[key] = pos;
      post({ type: 'move', key: key, x: pos.x, y: pos.y });
    } else {
      handleClick(el, key, editType);
    }
    dragState = null;
  });

  function handleClick(el, key, editType) {
    post({ type: 'select', key: key, editType: editType });
    if (editType === 'text') {
      el.setAttribute('contenteditable', 'true');
      el.focus();
      document.execCommand('defaultParagraphSeparator', false, 'br');
    } else if (editType === 'image' && cropActiveKey !== key) {
      post({ type: 'request-image', key: key });
    } else if (editType === 'video' && cropActiveKey !== key) {
      post({ type: 'request-video', key: key });
    }
  }

  document.addEventListener(
    'blur',
    function (e) {
      var el = e.target;
      if (!(el instanceof HTMLElement)) return;
      if (el.getAttribute('contenteditable') !== 'true') return;
      el.removeAttribute('contenteditable');
      post({ type: 'text-change', key: el.getAttribute('data-key'), html: el.innerHTML });
    },
    true
  );

  window.addEventListener('message', function (e) {
    var msg = e.data;
    if (!msg || msg.source === 'carousel-editor-iframe') return;
    var el = msg.key ? document.querySelector('[data-key="' + msg.key + '"]') : null;

    switch (msg.type) {
      case 'apply-style':
        if (!el) break;
        if (msg.color) {
          // A highlighted word/phrase inside the currently-edited text
          // block colors just that selection (like Canva); anything else
          // — nothing selected, or the selection isn't even inside this
          // element — falls back to coloring the whole block, same as
          // before. foreColor needs styleWithCSS on or it emits legacy
          // <font color> tags, which the server-side sanitizer (only
          // <br> and <span style="color:..."> survive) would strip.
          var sel = window.getSelection();
          var selectionInEl = el.getAttribute('contenteditable') === 'true' && sel && !sel.isCollapsed &&
            el.contains(sel.anchorNode) && el.contains(sel.focusNode);
          if (selectionInEl) {
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, msg.color);
            post({ type: 'text-change', key: el.getAttribute('data-key'), html: el.innerHTML });
          } else {
            el.style.color = msg.color;
            post({ type: 'style-changed', key: el.getAttribute('data-key'), color: msg.color });
          }
        }
        if (msg.textAlign) el.style.textAlign = msg.textAlign;
        if (msg.border) el.style.border = msg.border.width > 0 ? msg.border.width + 'px solid ' + msg.border.color : 'none';
        break;
      case 'set-image':
        if (!el) break;
        var img = el.querySelector('img.slot-img');
        if (!img) {
          img = document.createElement('img');
          img.className = 'slot-img';
          el.insertBefore(img, el.firstChild);
        }
        img.src = msg.url;
        var label = el.querySelector('.image-slot-label');
        if (label) label.remove();
        break;
      case 'set-video':
        if (!el) break;
        var video = el.querySelector('video');
        if (video) video.src = msg.url;
        var vlabel = el.querySelector('.video-slot-label');
        if (vlabel) vlabel.remove();
        break;
      case 'set-position':
        if (!el) break;
        applyTranslate(el, msg.x, msg.y);
        offsets[msg.key] = { x: msg.x, y: msg.y };
        break;
      case 'set-crop-mode':
        document.querySelectorAll('.crop-active').forEach(function (n) {
          n.classList.remove('crop-active');
        });
        cropActiveKey = msg.active ? msg.key : null;
        if (cropActiveKey && el) el.classList.add('crop-active');
        break;
      case 'apply-crop':
        var mediaEl = mediaElFor(msg.key);
        if (mediaEl) mediaEl.style.transform = 'translate(' + msg.x + 'px, ' + msg.y + 'px) scale(' + msg.scale + ')';
        break;
    }
  });

  post({ type: 'ready' });
})();
