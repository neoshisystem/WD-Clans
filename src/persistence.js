
'use strict';

const crypto = require('node:crypto');

const {
  emptyCanonicalModel,
  validateCanonicalModel,
  assertHistoryPreserved
} = require('./canonical');

const TRANSACTION_RESULTS = Object.freeze([
  'COMMITTED',
  'IDEMPOTENT_REPLAY',
  'REJECTED',
  'CONFLICT',
  'REVIEW_REQUIRED',
  'FAILED_ROLLED_BACK'
]);

const TRANSACTION_SCHEMA_VERSION = '0.1';

function clone(value) {
  return structuredClone(value);
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

function createSnapshotIdempotencyKey(input) {
  if (!input?.project_id || !input?.clan_id || !input?.snapshot?.snapshot_id) {
    throw new Error('project_id, clan_id and snapshot.snapshot_id are required for idempotency');
  }
  return [input.project_id, 'SNAPSHOT', input.clan_id, input.snapshot.snapshot_id].join('|');
}

function canonicalResolutionStatus(status) {
  switch (status) {
    case 'CONFIRMED':
    case 'AMBIGUOUS':
    case 'UNRESOLVED':
    case 'CONTRADICTION':
    case 'UNKNOWN':
      return status;
    case 'CANDIDATE':
    case 'NEW_IDENTITY_PENDING_AUTHORITY':
      return 'UNRESOLVED';
    case 'REJECTED_MATCH':
      return 'CONTRADICTION';
    default:
      return 'UNKNOWN';
  }
}

function confirmedPlayerIds(plan) {
  return new Set(
    (plan.members || [])
      .filter((member) => member.identity_resolution?.status === 'CONFIRMED')
      .map((member) => member.identity_resolution.global_player_id)
      .filter(Boolean)
  );
}

function candidateIds(member) {
  return (member.identity_resolution?.comparisons || [])
    .map((comparison) => comparison.candidate?.global_player_id)
    .filter(Boolean);
}

function createSnapshotPersistencePlan(input, preparedPlan) {
  if (!preparedPlan || !input) throw new Error('input and preparedPlan are required');
  const binding = preparedPlan.league_binding;
  if (!binding?.league_id || binding.league_id !== input.league.league_id) {
    throw new Error('prepared plan League binding does not match SnapshotInput');
  }

  const snapshotId = input.snapshot.snapshot_id;
  const clanId = input.clan_id;
  const leagueId = binding.league_id;
  const artifactId = input.source.artifact_id;
  const evidenceRefs = [artifactId];
  const leagueStatus = input.league.status || 'ACTIVE';
  const confirmedIds = confirmedPlayerIds(preparedPlan);

  const observations = preparedPlan.members.map((member) => {
    const status = canonicalResolutionStatus(member.identity_resolution?.status);
    return {
      observation_id: [snapshotId, member.source_member_key].join('::'),
      snapshot_id: snapshotId,
      clan_id: clanId,
      source_member_key: member.source_member_key,
      source_identity: member.source_identity || null,
      global_player_id: status === 'CONFIRMED'
        ? member.identity_resolution.global_player_id
        : null,
      membership_episode_id: null,
      identity_resolution_status: status,
      display_name: member.display_name,
      rank: member.observation.rank,
      stage: member.observation.stage,
      role: member.observation.role ?? null,
      weapons: clone(member.observation.weapons),
      total_kills: member.observation.total_kills,
      lifetime_medals: clone(member.observation.lifetime_medals),
      current_league_clan_medals: member.observation.current_league_clan_medals,
      profile_total_clan_medal_count: member.observation.profile_total_clan_medal_count,
      last_online_utc: member.observation.last_online_utc ?? null,
      provenance: { evidence_refs: evidenceRefs }
    };
  });

  const resolutionCases = preparedPlan.members
    .filter((member) => canonicalResolutionStatus(member.identity_resolution?.status) !== 'CONFIRMED')
    .map((member) => ({
      resolution_case_id: 'RC::' + snapshotId + '::' + member.source_member_key,
      observation_id: snapshotId + '::' + member.source_member_key,
      status: canonicalResolutionStatus(member.identity_resolution?.status),
      candidate_global_player_ids: candidateIds(member),
      matched_global_player_id: null,
      signals: clone(member.identity_resolution?.comparisons || []),
      evidence_refs: evidenceRefs,
      authority_ref: null,
      process_ref: 'identity-resolution-v0.1',
      decided_at_utc: null,
      reason: 'identity_requires_review'
    }));

  const patch = {
    clans: input.snapshot.sequence === 1 ? [{
      clan_id: clanId,
      display_name: input.clan_name ?? null,
      status: 'ACTIVE',
      provenance: { evidence_refs: evidenceRefs }
    }] : [],
    leagues: input.snapshot.sequence === 1 ? [{
      league_id: leagueId,
      name: input.league.name ?? null,
      starts_at_utc: input.league.starts_at_utc,
      ends_at_utc: input.league.ends_at_utc,
      sequence: input.league.sequence ?? null,
      status: leagueStatus,
      completed_at_utc: leagueStatus === 'COMPLETED' ? input.league.ends_at_utc : null,
      provenance: { evidence_refs: evidenceRefs }
    }] : [],
    clan_leagues: input.snapshot.sequence === 1 ? [{
      clan_league_id: 'CLANLEAGUE::' + clanId + '::' + leagueId,
      clan_id: clanId,
      league_id: leagueId,
      status: leagueStatus,
      final_snapshot_id: null,
      opening_snapshot_id: snapshotId,
      provenance: { evidence_refs: evidenceRefs }
    }] : [],
    snapshots: [{
      snapshot_id: snapshotId,
      clan_id: clanId,
      league_id: leagueId,
      clan_league_id: 'CLANLEAGUE::' + clanId + '::' + leagueId,
      sequence: input.snapshot.sequence,
      official_timestamp_utc: input.snapshot.official_timestamp_utc,
      member_count: input.snapshot.member_count,
      capacity: input.snapshot.capacity,
      provenance: { evidence_refs: evidenceRefs }
    }],
    observations,
    global_player_identities: [],
    membership_episodes: [],
    membership_events: [],
    evidence_artifacts: [{
      evidence_artifact_id: artifactId,
      artifact_type: input.source.artifact_type,
      content_hash: clone(input.source.content_hash),
      source_location: null,
      received_at_utc: null,
      immutable: true
    }],
    resolution_cases: resolutionCases,
    delta_results: []
  };

  const reviewRequired = preparedPlan.transaction_status === 'REVIEW_REQUIRED';
  return {
    transaction_schema_version: TRANSACTION_SCHEMA_VERSION,
    transaction_id: 'TX::' + createSnapshotIdempotencyKey(input),
    idempotency_key: createSnapshotIdempotencyKey(input),
    plan_hash: sha256(patch),
    expected_version: null,
    transaction_status: reviewRequired ? 'REVIEW_REQUIRED' : 'READY_FOR_PERSISTENCE',
    review_reasons: clone(preparedPlan.review_reasons || []),
    domain_scope: {
      project_id: input.project_id,
      clan_id: clanId,
      league_id: leagueId,
      snapshot_id: snapshotId,
      confirmed_global_player_ids: [...confirmedIds].sort(),
      creates_global_player_id: false
    },
    canonical_patch: patch
  };
}

function entityLabel(collection) {
  return collection.slice(0, -1);
}

function sameEntity(a, b) {
  return stableStringify(a) === stableStringify(b);
}

const ID_FIELD_BY_COLLECTION = Object.freeze({
  clans: 'clan_id',
  leagues: 'league_id',
  clan_leagues: 'clan_league_id',
  snapshots: 'snapshot_id',
  observations: 'observation_id',
  global_player_identities: 'global_player_id',
  membership_episodes: 'membership_episode_id',
  membership_events: 'membership_event_id',
  evidence_artifacts: 'evidence_artifact_id',
  resolution_cases: 'resolution_case_id',
  delta_results: 'delta_id'
});

function applyPatch(candidate, patch, failureInjection) {
  let writes = 0;

  for (const [collection, records] of Object.entries(patch)) {
    if (!Array.isArray(candidate[collection]) || !Array.isArray(records)) {
      throw new Error('invalid patch collection: ' + collection);
    }

    const idField = ID_FIELD_BY_COLLECTION[collection];
    if (!idField) throw new Error('unsupported patch collection: ' + collection);

    const index = new Map(candidate[collection].map((record) => [record[idField], record]));
    for (const record of records) {
      const id = record[idField];
      if (!id) throw new Error(entityLabel(collection) + ' missing ' + idField);

      if (index.has(id)) {
        if (!sameEntity(index.get(id), record)) {
          const error = new Error(
            'conflicting ' + entityLabel(collection) + ' content for id: ' + id
          );
          error.code = 'ENTITY_CONTENT_CONFLICT';
          throw error;
        }
        continue;
      }

      candidate[collection].push(clone(record));
      index.set(id, record);
      writes += 1;

      if (
        failureInjection?.throw_after_writes !== undefined &&
        writes >= failureInjection.throw_after_writes
      ) {
        throw new Error('injected persistence failure after ' + writes + ' writes');
      }

      if (typeof failureInjection?.on_write === 'function') {
        failureInjection.on_write({ collection, id, writes });
      }
    }
  }

  return writes;
}

function compareExistingSnapshot(state, transaction) {
  const snapshot = state.snapshots.find(
    (item) => item.snapshot_id === transaction.domain_scope.snapshot_id
  );
  if (!snapshot) return null;

  const incoming = transaction.canonical_patch.snapshots.find(
    (item) => item.snapshot_id === transaction.domain_scope.snapshot_id
  );
  return {
    identical: sameEntity(snapshot, incoming),
    snapshot
  };
}

class CanonicalPersistencePort {
  read() {
    throw new Error('CanonicalPersistencePort.read() is not implemented');
  }

  version() {
    throw new Error('CanonicalPersistencePort.version() is not implemented');
  }

  commit() {
    throw new Error('CanonicalPersistencePort.commit() is not implemented');
  }
}

class InMemoryAtomicPersistenceAdapter extends CanonicalPersistencePort {
  constructor(initialModel = emptyCanonicalModel()) {
    super();
    validateCanonicalModel(initialModel);
    this._state = clone(initialModel);
    this._version = 0;
    this._transactions = new Map();
  }

  read() {
    return clone(this._state);
  }

  version() {
    return this._version;
  }

  transactionRecord(idempotencyKey) {
    const record = this._transactions.get(idempotencyKey);
    return record ? clone(record) : null;
  }

  commit(transaction, options = {}) {
    if (!transaction || transaction.transaction_schema_version !== TRANSACTION_SCHEMA_VERSION) {
      return {
        result: 'REJECTED',
        transaction_id: transaction?.transaction_id || null,
        idempotency_key: transaction?.idempotency_key || null,
        committed: false,
        state_changed: false,
        reason: 'unsupported_or_missing_transaction_schema'
      };
    }

    const prior = this._transactions.get(transaction.idempotency_key);
    if (prior) {
      if (prior.plan_hash === transaction.plan_hash) {
        return {
          result: 'IDEMPOTENT_REPLAY',
          transaction_id: transaction.transaction_id,
          idempotency_key: transaction.idempotency_key,
          committed: false,
          state_changed: false,
          version: prior.version,
          reason: 'exact_transaction_replay'
        };
      }
      return {
        result: 'CONFLICT',
        transaction_id: transaction.transaction_id,
        idempotency_key: transaction.idempotency_key,
        committed: false,
        state_changed: false,
        version: this._version,
        reason: 'idempotency_key_reused_with_different_plan'
      };
    }

    const duplicate = compareExistingSnapshot(this._state, transaction);
    if (duplicate) {
      if (duplicate.identical && transaction.plan_hash === sha256(transaction.canonical_patch)) {
        return {
          result: 'IDEMPOTENT_REPLAY',
          transaction_id: transaction.transaction_id,
          idempotency_key: transaction.idempotency_key,
          committed: false,
          state_changed: false,
          version: this._version,
          reason: 'existing_identical_snapshot'
        };
      }
      return {
        result: 'CONFLICT',
        transaction_id: transaction.transaction_id,
        idempotency_key: transaction.idempotency_key,
        committed: false,
        state_changed: false,
        version: this._version,
        reason: 'snapshot_id_exists_with_different_transaction_content'
      };
    }

    if (transaction.transaction_status === 'REVIEW_REQUIRED' && !options.allowReviewPersistence) {
      return {
        result: 'REVIEW_REQUIRED',
        transaction_id: transaction.transaction_id,
        idempotency_key: transaction.idempotency_key,
        committed: false,
        state_changed: false,
        version: this._version,
        reason: 'transaction_requires_review_before_persistence'
      };
    }

    if (
      transaction.expected_version !== null &&
      transaction.expected_version !== undefined &&
      transaction.expected_version !== this._version
    ) {
      return {
        result: 'CONFLICT',
        transaction_id: transaction.transaction_id,
        idempotency_key: transaction.idempotency_key,
        committed: false,
        state_changed: false,
        version: this._version,
        reason: 'expected_version_mismatch'
      };
    }

    const before = clone(this._state);
    const candidate = clone(this._state);

    try {
      const writes = applyPatch(candidate, transaction.canonical_patch, options.failureInjection);
      assertHistoryPreserved(before, candidate);
      validateCanonicalModel(candidate);

      this._state = candidate;
      this._version += 1;

      const result = {
        result: transaction.transaction_status === 'REVIEW_REQUIRED'
          ? 'REVIEW_REQUIRED'
          : 'COMMITTED',
        transaction_id: transaction.transaction_id,
        idempotency_key: transaction.idempotency_key,
        committed: true,
        state_changed: writes > 0,
        version: this._version,
        writes,
        reason: transaction.transaction_status === 'REVIEW_REQUIRED'
          ? 'persisted_without_identity_binding_pending_review'
          : 'atomic_commit'
      };

      this._transactions.set(transaction.idempotency_key, clone({
        transaction_id: transaction.transaction_id,
        plan_hash: transaction.plan_hash,
        version: this._version,
        result: result.result
      }));

      return result;
    } catch (error) {
      return {
        result: 'FAILED_ROLLED_BACK',
        transaction_id: transaction.transaction_id,
        idempotency_key: transaction.idempotency_key,
        committed: false,
        state_changed: false,
        version: this._version,
        reason: error.code || 'persistence_failure',
        error: error.message
      };
    }
  }
}

module.exports = {
  TRANSACTION_RESULTS,
  TRANSACTION_SCHEMA_VERSION,
  stableStringify,
  sha256,
  createSnapshotIdempotencyKey,
  canonicalResolutionStatus,
  createSnapshotPersistencePlan,
  CanonicalPersistencePort,
  InMemoryAtomicPersistenceAdapter
};
