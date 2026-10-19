import { getMaxSize } from '@gitroom/nestjs-libraries/upload/custom.upload.validation';

const megabytes = (mime: string) => Math.floor(getMaxSize(mime) / 1024 / 1024);

export const UPLOAD_WIDGET_URI = 'ui://postiz/upload';

// MCP Apps (SEP-1865) widget: a single self-contained HTML document rendered by
// the host inside a sandboxed iframe. It can't load our bundles or cookies, so
// it talks to the host over postMessage JSON-RPC and to the backend over fetch:
// uploadWidgetTool result (sessionId) -> uploadWidgetTicketTool (ticket, through
// the host) -> POST /media-widget/upload -> report the media back to the model.
// The upload is a plain multipart fetch on purpose: no custom headers and no
// XHR progress listeners, so the browser never sends a CORS preflight
export const uploadWidgetHtml = (backendUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #0e0e0e; --muted: #6b6b6b; --border: #d9d9d9; --accent: #612bd3; --ok: #1a7f37; --bad: #cf222e; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1a1919; --fg: #ffffff; --muted: #9c9c9c; --border: #3a3a3a; --ok: #3fb950; --bad: #f85149; } }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 14px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #drop { display: block; border: 2px dashed var(--border); border-radius: 8px; padding: 24px 16px; text-align: center; cursor: pointer; }
  #drop.over { border-color: var(--accent); }
  #drop.disabled { opacity: 0.5; pointer-events: none; }
  #drop small { display: block; color: var(--muted); margin-top: 4px; }
  input[type=file] { display: none; }
  #files { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; margin-top: 12px; }
  #files:empty { display: none; }
  .tile { min-width: 0; }
  .box { position: relative; aspect-ratio: 1 / 1; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(127, 127, 127, 0.12); color: var(--muted); font-size: 12px; font-weight: 600; }
  .box canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  .tile:not(.ok):not(.bad) canvas { opacity: 0.5; }
  .state { position: absolute; left: 0; right: 0; bottom: 0; padding: 3px 4px; font-size: 11px; font-weight: 400; text-align: center; color: #ffffff; background: rgba(0, 0, 0, 0.6); }
  .state:empty { display: none; }
  .tile.ok .state, .tile.bad .state { left: auto; right: 6px; bottom: 6px; width: 20px; height: 20px; padding: 0; border-radius: 50%; line-height: 20px; background: var(--ok); }
  .tile.bad .state { background: var(--bad); }
  .tile.bad .box { border-color: var(--bad); }
  .copy { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; padding: 0; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600; color: #ffffff; background: rgba(0, 0, 0, 0.6); }
  .tile.ok .box:hover .copy, .tile.ok .copy:focus-visible { display: block; }
  @media (hover: none) { .tile.ok .copy { display: block; top: auto; bottom: 0; height: auto; padding: 3px 4px; font-size: 11px; font-weight: 400; } .tile.ok .state { bottom: auto; top: 6px; } }
  .name { margin-top: 4px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .note { font-size: 11px; color: var(--bad); }
  .note:empty { display: none; }
  #error { color: var(--bad); margin-top: 12px; }
  #error:empty { display: none; }
</style>
</head>
<body>
  <label id="drop" class="disabled">
    Choose files or drop them here
    <small>Images up to ${megabytes('image/png')} MB and videos up to ${megabytes('video/mp4')} MB</small>
    <input id="file" type="file" accept="image/*,video/mp4" multiple />
  </label>
  <div id="files"></div>
  <div id="error"></div>
<script>
(function () {
  var BACKEND = ${JSON.stringify(backendUrl).replace(/</g, '\\u003c')};
  var nextId = 1;
  var pending = {};
  var sessionId = null;
  var uploaded = [];
  var busy = false;

  function send(message) { window.parent.postMessage(Object.assign({ jsonrpc: '2.0' }, message), '*'); }
  function request(method, params) {
    return new Promise(function (resolve, reject) {
      var id = nextId++;
      pending[id] = { resolve: resolve, reject: reject };
      send({ id: id, method: method, params: params });
    });
  }
  function notify(method, params) { send({ method: method, params: params }); }
  function resize() { notify('ui/notifications/size-changed', { height: document.body.offsetHeight }); }
  function wait(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

  var drop = document.getElementById('drop');
  var list = document.getElementById('files');
  var error = document.getElementById('error');
  function fail(message) { error.textContent = message; resize(); }

  function start(result) {
    var content = (result && result.structuredContent) || {};
    if (!content.sessionId) {
      fail(content.error || 'The upload widget could not be opened.');
      return;
    }
    sessionId = content.sessionId;
    drop.className = '';
  }

  window.addEventListener('message', function (event) {
    var data = event.data;
    if (event.source !== window.parent || !data || data.jsonrpc !== '2.0') return;
    if (data.id !== undefined && !data.method) {
      var waiting = pending[data.id];
      if (!waiting) return;
      delete pending[data.id];
      if (data.error) waiting.reject(new Error(data.error.message || 'The host rejected the request'));
      else waiting.resolve(data.result);
      return;
    }
    if (data.method === 'ui/notifications/tool-result') start(data.params);
    // Requests from the host (ui/resource-teardown, ping) need an answer
    if (data.id !== undefined && data.method) send({ id: data.id, result: {} });
  });

  function getTicket() {
    return request('tools/call', { name: 'uploadWidgetTicketTool', arguments: { sessionId: sessionId } }).then(function (result) {
      var content = (result && result.structuredContent) || {};
      if (!content.ticket) throw new Error(content.error || 'Could not get an upload ticket');
      return content.ticket;
    });
  }

  function readError(res) {
    return res.json().then(
      function (body) { return new Error(body.message || body.msg || 'Upload failed (' + res.status + ')'); },
      function () { return new Error('Upload failed (' + res.status + ')'); }
    );
  }

  function uploadFile(file, ticket) {
    var form = new FormData();
    form.append('file', file);
    return fetch(BACKEND + '/media-widget/upload?ticket=' + encodeURIComponent(ticket), { method: 'POST', body: form }).then(function (res) {
      if (!res.ok) return readError(res).then(function (err) { throw err; });
      return res.json();
    });
  }

  // Videos and images may be normalized after the upload, poll until they are usable
  function waitUntilReady(media, ticket, deadline) {
    if (media.status !== 'processing') return Promise.resolve(media);
    deadline = deadline || Date.now() + 15 * 60 * 1000;
    if (Date.now() > deadline) return Promise.reject(new Error('Processing is taking too long, check the media library later'));
    return wait(3000)
      .then(function () { return fetch(BACKEND + '/media-widget/status?ticket=' + encodeURIComponent(ticket)).catch(function () { return null; }); })
      .then(function (res) {
        if (!res) return waitUntilReady(media, ticket, deadline);
        // the ticket is short lived and a long video can outlive it
        if (res.status === 401) return getTicket().then(function (fresh) { return waitUntilReady(media, fresh, deadline); });
        if (!res.ok) return readError(res).then(function (err) { throw err; });
        return res.json().then(function (all) {
          var current = all.filter(function (p) { return p.id === media.id; })[0] || media;
          return waitUntilReady(current, ticket, deadline);
        });
      });
  }

  // The sandbox CSP blocks blob: urls and the uploads domain, so the preview is
  // decoded from the picked file and drawn on a canvas - no image url involved.
  // Anything that can't be decoded that way (videos) keeps the extension label
  function preview(file, box, label) {
    if (file.type.indexOf('image/') !== 0 || !window.createImageBitmap) return;
    window.createImageBitmap(file).then(function (bitmap) {
      var canvas = document.createElement('canvas');
      var side = Math.min(bitmap.width, bitmap.height);
      canvas.width = canvas.height = 192;
      canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 192, 192);
      if (bitmap.close) bitmap.close();
      box.replaceChild(canvas, label);
    }).catch(function () {});
  }

  // navigator.clipboard needs the host to grant clipboard-write to the iframe (requested
  // in the resource permissions); execCommand still works on a click where it doesn't
  function copyText(text) {
    var legacy = function () {
      var area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok ? Promise.resolve() : Promise.reject(new Error('copy'));
    };
    if (!navigator.clipboard || !navigator.clipboard.writeText) return legacy();
    return navigator.clipboard.writeText(text).catch(legacy);
  }

  function row(file) {
    var tile = document.createElement('div');
    var box = document.createElement('div');
    var label = document.createElement('span');
    var state = document.createElement('span');
    var name = document.createElement('div');
    var note = document.createElement('div');
    tile.className = 'tile';
    box.className = 'box';
    state.className = 'state';
    name.className = 'name';
    note.className = 'note';
    label.textContent = (file.name.split('.').pop() || 'file').slice(0, 5).toUpperCase();
    name.textContent = file.name;
    name.title = file.name;
    box.appendChild(label);
    box.appendChild(state);
    tile.appendChild(box);
    tile.appendChild(name);
    tile.appendChild(note);
    list.appendChild(tile);
    preview(file, box, label);
    return function (kind, text, path) {
      if (path) {
        var copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'copy';
        copy.textContent = 'Copy link';
        copy.addEventListener('click', function () {
          copyText(path).then(
            function () { copy.textContent = 'Copied'; },
            function () { copy.textContent = 'Copy failed'; }
          ).then(function () { setTimeout(function () { copy.textContent = 'Copy link'; }, 1500); });
        });
        box.appendChild(copy);
      }
      tile.className = 'tile ' + kind;
      state.textContent = kind === 'ok' ? '✓' : kind === 'bad' ? '✕' : text;
      state.title = text;
      note.textContent = kind === 'bad' ? text : '';
      resize();
    };
  }

  // Always the full list of this widget, not only the last batch: the model acts
  // on the latest message, so a later upload must not drop the earlier ones
  function report() {
    var summary = uploaded.map(function (p) { return p.name + ' (id: ' + p.id + ', path: ' + p.path + ')'; }).join(', ');
    // Silent context first, so the model has the ids even if the host defers the message.
    // A host that never answers it must not hold the message back
    return Promise.race([
      request('ui/update-model-context', {
        structuredContent: { sessionId: sessionId, media: uploaded },
        content: [{ type: 'text', text: 'Media uploaded with the upload widget: ' + summary }],
      }),
      wait(5000),
    ])
      .catch(function () {})
      .then(function () {
        return request('ui/message', {
          role: 'user',
          content: [{ type: 'text', text: 'Schedule ' + summary + ' to:' }],
        });
      })
      .catch(function () {});
  }

  function handle(files) {
    if (busy || !sessionId || !files.length) return;
    busy = true;
    drop.className = 'disabled';
    fail('');
    var done = [];
    getTicket()
      .then(function (ticket) {
        return files.reduce(function (chain, file) {
          var set = row(file);
          return chain.then(function () {
            set('', 'Uploading…');
            return uploadFile(file, ticket)
              .then(function (media) {
                if (media.status === 'processing') set('', 'Processing…');
                return waitUntilReady(media, ticket);
              })
              .then(function (media) {
                if (media.status === 'failed') throw new Error(media.processingError || 'Processing failed');
                var item = { id: media.id, path: media.path, name: media.originalName || file.name };
                uploaded.push(item);
                done.push(item);
                set('ok', 'Uploaded', media.path);
              })
              .catch(function (err) { set('bad', err.message || 'Upload failed'); });
          });
        }, Promise.resolve());
      })
      .catch(function (err) { fail(err.message || 'Upload failed'); })
      .then(function () {
        busy = false;
        drop.className = '';
        if (done.length) report();
      });
  }

  document.getElementById('file').addEventListener('change', function (e) {
    handle(Array.prototype.slice.call(e.target.files || []));
    e.target.value = '';
  });
  ['dragenter', 'dragover'].forEach(function (name) {
    drop.addEventListener(name, function (e) { e.preventDefault(); if (!busy && sessionId) drop.className = 'over'; });
  });
  drop.addEventListener('dragleave', function (e) { e.preventDefault(); if (!busy && sessionId) drop.className = ''; });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    if (!busy && sessionId) drop.className = '';
    handle(Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []));
  });

  ['dragover', 'drop'].forEach(function (name) {
    document.addEventListener(name, function (e) { e.preventDefault(); });
  });

  request('ui/initialize', {
    appInfo: { name: 'postiz-upload', version: '1.0.0' },
    appCapabilities: {},
    protocolVersion: '2026-01-26',
  }).then(
    function () { notify('ui/notifications/initialized', {}); resize(); },
    function () { fail('This app cannot display the upload widget.'); }
  );
})();
</script>
</body>
</html>`;
