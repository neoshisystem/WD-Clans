'use strict';

(function () {
  const bundle = globalThis.UCS_STATIC_DATA;

  if (!bundle || !bundle.read_model) {
    throw new Error('UCS static data bundle is missing');
  }

  const model = bundle.read_model;
  const snapshot = model.snapshots[model.snapshots.length - 1] || null;
  const clan = model.clans.find((item) => item.clan_id === snapshot?.clan_id) || null;
  const member = snapshot?.members?.[0] || null;

  const text = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  const display = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  text('clan-name', display(clan?.display_name));
  text(
    'snapshot-meta',
    snapshot
      ? display(snapshot.official_timestamp_utc) + ' · ' + snapshot.league_id
      : '—'
  );
  text('snapshot-id', display(snapshot?.snapshot_id));
  text('member-count', display(snapshot?.member_count));
  text('projection-version', display(model.projection_version));
  text('evidence-count', display(bundle.provenance?.evidence_refs?.length ?? 0));
  text('canonical-ref-count', display(bundle.provenance?.canonical_refs?.length ?? 0));
  text('evidence-ref-list', display((bundle.provenance?.evidence_refs || []).join(', ')));
  text('static-version', display(bundle.static_data_version));

  if (member) {
    text('role-value', display(member.role));
    text(
      'last-online-status',
      member.last_online_utc === null
        ? display(member.provenance?.field_provenance?.last_online_utc?.status)
        : display(member.last_online_utc)
    );

    const row = document.createElement('tr');
    [
      member.rank,
      member.display_name,
      member.stage,
      member.current_league_clan_medals,
      member.total_kills,
      display(member.last_online_utc)
    ].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = display(value);
      row.appendChild(cell);
    });
    document.getElementById('members-body').appendChild(row);
  }

  const playerById = new Map(
    (Array.isArray(model.global_players) ? model.global_players : [])
      .map((player) => [player.global_player_id, player])
  );

  const deltaResults = Array.isArray(model.delta_results)
    ? model.delta_results
    : [];
  const deltaBody = document.getElementById('delta-results-body');
  const deltaEmptyState = document.getElementById('delta-empty-state');

  const displayDelta = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    return typeof value === 'number' && value > 0
      ? '+' + String(value)
      : String(value);
  };

  const appendDeltaCell = (row, value, className = '') => {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    row.appendChild(cell);
  };

  if (deltaBody && deltaResults.length > 0) {
    deltaResults.forEach((delta) => {
      const row = document.createElement('tr');
      const player = playerById.get(delta.global_player_id);
      const playerLabel = player?.display_name
        ? player.display_name + ' · ' + display(delta.global_player_id)
        : display(delta.global_player_id);

      appendDeltaCell(row, display(delta.scope));
      appendDeltaCell(row, display(delta.metric_key));
      appendDeltaCell(row, playerLabel);
      appendDeltaCell(row, displayDelta(delta.delta), 'delta-value');
      appendDeltaCell(row, display(delta.status));
      appendDeltaCell(row, display(delta.baseline_type));
      appendDeltaCell(row, display(delta.current_observation_id));
      appendDeltaCell(row, display(delta.baseline_observation_id));
      appendDeltaCell(row, display(delta.reason));

      deltaBody.appendChild(row);
    });
  }

  if (deltaEmptyState) {
    deltaEmptyState.textContent = 'No projected Delta records are present in this Static Data Bundle.';
    deltaEmptyState.hidden = deltaResults.length !== 0;
  }

  const hashSource = JSON.stringify({
    static_data_version: bundle.static_data_version,
    projection_version: model.projection_version,
    snapshot_id: snapshot?.snapshot_id || null,
    canonical_refs: bundle.provenance?.canonical_refs || [],
    evidence_refs: bundle.provenance?.evidence_refs || []
  });

  let hash = 0;
  for (let index = 0; index < hashSource.length; index += 1) {
    hash = ((hash << 5) - hash) + hashSource.charCodeAt(index);
    hash |= 0;
  }
  text('bundle-hash', 'bundle signature ' + Math.abs(hash).toString(16));
})();
