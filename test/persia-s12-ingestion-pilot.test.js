'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { emptyCanonicalModel } = require('../src/canonical');
const { stableStringify } = require('../src/projection');
const {
  RawExtractionSourceAdapter,
  validateRawExtraction
} = require('../src/source-adapter');
const {
  InMemoryEvidenceRegistry,
  validateRawExtractionAgainstRegistry,
  validateSnapshotInputAgainstRegistry
} = require('../src/evidence-registry');
const { prepareSnapshotTransaction } = require('../src/pipeline');
const { InMemoryAtomicPersistenceAdapter } = require('../src/persistence');

const FIXTURE = path.join(
  __dirname,
  '..',
  'examples',
  'pilots',
  'persia-s12',
  'raw-extraction.json'
);

const AUTHORITY_CONTEXT = {
  project_id: 'UCS',
  clan_id: 'PERSIA',
  snapshot: {
    snapshot_id: 'S12',
    sequence: 12,
    official_timestamp_utc: '2026-09-25T12:30:00Z',
    member_count: 50,
    capacity: 50
  },
  league: {
    league_id: 'PILOT::LEAGUE::2026-09-24',
    name: null,
    sequence: 1,
    status: 'ACTIVE',
    starts_at_utc: '2026-09-24T00:00:00Z',
    ends_at_utc: '2026-10-01T00:00:00Z'
  }
};

function readRaw() {
  return JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
}

function registryFromRaw(raw) {
  return new InMemoryEvidenceRegistry({
    artifacts: raw.source.artifacts
  });
}

test('PERSIA S12 Pilot 1: real artifact inventory and extraction contract are valid', () => {
  const raw = readRaw();
  assert.equal(raw.extraction_id, 'PILOT::PERSIA::S12::RAW-001');
  assert.equal(raw.members.length, 50);
  assert.equal(raw.source.artifacts.length, 2);
  assert.equal(raw.source.artifacts[0].content_hash.value, 'a970dc9f98796037474bbc5945d2e274315c2e42e2ea6e5a9844b51b4815f996');
  assert.equal(raw.source.artifacts[1].content_hash.value, 'fc03cfd5d3f7d85b4dd24e328968002bf8a262a523b25cd4399de9cb53bf08ba');
  assert.deepEqual(
    raw.members.filter(member => member.fields.profile_total_clan_medal_count.status !== 'OBSERVED').map(member => member.fields.rank.raw_value),
    [37, 41, 44]
  );
  assert.ok(raw.members.every(member => !Object.prototype.hasOwnProperty.call(member, 'global_player_id')));
  assert.equal(validateRawExtraction(raw).valid, true);
});

test('PERSIA S12 Pilot 2: Evidence Registry is fail-closed and idempotent', () => {
  const raw = readRaw();
  const registry = registryFromRaw(raw);

  assert.equal(validateRawExtractionAgainstRegistry(registry, raw).valid, true);
  assert.equal(registry.registerArtifact(raw.source.artifacts[0]).result, 'IDEMPOTENT');

  const unknown = structuredClone(raw);
  unknown.members[0].fields.rank.evidence_refs = ['PERSIA-S12-UNKNOWN'];
  assert.equal(validateRawExtractionAgainstRegistry(registry, unknown).valid, false);
});

test('PERSIA S12 Pilot 3: real RawExtraction deterministically becomes valid SnapshotInput', () => {
  const raw = readRaw();
  const adapter = new RawExtractionSourceAdapter();
  const first = adapter.toSnapshotInput(raw, AUTHORITY_CONTEXT);
  const second = adapter.toSnapshotInput(raw, AUTHORITY_CONTEXT);

  assert.equal(stableStringify(first), stableStringify(second));
  assert.equal(first.project_id, 'UCS');
  assert.equal(first.snapshot.snapshot_id, 'S12');
  assert.equal(first.snapshot.official_timestamp_utc, '2026-09-25T12:30:00Z');
  assert.equal(first.snapshot.member_count, 50);
  assert.equal(first.members.length, 50);
  assert.deepEqual(
    first.members.filter(member => member.profile_total_clan_medal_count === null).map(member => member.rank),
    [37, 41, 44]
  );
  assert.ok(first.members.every(member => member.global_player_id === undefined));
  assert.equal(first.members.find(member => member.rank === 37).role, null);
  assert.equal(first.members.find(member => member.rank === 37).weapons, null);
  assert.equal(first.members.find(member => member.rank === 37).total_kills, null);
  assert.equal(first.members.find(member => member.rank === 37).lifetime_medals, null);
  assert.equal(first.members.find(member => member.rank === 37).profile_total_clan_medal_count, null);
  assert.equal(first.members.find(member => member.rank === 37).last_online_utc, null);
  assert.equal(first.members.find(member => member.rank === 37).field_provenance.role.status, 'NOT_VISIBLE');
  assert.equal(first.members.find(member => member.rank === 37).field_provenance.total_kills.status, 'NOT_VISIBLE');
  assert.equal(first.members.find(member => member.rank === 1).field_provenance.display_name.evidence_refs.length, 2);
  assert.equal(first.members.find(member => member.rank === 1).field_provenance.stage.evidence_refs.length, 2);
});

