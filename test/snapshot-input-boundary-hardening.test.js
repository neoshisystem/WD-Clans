'use strict';

const assert=require('node:assert/strict');
const test=require('node:test');
const {validate:validateSnapshotInput}=require('../src/validate-snapshot');
const {RawExtractionSourceAdapter,validateRawExtraction,SourceAdapterError}=require('../src/source-adapter');
const {prepareSnapshotTransaction}=require('../src/pipeline');
const {validateJsonSchema}=require('../src/schema-validator');
const RAW_SCHEMA=require('../schemas/raw-extraction.v0.1.schema.json');

function capture(status,rawValue,evidenceRefs,extra={}){
  return {status,evidence_refs:evidenceRefs,...(rawValue!==null?{raw_value:rawValue}:{}),...extra};
}
function member(key,rank=1){
  return {
    source_member_key:key,
    fields:{
      rank:capture('OBSERVED',String(rank),['ART-RANK']),
      display_name:capture('OBSERVED','Player '+rank,['ART-RANK']),
      stage:capture('OBSERVED','10',['ART-RANK']),
      weapons:capture('OBSERVED',{'25mm':'4','Hydra-70':'2'},['ART-PROFILE']),
      total_kills:capture('OBSERVED','10000',['ART-PROFILE']),
      lifetime_medals:capture('OBSERVED',{'gold':'7'},['ART-PROFILE']),
      current_league_clan_medals:capture('OBSERVED','100',['ART-RANK']),
      profile_total_clan_medal_count:capture('OBSERVED','200',['ART-PROFILE']),
      last_online_utc:capture('OBSERVED','2026-09-25T17:00:00Z',['ART-PROFILE'])
    },
    evidence_refs:['ART-RANK','ART-PROFILE']
  };
}
function rawBase(){
  return {
    extraction_schema_version:'0.1',
    extraction_id:'EX-001',
    source:{
      primary_artifact_id:'ART-RANK',
      artifacts:[
        {artifact_id:'ART-RANK',artifact_type:'ranking-screenshot',source_location:'rank-1',content_hash:{algorithm:'sha256',value:'hash-rank'}},
        {artifact_id:'ART-PROFILE',artifact_type:'profile-screenshot',source_location:'profile-1',content_hash:{algorithm:'sha256',value:'hash-profile'}}
      ]
    },
    members:[member('ROW-001')]
  };
}
function authority(){
  return {
    project_id:'UCS',
    clan_id:'CLAN-A',
    snapshot:{
      snapshot_id:'S-001',sequence:1,official_timestamp_utc:'2026-09-25T12:00:00Z',
      member_count:1,capacity:50
    },
    league:{
      league_id:'LEAGUE-2026-09-24',
      starts_at_utc:'2026-09-24T00:00:00Z',
      ends_at_utc:'2026-10-01T00:00:00Z',
      status:'ACTIVE'
    }
  };
}
test('full Ranking + Profile Snapshot produces valid Standard SnapshotInput',()=>{
  const input=new RawExtractionSourceAdapter().toSnapshotInput(rawBase(),authority());
  assert.equal(validateSnapshotInput(input).valid,true);
  assert.equal(input.snapshot.member_count,1);
  assert.equal(input.members[0].total_kills,10000);
  assert.deepEqual(input.members[0].field_provenance.total_kills.evidence_refs,['ART-PROFILE']);
  assert.equal(input.source.artifacts.length,2);
});
test('roster count is independent from Profile coverage; missing Profile is explicit, not zero',()=>{
  const raw=rawBase();
  const m=member('ROW-002',2);
  for(const f of ['weapons','total_kills','lifetime_medals','profile_total_clan_medal_count','last_online_utc'])m.fields[f]=capture(f==='profile_total_clan_medal_count'?'UNKNOWN':'NOT_VISIBLE',null,['ART-RANK']);
  m.evidence_refs=['ART-RANK'];
  raw.members.push(m);
  const ctx=authority();ctx.snapshot.member_count=2;
  const input=new RawExtractionSourceAdapter().toSnapshotInput(raw,ctx);
  assert.equal(input.members.length,2);
  assert.equal(input.members[1].total_kills,null);
  assert.notEqual(input.members[1].total_kills,0);
  assert.equal(input.members[1].field_provenance.total_kills.status,'NOT_VISIBLE');
});
test('duplicate source_member_key is rejected',()=>{
  const raw=rawBase();raw.members.push(structuredClone(raw.members[0]));
  assert.throws(()=>validateRawExtraction(raw),(e)=>e.code==='DUPLICATE_SOURCE_MEMBER_KEY');
});
test('duplicate rank is rejected at Standard SnapshotInput validation',()=>{
  const raw=rawBase();raw.members.push(member('ROW-002',1));
  const ctx=authority();ctx.snapshot.member_count=2;
  assert.throws(()=>new RawExtractionSourceAdapter().toSnapshotInput(raw,ctx),(e)=>e instanceof SourceAdapterError&&/duplicate rank/.test(e.message));
});
test('same-Snapshot Ranking/Profile captures merge deterministically',()=>{
  const raw=rawBase();
  raw.members[0].fields.total_kills=[
    capture('OBSERVED','10000',['ART-PROFILE']),
    capture('OBSERVED','۱۰٬۰۰۰',['ART-RANK'])
  ];
  const input=new RawExtractionSourceAdapter().toSnapshotInput(raw,authority());
  assert.equal(input.members[0].total_kills,10000);
  assert.deepEqual(input.members[0].field_provenance.total_kills.evidence_refs,['ART-PROFILE','ART-RANK']);
});
test('same-Snapshot conflicting field values become CONFLICTING and then Review',()=>{
  const raw=rawBase();
  raw.members[0].fields.total_kills=[
    capture('OBSERVED','10000',['ART-RANK']),
    capture('OBSERVED','10001',['ART-PROFILE'])
  ];
  const input=new RawExtractionSourceAdapter().toSnapshotInput(raw,authority());
  assert.equal(input.members[0].total_kills,null);
  assert.equal(input.members[0].field_provenance.total_kills.status,'CONFLICTING');
  const plan=prepareSnapshotTransaction(input);
  assert.equal(plan.transaction_status,'REVIEW_REQUIRED');
  assert.ok(plan.review_reasons.some((r)=>r.reason==='field_observation_conflicting'));
});
test('official Snapshot timestamp is structurally validated',()=>{
  const raw=rawBase();const ctx=authority();ctx.snapshot.official_timestamp_utc='2026/09/25 12:00';
  assert.throws(()=>new RawExtractionSourceAdapter().toSnapshotInput(raw,ctx),(e)=>e.code==='SNAPSHOT_INPUT_CONTRACT_INVALID');
});
test('League boundary follows GAME_RULES and source context cannot redefine it',()=>{
  const raw=rawBase();const ctx=authority();ctx.league.starts_at_utc='2026-09-25T00:00:00Z';ctx.league.ends_at_utc='2026-10-02T00:00:00Z';
  assert.throws(()=>new RawExtractionSourceAdapter().toSnapshotInput(raw,ctx),(e)=>e.code==='SNAPSHOT_INPUT_CONTRACT_INVALID');
});
test('Source Adapter never emits Global Player ID',()=>{
  const raw=rawBase();raw.members[0].source_identity={status:'AMBIGUOUS'};
  const input=new RawExtractionSourceAdapter().toSnapshotInput(raw,authority());
  assert.equal('global_player_id' in input.members[0],false);
});
test('identical Source Input + authority context yields byte-equivalent SnapshotInput',()=>{
  const raw=rawBase();const ctx=authority();
  const a=new RawExtractionSourceAdapter().toSnapshotInput(raw,ctx);
  const b=new RawExtractionSourceAdapter().toSnapshotInput(structuredClone(raw),structuredClone(ctx));
  assert.equal(JSON.stringify(a),JSON.stringify(b));
});
test('cross-Snapshot identity is not inferred from rank/name/source_member_key',()=>{
  const input=new RawExtractionSourceAdapter().toSnapshotInput(rawBase(),authority());
  const plan=prepareSnapshotTransaction(input,{
    previousBySourceKey:{'ROW-001':{total_kills:9000,current_league_clan_medals:50,profile_total_clan_medal_count:150,stage:9,weapons:{'25mm':3},lifetime_medals:{gold:6}}},
    membershipBySourceKey:{'ROW-001':{sameLeague:true,sameEpisode:true,prior_episode_exists:true,prior_observation_observed:true}}
  });
  assert.equal(plan.members[0].identity_resolution.status,'UNRESOLVED');
  assert.equal(plan.members[0].metrics.lifetime,null);
  assert.equal(plan.members[0].metrics.current_league_clan_medals.delta,100);
});
test('RawExtraction schema allows a same-field capture set and structural validator rejects malformed input',()=>{
  const raw=rawBase();
  raw.members[0].fields.total_kills=[raw.members[0].fields.total_kills,structuredClone(raw.members[0].fields.total_kills)];
  assert.equal(validateJsonSchema(raw,RAW_SCHEMA),true);
  raw.members[0].fields.total_kills=[];
  assert.throws(()=>validateRawExtraction(raw),(e)=>e.code==='RAW_SCHEMA_INVALID');
});
test('SnapshotInput schema permits null Profile fields only when domain provenance explains the absence',()=>{
  const input=new RawExtractionSourceAdapter().toSnapshotInput(rawBase(),authority());
  input.members[0].total_kills=null;
  input.members[0].field_provenance.total_kills={status:'NOT_VISIBLE',evidence_refs:['ART-RANK']};
  assert.equal(validateSnapshotInput(input).valid,true);
  delete input.members[0].field_provenance.total_kills;
  assert.throws(()=>validateSnapshotInput(input),/requires field_provenance/);
});
test('authority Snapshot identity and timestamp are never sourced from extraction id or artifact metadata',()=>{
  const raw=rawBase();raw.extraction_id='SOURCE-SHOULD-NOT-BECOME-SNAPSHOT-ID';
  raw.source.artifacts[0].source_location='2026-09-24T00:00:00Z';
  const ctx=authority();ctx.snapshot.snapshot_id='OFFICIAL-S-900';
  const input=new RawExtractionSourceAdapter().toSnapshotInput(raw,ctx);
  assert.equal(input.snapshot.snapshot_id,'OFFICIAL-S-900');
  assert.equal(input.snapshot.official_timestamp_utc,'2026-09-25T12:00:00Z');
});
