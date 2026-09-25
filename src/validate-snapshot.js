'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {bindSnapshotToLeague}=require('./league');
const {SchemaValidationError,validateJsonSchema}=require('./schema-validator');
const SNAPSHOT_SCHEMA=require('../schemas/snapshot-input.schema.json');

const FIELD_STATUSES=new Set(['OBSERVED','NOT_VISIBLE','UNKNOWN','AMBIGUOUS','CONFLICTING']);
const FIELD_NAMES=['rank','display_name','role','stage','weapons','total_kills','lifetime_medals','current_league_clan_medals','profile_total_clan_medal_count','last_online_utc'];
const NULLABLE_PROFILE_FIELDS=new Set(['weapons','total_kills','lifetime_medals','profile_total_clan_medal_count','last_online_utc']);

function fail(message){console.error('SNAPSHOT INPUT INVALID: '+message);process.exitCode=1;}

function validateFieldProvenance(member,sourceArtifactIds,pathPrefix){
  const provenance=member.field_provenance||{};
  for(const [fieldName,meta] of Object.entries(provenance)){
    if(!FIELD_NAMES.includes(fieldName))throw new Error(pathPrefix+'.field_provenance.'+fieldName+' is unsupported');
    if(!FIELD_STATUSES.has(meta.status))throw new Error(pathPrefix+'.field_provenance.'+fieldName+'.status is invalid');
    for(const ref of meta.evidence_refs)if(!sourceArtifactIds.has(ref))throw new Error(pathPrefix+'.field_provenance.'+fieldName+'.evidence_refs contains undeclared artifact: '+ref);
    const hasValue=Object.prototype.hasOwnProperty.call(member,fieldName);
    const value=hasValue?member[fieldName]:null;
    if(meta.status==='OBSERVED'){
      if(!hasValue||value===null)throw new Error(pathPrefix+'.'+fieldName+' cannot be null/absent when provenance status is OBSERVED');
    }else if(hasValue&&value!==null){
      throw new Error(pathPrefix+'.'+fieldName+' must be null when provenance status is '+meta.status);
    }
  }
  for(const fieldName of NULLABLE_PROFILE_FIELDS){
    const hasValue=Object.prototype.hasOwnProperty.call(member,fieldName);
    const value=hasValue?member[fieldName]:null;
    if((value===null||!hasValue)&&(!provenance[fieldName]||!['NOT_VISIBLE','UNKNOWN','AMBIGUOUS','CONFLICTING'].includes(provenance[fieldName].status))){
      throw new Error(pathPrefix+'.'+fieldName+' is missing and requires field_provenance status NOT_VISIBLE/UNKNOWN/AMBIGUOUS/CONFLICTING');
    }
  }
}

function validate(input){
  if(!input||typeof input!=='object')throw new Error('input must be an object');
  try{validateJsonSchema(input,SNAPSHOT_SCHEMA);}
  catch(error){
    if(error instanceof SchemaValidationError){const wrapped=new Error(error.message);wrapped.code='SNAPSHOT_SCHEMA_INVALID';wrapped.path=error.path;throw wrapped;}
    throw error;
  }
  const snapshot=input.snapshot,members=input.members;
  if(snapshot.member_count>snapshot.capacity)throw new Error('member_count cannot exceed capacity');
  if(members.length!==snapshot.member_count)throw new Error('members.length must equal snapshot.member_count');

  const sourceArtifactIds=new Set();
  if(Array.isArray(input.source.artifacts)){
    for(const artifact of input.source.artifacts){
      if(sourceArtifactIds.has(artifact.artifact_id))throw new Error('duplicate source artifact: '+artifact.artifact_id);
      sourceArtifactIds.add(artifact.artifact_id);
    }
    if(!sourceArtifactIds.has(input.source.artifact_id))throw new Error('source.artifacts must include the primary artifact_id');
  }else sourceArtifactIds.add(input.source.artifact_id);

  const ranks=new Set(),sourceKeys=new Set();
  for(let index=0;index<members.length;index++){
    const member=members[index],p='$.members['+index+']';
    if(sourceKeys.has(member.source_member_key))throw new Error('duplicate source_member_key: '+member.source_member_key);
    sourceKeys.add(member.source_member_key);
    if(ranks.has(member.rank))throw new Error('duplicate rank: '+member.rank);
    ranks.add(member.rank);
    if(!member.display_name.trim())throw new Error('display_name is required');
    if(member.evidence_refs)for(const ref of member.evidence_refs)if(!sourceArtifactIds.has(ref))throw new Error(p+'.evidence_refs contains undeclared artifact: '+ref);
    validateFieldProvenance(member,sourceArtifactIds,p);
  }
  bindSnapshotToLeague(snapshot.official_timestamp_utc,input.league);
  return {valid:true,project_id:input.project_id,clan_id:input.clan_id,snapshot_id:snapshot.snapshot_id,league_id:input.league.league_id};
}
if(require.main===module){
  try{
    const file=process.argv[2];
    if(!file)throw new Error('usage: node src/validate-snapshot.js <input.json>');
    console.log(JSON.stringify(validate(JSON.parse(fs.readFileSync(path.resolve(file),'utf8'))),null,2));
  }catch(error){fail(error.message);}
}
module.exports={validate};
