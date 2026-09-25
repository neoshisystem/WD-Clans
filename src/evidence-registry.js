'use strict';

const crypto = require('node:crypto');

const REGISTRY_VERSION = '0.1';
const RESULTS = Object.freeze(['REGISTERED','IDEMPOTENT','CONFLICT','REJECTED']);
const SUBJECT_TYPES = Object.freeze([
  'SNAPSHOT_INPUT',
  'OBSERVATION',
  'FIELD_OBSERVATION',
  'RAW_EXTRACTION',
  'RAW_EXTRACTION_CAPTURE',
  'RESOLUTION_CASE'
]);

class EvidenceRegistryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'EvidenceRegistryError';
    this.code = code;
    this.details = details;
  }
}

function clone(value) {
  return structuredClone(value);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

function sortUnique(values) {
  return [...new Set(values)].sort();
}

function normalizeHash(input) {
  if (!isObject(input)) {
    throw new EvidenceRegistryError('INVALID_HASH', 'content_hash must be an object');
  }
  const algorithm = String(input.algorithm || '').trim().toLowerCase();
  const value = String(input.value || '').trim().toLowerCase();
  if (!algorithm || !value) {
    throw new EvidenceRegistryError('INVALID_HASH', 'content_hash requires algorithm and value');
  }
  if (algorithm === 'sha256' && !/^[a-f0-9]{64}$/.test(value)) {
    throw new EvidenceRegistryError(
      'INVALID_HASH',
      'sha256 content_hash.value must be exactly 64 hexadecimal characters'
    );
  }
  return { algorithm, value };
}

function normalizeArtifact(input) {
  if (!isObject(input)) {
    throw new EvidenceRegistryError('INVALID_ARTIFACT', 'artifact must be an object');
  }
  const artifact_id = String(input.artifact_id || '').trim();
  const artifact_type = String(input.artifact_type || '').trim();
  if (!artifact_id) throw new EvidenceRegistryError('INVALID_ARTIFACT', 'artifact_id is required');
  if (!artifact_type) throw new EvidenceRegistryError('INVALID_ARTIFACT', 'artifact_type is required');
  if (Object.prototype.hasOwnProperty.call(input, 'global_player_id')) {
    throw new EvidenceRegistryError('FORBIDDEN_GLOBAL_ID', 'Evidence Artifact cannot contain Global Player ID');
  }
  const output = {
    artifact_id,
    artifact_type,
    source_location: input.source_location == null ? null : String(input.source_location),
    content_hash: normalizeHash(input.content_hash)
  };
  if (input.metadata !== undefined) {
    if (!isObject(input.metadata)) {
      throw new EvidenceRegistryError('INVALID_METADATA', 'artifact metadata must be an object when supplied');
    }
    output.metadata = stableValue(input.metadata);
  }
  return stableValue(output);
}

function artifactRecordEquivalent(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function normalizeProvenance(input) {
  if (!isObject(input)) {
    throw new EvidenceRegistryError('INVALID_PROVENANCE', 'provenance relation must be an object');
  }
  const subject_type = String(input.subject_type || '').trim();
  const subject_id = String(input.subject_id || '').trim();
  const field_name = input.field_name == null ? null : String(input.field_name).trim();
  const evidence_refs = sortUnique(Array.isArray(input.evidence_refs)
    ? input.evidence_refs.map((ref) => String(ref || '').trim()).filter(Boolean)
    : []);
  if (!subject_type) throw new EvidenceRegistryError('INVALID_PROVENANCE', 'subject_type is required');
  if (!subject_id) throw new EvidenceRegistryError('INVALID_PROVENANCE', 'subject_id is required');
  if (field_name === '') throw new EvidenceRegistryError('INVALID_PROVENANCE', 'field_name cannot be empty');
  if (!evidence_refs.length) {
    throw new EvidenceRegistryError('INVALID_PROVENANCE', 'provenance relation requires at least one evidence reference');
  }
  const base = { subject_type, subject_id, field_name, evidence_refs };
  const provenance_id = String(input.provenance_id || '').trim() || 'PROV::' + sha256(base);
  return stableValue({ provenance_id, ...base });
}

function referenceIdSet(rawOrSnapshot) {
  const refs = new Set();
  if (!isObject(rawOrSnapshot)) return refs;
  const members = Array.isArray(rawOrSnapshot.members) ? rawOrSnapshot.members : [];
  for (const member of members) {
    for (const ref of member.evidence_refs || []) refs.add(ref);
    const fields = isObject(member.fields) ? member.fields : {};
    const provenance = isObject(member.field_provenance) ? member.field_provenance : {};
    for (const capture of Object.values(fields)) {
      const captures = Array.isArray(capture) ? capture : [capture];
      for (const item of captures) for (const ref of item?.evidence_refs || []) refs.add(ref);
    }
    for (const item of Object.values(provenance)) for (const ref of item?.evidence_refs || []) refs.add(ref);
  }
  return refs;
}

function declaredArtifactMap(container) {
  const map = new Map();
  if (!isObject(container?.source)) return map;
  const artifacts = Array.isArray(container.source.artifacts) ? container.source.artifacts : [];
  for (const artifact of artifacts) {
    const normalized = normalizeArtifact(artifact);
    if (map.has(normalized.artifact_id) && !artifactRecordEquivalent(map.get(normalized.artifact_id), normalized)) {
      throw new EvidenceRegistryError(
        'CONFLICTING_ARTIFACT_METADATA',
        'declared artifact_id has conflicting metadata: ' + normalized.artifact_id
      );
    }
    map.set(normalized.artifact_id, normalized);
  }
  if (container.source.artifact_id || container.source.primary_artifact_id) {
    const primaryId = container.source.artifact_id || container.source.primary_artifact_id;
    if (!map.has(primaryId) && container.source.content_hash) {
      map.set(primaryId, normalizeArtifact({
        artifact_id: primaryId,
        artifact_type: container.source.artifact_type,
        source_location: container.source.source_location ?? null,
        content_hash: container.source.content_hash
      }));
    }
  }
  return map;
}

function validateContainerAgainstRegistry(registry, container, label) {
  if (!registry || typeof registry.validateReference !== 'function') {
    throw new EvidenceRegistryError('INVALID_REGISTRY', 'a compatible Evidence Registry is required');
  }
  const declared = declaredArtifactMap(container);
  for (const artifact of declared.values()) {
    const check = registry.validateReference(artifact.artifact_id, artifact);
    if (!check.valid) {
      return {
        valid: false,
        reason: check.reason,
        artifact_id: artifact.artifact_id,
        message: check.message
      };
    }
  }
  if (container?.source?.artifact_id || container?.source?.primary_artifact_id) {
    const primaryId = container.source.artifact_id || container.source.primary_artifact_id;
    const check = registry.validateReference(primaryId);
    if (!check.valid) {
      return { valid: false, reason: check.reason, artifact_id: primaryId, message: check.message };
    }
  }
  for (const ref of referenceIdSet(container)) {
    const check = registry.validateReference(ref);
    if (!check.valid) {
      return { valid: false, reason: check.reason, artifact_id: ref, message: check.message };
    }
  }
  return { valid: true, scope: label };
}

function validateRawExtractionAgainstRegistry(registry, rawExtraction) {
  return validateContainerAgainstRegistry(registry, rawExtraction, 'RawExtraction');
}

function snapshotReferenceIdSet(input) {
  const refs = new Set();
  if (!isObject(input)) return refs;
  if (input.source?.artifact_id) refs.add(input.source.artifact_id);
  for (const artifact of input.source?.artifacts || []) refs.add(artifact.artifact_id);
  for (const member of input.members || []) {
    for (const ref of member.evidence_refs || []) refs.add(ref);
    for (const meta of Object.values(member.field_provenance || {})) {
      for (const ref of meta?.evidence_refs || []) refs.add(ref);
    }
  }
  return refs;
}

function validateSnapshotInputAgainstRegistry(registry, input) {
  if (!registry || typeof registry.validateReference !== 'function') {
    throw new EvidenceRegistryError('INVALID_REGISTRY', 'a compatible Evidence Registry is required');
  }
  for (const artifact of input.source?.artifacts || []) {
    const check = registry.validateReference(artifact.artifact_id, artifact);
    if (!check.valid) {
      return {
        valid: false,
        reason: check.reason,
        artifact_id: artifact.artifact_id,
        message: check.message
      };
    }
  }
  for (const ref of snapshotReferenceIdSet(input)) {
    const check = registry.validateReference(ref);
    if (!check.valid) {
      return { valid: false, reason: check.reason, artifact_id: ref, message: check.message };
    }
  }
  return { valid: true, snapshot_id: input.snapshot?.snapshot_id || null };
}

class EvidenceRegistryPort {
  registerArtifact() { throw new Error('EvidenceRegistryPort.registerArtifact() is not implemented'); }
  getArtifact() { throw new Error('EvidenceRegistryPort.getArtifact() is not implemented'); }
  hasArtifact() { throw new Error('EvidenceRegistryPort.hasArtifact() is not implemented'); }
  validateReference() { throw new Error('EvidenceRegistryPort.validateReference() is not implemented'); }
  registerProvenance() { throw new Error('EvidenceRegistryPort.registerProvenance() is not implemented'); }
  resolveReference() { throw new Error('EvidenceRegistryPort.resolveReference() is not implemented'); }
  listArtifacts() { throw new Error('EvidenceRegistryPort.listArtifacts() is not implemented'); }
  listProvenance() { throw new Error('EvidenceRegistryPort.listProvenance() is not implemented'); }
}

class InMemoryEvidenceRegistry extends EvidenceRegistryPort {
  constructor(initialState = {}) {
    super();
    this._artifacts = new Map();
    this._provenance = new Map();
    for (const artifact of initialState.artifacts || []) {
      const result = this.registerArtifact(artifact);
      if (result.result === 'REJECTED' || result.result === 'CONFLICT') {
        throw new EvidenceRegistryError(result.reason || 'INVALID_ARTIFACT', result.message || 'invalid initial artifact');
      }
    }
    if (initialState.provenance?.length) {
      const result = this.registerProvenance(initialState.provenance);
      if (result.result === 'REJECTED' || result.result === 'CONFLICT') {
        throw new EvidenceRegistryError(result.reason || 'INVALID_PROVENANCE', result.message || 'invalid initial provenance');
      }
    }
  }

  registerArtifact(input) {
    try {
      const artifact = normalizeArtifact(input);
      const existing = this._artifacts.get(artifact.artifact_id);
      if (!existing) {
        this._artifacts.set(artifact.artifact_id, clone(artifact));
        return {
          result: 'REGISTERED',
          artifact_id: artifact.artifact_id,
          state_changed: true,
          artifact: clone(artifact)
        };
      }
      if (existing.content_hash.value !== artifact.content_hash.value ||
          existing.content_hash.algorithm !== artifact.content_hash.algorithm) {
        return {
          result: 'CONFLICT',
          artifact_id: artifact.artifact_id,
          state_changed: false,
          reason: 'artifact_id_reused_with_different_content_hash'
        };
      }
      if (!artifactRecordEquivalent(existing, artifact)) {
        return {
          result: 'CONFLICT',
          artifact_id: artifact.artifact_id,
          state_changed: false,
          reason: 'artifact_id_reused_with_incompatible_metadata'
        };
      }
      return {
        result: 'IDEMPOTENT',
        artifact_id: artifact.artifact_id,
        state_changed: false,
        artifact: clone(existing)
      };
    } catch (error) {
      return {
        result: 'REJECTED',
        artifact_id: input?.artifact_id || null,
        state_changed: false,
        reason: error.code || 'invalid_artifact',
        message: error.message
      };
    }
  }

  getArtifact(artifactId) {
    const artifact = this._artifacts.get(String(artifactId || '').trim());
    return artifact ? clone(artifact) : null;
  }

  hasArtifact(artifactId) {
    return this._artifacts.has(String(artifactId || '').trim());
  }

  validateReference(artifactId, expectedArtifact = null) {
    const id = String(artifactId || '').trim();
    if (!id) return { valid: false, reason: 'INVALID_EVIDENCE_REFERENCE', message: 'evidence reference is empty' };
    const existing = this._artifacts.get(id);
    if (!existing) {
      return { valid: false, reason: 'UNKNOWN_EVIDENCE_REFERENCE', artifact_id: id, message: 'evidence artifact is not registered' };
    }
    if (expectedArtifact) {
      try {
        const expected = normalizeArtifact(expectedArtifact);
        if (!artifactRecordEquivalent(existing, expected)) {
          return {
            valid: false,
            reason: 'ARTIFACT_METADATA_CONFLICT',
            artifact_id: id,
            message: 'registered artifact metadata conflicts with supplied artifact metadata'
          };
        }
      } catch (error) {
        return {
          valid: false,
          reason: error.code || 'INVALID_ARTIFACT',
          artifact_id: id,
          message: error.message
        };
      }
    }
    return { valid: true, artifact_id: id, artifact: clone(existing) };
  }

  resolveReference(artifactId, expectedArtifact = null) {
    const check = this.validateReference(artifactId, expectedArtifact);
    if (!check.valid) {
      return {
        resolved: false,
        valid: false,
        reason: check.reason,
        artifact_id: check.artifact_id || String(artifactId || '').trim(),
        message: check.message
      };
    }
    return {
      resolved: true,
      valid: true,
      artifact_id: check.artifact_id,
      artifact: clone(check.artifact)
    };
  }

  registerProvenance(input) {
    const relations = Array.isArray(input) ? input : [input];
    try {
      const normalized = relations.map(normalizeProvenance);
      const deduped = new Map();
      for (const relation of normalized) {
        const existing = deduped.get(relation.provenance_id);
        if (existing && !artifactRecordEquivalent(existing, relation)) {
          return {
            result: 'CONFLICT',
            state_changed: false,
            reason: 'duplicate_provenance_id_with_conflicting_content'
          };
        }
        deduped.set(relation.provenance_id, relation);
      }
      const ordered = [...deduped.values()].sort((a, b) => a.provenance_id.localeCompare(b.provenance_id));

      // Preflight every reference and every existing relation before mutating any state.
      for (const relation of ordered) {
        for (const ref of relation.evidence_refs) {
          const reference = this.validateReference(ref);
          if (!reference.valid) {
            return {
              result: 'REJECTED',
              state_changed: false,
              reason: reference.reason,
              artifact_id: reference.artifact_id,
              message: reference.message
            };
          }
        }
        const existing = this._provenance.get(relation.provenance_id);
        if (existing && !artifactRecordEquivalent(existing, relation)) {
          return {
            result: 'CONFLICT',
            state_changed: false,
            reason: 'provenance_id_reused_with_conflicting_content',
            provenance_id: relation.provenance_id
          };
        }
      }

      const candidate = new Map(this._provenance);
      let changed = false;
      for (const relation of ordered) {
        if (!candidate.has(relation.provenance_id)) {
          candidate.set(relation.provenance_id, clone(relation));
          changed = true;
        }
      }
      if (changed) this._provenance = candidate;
      return {
        result: changed ? 'REGISTERED' : 'IDEMPOTENT',
        state_changed: changed,
        provenance_ids: ordered.map((relation) => relation.provenance_id)
      };
    } catch (error) {
      return {
        result: 'REJECTED',
        state_changed: false,
        reason: error.code || 'invalid_provenance',
        message: error.message
      };
    }
  }

  listArtifacts() {
    return [...this._artifacts.values()]
      .map(clone)
      .sort((a, b) => a.artifact_id.localeCompare(b.artifact_id));
  }

  listProvenance() {
    return [...this._provenance.values()]
      .map(clone)
      .sort((a, b) => a.provenance_id.localeCompare(b.provenance_id));
  }

  read() {
    return {
      registry_version: REGISTRY_VERSION,
      artifacts: this.listArtifacts(),
      provenance: this.listProvenance()
    };
  }
}

module.exports = {
  REGISTRY_VERSION,
  RESULTS,
  SUBJECT_TYPES,
  EvidenceRegistryError,
  EvidenceRegistryPort,
  InMemoryEvidenceRegistry,
  validateRawExtractionAgainstRegistry,
  validateSnapshotInputAgainstRegistry,
  stableStringify
};
