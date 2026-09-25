
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { validate: validateSnapshotInput } = require('../src/validate-snapshot');
const { prepareSnapshotTransaction } = require('../src/pipeline');
const {
  SourceAdapterError,
  validateRawExtraction,
  RawExtractionSourceAdapter
} = require('../src/source-adapter');

function artifact(id, type = 'screenshot') {
  return {
    artifact_id: id,
    artifact_type: type,
    content_hash: { algorithm: 'sha256', value: 'hash-' + id }
  };
}

function capture(status, rawValue, evidenceRefs = ['ART-001'], extra = {}) {
  return {
    status,
    ...(status === 'OBSERVED' ? { raw_value: rawValue } : {}),
    evidence_refs: evidenceRefs,
    interpretation: 'NONE',
    ...extra
  };
}

function validRawExtraction() {
  return {
    extraction_schema_version: '0.1',
    extraction_id: 'EX-001',
    extracted_at_utc: '2026-09-25T18:30:00Z',
    source: {
      primary_artifact_id: 'ART-001',
      artifacts: [
        artifact('ART-001'),
        artifact('ART-002', 'screenshot-detail')
      ]
    },
    members: [{
      source_member_key: 'ROW-001',
      source_identity: {
        status: 'OBSERVED',
        source_system: 'TEST',
        source_identity_id: 'player-raw-001'
      },
      fields: {
        rank: capture('OBSERVED', '۱', ['ART-001']),
        display_name: capture('OBSERVED', '  Player A  ', ['ART-001']),
        role: capture('OBSERVED', ' Member ', ['ART-001']),
        stage: capture('OBSERVED', '10', ['ART-001']),
        weapons: capture('OBSERVED', { '25mm': '4', hydra: '3' }, ['ART-001', 'ART-002']),
        total_kills: capture('OBSERVED', '۱۰٬۰۰۰', ['ART-002']),
        lifetime_medals: capture('OBSERVED', { bronze: '2' }, ['ART-002']),
        current_league_clan_medals: capture('OBSERVED', '100', ['ART-001']),
        profile_total_clan_medal_count: capture('OBSERVED', '100', ['ART-002']),
        last_online_utc: capture('OBSERVED', '2026-09-25T17:00:00Z', ['ART-002'])
      },
      evidence_refs: ['ART-001', 'ART-002']
    }]
  };
}

function context() {
  return {
    project_id: 'UCS',
    clan_id: 'CLAN-A',
    snapshot: {
      snapshot_id: 'S-IN-001',
      sequence: 1,
      official_timestamp_utc: '2026-09-25T18:30:00Z',
      member_count: 1,
      capacity: 50
    },
    league: {
      league_id: 'LEAGUE-2026-09-24',
      name: null,
      sequence: 1,
      starts_at_utc: '2026-09-24T00:00:00Z',
      ends_at_utc: '2026-10-01T00:00:00Z',
      status: 'ACTIVE'
    }
  };
}

test('1. valid RawExtraction converts to a contract-valid SnapshotInput', () => {
  const raw = validRawExtraction();
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, context());
  assert.equal(validateSnapshotInput(input).valid, true);
  assert.equal(input.members[0].rank, 1);
  assert.equal(input.members[0].total_kills, 10000);
  assert.deepEqual(input.members[0].weapons, { '25mm': 4, hydra: 3 });
  assert.deepEqual(input.members[0].evidence_refs, ['ART-001', 'ART-002']);
  assert.deepEqual(input.members[0].source_identity, {
    source_system: 'TEST',
    source_identity_id: 'player-raw-001'
  });
});

test('2. RawExtraction keeps source data separate and does not mutate during conversion', () => {
  const raw = validRawExtraction();
  const before = structuredClone(raw);
  new RawExtractionSourceAdapter().toSnapshotInput(raw, context());
  assert.deepEqual(raw, before);
  assert.equal(raw.members[0].fields.total_kills.raw_value, '۱۰٬۰۰۰');
});

