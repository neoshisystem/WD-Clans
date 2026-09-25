'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  buildStaticDataBundle,
  serializeStaticDataBundle,
  serializeBrowserBundle
} = require('../src/static-data');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_CANONICAL_PATH = path.join(ROOT, 'examples/vertical-slice/canonical.json');
const DEFAULT_JSON_PATH = path.join(ROOT, 'site/data/ucs-vertical-slice.json');
const DEFAULT_BROWSER_PATH = path.join(ROOT, 'site/data/ucs-vertical-slice.js');

function readCanonical(canonicalPath = DEFAULT_CANONICAL_PATH) {
  return JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
}

function generateStaticVerticalSlice({
  canonicalPath = DEFAULT_CANONICAL_PATH,
  jsonPath = DEFAULT_JSON_PATH,
  browserPath = DEFAULT_BROWSER_PATH
} = {}) {
  const bundle = buildStaticDataBundle(readCanonical(canonicalPath));
  const json = serializeStaticDataBundle(bundle);
  const browser = serializeBrowserBundle(bundle);

  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(browserPath), { recursive: true });
  fs.writeFileSync(jsonPath, json, 'utf8');
  fs.writeFileSync(browserPath, browser, 'utf8');

  return { bundle, json, browser };
}

if (require.main === module) generateStaticVerticalSlice();

module.exports = {
  DEFAULT_CANONICAL_PATH,
  DEFAULT_JSON_PATH,
  DEFAULT_BROWSER_PATH,
  readCanonical,
  generateStaticVerticalSlice
};
