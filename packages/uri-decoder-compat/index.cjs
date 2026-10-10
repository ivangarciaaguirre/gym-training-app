// query-string 7 expects require('decode-uri-component') to be a callable function.
// The patched upstream decoder is ESM; expose its default export to that caller.
// Metro transforms ESM for mobile; Node 22.13+ supports synchronous require(ESM).
const decode = require('patched-uri-decoder').default;
module.exports = function decodeCompat(value) {
  // Preserve decode-uri-component 0.2's '+' handling before invoking the fixed scanner.
  return decode(typeof value === 'string' ? value.replace(/\+/g, ' ') : value);
};
