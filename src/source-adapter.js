'use strict';
const fs=require('node:fs');
const {validateJsonSchema,SchemaValidationError}=require('./schema-validator');
const {validate:validateSnapshotInput}=require('./validate-snapshot');
const RAW_SCHEMA=require('../schemas/raw-extraction.v0.1.schema.json');

const RAW_EXTRACTION_SCHEMA_VERSION='0.1';
const FIELD_STATUSES=Object.freeze(['OBSERVED','NOT_VISIBLE','UNKNOWN','AMBIGUOUS','CONFLICTING']);
const INTERPRETATION_STATUSES=Object.freeze(['NONE','INTERPRETED']);
const ADAPTER_RESULTS=Object.freeze(['READY','BLOCKED']);
const REQUIRED_MEMBER_FIELDS=Object.freeze(['rank','display_name','stage','weapons','total_kills','lifetime_medals','current_league_clan_medals','profile_total_clan_medal_count']);
const OPTIONAL_MEMBER_FIELDS=Object.freeze(['role','last_online_utc']);
const RANKING_REQUIRED=new Set(['rank','display_name','stage','current_league_clan_medals']);
const INTEGER_FIELDS=new Set(['rank','stage','total_kills','current_league_clan_medals','profile_total_clan_medal_count']);
const DATE_FIELDS=new Set(['last_online_utc']);
const TEXT_FIELDS=new Set(['display_name','role']);
const FIELD_ORDER=Object.freeze([...REQUIRED_MEMBER_FIELDS,...OPTIONAL_MEMBER_FIELDS]);

