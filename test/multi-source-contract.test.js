'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  validate: validateSnapshotInput
} = require('../src/validate-snapshot');
const {
  SourceAdapterError,
  validateRawExtraction,
  RawExtractionSourceAdapter
} = require('../src/source-adapter');
const {
  InMemoryEvidenceRegistry,
  validateSnapshotInputAgainstRegistry,
  stableStringify: stableEvidenceStringify
} = require('../src/evidence-registry');
const {
  validateJsonSchema
} = require('../src/schema-validator');
const RAW_SCHEMA = require('../schemas/raw-extraction.v0.1.schema.json');

const fixturePath = require('node:path').join(__dirname, 'fixtures/raw-extraction.multi-source-ranking-profile.json');

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function authorityContext() {
  return {
    project_id: 'UCS',
    clan_id: 'CLAN-MULTI',
    snapshot: {
      snapshot_id: 'S-MULTI-001',
      sequence: 1,
      official_timestamp_utc: '2026-09-25T18:45:00Z',
      member_count: 3,
      capacity: 50
    },
    league: {
      league_id: 'LEAGUE-2026-09-24',
      name: '2026-W39',
      sequence: 1,
      starts_at_utc: '2026-09-24T00:00:00Z',
      ends_at_utc: '2026-10-01T00:00:00Z',
      status: 'ACTIVE'
    }
  };
}

function adapt(raw = loadFixture(), context = authorityContext()) {
  return new RawExtractionSourceAdapter().toSnapshotInput(raw, context);
}

test('1. multi-ranking + fewer-profile fixture is structurally and semantically valid', () => {
  const raw = loadFixture();
  assert.equal(validateJsonSchema(raw, RAW_SCHEMA), true);
  assert.equal(validateRawExtraction(raw).valid, true);

  const input = adapt(raw);
  assert.equal(validateSnapshotInput(input).valid, true);
  assert.deepEqual(
    input.source.artifacts.map((artifact) => artifact.artifact_id),
    ['PROFILE-001', 'RANK-001', 'RANK-002']
  );
  assert.equal(raw.members.length, 3);
  assert.equal(input.source.artifacts.filter((artifact) => artifact.artifact_type === 'profile-screenshot').length, 1);
});

test('2. same member merges Ranking and Profile evidence without creating identity', () => {
  const input = adapt();
  const member = input.members.find((item) => item.source_member_key === 'RANK-01');

  assert.equal(member.rank, 1);
  assert.equal(member.stage, 12);
  assert.equal(member.total_kills, 10500);
  assert.deepEqual(member.weapons, { '25mm': 6, 'Hydra-70': 5 });
  assert.equal(member.role, 'Leader');
  assert.equal('global_player_id' in member, false);
  assert.deepEqual(member.source_identity, {
    source_system: 'ranking',
    source_identity_id: 'RANK-01'
  });
});

test('3. multiple Ranking references on one field survive merge deterministically', () => {
  const member = adapt().members.find((item) => item.source_member_key === 'RANK-01');

  assert.equal(member.current_league_clan_medals, 120);
  assert.deepEqual(
    member.field_provenance.current_league_clan_medals,
    { status: 'OBSERVED', evidence_refs: ['RANK-001', 'RANK-002'] }
  );
  assert.ok(member.evidence_refs.includes('RANK-001'));
  assert.ok(member.evidence_refs.includes('RANK-002'));
});

test('4. fewer Profile artifacts leave uncovered Profile fields explicitly missing', () => {
  const input = adapt();
  const bravo = input.members.find((item) => item.source_member_key === 'RANK-02');
  const charlie = input.members.find((item) => item.source_member_key === 'RANK-03');

  assert.equal(bravo.weapons, null);
  assert.equal(bravo.total_kills, null);
  assert.equal(bravo.lifetime_medals, null);
  assert.equal(bravo.profile_total_clan_medal_count, null);
  assert.equal(bravo.field_provenance.total_kills.status, 'NOT_VISIBLE');
  assert.notEqual(bravo.total_kills, 0);

  assert.equal(charlie.weapons, null);
  assert.equal(charlie.total_kills, null);
  assert.equal(charlie.field_provenance.total_kills.status, 'UNKNOWN');
  assert.notEqual(charlie.total_kills, 0);
});

test('5. explicit conflicting values become CONFLICTING and do not silently resolve', () => {
  const raw = loadFixture();
  raw.members[0].fields.total_kills = [
    { status: 'OBSERVED', raw_value: '10500', interpretation: 'NONE', evidence_refs: ['PROFILE-001'] },
    { status: 'OBSERVED', raw_value: '10501', interpretation: 'NONE', evidence_refs: ['RANK-002'] }
  ];

  const input = adapt(raw);
  const member = input.members.find((item) => item.source_member_key === 'RANK-01');

  assert.equal(member.total_kills, null);
  assert.deepEqual(member.field_provenance.total_kills, {
    status: 'CONFLICTING',
    evidence_refs: ['PROFILE-001', 'RANK-002']
  });
});

