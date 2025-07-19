// Avoid loading node-fetch, because that triggers
// `require('punycode')`, which is deprecated.

// The right fix:
// https://github.com/dropbox/dropbox-sdk-js/issues/1143

import Module from "module";
const realRequire = Module.prototype.require;

const newRequire = function (
  this: unknown,
  id: string,
): ReturnType<typeof realRequire> {
  if (id === "node-fetch") return globalThis.fetch;

  return realRequire.call(this, id);
};

for (const name of Object.getOwnPropertyNames(
  realRequire,
) as (keyof typeof realRequire)[]) {
  Object.defineProperty(newRequire, name, { value: realRequire[name] });
}

Module.prototype.require = newRequire as typeof realRequire;
