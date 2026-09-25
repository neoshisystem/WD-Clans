'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RawExtractionSourceAdapter } = require('../src/source-adapter');
const { prepareSnapshotTransaction } = require('../src/pipeline');
const {
  InMemoryEvidenceRegistry,
  validateRawExtractionAgainstRegistry,
  validateSnapshotInputAgainstRegistry
} = require('../src/evidence-registry');

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function artifact(id, hash = HASH_A, type = 'screenshot', sourceLocation = null) {
  return {
    artifact_id: id,
    artifact_type: type,
    source_location: sourceLocation,
    content_hash: { algorithm: 'sha256', value: hash }
  };
}

function capture(rawValue, evidenceRefs) {
  return {
    status: 'OBSERVED',
    raw_value: rawValue,
    evidence_refs: evidenceRefs,
    interpretation: 'NONE'
  };
}

function rawExtraction() {
  return {
    extraction_schema_version: '0.1',
    extraction_id: 'EX-REG-001',
    extracted_at_utc: '2026-09-25T18:30:00Z',
    source: {
      primary_artifact_id: 'ART-RANK',
      artifacts: [
        artifact('ART-RANK', HASH_A, 'ranking-screenshot', 'rank-1'),
        artifact('ART-PROFILE', HASH_B, 'profile-screenshot', 'profile-1')
      ]
    },
    members: [{
      source_member_key: 'ROW-001',
      fields: {
        rank: capture('1', ['ART-RANK']),
        display_name: capture('Player A', ['ART-RANK']),
        role: capture('Member', ['ART-RANK']),
        stage: capture('10', ['ART-RANK']),
        weapons: capture({ '25mm': '4' }, ['ART-PROFILE']),
        total_kills: capture('10000', ['ART-PROFILE']),
        lifetime_medals: capture({ gold: '7' }, ['ART-PROFILE']),
        current_league_clan_medals: capture('100', ['ART-RANK']),
        profile_total_clan_medal_count: capture('200', ['ART-PROFILE']),
        last_online_utc: capture('2026-09-25T17:00:00Z', ['ART-PROFILE'])
      },
      evidence_refs: ['ART-RANK', 'ART-PROFILE']
    }]
  };
}

function authority() {
  return {
    project_id: 'UCS',
    clan_id: 'CLAN-A',
    snapshot: {
      snapshot_id: 'S-REG-001',
      sequence: 1,
      official_timestamp_utc: '2026-09-25T18:30:00Z',
      member_count: 1,
      capacity: 50
    },
    league: {
      league_id: 'LEAGUE-2026-09-24',
      starts_at_utc: '2026-09-24T00:00:00Z',
      ends_at_utc: '2026-10-01T00:00:00Z',
      status: 'ACTIVE'
    }
  };
}

function registerSourceArtifacts(registry, raw) {
  for (const sourceArtifact of raw.source.artifacts) {
    const result = registry.registerArtifact(sourceArtifact);
    assert.ok(['REGISTERED', 'IDEMPOTENT'].includes(result.result));
  }
}

test('1. register valid Evidence Artifact', () => {
  const registry = new InMemoryEvidenceRegistry();
  const result = registry.registerArtifact(artifact('ART-001'));
  assert.equal(result.result, 'REGISTERED');
  assert.equal(registry.hasArtifact('ART-001'), true);
});

test('2. retrieve registered artifact', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  assert.deepEqual(registry.getArtifact('ART-001'), artifact('ART-001'));
});

test('3. identical artifact registration is idempotent', () => {
  const registry = new InMemoryEvidenceRegistry();
  const first = registry.registerArtifact(artifact('ART-001'));
  const second = registry.registerArtifact({ ...artifact('ART-001'), content_hash: { value: HASH_A.toUpperCase(), algorithm: 'SHA256' } });
  assert.equal(first.result, 'REGISTERED');
  assert.equal(second.result, 'IDEMPOTENT');
  assert.equal(registry.listArtifacts().length, 1);
});

test('4. same artifact_id with different content hash is a conflict', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001', HASH_A));
  const result = registry.registerArtifact(artifact('ART-001', HASH_B));
  assert.equal(result.result, 'CONFLICT');
  assert.equal(result.reason, 'artifact_id_reused_with_different_content_hash');
  assert.equal(registry.getArtifact('ART-001').content_hash.value, HASH_A);
});

test('5. same artifact_id with incompatible metadata is a conflict', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001', HASH_A, 'ranking-screenshot'));
  const result = registry.registerArtifact(artifact('ART-001', HASH_A, 'profile-screenshot'));
  assert.equal(result.result, 'CONFLICT');
  assert.equal(result.reason, 'artifact_id_reused_with_incompatible_metadata');
});

