(function () {
  if (document.body.dataset.mode !== 'editor') return;

  var DRAG_THRESHOLD = 4;
  var offsets = {}; // key -> {x, y}, current translate() applied to element

  function parseTranslate(el) {
    var m = /translate\(\s*(-?[\d.]+)px\s*,\s*(-?[\d.]+)px\s*\)/.exec(el.style.transform || '');
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  }

  function applyTranslate(el, x, y) {
    var rest = (el.style.transform || '').replace(/translate\([^)]*\)/, '').trim();
    el.style.transform = 'translate(' + x + 'px, ' + y + 'px) ' + rest;
  }

  function post(msg) {
    window.parent.postMessage(Object.assign({ source: 'carousel-editor-iframe' }, msg), '*');
  }

  document.querySelectorAll('[data-key]').forEach(function (el) {
    offsets[el.getAttribute('data-key')] = parseTranslate(el);
  });

  var dragState = null;

  document.addEventListener('pointerdown', function (e) {
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
    if (!dragState) return;
    var dx = e.clientX - dragState.startX;
    var dy = e.clientY - dragState.startY;
    if (!dragState.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragState.moved = true;
    if (dragState.el.getAttribute('contenteditable') === 'true') return;
    var nx = dragState.base.x + dx;
    var ny = dragState.base.y + dy;
    applyTranslate(dragState.el, nx, ny);
  });

  document.addEventListener('pointerup', function (e) {
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
    } else if (editType === 'image') {
      post({ type: 'request-image', key: key });
    } else if (editType === 'video') {
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
        if (msg.color) el.style.color = msg.color;
        if (msg.textAlign) el.style.textAlign = msg.textAlign;
        break;
      case 'set-image':
        if (!el) break;
        if (el.tagName === 'IMG') el.src = msg.url;
        else {
          el.style.backgroundImage = "url('" + msg.url + "')";
          var label = el.querySelector('.image-slot-label');
          if (label) label.remove();
        }
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
    }
  });

  post({ type: 'ready' });
})();