test('6. source_member_key remains source/snapshot-local and is not converted to Global Identity', () => {
  const input = adapt();

  assert.deepEqual(
    input.members.map((member) => member.source_member_key),
    ['RANK-01', 'RANK-02', 'RANK-03']
  );
  assert.equal(input.members.some((member) => 'global_player_id' in member), false);
});

test('7. normalized output is independent of input member/source artifact ordering', () => {
  const original = loadFixture();
  const reordered = structuredClone(original);
  reordered.source.artifacts.reverse();
  reordered.members.reverse();

  const originalInput = adapt(original);
  const reorderedInput = adapt(reordered);

  assert.equal(JSON.stringify(originalInput), JSON.stringify(reorderedInput));
});

test('8. repeated regeneration produces identical normalized output', () => {
  const raw = loadFixture();
  const context = authorityContext();
  const first = adapt(structuredClone(raw), structuredClone(context));
  const second = adapt(structuredClone(raw), structuredClone(context));

  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(stableEvidenceStringify(first), stableEvidenceStringify(second));
});

test('9. duplicate source observations are rejected at the RawExtraction domain boundary', () => {
  const raw = loadFixture();
  raw.members.push(structuredClone(raw.members[0]));

  assert.throws(
    () => validateRawExtraction(raw),
    (error) => error instanceof SourceAdapterError && error.code === 'DUPLICATE_SOURCE_MEMBER_KEY'
  );
});

test('10. structural JSON Schema rejection is distinguishable from domain rejection', () => {
  const raw = loadFixture();
  raw.source.artifacts[0].unexpected = true;

  assert.throws(
    () => validateRawExtraction(raw),
    (error) => error instanceof SourceAdapterError && error.code === 'RAW_SCHEMA_INVALID'
  );

  const domainRaw = loadFixture();
  domainRaw.members.push(structuredClone(domainRaw.members[0]));

  assert.throws(
    () => validateRawExtraction(domainRaw),
    (error) => error instanceof SourceAdapterError && error.code === 'DUPLICATE_SOURCE_MEMBER_KEY'
  );
});

test('11. SnapshotInput structural and domain validation remain separate', () => {
  const input = adapt();

  const structuralInvalid = structuredClone(input);
  structuralInvalid.members[0].unexpected = true;
  assert.throws(
    () => validateSnapshotInput(structuralInvalid),
    (error) => error.code === 'SNAPSHOT_SCHEMA_INVALID'
  );

  const domainInvalid = structuredClone(input);
  domainInvalid.members[1].rank = domainInvalid.members[0].rank;
  assert.throws(
    () => validateSnapshotInput(domainInvalid),
    /duplicate rank/
  );
});

test('12. Evidence Registry accepts all declared multi-source artifacts and fails closed on missing registration', () => {
  const input = adapt();
  const registered = new InMemoryEvidenceRegistry(input.source.artifacts);

  assert.equal(validateSnapshotInputAgainstRegistry(registered, input).valid, true);

  const partial = new InMemoryEvidenceRegistry(
    input.source.artifacts.filter((artifact) => artifact.artifact_id !== 'PROFILE-001')
  );
  const check = validateSnapshotInputAgainstRegistry(partial, input);
  assert.equal(check.valid, false);
  assert.equal(check.reason, 'UNKNOWN_EVIDENCE_REFERENCE');
});

test('13. field-level provenance retains source lineage after Evidence Registry validation', () => {
  const input = adapt();
  const registry = new InMemoryEvidenceRegistry(input.source.artifacts);
  assert.equal(validateSnapshotInputAgainstRegistry(registry, input).valid, true);

  const member = input.members.find((item) => item.source_member_key === 'RANK-01');
  assert.deepEqual(member.field_provenance.current_league_clan_medals.evidence_refs, ['RANK-001', 'RANK-002']);
  assert.deepEqual(member.field_provenance.total_kills.evidence_refs, ['PROFILE-001']);
});

test('14. RawExtraction remains immutable during multi-source normalization', () => {
  const raw = loadFixture();
  const before = stableEvidenceStringify(raw);
  adapt(raw);
  assert.equal(stableEvidenceStringify(raw), before);
});

test('15. League boundary is controlled by authority context and cannot be overridden by source data', () => {
  const raw = loadFixture();
  const invalidContext = authorityContext();
  invalidContext.league.starts_at_utc = '2026-09-25T00:00:00Z';
  invalidContext.league.ends_at_utc = '2026-10-02T00:00:00Z';

  assert.throws(
    () => adapt(raw, invalidContext),
    (error) => error instanceof SourceAdapterError && error.code === 'SNAPSHOT_INPUT_CONTRACT_INVALID'
  );
});

test('16. SnapshotInput keeps the authoritative Snapshot identity/timestamp separate from source identifiers', () => {
  const raw = loadFixture();
  raw.extraction_id = 'SOURCE-ID-THAT-MUST-NOT-BECOME-SNAPSHOT-ID';
  raw.source.artifacts[0].source_location = '2026-09-24T00:00:00Z';

  const input = adapt(raw);
  assert.equal(input.snapshot.snapshot_id, 'S-MULTI-001');
  assert.equal(input.snapshot.official_timestamp_utc, '2026-09-25T18:45:00Z');
  assert.equal(input.source.artifacts.length, 3);
});
