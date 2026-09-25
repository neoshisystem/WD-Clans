'use strict';

const crypto = require('node:crypto');

const { validateCanonicalModel } = require('./canonical');
const { ProjectionEngine, stableStringify } = require('./projection');

const STATIC_DATA_VERSION = '0.1';

function clone(value) {
  return structuredClone(value);
}

function collectProvenance(value, canonicalRefs, evidenceRefs) {
  if (Array.isArray(value)) {
    for (const item of value) collectProvenance(item, canonicalRefs, evidenceRefs);
    return;
  }

  if (!value || typeof value !== 'object') return;

  if (typeof value.canonical_ref === 'string') canonicalRefs.add(value.canonical_ref);
  if (Array.isArray(value.canonical_refs)) {
    for (const ref of value.canonical_refs) {
      if (typeof ref === 'string') canonicalRefs.add(ref);
    }
  }
  if (Array.isArray(value.evidence_refs)) {
    for (const ref of value.evidence_refs) {
      if (typeof ref === 'string') evidenceRefs.add(ref);
    }
  }

  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') collectProvenance(child, canonicalRefs, evidenceRefs);
  }
}

function buildStaticDataBundle(canonicalState, options = {}) {
  validateCanonicalModel(canonicalState);

  const readModel = new ProjectionEngine({
    projection_version: options.projection_version
  }).projectAll(canonicalState);

  const canonicalRefs = new Set();
  const evidenceRefs = new Set();
  collectProvenance(readModel, canonicalRefs, evidenceRefs);

  return {
    static_data_version: STATIC_DATA_VERSION,
    source: {
      type: 'canonical',
      schema_version: canonicalState.schema_version
    },
    read_model: clone(readModel),
    provenance: {
      canonical_refs: [...canonicalRefs].sort(),
      evidence_refs: [...evidenceRefs].sort()
    }
  };
}

function serializeStaticDataBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') {
    throw new Error('static data bundle must be an object');
  }
  return stableStringify(bundle) + '\n';
}

function serializeBrowserBundle(bundle) {
  return 'globalThis.UCS_STATIC_DATA = ' + stableStringify(bundle) + ';\n';
}

function hashStaticDataBundle(bundle) {
  return crypto.createHash('sha256').update(stableStringify(bundle), 'utf8').digest('hex');
}

module.exports = {
  STATIC_DATA_VERSION,
  buildStaticDataBundle,
  serializeStaticDataBundle,
  serializeBrowserBundle,
  hashStaticDataBundle
};
