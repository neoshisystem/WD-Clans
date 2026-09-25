
'use strict';

const fs = require('node:fs');
const { validate: validateSnapshotInput } = require('./validate-snapshot');

const RAW_EXTRACTION_SCHEMA_VERSION = '0.1';

const FIELD_STATUSES = Object.freeze([
  'OBSERVED',
  'NOT_VISIBLE',
  'UNKNOWN',
  'AMBIGUOUS',
  'CONFLICTING'
]);

const INTERPRETATION_STATUSES = Object.freeze([
  'NONE',
  'INTERPRETED'
]);

const ADAPTER_RESULTS = Object.freeze([
  'READY',
  'BLOCKED'
]);

const REQUIRED_MEMBER_FIELDS = Object.freeze([
  'rank',
  'display_name',
  'stage',
  'weapons',
  'total_kills',
  'lifetime_medals',
  'current_league_clan_medals',
  'profile_total_clan_medal_count'
]);

const OPTIONAL_MEMBER_FIELDS = Object.freeze([
  'role',
  'last_online_utc'
]);

const INTEGER_FIELDS = new Set([
  'rank',
  'stage',
  'total_kills',
  'current_league_clan_medals',
  'profile_total_clan_medal_count'
]);

const DATE_FIELDS = new Set(['last_online_utc']);
const TEXT_FIELDS = new Set(['display_name', 'role']);

class SourceAdapterError extends Error {
  constructor(code, path, message, details = {}) {
    super(message);
    this.name = 'SourceAdapterError';
    this.code = code;
    this.path = path;
    this.details = details;
  }
}

function clone(value) {
  return structuredClone(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sortUnique(values) {
  return [...new Set(values)].sort();
}

function normalizeDigits(value) {
  return String(value)
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
}

function parseInteger(value, path) {
  if (Number.isInteger(value)) return value;
  if (typeof value !== 'string') {
    throw new SourceAdapterError(
      'NORMALIZATION_ERROR',
      path,
      'integer field must contain an integer or an integer-formatted string'
    );
  }

  const normalized = normalizeDigits(value)
    .trim()
    .replace(/[,_\u066C\u00A0\u202F\s]/g, '');

  if (!/^-?\d+$/.test(normalized)) {
    throw new SourceAdapterError(
      'NORMALIZATION_ERROR',
      path,
      'value is not an unambiguous integer representation'
    );
  }
  return Number(normalized);
}

function normalizeIntegerCapture(capture, path) {
  const computed = parseInteger(capture.raw_value, path);
  const normalized = hasOwn(capture, 'normalized_value')
    ? parseInteger(capture.normalized_value, path + '.normalized_value')
    : computed;

  if (normalized !== computed) {
    throw new SourceAdapterError(
      'NORMALIZATION_CONFLICT',
      path,
      'normalized_value conflicts with deterministic normalization of raw_value'
    );
  }
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new SourceAdapterError(
      'INVALID_CORE_VALUE',
      path,
      'normalized integer must be a non-negative safe integer'
    );
  }
  return normalized;
}

function normalizeTextCapture(capture, path) {
  if (typeof capture.raw_value !== 'string') {
    throw new SourceAdapterError(
      'NORMALIZATION_ERROR',
      path,
      'text field must contain a string'
    );
  }

  const computed = capture.raw_value.trim();
  const normalized = hasOwn(capture, 'normalized_value')
    ? String(capture.normalized_value).trim()
    : computed;

  if (normalized !== computed) {
    throw new SourceAdapterError(
      'NORMALIZATION_CONFLICT',
      path,
      'normalized text differs from deterministic trim normalization'
    );
  }
  return normalized;
}

function normalizeDateCapture(capture, path) {
  if (typeof capture.raw_value !== 'string') {
    throw new SourceAdapterError(
      'NORMALIZATION_ERROR',
      path,
      'date-time field must contain a string'
    );
  }

  const computed = capture.raw_value.trim();
  const normalized = hasOwn(capture, 'normalized_value')
    ? String(capture.normalized_value).trim()
    : computed;

  if (normalized !== computed) {
    throw new SourceAdapterError(
      'NORMALIZATION_CONFLICT',
      path,
      'date-time normalization must be a deterministic pass-through at this boundary'
    );
  }

  if (Number.isNaN(Date.parse(normalized))) {
    throw new SourceAdapterError(
      'INVALID_DATE_TIME',
      path,
      'date-time is not parseable'
    );
  }
  return normalized;
}

function normalizeIntegerMapCapture(capture, path) {
  if (!isObject(capture.raw_value)) {
    throw new SourceAdapterError(
      'NORMALIZATION_ERROR',
      path,
      'map field must contain an object'
    );
  }

  const computed = {};
  for (const key of Object.keys(capture.raw_value).sort()) {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      throw new SourceAdapterError(
        'NORMALIZATION_ERROR',
        path,
        'map contains an empty key'
      );
    }
    if (hasOwn(computed, normalizedKey)) {
      throw new SourceAdapterError(
        'NORMALIZATION_CONFLICT',
        path,
        'map contains keys that collapse to the same normalized key: ' + normalizedKey
      );
    }
    computed[normalizedKey] = parseInteger(capture.raw_value[key], path + '.' + key);
    if (!Number.isSafeInteger(computed[normalizedKey]) || computed[normalizedKey] < 0) {
      throw new SourceAdapterError(
        'INVALID_CORE_VALUE',
        path + '.' + key,
        'normalized map value must be a non-negative safe integer'
      );
    }
  }

  if (hasOwn(capture, 'normalized_value')) {
    if (!isObject(capture.normalized_value)) {
      throw new SourceAdapterError(
        'NORMALIZATION_CONFLICT',
        path,
        'normalized_value for a map must be an object'
      );
    }
    const supplied = {};
    for (const key of Object.keys(capture.normalized_value).sort()) {
      supplied[key.trim()] = parseInteger(capture.normalized_value[key], path + '.normalized_value.' + key);
    }
    if (JSON.stringify(supplied) !== JSON.stringify(computed)) {
      throw new SourceAdapterError(
        'NORMALIZATION_CONFLICT',
        path,
        'normalized_value conflicts with deterministic normalization of raw map'
      );
    }
  }

  return computed;
}