test('3. unknown Profile field remains machine-readable and is not converted to zero', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.total_kills = capture('UNKNOWN', null, ['ART-001']);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, context());
  assert.equal(input.members[0].total_kills, null);
  assert.equal(input.members[0].field_provenance.total_kills.status, 'UNKNOWN');
  assert.notEqual(input.members[0].total_kills, 0);
});

test('4. ambiguous required field blocks SnapshotInput generation', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.stage = capture('AMBIGUOUS', null, ['ART-001']);
  assert.throws(
    () => new RawExtractionSourceAdapter().toSnapshotInput(raw, context()),
    (error) => error instanceof SourceAdapterError && error.code === 'BLOCKED_REQUIRED_VALUE'
  );
});

test('5. interpreted extraction is blocked even when a normalized value exists', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.total_kills.interpretation = 'INTERPRETED';
  raw.members[0].fields.total_kills.normalized_value = 10000;
  assert.throws(
    () => new RawExtractionSourceAdapter().toSnapshotInput(raw, context()),
    (error) => error instanceof SourceAdapterError &&
      error.code === 'INTERPRETATION_NOT_ALLOWED'
  );
});

test('6. conflicting normalization is rejected deterministically', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.rank.normalized_value = 2;
  assert.throws(
    () => new RawExtractionSourceAdapter().toSnapshotInput(raw, context()),
    (error) => error instanceof SourceAdapterError &&
      error.code === 'NORMALIZATION_CONFLICT'
  );
});

test('7. NOT_VISIBLE Profile field is preserved as missing in v0.1 SnapshotInput', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.weapons = capture('NOT_VISIBLE', null, ['ART-001']);
  assert.equal(validateRawExtraction(raw).valid, true);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, context());
  assert.equal(input.members[0].weapons, null);
  assert.equal(input.members[0].field_provenance.weapons.status, 'NOT_VISIBLE');
});

test('8. ambiguous source identity does not create or force a Global Identity', () => {
  const raw = validRawExtraction();
  raw.members[0].source_identity = {
    status: 'AMBIGUOUS'
  };
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, context());
  assert.equal('source_identity' in input.members[0], false);
  assert.equal('global_player_id' in input.members[0], false);
});

test('9. Global Player ID is forbidden at RawExtraction boundary', () => {
  const raw = validRawExtraction();
  raw.members[0].source_identity.global_player_id = 'GP-FAKE-001';
  assert.throws(
    () => validateRawExtraction(raw),
    (error) => error instanceof SourceAdapterError && error.code === 'FORBIDDEN_GLOBAL_ID'
  );
});

test('10. duplicate source_member_key is rejected', () => {
  const raw = validRawExtraction();
  raw.members.push(structuredClone(raw.members[0]));
  assert.throws(
    () => validateRawExtraction(raw),
    (error) => error instanceof SourceAdapterError &&
      error.code === 'DUPLICATE_SOURCE_MEMBER_KEY'
  );
});

test('11. unknown evidence reference is rejected', () => {
  const raw = validRawExtraction();
  raw.members[0].evidence_refs = ['ART-MISSING'];
  assert.throws(
    () => validateRawExtraction(raw),
    (error) => error instanceof SourceAdapterError &&
      error.code === 'UNKNOWN_EVIDENCE_REF'
  );
});

test('13. direct Global Player ID on member is rejected', () => {
  const raw = validRawExtraction();
  raw.members[0].global_player_id = 'GP-FAKE-002';
  assert.throws(
    () => validateRawExtraction(raw),
    (error) => error instanceof SourceAdapterError && error.code === 'FORBIDDEN_GLOBAL_ID'
  );
});

test('14. multiple evidence references are preserved and deterministically sorted', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.rank.evidence_refs = ['ART-002', 'ART-001'];
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, context());
  assert.deepEqual(input.members[0].evidence_refs, ['ART-001', 'ART-002']);
});

test('15. negative normalized metric is rejected and never becomes a core value', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.total_kills.raw_value = '-1';
  assert.throws(
    () => new RawExtractionSourceAdapter().toSnapshotInput(raw, context()),
    (error) => error instanceof SourceAdapterError && error.code === 'INVALID_CORE_VALUE'
  );
});

