'use strict';

const { validate } = require('./validate-snapshot');
const { bindSnapshotToLeague } = require('./league');
const { resolveIdentity } = require('./identity');
const { classifyMembership } = require('./membership');
const {
  validateLifetimeMetrics,
  currentLeagueClanMedalDelta,
  membershipEpisodeClanMedalContribution
} = require('./metrics');

function prepareSnapshotTransaction(input, context = {}) {
  const validation = validate(input);
  const leagueBinding = bindSnapshotToLeague(
    input.snapshot.official_timestamp_utc,
    input.league
  );

  const previousBySourceKey = context.previousBySourceKey || {};
  const candidatesBySourceKey = context.candidatesBySourceKey || {};
  const decisionsBySourceKey = context.identityDecisionsBySourceKey || {};
  const membershipBySourceKey = context.membershipBySourceKey || {};

  const members = input.members.map((member) => {
    const previous = previousBySourceKey[member.source_member_key] || null;
    const candidates = candidatesBySourceKey[member.source_member_key] || [];
    const identity = resolveIdentity({
      observation: member,
      candidates,
      resolutionDecision: decisionsBySourceKey[member.source_member_key] || null
    });

    const priorMembership = membershipBySourceKey[member.source_member_key] || {};
    const membership = classifyMembership({
      currentObserved: true,
      priorEpisodeExists: Boolean(priorMembership.prior_episode_exists),
      priorObservationObserved: Boolean(previous),
      priorEpisodeEnded: Boolean(priorMembership.prior_episode_ended)
    });

    const lifetime = previous && identity.global_player_id
      ? validateLifetimeMetrics(previous, member)
      : null;

    const currentLeague = currentLeagueClanMedalDelta({
      current: member.current_league_clan_medals,
      previous: previous?.current_league_clan_medals ?? null,
      sameLeague: Boolean(priorMembership.same_league)
    });

    const episodeClanMedal = membershipEpisodeClanMedalContribution({
      current: member.profile_total_clan_medal_count,
      previous: previous?.profile_total_clan_medal_count ?? null,
      sameEpisode: Boolean(priorMembership.same_episode),
      sameLeague: Boolean(priorMembership.same_league)
    });

    return {
      source_member_key: member.source_member_key,
      source_identity: member.source_identity || null,
      display_name: member.display_name,
      snapshot_id: input.snapshot.snapshot_id,
      clan_id: input.clan_id,
      league_id: leagueBinding.league_id,
      identity_resolution: identity,
      membership_resolution: membership,
      observation: { ...member },
      metrics: {
        lifetime,
        current_league_clan_medals: currentLeague,
        membership_episode_clan_medals: episodeClanMedal
      }
    };
  });

  const reviewReasons = [];
  for (const member of members) {
    if (member.identity_resolution.status !== 'CONFIRMED') {
      reviewReasons.push({
        source_member_key: member.source_member_key,
        reason: 'identity_resolution_not_confirmed',
        status: member.identity_resolution.status
      });
    }
    const lifetime = member.metrics.lifetime;
    if (lifetime) {
      if (lifetime.total_kills.status === 'ANOMALY') reviewReasons.push({ source_member_key: member.source_member_key, reason: 'total_kills_anomaly' });
      if (lifetime.stage.status === 'ANOMALY') reviewReasons.push({ source_member_key: member.source_member_key, reason: 'stage_anomaly' });
      if (Object.values(lifetime.weapons).some((result) => result.status === 'ANOMALY')) {
        reviewReasons.push({ source_member_key: member.source_member_key, reason: 'weapon_level_anomaly' });
      }
      if (Object.values(lifetime.lifetime_medals).some((result) => result.status === 'ANOMALY')) {
        reviewReasons.push({ source_member_key: member.source_member_key, reason: 'lifetime_medal_anomaly' });
      }
    }
    if (member.metrics.current_league_clan_medals.status === 'ANOMALY') {
      reviewReasons.push({ source_member_key: member.source_member_key, reason: 'current_league_clan_medal_anomaly' });
    }
    if (member.metrics.membership_episode_clan_medals.status === 'ANOMALY') {
      reviewReasons.push({ source_member_key: member.source_member_key, reason: 'membership_episode_clan_medal_anomaly' });
    }
  }

  return {
    transaction_status: reviewReasons.length === 0 ? 'READY_FOR_PERSISTENCE_REVIEW' : 'REVIEW_REQUIRED',
    validation,
    league_binding: leagueBinding,
    members,
    review_reasons: reviewReasons,
    persistence: {
      atomic_boundary_required: true,
      writes_planned: true,
      side_effects_executed: false
    }
  };
}

module.exports = { prepareSnapshotTransaction };