function validateFieldCapture(capture, path) {
  if (!isObject(capture)) {
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION', path, 'field capture must be an object');
  }

  if (!FIELD_STATUSES.includes(capture.status)) {
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION', path + '.status', 'unsupported field status');
  }

  const interpretation = capture.interpretation || 'NONE';
  if (!INTERPRETATION_STATUSES.includes(interpretation)) {
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION', path + '.interpretation', 'unsupported interpretation status');
  }

  const refs = capture.evidence_refs || [];
  if (!Array.isArray(refs) || refs.length === 0) {
    throw new SourceAdapterError(
      'INVALID_RAW_EXTRACTION',
      path + '.evidence_refs',
      'field capture requires at least one evidence reference'
    );
  }

  if (capture.status === 'OBSERVED') {
    if (!hasOwn(capture, 'raw_value') || capture.raw_value === null || capture.raw_value === undefined) {
      throw new SourceAdapterError(
        'MISSING_RAW_VALUE',
        path + '.raw_value',
        'OBSERVED field must preserve raw_value'
      );
    }
  } else if (
    (hasOwn(capture, 'raw_value') && capture.raw_value !== null) ||
    (hasOwn(capture, 'normalized_value') && capture.normalized_value !== null)
  ) {
    throw new SourceAdapterError(
      'INVALID_RAW_EXTRACTION',
      path,
      'non-OBSERVED field cannot contain value payloads'
    );
  }

  return true;
}

