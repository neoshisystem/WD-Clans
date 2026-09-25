'use strict';

const MEMBERSHIP_EVENTS = Object.freeze([
  'JOIN',
  'CONTINUE',
  'NOT_OBSERVED',
  'LEAVE',
  'RETURN',
  'POSSIBLE_TRANSFER',
  'UNKNOWN_CHANGE'
]);

function classifyMembership({ currentObserved, priorEpisodeExists, priorObservationObserved, priorEpisodeEnded }) {
  if (currentObserved) {
    if (!priorObservationObserved && priorEpisodeExists && priorEpisodeEnded) return 'RETURN';
    if (!priorObservationObserved && !priorEpisodeExists) return 'JOIN';
    if (priorObservationObserved) return 'CONTINUE';
    return priorEpisodeExists ? 'UNKNOWN_CHANGE' : 'JOIN';
  }
  return 'NOT_OBSERVED';
}

function resolveAbsenceToLeave({ event = null, authorityRef = null, evidenceRefs = [] } = {}) {
  if (event !== 'LEAVE') return {
    status: 'NOT_OBSERVED',
    resolved: false,
    authority_ref: authorityRef,
    evidence_refs: [...evidenceRefs]
  };
  if (!authorityRef && evidenceRefs.length === 0) {
    throw new Error('LEAVE requires authority_ref or evidence_refs');
  }
  return {
    status: 'LEAVE',
    resolved: true,
    authority_ref: authorityRef,
    evidence_refs: [...evidenceRefs]
  };
}

function validateTransferResolution({ globalPlayerId, fromClanId, toClanId, authorityRef, evidenceRefs = [] }) {
  if (!globalPlayerId) throw new Error('transfer resolution requires global_player_id');
  if (!fromClanId || !toClanId || fromClanId === toClanId) throw new Error('transfer requires distinct source and destination clans');
  if (!authorityRef && evidenceRefs.length === 0) throw new Error('POSSIBLE_TRANSFER requires evidence or authority reference');
  return {
    status: 'POSSIBLE_TRANSFER',
    global_player_id: globalPlayerId,
    from_clan_id: fromClanId,
    to_clan_id: toClanId,
    authority_ref: authorityRef || null,
    evidence_refs: [...evidenceRefs]
  };
}

module.exports = { MEMBERSHIP_EVENTS, classifyMembership, resolveAbsenceToLeave, validateTransferResolution };