test('6. unknown evidence reference is rejected', () => {
  const registry = new InMemoryEvidenceRegistry();
  const result = registry.registerProvenance({
    subject_type: 'FIELD_OBSERVATION',
    subject_id: 'OBS-1',
    field_name: 'total_kills',
    evidence_refs: ['ART-MISSING']
  });
  assert.equal(result.result, 'REJECTED');
  assert.equal(result.reason, 'UNKNOWN_EVIDENCE_REFERENCE');
  assert.equal(registry.listProvenance().length, 0);
});

test('7. valid provenance reference is accepted', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  const result = registry.registerProvenance({
    subject_type: 'OBSERVATION',
    subject_id: 'OBS-1',
    evidence_refs: ['ART-001']
  });
  assert.equal(result.result, 'REGISTERED');
  assert.equal(registry.listProvenance().length, 1);
});

test('8. field-level provenance survives registration', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  const result = registry.registerProvenance({
    provenance_id: 'PROV-FIELD-1',
    subject_type: 'FIELD_OBSERVATION',
    subject_id: 'OBS-1',
    field_name: 'total_kills',
    evidence_refs: ['ART-001']
  });
  assert.equal(result.result, 'REGISTERED');
  assert.equal(registry.listProvenance()[0].field_name, 'total_kills');
  assert.deepEqual(registry.listProvenance()[0].evidence_refs, ['ART-001']);
});

test('9. multiple Evidence references for one field are preserved', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001', HASH_A));
  registry.registerArtifact(artifact('ART-002', HASH_B));
  registry.registerProvenance({
    subject_type: 'FIELD_OBSERVATION',
    subject_id: 'OBS-1',
    field_name: 'total_kills',
    evidence_refs: ['ART-002', 'ART-001']
  });
  assert.deepEqual(registry.listProvenance()[0].evidence_refs, ['ART-001', 'ART-002']);
});

test('10. conflicting Evidence references are preserved, not resolved', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001', HASH_A));
  registry.registerArtifact(artifact('ART-002', HASH_B));
  registry.registerProvenance({
    subject_type: 'FIELD_OBSERVATION',
    subject_id: 'OBS-1',
    field_name: 'total_kills',
    evidence_refs: ['ART-001', 'ART-002']
  });
  const record = registry.listProvenance()[0];
  assert.deepEqual(record.evidence_refs, ['ART-001', 'ART-002']);
});

test('11. registered artifacts are immutable through cloned reads', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  const fetched = registry.getArtifact('ART-001');
  fetched.artifact_type = 'modified';
  fetched.content_hash.value = HASH_B;
  assert.equal(registry.getArtifact('ART-001').artifact_type, 'screenshot');
  assert.equal(registry.getArtifact('ART-001').content_hash.value, HASH_A);
});

test('12. failed batch provenance registration causes no partial state mutation', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  const result = registry.registerProvenance([
    { provenance_id: 'P-1', subject_type: 'OBSERVATION', subject_id: 'OBS-1', evidence_refs: ['ART-001'] },
    { provenance_id: 'P-2', subject_type: 'OBSERVATION', subject_id: 'OBS-2', evidence_refs: ['ART-MISSING'] }
  ]);
  assert.equal(result.result, 'REJECTED');
  assert.deepEqual(registry.listProvenance(), []);
});

test('13. repeated identical provenance registration is deterministic and idempotent', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  const relation = {
    subject_type: 'FIELD_OBSERVATION',
    subject_id: 'OBS-1',
    field_name: 'stage',
    evidence_refs: ['ART-001']
  };
  const first = registry.registerProvenance(relation);
  const second = registry.registerProvenance(structuredClone(relation));
  assert.equal(first.provenance_ids[0], second.provenance_ids[0]);
  assert.equal(second.result, 'IDEMPOTENT');
  assert.deepEqual(registry.read(), {
    registry_version: '0.1',
    artifacts: [artifact('ART-001')],
    provenance: registry.listProvenance()
  });
});

test('14. SnapshotInput evidence references resolve through Registry', () => {
  const registry = new InMemoryEvidenceRegistry();
  const raw = rawExtraction();
  registerSourceArtifacts(registry, raw);
  const adapter = new RawExtractionSourceAdapter();
  const input = adapter.toSnapshotInput(raw, authority());
  assert.equal(validateSnapshotInputAgainstRegistry(registry, input).valid, true);
  assert.equal(registry.resolveReference('ART-PROFILE').resolved, true);
});

test('15. RawExtraction evidence references resolve through Registry', () => {
  const registry = new InMemoryEvidenceRegistry();
  const raw = rawExtraction();
  registerSourceArtifacts(registry, raw);
  const check = validateRawExtractionAgainstRegistry(registry, raw);
  assert.deepEqual(check, { valid: true, scope: 'RawExtraction' });
});