function validateRawExtraction(raw) {
  if (!isObject(raw)) {
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION', '$', 'raw extraction must be an object');
  }
  if (raw.extraction_schema_version !== RAW_EXTRACTION_SCHEMA_VERSION) {
    throw new SourceAdapterError(
      'UNSUPPORTED_RAW_EXTRACTION_VERSION',
      '$.extraction_schema_version',
      'unsupported raw extraction schema version'
    );
  }
  if (!raw.extraction_id) {
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION', '$.extraction_id', 'extraction_id is required');
  }
  if (!isObject(raw.source)) {
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION', '$.source', 'source is required');
  }

  const artifacts = raw.source.artifacts;
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    throw new SourceAdapterError(
      'INVALID_RAW_EXTRACTION',
      '$.source.artifacts',
      'at least one source artifact is required'
    );
  }

  const artifactIds = new Set();
  for (const [index, artifact] of artifacts.entries()) {
    const path = '$.source.artifacts[' + index + ']';
    if (!isObject(artifact) || !artifact.artifact_id || artifactIds.has(artifact.artifact_id)) {
      throw new SourceAdapterError('INVALID_RAW_EXTRACTION', path, 'artifact_id must be present and unique');
    }
    artifactIds.add(artifact.artifact_id);
    if (!artifact.artifact_type) {
      throw new SourceAdapterError('INVALID_RAW_EXTRACTION', path, 'artifact_type is required');
    }
    if (
      !isObject(artifact.content_hash) ||
      !artifact.content_hash.algorithm ||
      !artifact.content_hash.value
    ) {
      throw new SourceAdapterError(
        'INVALID_RAW_EXTRACTION',
        path + '.content_hash',
        'immutable artifact hash is required'
      );
    }
    if (artifact.content_hash.algorithm.toLowerCase() !== 'sha256') {
      throw new SourceAdapterError(
        'INVALID_RAW_EXTRACTION',
        path + '.content_hash.algorithm',
        'v0.1 requires SHA-256 artifact hashing'
      );
    }
  }

  if (!artifactIds.has(raw.source.primary_artifact_id)) {
    throw new SourceAdapterError(
      'INVALID_RAW_EXTRACTION',
      '$.source.primary_artifact_id',
      'primary_artifact_id must reference a declared artifact'
    );
  }

  if (!Array.isArray(raw.members)) {
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION', '$.members', 'members is required');
  }

  const memberKeys = new Set();
  for (const [index, member] of raw.members.entries()) {
    const path = '$.members[' + index + ']';
    if (!isObject(member) || !member.source_member_key) {
      throw new SourceAdapterError('INVALID_RAW_EXTRACTION', path, 'source_member_key is required');
    }
    if (memberKeys.has(member.source_member_key)) {
      throw new SourceAdapterError(
        'DUPLICATE_SOURCE_MEMBER_KEY',
        path + '.source_member_key',
        'source_member_key must be unique within an extraction'
      );
    }
    memberKeys.add(member.source_member_key);

    if (!isObject(member.fields)) {
      throw new SourceAdapterError('INVALID_RAW_EXTRACTION', path + '.fields', 'fields is required');
    }

    for (const fieldName of REQUIRED_MEMBER_FIELDS) {
      if (!hasOwn(member.fields, fieldName)) {
        throw new SourceAdapterError(
          'MISSING_REQUIRED_FIELD_CAPTURE',
          path + '.fields.' + fieldName,
          'required field capture is missing'
        );
      }
      validateFieldCapture(member.fields[fieldName], path + '.fields.' + fieldName);
    }

    for (const fieldName of OPTIONAL_MEMBER_FIELDS) {
      if (hasOwn(member.fields, fieldName)) {
        validateFieldCapture(member.fields[fieldName], path + '.fields.' + fieldName);
      }
    }

    const memberEvidence = member.evidence_refs || [];
    if (!Array.isArray(memberEvidence)) {
      throw new SourceAdapterError(
        'INVALID_RAW_EXTRACTION',
        path + '.evidence_refs',
        'evidence_refs must be an array'
      );
    }
    for (const ref of memberEvidence) {
      if (!artifactIds.has(ref)) {
        throw new SourceAdapterError(
          'UNKNOWN_EVIDENCE_REF',
          path + '.evidence_refs',
          'member evidence reference is not declared in source.artifacts'
        );
      }
    }

    if (member.source_identity !== undefined) {
      if (!isObject(member.source_identity)) {
        throw new SourceAdapterError(
          'INVALID_RAW_EXTRACTION',
          path + '.source_identity',
          'source_identity must be an object'
        );
      }
      const status = member.source_identity.status || 'UNKNOWN';
      if (!['OBSERVED', 'AMBIGUOUS', 'UNKNOWN'].includes(status)) {
        throw new SourceAdapterError(
          'INVALID_RAW_EXTRACTION',
          path + '.source_identity.status',
          'unsupported source identity status'
        );
      }
      if (status === 'OBSERVED' && (!member.source_identity.source_system || !member.source_identity.source_identity_id)) {
        throw new SourceAdapterError(
          'INVALID_RAW_EXTRACTION',
          path + '.source_identity',
          'OBSERVED source identity requires source_system and source_identity_id'
        );
      }
      if (hasOwn(member.source_identity, 'global_player_id')) {
        throw new SourceAdapterError(
          'FORBIDDEN_GLOBAL_ID',
          path + '.source_identity.global_player_id',
          'RawExtraction must never contain a Global Player ID'
        );
      }
    }
  }

  return {
    valid: true,
    extraction_id: raw.extraction_id,
    artifact_count: artifacts.length,
    member_count: raw.members.length
  };
}

