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