test('16. source layer still never creates Global Player ID', () => {
  const registry = new InMemoryEvidenceRegistry();
  const raw = rawExtraction();
  registerSourceArtifacts(registry, raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, authority());
  assert.equal('global_player_id' in input.members[0], false);
  assert.equal('global_player_id' in input.source, false);
});

test('17. Registry never creates Global Player ID', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  registry.registerProvenance({
    subject_type: 'RESOLUTION_CASE',
    subject_id: 'RC-1',
    evidence_refs: ['ART-001']
  });
  assert.equal('global_player_id' in registry.read(), false);
  assert.equal(Object.values(registry.read()).some((value) => Array.isArray(value) && value.some((item) => 'global_player_id' in item)), false);
});

test('18. Evidence survives Adapter to Core planning path', () => {
  const registry = new InMemoryEvidenceRegistry();
  const raw = rawExtraction();
  registerSourceArtifacts(registry, raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, authority());
  const plan = prepareSnapshotTransaction(input, { evidenceRegistry: registry });
  const observation = plan.persistence.transaction.canonical_patch.observations[0];
  assert.deepEqual(observation.provenance.evidence_refs, ['ART-PROFILE', 'ART-RANK']);
  assert.deepEqual(observation.provenance.field_provenance.total_kills.evidence_refs, ['ART-PROFILE']);
  assert.deepEqual(observation.provenance.field_provenance.rank.evidence_refs, ['ART-RANK']);
});

test('19. provenance is not lost during canonical planning', () => {
  const registry = new InMemoryEvidenceRegistry();
  const raw = rawExtraction();
  registerSourceArtifacts(registry, raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, authority());
  const plan = prepareSnapshotTransaction(input, { evidenceRegistry: registry });
  const canonicalPatch = plan.persistence.transaction.canonical_patch;
  assert.deepEqual(canonicalPatch.evidence_artifacts.map((item) => item.evidence_artifact_id).sort(), ['ART-PROFILE', 'ART-RANK']);
  assert.deepEqual(canonicalPatch.observations[0].provenance.field_provenance.weapons.evidence_refs, ['ART-PROFILE']);
  assert.deepEqual(canonicalPatch.resolution_cases[0].evidence_refs, ['ART-PROFILE', 'ART-RANK']);
});

test('20. hash metadata is structurally validated without hashing source bytes', () => {
  const registry = new InMemoryEvidenceRegistry();
  const invalid = registry.registerArtifact(artifact('ART-BAD', 'not-a-sha256'));
  assert.equal(invalid.result, 'REJECTED');
  assert.equal(invalid.reason, 'INVALID_HASH');
  assert.equal(registry.hasArtifact('ART-BAD'), false);
});

test('21. equal content hashes do not force artifact deduplication', () => {
  const registry = new InMemoryEvidenceRegistry();
  assert.equal(registry.registerArtifact(artifact('ART-A', HASH_A)).result, 'REGISTERED');
  assert.equal(registry.registerArtifact(artifact('ART-B', HASH_A)).result, 'REGISTERED');
  assert.equal(registry.listArtifacts().length, 2);
});

test('22. registry contract does not require binary storage', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  const stored = registry.getArtifact('ART-001');
  assert.equal('bytes' in stored, false);
  assert.equal('blob' in stored, false);
  assert.equal('binary' in stored, false);
  assert.equal('storage_backend' in stored, false);
  assert.equal('storage_uri' in stored, false);
});

test('23. SnapshotInput reference validation catches registry metadata mismatch', () => {
  const registry = new InMemoryEvidenceRegistry();
  const raw = rawExtraction();
  registerSourceArtifacts(registry, raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(raw, authority());
  input.source.artifacts[1].source_location = 'different-location';
  const check = validateSnapshotInputAgainstRegistry(registry, input);
  assert.equal(check.valid, false);
  assert.equal(check.reason, 'ARTIFACT_METADATA_CONFLICT');
});

test('24. provenance IDs are deterministic from the logical relation when not supplied', () => {
  const registry = new InMemoryEvidenceRegistry();
  registry.registerArtifact(artifact('ART-001'));
  const relation = {
    subject_type: 'SNAPSHOT_INPUT',
    subject_id: 'S-1',
    field_name: 'rank',
    evidence_refs: ['ART-001']
  };
  const first = registry.registerProvenance(relation);
  const id = first.provenance_ids[0];
  assert.equal(registry.registerProvenance(structuredClone(relation)).result, 'IDEMPOTENT');
  assert.match(id, /^PROV::[a-f0-9]{64}$/);
});