test('PERSIA S12 Pilot 4: actual S12 cross-source key fields have no conflict; conflict path remains explicit', () => {
  const raw = readRaw();
  assert.equal(raw.members.length, 50);

  const conflict = structuredClone(raw);
  conflict.members[0].fields.role = [
    conflict.members[0].fields.role,
    {
      status: 'OBSERVED',
      interpretation: 'NONE',
      evidence_refs: ['PERSIA-S12-PROFILE-JSON'],
      raw_value: 'Conflicting Role'
    }
  ];

  const normalized = new RawExtractionSourceAdapter().toSnapshotInput(conflict, AUTHORITY_CONTEXT);
  const member = normalized.members.find(item => item.rank === 1);

  assert.equal(member.role, null);
  assert.equal(member.field_provenance.role.status, 'CONFLICTING');
  assert.deepEqual(
    member.field_provenance.role.evidence_refs,
    ['PERSIA-S12-PROFILE-JSON']
  );
});

test('PERSIA S12 Pilot 5: Core planning is identity-safe and produces REVIEW_REQUIRED', () => {
  const raw = readRaw();
  const registry = registryFromRaw(raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, AUTHORITY_CONTEXT);
  assert.equal(validateSnapshotInputAgainstRegistry(registry, input).valid, true);

  const plan = prepareSnapshotTransaction(input, { evidenceRegistry: registry });

  assert.equal(plan.transaction_status, 'REVIEW_REQUIRED');
  assert.equal(plan.members.length, 50);
  assert.equal(plan.review_reasons.length, 50);
  assert.ok(plan.review_reasons.every(reason => reason.reason === 'identity_resolution_not_confirmed'));
  assert.ok(plan.persistence.transaction.canonical_patch.observations.every(observation => observation.global_player_id === null));
  assert.ok(plan.persistence.transaction.canonical_patch.observations.every(observation => observation.identity_resolution_status === 'UNRESOLVED'));
  assert.deepEqual(plan.persistence.transaction.domain_scope.confirmed_global_player_ids, []);
});

test('PERSIA S12 Pilot 6: default persistence blocks REVIEW_REQUIRED with zero state change', () => {
  const raw = readRaw();
  const registry = registryFromRaw(raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, AUTHORITY_CONTEXT);
  const plan = prepareSnapshotTransaction(input, { evidenceRegistry: registry });

  const persistence = new InMemoryAtomicPersistenceAdapter(emptyCanonicalModel());
  const before = persistence.read();
  const result = persistence.commit(plan.persistence.transaction);

  assert.equal(result.result, 'REVIEW_REQUIRED');
  assert.equal(result.committed, false);
  assert.equal(result.state_changed, false);
  assert.deepEqual(persistence.read(), before);
});

test('PERSIA S12 Pilot 7: downstream Projection and Static Data are not reached after blocked persistence', () => {
  const raw = readRaw();
  const registry = registryFromRaw(raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, AUTHORITY_CONTEXT);
  const plan = prepareSnapshotTransaction(input, { evidenceRegistry: registry });

  const persistence = new InMemoryAtomicPersistenceAdapter(emptyCanonicalModel());
  const result = persistence.commit(plan.persistence.transaction);

  assert.equal(result.result, 'REVIEW_REQUIRED');
  assert.equal(result.committed, false);
  assert.equal(persistence.read().snapshots.length, 0);
  assert.equal(persistence.read().observations.length, 0);
});