class SourceAdapterError extends Error{
  constructor(code,path,message,details={}){super(message);this.name='SourceAdapterError';this.code=code;this.path=path;this.details=details;}
}
function clone(value){return structuredClone(value);}
function hasOwn(object,key){return Object.prototype.hasOwnProperty.call(object,key);}
function isObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function sortUnique(values){return [...new Set(values)].sort();}
function stableValue(value){
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map((key)=>[key,stableValue(value[key])]));
  return value;
}
function equalValues(left,right){return JSON.stringify(stableValue(left))===JSON.stringify(stableValue(right));}
function captureList(value){
  if(Array.isArray(value)){
    if(value.length===0)throw new SourceAdapterError('INVALID_RAW_EXTRACTION','$','field capture array must not be empty');
    return value;
  }
  return [value];
}
function normalizeDigits(value){
  return String(value).replace(/[۰-۹]/g,(d)=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,(d)=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
function parseInteger(value,path){
  if(Number.isInteger(value))return value;
  if(typeof value!=='string')throw new SourceAdapterError('NORMALIZATION_ERROR',path,'integer field must contain an integer or integer-formatted string');
  const normalized=normalizeDigits(value).trim().replace(/[,_\u066C\u00A0\u202F\s]/g,'');
  if(!/^-?\d+$/.test(normalized))throw new SourceAdapterError('NORMALIZATION_ERROR',path,'value is not an unambiguous integer representation');
  return Number(normalized);
}
function normalizeIntegerCapture(capture,path){
  const computed=parseInteger(capture.raw_value,path);
  const normalized=hasOwn(capture,'normalized_value')?parseInteger(capture.normalized_value,path+'.normalized_value'):computed;
  if(normalized!==computed)throw new SourceAdapterError('NORMALIZATION_CONFLICT',path,'normalized_value conflicts with deterministic normalization of raw_value');
  if(!Number.isSafeInteger(normalized)||normalized<0)throw new SourceAdapterError('INVALID_CORE_VALUE',path,'normalized integer must be a non-negative safe integer');
  return normalized;
}
function normalizeTextCapture(capture,path){
  if(typeof capture.raw_value!=='string')throw new SourceAdapterError('NORMALIZATION_ERROR',path,'text field must contain a string');
  const computed=capture.raw_value.trim();
  const normalized=hasOwn(capture,'normalized_value')?String(capture.normalized_value).trim():computed;
  if(normalized!==computed)throw new SourceAdapterError('NORMALIZATION_CONFLICT',path,'normalized text differs from deterministic trim normalization');
  if(!normalized)throw new SourceAdapterError('INVALID_CORE_VALUE',path,'normalized text must not be empty');
  return normalized;
}
function normalizeDateCapture(capture,path){
  if(typeof capture.raw_value!=='string')throw new SourceAdapterError('NORMALIZATION_ERROR',path,'date-time field must contain a string');
  const computed=capture.raw_value.trim();
  const normalized=hasOwn(capture,'normalized_value')?String(capture.normalized_value).trim():computed;
  if(normalized!==computed)throw new SourceAdapterError('NORMALIZATION_CONFLICT',path,'date-time normalization must be deterministic pass-through');
  if(Number.isNaN(Date.parse(normalized)))throw new SourceAdapterError('INVALID_DATE_TIME',path,'date-time is not parseable');
  return normalized;
}
function normalizeIntegerMapCapture(capture,path){
  if(!isObject(capture.raw_value))throw new SourceAdapterError('NORMALIZATION_ERROR',path,'map field must contain an object');
  const computed={};
  for(const key of Object.keys(capture.raw_value).sort()){
    const normalizedKey=key.trim();
    if(!normalizedKey)throw new SourceAdapterError('NORMALIZATION_ERROR',path,'map contains an empty key');
    if(hasOwn(computed,normalizedKey))throw new SourceAdapterError('NORMALIZATION_CONFLICT',path,'map keys collapse to the same normalized key: '+normalizedKey);
    computed[normalizedKey]=parseInteger(capture.raw_value[key],path+'.'+key);
    if(!Number.isSafeInteger(computed[normalizedKey])||computed[normalizedKey]<0)throw new SourceAdapterError('INVALID_CORE_VALUE',path+'.'+key,'normalized map value must be a non-negative safe integer');
  }
  if(hasOwn(capture,'normalized_value')){
    if(!isObject(capture.normalized_value))throw new SourceAdapterError('NORMALIZATION_CONFLICT',path,'normalized map must be an object');
    const supplied={};
    for(const key of Object.keys(capture.normalized_value).sort())supplied[key.trim()]=parseInteger(capture.normalized_value[key],path+'.normalized_value.'+key);
    if(!equalValues(supplied,computed))throw new SourceAdapterError('NORMALIZATION_CONFLICT',path,'normalized map differs from deterministic normalization');
  }
  return computed;
}
function validateFieldCapture(capture,path){
  if(!isObject(capture))throw new SourceAdapterError('INVALID_RAW_EXTRACTION',path,'field capture must be an object');
  if(!FIELD_STATUSES.includes(capture.status))throw new SourceAdapterError('INVALID_RAW_EXTRACTION',path+'.status','unsupported field status');
  const interpretation=capture.interpretation||'NONE';
  if(!INTERPRETATION_STATUSES.includes(interpretation))throw new SourceAdapterError('INVALID_RAW_EXTRACTION',path+'.interpretation','unsupported interpretation status');
  if(!Array.isArray(capture.evidence_refs)||capture.evidence_refs.length===0)throw new SourceAdapterError('INVALID_RAW_EXTRACTION',path+'.evidence_refs','field capture requires at least one evidence reference');
  if(capture.status==='OBSERVED'){
    if(!hasOwn(capture,'raw_value')||capture.raw_value===null||capture.raw_value===undefined)throw new SourceAdapterError('MISSING_RAW_VALUE',path+'.raw_value','OBSERVED field must preserve raw_value');
  }else if((hasOwn(capture,'raw_value')&&capture.raw_value!==null)||(hasOwn(capture,'normalized_value')&&capture.normalized_value!==null)){
    throw new SourceAdapterError('INVALID_RAW_EXTRACTION',path,'non-OBSERVED field cannot contain value payloads');
  }
}
function validateRawExtraction(raw){
  if(!isObject(raw))throw new SourceAdapterError('INVALID_RAW_EXTRACTION','$','raw extraction must be an object');
  try{validateJsonSchema(raw,RAW_SCHEMA);}
  catch(error){
    if(error instanceof SchemaValidationError)throw new SourceAdapterError('RAW_SCHEMA_INVALID',error.path,error.message);
    throw error;
  }
  if(raw.extraction_schema_version!==RAW_EXTRACTION_SCHEMA_VERSION)throw new SourceAdapterError('UNSUPPORTED_RAW_EXTRACTION_VERSION','$.extraction_schema_version','unsupported raw extraction schema version');
  if(!raw.extraction_id)throw new SourceAdapterError('INVALID_RAW_EXTRACTION','$.extraction_id','extraction_id is required');
  if(!isObject(raw.source))throw new SourceAdapterError('INVALID_RAW_EXTRACTION','$.source','source is required');
  const artifacts=raw.source.artifacts;
  const artifactIds=new Set();
  for(const [index,artifact] of artifacts.entries()){
    const p='$.source.artifacts['+index+']';
    if(!artifactIds.has(artifact.artifact_id))artifactIds.add(artifact.artifact_id);else throw new SourceAdapterError('INVALID_RAW_EXTRACTION',p,'artifact_id must be unique');
    if(String(artifact.content_hash.algorithm).toLowerCase()!=='sha256')throw new SourceAdapterError('INVALID_RAW_EXTRACTION',p+'.content_hash.algorithm','v0.1 requires SHA-256 artifact hashing');
  }
  if(!artifactIds.has(raw.source.primary_artifact_id))throw new SourceAdapterError('INVALID_RAW_EXTRACTION','$.source.primary_artifact_id','primary_artifact_id must reference a declared artifact');
  if(hasOwn(raw,'global_player_id'))throw new SourceAdapterError('FORBIDDEN_GLOBAL_ID','$.global_player_id','RawExtraction must never contain a Global Player ID');

  const memberKeys=new Set();
  for(const [index,member] of raw.members.entries()){
    const p='$.members['+index+']';
    if(!member.source_member_key)throw new SourceAdapterError('INVALID_RAW_EXTRACTION',p,'source_member_key is required');
    if(hasOwn(member,'global_player_id'))throw new SourceAdapterError('FORBIDDEN_GLOBAL_ID',p+'.global_player_id','RawExtraction must never contain a Global Player ID');
    if(memberKeys.has(member.source_member_key))throw new SourceAdapterError('DUPLICATE_SOURCE_MEMBER_KEY',p+'.source_member_key','source_member_key must be unique within an extraction');
    memberKeys.add(member.source_member_key);
    for(const fieldName of REQUIRED_MEMBER_FIELDS){
      for(const [captureIndex,capture] of captureList(member.fields[fieldName]).entries()){
        const cp=p+'.fields.'+fieldName+(Array.isArray(member.fields[fieldName])?'['+captureIndex+']':'');
        validateFieldCapture(capture,cp);
        for(const ref of capture.evidence_refs)if(!artifactIds.has(ref))throw new SourceAdapterError('UNKNOWN_EVIDENCE_REF',cp+'.evidence_refs','evidence reference is not declared in source.artifacts');
      }
    }
    for(const fieldName of OPTIONAL_MEMBER_FIELDS)if(hasOwn(member.fields,fieldName)){
      for(const [captureIndex,capture] of captureList(member.fields[fieldName]).entries()){
        const cp=p+'.fields.'+fieldName+(Array.isArray(member.fields[fieldName])?'['+captureIndex+']':'');
        validateFieldCapture(capture,cp);
        for(const ref of capture.evidence_refs)if(!artifactIds.has(ref))throw new SourceAdapterError('UNKNOWN_EVIDENCE_REF',cp+'.evidence_refs','evidence reference is not declared in source.artifacts');
      }
    }
    const memberEvidence=member.evidence_refs||[];
    for(const ref of memberEvidence)if(!artifactIds.has(ref))throw new SourceAdapterError('UNKNOWN_EVIDENCE_REF',p+'.evidence_refs','evidence reference is not declared in source.artifacts');
    if(member.source_identity!==undefined&&member.source_identity!==null){
      const status=member.source_identity.status||'UNKNOWN';
      if(status==='OBSERVED'&&(!member.source_identity.source_system||!member.source_identity.source_identity_id))throw new SourceAdapterError('INVALID_SOURCE_IDENTITY',p+'.source_identity','OBSERVED source identity requires source_system and source_identity_id');
      if(!['OBSERVED','AMBIGUOUS','UNKNOWN'].includes(status))throw new SourceAdapterError('INVALID_SOURCE_IDENTITY',p+'.source_identity.status','unsupported source identity status');
      if(hasOwn(member.source_identity,'global_player_id'))throw new SourceAdapterError('FORBIDDEN_GLOBAL_ID',p+'.source_identity.global_player_id','RawExtraction must never contain a Global Player ID');
    }
  }
  return {valid:true,extraction_id:raw.extraction_id,artifact_count:artifacts.length,member_count:raw.members.length};
}
function mergeFieldCaptures(member,fieldName,path,adapter,fallbackRefs){
  const rawField=hasOwn(member.fields,fieldName)?member.fields[fieldName]:null;
  const captures=rawField===null?[{status:'NOT_VISIBLE',interpretation:'NONE',evidence_refs:fallbackRefs}]:captureList(rawField);
  const evidenceRefs=sortUnique(captures.flatMap((capture)=>capture.evidence_refs||[]));
  if(captures.some((capture)=>(capture.interpretation||'NONE')==='INTERPRETED'))throw new SourceAdapterError('INTERPRETATION_NOT_ALLOWED',path+'.interpretation','interpreted values cannot cross the RawExtraction -> SnapshotInput boundary');
  if(captures.some((capture)=>capture.status==='CONFLICTING'))return {status:'CONFLICTING',value:null,evidence_refs:evidenceRefs};
  const observed=captures.filter((capture)=>capture.status==='OBSERVED');
  const values=observed.map((capture,index)=>adapter.normalizeField(fieldName,capture,path+(captures.length>1?'['+index+']':'')));
  if(values.length){
    const first=values[0];
    if(values.some((value)=>!equalValues(first,value)))return {status:'CONFLICTING',value:null,evidence_refs:evidenceRefs};
    return {status:'OBSERVED',value:first,evidence_refs:evidenceRefs};
  }
  const status=['AMBIGUOUS','UNKNOWN','NOT_VISIBLE'].find((candidate)=>captures.some((capture)=>capture.status===candidate))||'UNKNOWN';
  return {status,value:null,evidence_refs:evidenceRefs};
}
function resolveSourceIdentity(member,path){
  const sourceIdentity=member.source_identity;
  if(!sourceIdentity||sourceIdentity.status!=='OBSERVED')return undefined;
  const sourceSystem=String(sourceIdentity.source_system).trim();
  const sourceIdentityId=String(sourceIdentity.source_identity_id).trim();
  if(!sourceSystem||!sourceIdentityId)throw new SourceAdapterError('INVALID_SOURCE_IDENTITY',path,'observed source identity must contain non-empty values');
  return {source_system:sourceSystem,source_identity_id:sourceIdentityId};
}
class SourceAdapter{toSnapshotInput(){throw new Error('SourceAdapter.toSnapshotInput() is not implemented');}}
class RawExtractionSourceAdapter extends SourceAdapter{
  constructor(options={}){
    super();
    this._normalizers={
      rank:normalizeIntegerCapture,stage:normalizeIntegerCapture,total_kills:normalizeIntegerCapture,
      current_league_clan_medals:normalizeIntegerCapture,profile_total_clan_medal_count:normalizeIntegerCapture,
      display_name:normalizeTextCapture,role:normalizeTextCapture,last_online_utc:normalizeDateCapture,
      weapons:normalizeIntegerMapCapture,lifetime_medals:normalizeIntegerMapCapture,
      ...(options.normalizers||{})
    };
  }
  normalizeField(fieldName,capture,path){
    const normalizer=this._normalizers[fieldName];
    if(typeof normalizer!=='function')throw new SourceAdapterError('UNSUPPORTED_FIELD',path,'no deterministic normalizer registered for field: '+fieldName);
    return normalizer(capture,path);
  }
  toSnapshotInput(rawExtraction,authorityContext){
    validateRawExtraction(rawExtraction);
    if(!isObject(authorityContext))throw new SourceAdapterError('INVALID_CONTEXT','$.authorityContext','authorityContext is required');
    if(authorityContext.project_id!=='UCS')throw new SourceAdapterError('INVALID_CONTEXT','$.authorityContext.project_id','project_id must be UCS');
    const snapshot=authorityContext.snapshot,league=authorityContext.league;
    if(!isObject(snapshot)||!snapshot.snapshot_id||!Number.isInteger(snapshot.sequence)||!snapshot.official_timestamp_utc||!Number.isInteger(snapshot.member_count)||!Number.isInteger(snapshot.capacity))throw new SourceAdapterError('INVALID_CONTEXT','$.authorityContext.snapshot','complete Snapshot authority context is required and is never inferred from source');
    if(!isObject(league)||!league.league_id||!league.starts_at_utc||!league.ends_at_utc)throw new SourceAdapterError('INVALID_CONTEXT','$.authorityContext.league','complete League identity/boundary context is required');
    if(!authorityContext.clan_id)throw new SourceAdapterError('INVALID_CONTEXT','$.authorityContext.clan_id','clan_id context is required');
    if(rawExtraction.members.length!==snapshot.member_count)throw new SourceAdapterError('MEMBER_COUNT_MISMATCH','$.authorityContext.snapshot.member_count','Snapshot member_count must equal roster member count, not Profile screenshot count');

    const primaryArtifact=rawExtraction.source.artifacts.find((artifact)=>artifact.artifact_id===rawExtraction.source.primary_artifact_id);
    const artifactRecords=rawExtraction.source.artifacts.map((artifact)=>({
      artifact_id:artifact.artifact_id,artifact_type:artifact.artifact_type,source_location:artifact.source_location??null,content_hash:clone(artifact.content_hash)
    }));

    const members=rawExtraction.members.map((member,index)=>{
      const p='$.members['+index+']';
      const fallbackRefs=sortUnique([...(member.evidence_refs||[]),primaryArtifact.artifact_id]);
      const merged=Object.fromEntries(FIELD_ORDER.map((fieldName)=>[
        fieldName,mergeFieldCaptures(member,fieldName,p+'.fields.'+fieldName,this,fallbackRefs)
      ]));
      for(const fieldName of RANKING_REQUIRED)if(merged[fieldName].status!=='OBSERVED')throw new SourceAdapterError('BLOCKED_REQUIRED_VALUE',p+'.fields.'+fieldName,'ranking-visible SnapshotInput field is not deterministically observed',{status:merged[fieldName].status});

      const output={
        source_member_key:member.source_member_key,
        rank:merged.rank.value,
        display_name:merged.display_name.value,
        role:merged.role.status==='OBSERVED'?merged.role.value:null,
        stage:merged.stage.value,
        weapons:merged.weapons.value,
        total_kills:merged.total_kills.value,
        lifetime_medals:merged.lifetime_medals.value,
        current_league_clan_medals:merged.current_league_clan_medals.value,
        profile_total_clan_medal_count:merged.profile_total_clan_medal_count.value,
        last_online_utc:merged.last_online_utc.status==='OBSERVED'?merged.last_online_utc.value:null,
        evidence_refs:sortUnique(FIELD_ORDER.flatMap((fieldName)=>merged[fieldName].evidence_refs)),
        field_provenance:Object.fromEntries(FIELD_ORDER.map((fieldName)=>[fieldName,{status:merged[fieldName].status,evidence_refs:merged[fieldName].evidence_refs}]))
      };
      const sourceIdentity=resolveSourceIdentity(member,p+'.source_identity');
      if(sourceIdentity)output.source_identity=sourceIdentity;
      return output;
    });

    const snapshotInput={
      project_id:authorityContext.project_id,clan_id:authorityContext.clan_id,schema_version:'0.1',
      snapshot:clone(snapshot),league:clone(league),
      source:{
        artifact_id:primaryArtifact.artifact_id,
        artifact_type:primaryArtifact.artifact_type,
        content_hash:clone(primaryArtifact.content_hash),
        artifacts:artifactRecords
      },
      members
    };
    try{validateSnapshotInput(snapshotInput);}
    catch(error){
      throw new SourceAdapterError('SNAPSHOT_INPUT_CONTRACT_INVALID','$.snapshotInput',error.message,{cause_code:error.code||null,cause_path:error.path||null});
    }
    return clone(snapshotInput);
  }
}
function loadJson(filePath){return JSON.parse(fs.readFileSync(filePath,'utf8'));}
if(require.main===module){
  const command=process.argv[2],file=process.argv[3];
  if(command!=='--validate'||!file){console.error('usage: node src/source-adapter.js --validate <raw-extraction.json>');process.exitCode=1;}
  else{try{console.log(JSON.stringify(validateRawExtraction(loadJson(file)),null,2));}catch(error){console.error('RAW EXTRACTION INVALID: '+error.message);process.exitCode=1;}}
}
module.exports={RAW_EXTRACTION_SCHEMA_VERSION,FIELD_STATUSES,INTERPRETATION_STATUSES,ADAPTER_RESULTS,REQUIRED_MEMBER_FIELDS,OPTIONAL_MEMBER_FIELDS,SourceAdapterError,validateRawExtraction,RawExtractionSourceAdapter};
