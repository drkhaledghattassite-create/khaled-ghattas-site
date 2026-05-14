// Empty stub used by Turbopack's resolveAlias to shim Node-only deps that
// the bundler must ignore in browser bundles (currently: `canvas`, an
// optional pdfjs-dist dep we never use because the reader is client-only).
// Webpack accepts `alias: { canvas: false }`; Turbopack needs a real file.
module.exports = {}
