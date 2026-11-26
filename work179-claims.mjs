/* WORK179 dev-only job board and exclusive claim model.
 * A successful in-memory claim does not constitute server reservation or worker authorization.
 * Production: atomic UNIQUE active claim + RLS + signed JWT/ACTIVE/skill/area checks.
 */
const valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{4,80}$/.test(v);
export function publishOpportunity(source){
 if(!valid(source?.id)||source?.publishable!==true||source?.state!=='OPEN')
  throw Error('NOT_PUBLISHABLE');
 const safeKeys=['id','category','estimatedLabor','district','publishedAt'];
 const output={};
 for(const k of safeKeys)if(source[k]!==undefined)output[k]=source[k];
 if(typeof output.district!=='string'||output.district.length>40||!/(시|군|구)$/u.test(output.district))throw Error('NORMALIZED_DISTRICT_REQUIRED');
 return Object.freeze(output);
}
export function emptyClaimBoard(opportunityId){
 if(!valid(opportunityId))throw Error('INVALID_OPPORTUNITY');
 return {opportunityId,version:0,activeClaim:null,events:[],keys:{}};
}
export function claimAction(state,action,{workerId,key,expectedVersion,eligibility}={}){
 if(!['CLAIM','RELEASE'].includes(action)||!valid(workerId)||!valid(key))
  throw Error('INVALID_CLAIM_REQUEST');
 const prior=state.keys[key];
 if(prior){
  if(prior.action!==action||prior.workerId!==workerId)throw Error('IDEMPOTENCY_KEY_CONFLICT');
  return state;
 }
 if(expectedVersion!==state.version)throw Error('STALE_CLAIM_VERSION');
 if(action==='CLAIM'){
  if(state.activeClaim)throw Error('OPPORTUNITY_ALREADY_CLAIMED');
  if(!eligibility||['adminApproved','active','areaAllowed','skillAllowed','complianceValid',
     'opportunityStillOpen','dailyLimitAvailable'].some(k=>eligibility[k]!==true))
   throw Error('INELIGIBLE_WORKER_OR_JOB');
 }else if(state.activeClaim?.workerId!==workerId)throw Error('CLAIM_NOT_OWNED');
 const copy={...state,activeClaim:action==='CLAIM'?{workerId,status:'ACTIVE'}:null,
  version:state.version+1,events:[...state.events,{action,workerId,version:state.version+1}],
  keys:{...state.keys,[key]:{action,workerId}}};
 return copy;
}
