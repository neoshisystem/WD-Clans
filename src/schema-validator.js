'use strict';

class SchemaValidationError extends Error {
  constructor(path,message){super(path+' '+message);this.name='SchemaValidationError';this.code='SCHEMA_VALIDATION_ERROR';this.path=path;}
}
function typeMatches(value,type){
  switch(type){
    case 'object':return value!==null&&typeof value==='object'&&!Array.isArray(value);
    case 'array':return Array.isArray(value);
    case 'string':return typeof value==='string';
    case 'integer':return Number.isInteger(value);
    case 'number':return typeof value==='number'&&Number.isFinite(value);
    case 'boolean':return typeof value==='boolean';
    case 'null':return value===null;
    default:return true;
  }
}
function isDateTime(value){
  if(typeof value!=='string')return false;
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return false;
  return !Number.isNaN(Date.parse(value));
}
function validateJsonSchema(value,schema,rootSchema=schema,path='$'){
  if(schema.$ref){
    const prefix='#/$defs/';
    if(!schema.$ref.startsWith(prefix))throw new SchemaValidationError(path,'unsupported schema reference: '+schema.$ref);
    const target=rootSchema.$defs?.[schema.$ref.slice(prefix.length)];
    if(!target)throw new SchemaValidationError(path,'schema definition not found: '+schema.$ref);
    return validateJsonSchema(value,target,rootSchema,path);
  }
  if(Object.prototype.hasOwnProperty.call(schema,'const')&&value!==schema.const)throw new SchemaValidationError(path,'must equal '+JSON.stringify(schema.const));
  if(schema.enum&&!schema.enum.includes(value))throw new SchemaValidationError(path,'must be one of '+schema.enum.join(', '));
  if(schema.oneOf){
    let matches=0;
    for(const option of schema.oneOf){try{validateJsonSchema(value,option,rootSchema,path);matches++;}catch{}}
    if(matches!==1)throw new SchemaValidationError(path,'must match exactly one schema option');
  }
  if(schema.type){
    const types=Array.isArray(schema.type)?schema.type:[schema.type];
    if(!types.some((type)=>typeMatches(value,type)))throw new SchemaValidationError(path,'has invalid type');
  }
  if(schema.minLength!==undefined&&typeof value==='string'&&value.length<schema.minLength)throw new SchemaValidationError(path,'must have length >= '+schema.minLength);
  if(schema.minimum!==undefined&&typeof value==='number'&&value<schema.minimum)throw new SchemaValidationError(path,'must be >= '+schema.minimum);
  if(schema.minItems!==undefined&&Array.isArray(value)&&value.length<schema.minItems)throw new SchemaValidationError(path,'must contain at least '+schema.minItems+' items');
  if(schema.format==='date-time'&&!isDateTime(value))throw new SchemaValidationError(path,'must be an RFC3339 date-time');
  if(schema.required&&typeMatches(value,'object'))for(const key of schema.required)if(!Object.prototype.hasOwnProperty.call(value,key))throw new SchemaValidationError(path+'.'+key,'is required');
  if(typeMatches(value,'object')){
    const props=schema.properties||{};
    if(schema.additionalProperties===false)for(const key of Object.keys(value))if(!Object.prototype.hasOwnProperty.call(props,key))throw new SchemaValidationError(path+'.'+key,'is not allowed');
    for(const [key,child] of Object.entries(props))if(Object.prototype.hasOwnProperty.call(value,key))validateJsonSchema(value[key],child,rootSchema,path+'.'+key);
  }
  if(Array.isArray(value)&&schema.items)value.forEach((item,index)=>validateJsonSchema(item,schema.items,rootSchema,path+'['+index+']'));
  return true;
}
module.exports={SchemaValidationError,validateJsonSchema};
