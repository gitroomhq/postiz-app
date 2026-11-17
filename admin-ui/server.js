const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const httpProxy = require('http-proxy');
const path = require('path');

const credentialsRouter = require('./routes/credentials');
const healthRouter = require('./routes/health');
const dockerRouter = require('./routes/docker-ops');
const aiContentRouter = require('./routes/ai-content');
const { bootstrapOrResolve, can } = require('./access-control');
const { router: accessRouter, requirePermission, requireOwner } = require('./routes/access');
const workspaceRouter = require('./routes/workspace');
const analyticsRouter = require('./routes/analytics');
const growthRouter = require('./routes/growth');
const facebookAdsRouter = require('./routes/facebook-ads');

const app = express();
const PORT = process.env.PORT || 3001;
const POSTIZ_URL = process.env.POSTIZ_INTERNAL_URL || 'http://postiz:5000';

const proxy = httpProxy.createProxyServer({ changeOrigin: true, ws: true });
proxy.on('error', (err, req, res) => {
  if (res && !res.headersSent && typeof res.status === 'function') {
    res.status(502).json({ error: 'Postiz unreachable: ' + err.message });
  }
});

// Forward Postiz response headers (JWT on login)
proxy.on('proxyRes', (proxyRes, req, res) => {
  const authHeader = proxyRes.headers['auth'];
  if (authHeader) res.setHeader('x-postiz-auth', authHeader);
});

function injectAuth(req) {
  const auth = req.headers['auth'] || req.cookies?.auth;
  if (auth) req.headers['auth'] = auth;
}

function proxyToPostiz(req, res) {
  injectAuth(req);
  proxy.web(req, res, { target: POSTIZ_URL });
}

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
// express.json() only on admin routes — applying it globally consumes the body
// stream before http-proxy can forward POST requests to Postiz
async function resolvePostizPrincipal(req, res, next) {
  const token = req.headers.auth || req.cookies?.auth;
  if (!token) return res.status(401).json({ error: 'Sign in with Postiz before using the admin workspace.' });
  try {
    const response = await fetch(`${POSTIZ_URL}/api/user/self`, { headers: { auth: token } });
    if (!response.ok) return res.status(401).json({ error: 'Your Postiz session has expired. Please sign in again.' });
    const payload = await response.json();
    const user = payload?.user || payload?.data || payload;
    if (!user?.email) return res.status(401).json({ error: 'Postiz did not return a valid user profile.' });
    req.postizUrl = POSTIZ_URL;
    req.principal = { token, user, member: bootstrapOrResolve(user) };
    next();
  } catch (error) {
    res.status(502).json({ error: `Unable to validate the Postiz session: ${error.message}` });
  }
}

app.use('/api', (req, res, next) => {
  if (req.path === '/facebook-ads/oauth/callback') return next();
  if (req.path === '/ai/generate' || req.path === '/ai/rewrite') return next();
  return resolvePostizPrincipal(req, res, next);
});
app.use('/api/access', express.json(), accessRouter);
app.use('/api/workspace', express.json(), workspaceRouter);
app.use('/api/analytics', analyticsRouter);
// Campaign creation is a JSON POST. Without this parser req.body is empty,
// making a filled-in campaign topic look missing to the route handler.
app.use('/api/growth', express.json(), growthRouter);
app.use('/api/credentials', express.json(), requireOwner, credentialsRouter);
app.use('/api/health', requirePermission('workspace.view'), healthRouter);
app.use('/api/docker', express.json(), requireOwner, dockerRouter);
app.use('/api/ai', express.json(), (req, res, next) => {
  if (req.path === '/generate' || req.path === '/rewrite') return next();
  return requirePermission('ai.generate')(req, res, next);
}, aiContentRouter);
app.use('/api/facebook-ads', (req, res, next) => {
  if (req.path === '/oauth/callback') return next();
  return requirePermission('workspace.view')(req, res, next);
}, express.json(), facebookAdsRouter);

// Unmatched /api/* is Postiz API (used by the embedded calendar iframe).
app.use('/api', (req, res) => proxyToPostiz(req, res));

// Proxy /postiz/* → Postiz container (strip the /postiz prefix)
app.use('/postiz', (req, res, next) => {
  if (req.path.startsWith('/_next') || req.path.startsWith('/uploads') || req.path.match(/\.(js|css|map|woff2?|png|jpg|svg|ico)$/)) {
    return next();
  }
  // Login and registration are the only unauthenticated Postiz proxy requests.
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/can-register')) return next();
  return resolvePostizPrincipal(req, res, () => {
    const member = req.principal.member;
    if (!member || !member.active) return res.status(403).json({ error: 'This Postiz account is not assigned to the workspace.' });
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const isIntegration = req.path.includes('/integrations');
    const permission = isIntegration ? (write ? 'channels.manage' : 'channels.view') : (write ? 'posts.edit' : 'posts.view');
    if (!can(member, permission)) return res.status(403).json({ error: `Your ${member.role} role cannot perform this action.` });
    next();
  });
}, (req, res) => proxyToPostiz(req, res));

// Next.js assets and Postiz app routes used by the in-admin iframe.
['/_next', '/uploads', '/launches', '/civic-desk', '/plugs', '/media', '/billing', '/third-party', '/agents', '/auth', '/integrations', '/oauth', '/provider', '/modal'].forEach((prefix) => {
  app.use(prefix, (req, res) => proxyToPostiz(req, res));
});

// Serve Vite build in production
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = http.createServer(app);
server.on('upgrade', (req, socket, head) => {
  const url = req.url || '';
  if (url.startsWith('/_next') || url.startsWith('/postiz') || url.startsWith('/launches')) {
    injectAuth(req);
    proxy.ws(req, socket, head, { target: POSTIZ_URL });
  } else {
    socket.destroy();
  }
});
server.listen(PORT, () => console.log(`Admin UI → http://localhost:${PORT}`));