function requiredObserved(capture, path) {
  if (capture.status !== 'OBSERVED') {
    throw new SourceAdapterError(
      'BLOCKED_REQUIRED_VALUE',
      path + '.status',
      'required SnapshotInput value is not deterministically observable',
      { status: capture.status }
    );
  }
  if ((capture.interpretation || 'NONE') !== 'NONE') {
    throw new SourceAdapterError(
      'INTERPRETATION_NOT_ALLOWED',
      path + '.interpretation',
      'interpreted values cannot cross the RawExtraction -> SnapshotInput boundary'
    );
  }
  return capture;
}

function captureEvidenceRefs(member) {
  const refs = [...(member.evidence_refs || [])];
  for (const capture of Object.values(member.fields)) {
    if (capture && Array.isArray(capture.evidence_refs)) refs.push(...capture.evidence_refs);
  }
  return sortUnique(refs);
}

function resolveSourceIdentity(member, path) {
  const sourceIdentity = member.source_identity;
  if (!sourceIdentity || sourceIdentity.status !== 'OBSERVED') return undefined;

  const sourceSystem = String(sourceIdentity.source_system).trim();
  const sourceIdentityId = String(sourceIdentity.source_identity_id).trim();
  if (!sourceSystem || !sourceIdentityId) {
    throw new SourceAdapterError(
      'INVALID_SOURCE_IDENTITY',
      path,
      'observed source identity must contain non-empty values'
    );
  }
  return {
    source_system: sourceSystem,
    source_identity_id: sourceIdentityId
  };
}

function fieldValue(member, fieldName, path, adapter) {
  const capture = requiredObserved(member.fields[fieldName], path);
  if (INTEGER_FIELDS.has(fieldName)) return adapter.normalizeField(fieldName, capture, path);
  if (TEXT_FIELDS.has(fieldName)) return adapter.normalizeField(fieldName, capture, path);
  if (fieldName === 'weapons' || fieldName === 'lifetime_medals') {
    return adapter.normalizeField(fieldName, capture, path);
  }
  if (DATE_FIELDS.has(fieldName)) return adapter.normalizeField(fieldName, capture, path);
  throw new SourceAdapterError(
    'UNSUPPORTED_FIELD',
    path,
    'no normalizer registered for field: ' + fieldName
  );
}

class SourceAdapter {
  toSnapshotInput() {
    throw new Error('SourceAdapter.toSnapshotInput() is not implemented');
  }
}

class RawExtractionSourceAdapter extends SourceAdapter {
  constructor(options = {}) {
    super();
    this._normalizers = {
      ...{
        rank: normalizeIntegerCapture,
        stage: normalizeIntegerCapture,
        total_kills: normalizeIntegerCapture,
        current_league_clan_medals: normalizeIntegerCapture,
        profile_total_clan_medal_count: normalizeIntegerCapture,
        display_name: normalizeTextCapture,
        role: normalizeTextCapture,
        last_online_utc: normalizeDateCapture,
        weapons: normalizeIntegerMapCapture,
        lifetime_medals: normalizeIntegerMapCapture
      },
      ...(options.normalizers || {})
    };
  }

  normalizeField(fieldName, capture, path) {
    const normalizer = this._normalizers[fieldName];
    if (typeof normalizer !== 'function') {
      throw new SourceAdapterError(
        'UNSUPPORTED_FIELD',
        path,
        'no deterministic normalizer registered for field: ' + fieldName
      );
    }
    return normalizer(capture, path);
  }

