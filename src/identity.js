'use strict';

const IDENTITY_STATUSES = Object.freeze([
  'UNRESOLVED',
  'CANDIDATE',
  'RESOLVED',
  'AMBIGUOUS',
  'NEW_IDENTITY_PENDING_AUTHORITY',
  'REJECTED_MATCH'
]);

function buildFingerprint(observation) {
  return {
    stage: Number.isInteger(observation.stage) ? observation.stage : null,
    total_kills: Number.isInteger(observation.total_kills) ? observation.total_kills : null,
    weapons: observation.weapons && typeof observation.weapons === 'object'
      ? { ...observation.weapons }
      : null
  };
}

function compareFingerprint(left, right) {
  const a = buildFingerprint(left);
  const b = buildFingerprint(right);
  const weaponKeys = [...new Set([
    ...Object.keys(a.weapons || {}),
    ...Object.keys(b.weapons || {})
  ])].sort();

  return {
    stage: a.stage !== null && b.stage !== null
      ? { comparable: true, match: a.stage === b.stage, left: a.stage, right: b.stage }
      : { comparable: false, match: null, left: a.stage, right: b.stage },
    total_kills: a.total_kills !== null && b.total_kills !== null
      ? { comparable: true, match: a.total_kills === b.total_kills, left: a.total_kills, right: b.total_kills }
      : { comparable: false, match: null, left: a.total_kills, right: b.total_kills },
    weapons: Object.fromEntries(weaponKeys.map((key) => [
      key,
      {
        comparable: Number.isInteger(a.weapons?.[key]) && Number.isInteger(b.weapons?.[key]),
        match: Number.isInteger(a.weapons?.[key]) && Number.isInteger(b.weapons?.[key])
          ? a.weapons[key] === b.weapons[key]
          : null,
        left: a.weapons?.[key] ?? null,
        right: b.weapons?.[key] ?? null
      }
    ]))
  };
}

function resolveIdentity({ observation, candidates = [], resolutionDecision = null }) {
  if (!observation) throw new Error('observation is required');
  const comparisons = candidates.map((candidate) => ({
    candidate,
    signals: compareFingerprint(observation, candidate.observation || candidate)
  }));

  if (!resolutionDecision) {
    return {
      status: comparisons.length > 1 ? 'AMBIGUOUS' : 'CANDIDATE',
      global_player_id: null,
      comparisons,
      decision: null
    };
  }

  if (!IDENTITY_STATUSES.includes(resolutionDecision.status)) {
    throw new Error(`unsupported identity status: ${resolutionDecision.status}`);
  }

  if (resolutionDecision.status === 'RESOLVED' && !resolutionDecision.global_player_id) {
    throw new Error('RESOLVED identity decision requires global_player_id');
  }

  return {
    status: resolutionDecision.status,
    global_player_id: resolutionDecision.global_player_id || null,
    comparisons,
    decision: {
      authority_ref: resolutionDecision.authority_ref || null,
      evidence_refs: Array.isArray(resolutionDecision.evidence_refs) ? [...resolutionDecision.evidence_refs] : [],
      decided_at_utc: resolutionDecision.decided_at_utc || null,
      reason: resolutionDecision.reason || null
    }
  };
}

module.exports = { IDENTITY_STATUSES, buildFingerprint, compareFingerprint, resolveIdentity };