test('16. source-specific deterministic map normalization is injectable without changing the interface', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.weapons = capture(
    'OBSERVED',
    { '25 MM': '4', 'Hydra-70': '3' },
    ['ART-001']
  );
  const adapter = new RawExtractionSourceAdapter({
    normalizers: {
      weapons(captureValue, path) {
        const mapping = { '25 MM': '25mm', 'Hydra-70': 'hydra' };
        const output = {};
        for (const [rawKey, rawValue] of Object.entries(captureValue.raw_value)) {
          output[mapping[rawKey]] = Number(rawValue);
        }
        if (JSON.stringify(output) !== JSON.stringify({ '25mm': 4, hydra: 3 })) {
          throw new SourceAdapterError('NORMALIZATION_CONFLICT', path, 'unexpected test mapping');
        }
        return output;
      }
    }
  });
  const input = adapter.toSnapshotInput(raw, context());
  assert.deepEqual(input.members[0].weapons, { '25mm': 4, hydra: 3 });
});

test('17. same RawExtraction + same authority context produces byte-equivalent SnapshotInput', () => {
  const raw = validRawExtraction();
  const adapter = new RawExtractionSourceAdapter();
  const first = adapter.toSnapshotInput(raw, context());
  const second = adapter.toSnapshotInput(raw, context());
  assert.deepEqual(first, second);
});

test('18. authority Snapshot identity is not derived from source extraction identifiers', () => {
  const raw = validRawExtraction();
  raw.extraction_id = 'different-extraction-id';
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, context());
  assert.equal(input.snapshot.snapshot_id, 'S-IN-001');
});

test('19. late Snapshot timestamp remains the supplied Snapshot observation timestamp', () => {
  const raw = validRawExtraction();
  const lateContext = context();
  lateContext.snapshot.official_timestamp_utc = '2026-09-27T12:00:00Z';
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, lateContext);
  assert.equal(input.snapshot.official_timestamp_utc, '2026-09-27T12:00:00Z');
  assert.equal(input.league.starts_at_utc, '2026-09-24T00:00:00Z');
});

test('20. SnapshotInput from the adapter can enter the existing deterministic Core pipeline', () => {
  const input = new RawExtractionSourceAdapter().toSnapshotInput(validRawExtraction(), context());
  const plan = prepareSnapshotTransaction(input);
  assert.equal(plan.validation.valid, true);
  assert.equal(plan.transaction_status, 'REVIEW_REQUIRED');
  assert.equal(plan.members[0].identity_resolution.status, 'UNRESOLVED');
});

test('21. invalid authority context cannot be silently replaced by source-derived metadata', () => {
  const raw = validRawExtraction();
  const invalid = structuredClone(context());
  delete invalid.snapshot.snapshot_id;
  assert.throws(
    () => new RawExtractionSourceAdapter().toSnapshotInput(raw, invalid),
    (error) => error instanceof SourceAdapterError && error.code === 'INVALID_CONTEXT'
  );
});

test('22. RawExtraction validation accepts explicit UNKNOWN/AMBIGUOUS field states without guessing', () => {
  const raw = validRawExtraction();
  raw.members[0].fields.role = capture('UNKNOWN', null, ['ART-001']);
  raw.members[0].fields.last_online_utc = capture('AMBIGUOUS', null, ['ART-002']);
  assert.equal(validateRawExtraction(raw).valid, true);
});

const path = require('node:path');

test('23. bundled RawExtraction fixture is valid', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/raw-extraction.valid.json'), 'utf8'));
  assert.equal(validateRawExtraction(fixture).valid, true);
});

test('24. bundled UNKNOWN fixture validates as raw and emits explicit missing Profile state', () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/raw-extraction.unknown-required.json'), 'utf8'));
  assert.equal(validateRawExtraction(fixture).valid, true);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(fixture, context());
  assert.equal(input.members[0].total_kills, null);
  assert.equal(input.members[0].field_provenance.total_kills.status, 'UNKNOWN');
});
