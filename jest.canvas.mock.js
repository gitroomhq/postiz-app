// jsdom optionally renders <canvas> through the native canvas package, which is
// not installed and is not needed by anything under test. Without this stand-in
// jsdom refuses to load.
module.exports = {};
