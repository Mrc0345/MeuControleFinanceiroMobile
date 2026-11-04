const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the actual service modules in Node, replacing only native storage.
// Transpilation supports the parameter properties used by the shared HTTP client.
exports.createLoader = ({ development = true, secureStore, platform = 'native' }) => {
  const cache = new Map();
  function load(filename) {
    const absolute = path.resolve(__dirname, '../..', filename);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (specifier) => {
      if (specifier === 'expo-secure-store') return secureStore;
      if (specifier.startsWith('.')) {
        const target = path.resolve(path.dirname(absolute), specifier);
        return load(platform === 'web' && fs.existsSync(`${target}.web.ts`) ? `${target}.web.ts` : `${target}.ts`);
      }
      return require(specifier);
    };
    new Function('require', 'module', 'exports', '__DEV__', output)(localRequire, module, module.exports, development);
    return module.exports;
  }
  return load;
};