  toSnapshotInput(rawExtraction, authorityContext) {
    validateRawExtraction(rawExtraction);

    if (!isObject(authorityContext)) {
      throw new SourceAdapterError(
        'INVALID_CONTEXT',
        '$.authorityContext',
        'authorityContext is required'
      );
    }

    if (authorityContext.project_id !== 'UCS') {
      throw new SourceAdapterError(
        'INVALID_CONTEXT',
        '$.authorityContext.project_id',
        'project_id must be UCS'
      );
    }

    const snapshot = authorityContext.snapshot;
    const league = authorityContext.league;
    if (!isObject(snapshot) || !snapshot.snapshot_id || !Number.isInteger(snapshot.sequence)) {
      throw new SourceAdapterError(
        'INVALID_CONTEXT',
        '$.authorityContext.snapshot',
        'snapshot identity/sequence context is required and is never inferred from source filenames'
      );
    }
    if (!isObject(league) || !league.league_id || !league.starts_at_utc || !league.ends_at_utc) {
      throw new SourceAdapterError(
        'INVALID_CONTEXT',
        '$.authorityContext.league',
        'league identity/boundary context is required'
      );
    }
    if (!authorityContext.clan_id) {
      throw new SourceAdapterError(
        'INVALID_CONTEXT',
        '$.authorityContext.clan_id',
        'clan_id context is required'
      );
    }

    const primaryArtifact = rawExtraction.source.artifacts.find(
      (artifact) => artifact.artifact_id === rawExtraction.source.primary_artifact_id
    );

    const members = rawExtraction.members.map((member, index) => {
      const path = '$.members[' + index + ']';
      const output = {
        source_member_key: member.source_member_key,
        rank: fieldValue(member, 'rank', path + '.fields.rank', this),
        display_name: fieldValue(member, 'display_name', path + '.fields.display_name', this),
        role: null,
        stage: fieldValue(member, 'stage', path + '.fields.stage', this),
        weapons: fieldValue(member, 'weapons', path + '.fields.weapons', this),
        total_kills: fieldValue(member, 'total_kills', path + '.fields.total_kills', this),
        lifetime_medals: fieldValue(member, 'lifetime_medals', path + '.fields.lifetime_medals', this),
        current_league_clan_medals: fieldValue(
          member,
          'current_league_clan_medals',
          path + '.fields.current_league_clan_medals',
          this
        ),
        profile_total_clan_medal_count: fieldValue(
          member,
          'profile_total_clan_medal_count',
          path + '.fields.profile_total_clan_medal_count',
          this
        ),
        last_online_utc: null,
        evidence_refs: captureEvidenceRefs(member)
      };

      if (member.fields.role && member.fields.role.status === 'OBSERVED') {
        output.role = fieldValue(member, 'role', path + '.fields.role', this);
      }

      if (member.fields.last_online_utc && member.fields.last_online_utc.status === 'OBSERVED') {
        output.last_online_utc = fieldValue(
          member,
          'last_online_utc',
          path + '.fields.last_online_utc',
          this
        );
      }

      const sourceIdentity = resolveSourceIdentity(
        member,
        path + '.source_identity'
      );
      if (sourceIdentity) output.source_identity = sourceIdentity;

      return output;
    });

    const snapshotInput = {
      project_id: authorityContext.project_id,
      clan_id: authorityContext.clan_id,
      schema_version: '0.1',
      snapshot: clone(snapshot),
      league: clone(league),
      source: {
        artifact_id: primaryArtifact.artifact_id,
        artifact_type: primaryArtifact.artifact_type,
        content_hash: clone(primaryArtifact.content_hash)
      },
      members
    };

    try {
      validateSnapshotInput(snapshotInput);
    } catch (error) {
      throw new SourceAdapterError(
        'SNAPSHOT_INPUT_CONTRACT_INVALID',
        '$.snapshotInput',
        error.message
      );
    }

    return clone(snapshotInput);
  }
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

if (require.main === module) {
  const command = process.argv[2];
  const file = process.argv[3];
  if (command !== '--validate' || !file) {
    console.error('usage: node src/source-adapter.js --validate <raw-extraction.json>');
    process.exitCode = 1;
  } else {
    try {
      console.log(JSON.stringify(validateRawExtraction(loadJson(file)), null, 2));
    } catch (error) {
      console.error('RAW EXTRACTION INVALID: ' + error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = {
  RAW_EXTRACTION_SCHEMA_VERSION,
  FIELD_STATUSES,
  INTERPRETATION_STATUSES,
  ADAPTER_RESULTS,
  REQUIRED_MEMBER_FIELDS,
  OPTIONAL_MEMBER_FIELDS,
  SourceAdapterError,
  validateRawExtraction,
  RawExtractionSourceAdapter
};
