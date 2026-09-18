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
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 6px 0; display: flex; gap: 8px; align-items: baseline; }
  li:first-child { margin-top: 12px; }
  li .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  li .state { color: var(--muted); }
  li.ok .state { color: var(--ok); }
  li.bad .state { color: var(--bad); white-space: normal; }
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
  <ul id="files"></ul>
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

  function row(file) {
    var li = document.createElement('li');
    var name = document.createElement('span');
    var state = document.createElement('span');
    name.className = 'name';
    name.textContent = file.name;
    state.className = 'state';
    li.appendChild(name);
    li.appendChild(state);
    list.appendChild(li);
    return function (kind, text) {
      li.className = kind;
      state.textContent = text;
      resize();
    };
  }

  function report(done) {
    var summary = done.map(function (p) { return p.name + ' (id: ' + p.id + ', path: ' + p.path + ')'; }).join(', ');
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
          content: [{ type: 'text', text: 'I uploaded ' + summary + ' with the upload widget.' }],
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
                set('ok', 'Uploaded');
              })
              .catch(function (err) { set('bad', err.message || 'Upload failed'); });
          });
        }, Promise.resolve());
      })
      .catch(function (err) { fail(err.message || 'Upload failed'); })
      .then(function () {
        busy = false;
        drop.className = '';
        if (done.length) report(done);
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
