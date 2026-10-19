export const CLIPPING_WIDGET_URI = 'ui://postiz/clipping';

// MCP Apps (SEP-1865) widget, same shape as the upload widget: a single
// self-contained HTML document in the host's sandboxed iframe. A chat model
// can't wait between two status calls, a page can: clippingTool result
// (clippingId) -> clippingWidgetTicketTool (ticket, through the host) ->
// GET /clipping-widget/status every few seconds -> report the clips back to the
// model once they are done. Only plain GETs, so the browser never sends a CORS
// preflight
export const clippingWidgetHtml = (backendUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root { color-scheme: light dark; --bg: #ffffff; --fg: #0e0e0e; --muted: #6b6b6b; --border: #d9d9d9; --accent: #612bd3; --ok: #1a7f37; --bad: #cf222e; }
  @media (prefers-color-scheme: dark) { :root { --bg: #1a1919; --fg: #ffffff; --muted: #9c9c9c; --border: #3a3a3a; --ok: #3fb950; --bad: #f85149; } }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 16px; background: var(--bg); color: var(--fg); font: 14px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  #title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #title:empty { display: none; }
  #steps { display: flex; gap: 6px; margin-top: 10px; }
  .step { flex: 1; min-width: 0; font-size: 11px; color: var(--muted); }
  .step i { display: block; height: 4px; border-radius: 2px; margin-bottom: 4px; background: var(--border); }
  .step.done i { background: var(--ok); }
  .step.now { color: var(--fg); }
  .step.now i { background: var(--accent); animation: pulse 1.2s ease-in-out infinite; }
  .step.bad i { background: var(--bad); }
  @keyframes pulse { 50% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) { .step.now i { animation: none; } }
  #clips { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; margin-top: 14px; }
  #clips:empty { display: none; }
  .tile { min-width: 0; }
  .box { position: relative; aspect-ratio: 9 / 16; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(127, 127, 127, 0.12); color: var(--muted); font-size: 12px; text-align: center; padding: 6px; }
  .box img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
  .tile.bad .box { border-color: var(--bad); }
  .actions { display: none; position: absolute; left: 0; right: 0; bottom: 0; }
  .tile.ok .actions { display: flex; }
  .actions button { flex: 1; border: 0; padding: 5px 4px; cursor: pointer; font: inherit; font-size: 11px; color: #ffffff; background: rgba(0, 0, 0, 0.65); }
  .actions button + button { border-left: 1px solid rgba(255, 255, 255, 0.25); }
  .name { margin-top: 4px; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .note { font-size: 11px; color: var(--bad); }
  .note:empty { display: none; }
  #error { color: var(--bad); margin-top: 12px; }
  #error:empty { display: none; }
</style>
</head>
<body>
  <div id="title"></div>
  <div id="steps"></div>
  <div id="clips"></div>
  <div id="error"></div>
<script>
(function () {
  var BACKEND = ${JSON.stringify(backendUrl).replace(/</g, '\\u003c')};
  var STEPS = [['analysing', 'Analysing'], ['transcribing', 'Transcribing'], ['picking', 'Picking clips'], ['rendering', 'Rendering'], ['completed', 'Done']];
  var nextId = 1;
  var pending = {};
  var clippingId = null;
  var started = false;
  // the host renders the widget again whenever the conversation is opened: only
  // a clipping this page has seen running is reported, never an old finished one
  var sawRunning = false;
  var refused = 0;
  function web(url) { return typeof url === 'string' && /^https?:[/][/]/i.test(url) ? url : null; }

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

  var title = document.getElementById('title');
  var steps = document.getElementById('steps');
  var list = document.getElementById('clips');
  var error = document.getElementById('error');
  function fail(message) { error.textContent = message; resize(); }

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
    return request('tools/call', { name: 'clippingWidgetTicketTool', arguments: { clippingId: clippingId } }).then(function (result) {
      var content = (result && result.structuredContent) || {};
      if (!content.ticket) throw new Error(content.error || 'Could not get a clipping ticket');
      return content.ticket;
    });
  }

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

  function renderSteps(status) {
    var failed = status === 'failed';
    var at = STEPS.map(function (p) { return p[0]; }).indexOf(status);
    steps.textContent = '';
    STEPS.forEach(function (p, index) {
      // a video with captions never goes through transcribing
      if (p[0] === 'transcribing' && status !== 'transcribing') return;
      var step = document.createElement('div');
      step.className = 'step' + (failed ? ' bad' : index < at || status === 'completed' ? ' done' : index === at ? ' now' : '');
      step.appendChild(document.createElement('i'));
      step.appendChild(document.createTextNode(failed && index === 0 ? 'Failed' : p[1]));
      steps.appendChild(step);
    });
  }

  function renderClips(clips) {
    list.textContent = '';
    clips.forEach(function (clip) {
      var tile = document.createElement('div');
      var box = document.createElement('div');
      var name = document.createElement('div');
      var note = document.createElement('div');
      tile.className = 'tile' + (clip.status === 'completed' ? ' ok' : clip.status === 'failed' ? ' bad' : '');
      box.className = 'box';
      name.className = 'name';
      note.className = 'note';
      box.appendChild(document.createTextNode(clip.status === 'completed' ? 'Ready' : clip.status === 'failed' ? 'Failed' : 'Rendering…'));
      if (web(clip.thumbnail)) {
        // the sandbox only loads images from the domains the resource asked for;
        // where the host refuses, the label underneath stays
        var img = document.createElement('img');
        img.alt = '';
        img.addEventListener('error', function () { if (img.parentNode) img.parentNode.removeChild(img); });
        img.src = clip.thumbnail;
        box.appendChild(img);
      }
      if (web(clip.path)) {
        var actions = document.createElement('div');
        var open = document.createElement('button');
        var copy = document.createElement('button');
        actions.className = 'actions';
        open.type = copy.type = 'button';
        open.textContent = 'Open';
        copy.textContent = 'Copy link';
        open.addEventListener('click', function () { request('ui/open-link', { url: clip.path }).catch(function () {}); });
        copy.addEventListener('click', function () {
          copyText(clip.path).then(
            function () { copy.textContent = 'Copied'; },
            function () { copy.textContent = 'Copy failed'; }
          ).then(function () { setTimeout(function () { copy.textContent = 'Copy link'; }, 1500); });
        });
        actions.appendChild(open);
        actions.appendChild(copy);
        box.appendChild(actions);
      }
      name.textContent = clip.title;
      name.title = clip.title;
      note.textContent = clip.status === 'failed' ? clip.error || 'Failed' : '';
      tile.appendChild(box);
      tile.appendChild(name);
      tile.appendChild(note);
      list.appendChild(tile);
    });
  }

  function render(clipping) {
    title.textContent = clipping.title || clipping.url || '';
    renderSteps(clipping.status);
    renderClips(clipping.clips || []);
    fail(clipping.status === 'failed' ? clipping.error || 'The clipping failed.' : '');
  }

  // Silent context first, so the model has the clips even if the host defers the
  // message. A host that never answers it must not hold the message back
  function report(clipping) {
    var ready = (clipping.clips || []).filter(function (p) { return p.status === 'completed'; });
    // Titles and errors come from somebody else's video, so neither is pushed to
    // the model from here: it gets ids and urls, and a fixed sentence in the
    // user's name. clippingStatusTool has the texts, marked as untrusted
    var text = clipping.status === 'failed'
      ? 'The clipping ' + clippingId + ' failed and the clipping minutes were given back.'
      : 'The clipping ' + clippingId + ' is done, ' + ready.length + ' clips are ready.';
    return Promise.race([
      request('ui/update-model-context', {
        structuredContent: { clippingId: clippingId, status: clipping.status, clips: ready.map(function (p) { return { id: p.id, mediaId: p.mediaId, path: p.path, thumbnail: p.thumbnail }; }) },
        content: [{ type: 'text', text: text + ' The clips are in structuredContent, clippingStatusTool has their titles and post texts.' }],
      }),
      wait(5000),
    ])
      .catch(function () {})
      .then(function () { return request('ui/message', { role: 'user', content: [{ type: 'text', text: text }] }); })
      .catch(function () {});
  }

  function poll(ticket, deadline) {
    if (Date.now() > deadline) { fail('This is taking longer than expected, ask for the clipping status later.'); return; }
    var again = function (next) { return wait(5000).then(function () { poll(next || ticket, deadline); }); };
    fetch(BACKEND + '/clipping-widget/status?ticket=' + encodeURIComponent(ticket) + (sawRunning ? '&seen=1' : ''))
      .catch(function () { return null; })
      .then(function (res) {
        // offline, a deploy, a rate limit: the clipping goes on, so does the widget
        if (!res || res.status >= 500 || res.status === 429) return again();
        // the ticket is short lived and a clipping outlives it; a ticket that is
        // refused again and again is not going to work
        if (res.status === 401) {
          if (++refused > 3) throw new Error('Could not read the clipping, ask for its status instead.');
          return getTicket().then(again, function () { return again(); });
        }
        if (!res.ok) throw new Error('Could not read the clipping (' + res.status + ')');
        refused = 0;
        return res.json().then(function (clipping) {
          render(clipping);
          if (clipping.status === 'completed' || clipping.status === 'failed') {
            // several widgets can watch one clipping (a reopened conversation):
            // the server lets exactly one of them report it
            if (clipping.report) report(clipping);
            return;
          }
          sawRunning = true;
          return wait(5000).then(function () { poll(ticket, deadline); });
        });
      })
      .catch(function (err) { fail(err.message || 'Could not read the clipping'); });
  }

  function start(result) {
    var content = (result && result.structuredContent) || {};
    if (!content.clippingId) {
      fail(content.error || 'The clipping could not be started.');
      return;
    }
    if (started) return;
    started = true;
    clippingId = content.clippingId;
    renderSteps('analysing');
    resize();
    getTicket().then(
      function (ticket) { poll(ticket, Date.now() + 90 * 60 * 1000); },
      function (err) { fail(err.message || 'Could not read the clipping'); }
    );
  }

  request('ui/initialize', {
    appInfo: { name: 'postiz-clipping', version: '1.0.0' },
    appCapabilities: {},
    protocolVersion: '2026-01-26',
  }).then(
    function () { notify('ui/notifications/initialized', {}); resize(); },
    function () { fail('This app cannot display the clipping widget.'); }
  );
})();
</script>
</body>
</html>`;
