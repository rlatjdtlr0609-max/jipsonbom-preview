/* WORK173: deterministic organization membership + schedule assignment preview.
 * MASTER_11 #27/#28/#40/#124. Uses mock identifiers; does not write or authorize server data.
 * Server-side JWT, signed member acceptance, RLS and atomic calendar constraints remain mandatory.
 */
import {canReadOrganization} from './work168-org-guard.mjs';
const validId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(v);
export function createOrg({id,ownerId,status='APPROVED',type='REPAIR_TEAM'}){
 if(!validId(id)||!validId(ownerId))throw Error('INVALID_ORG_IDS');
 return {org:{id,ownerId,status,type},version:0,members:{},assignments:{},events:[],keys:{}};
}
export function orgCommand(state,action,{actor,workerId,job,expectedVersion,key,workerEligible}={}){
 if(!['INVITE','ACCEPT','REVOKE','ASSIGN','UNASSIGN'].includes(action))throw Error('UNSUPPORTED_ACTION');
 if(!validId(key)||!validId(workerId)||!validId(actor?.userId))throw Error('INVALID_ORG_COMMAND');
 const prior=state.keys[key];
 if(prior){
  if(prior.action!==action||prior.workerId!==workerId||prior.actor!==actor.userId)
   throw Error('IDEMPOTENCY_KEY_REUSE_CONFLICT');
  return state;
 }
 if(!Number.isSafeInteger(expectedVersion)||expectedVersion!==state.version)throw Error('STALE_ORG_VERSION');
 const owner=canReadOrganization(actor,state.org);
 const self=actor?.authenticated===true&&actor.active===true&&actor.userId===workerId;
 if(action==='ACCEPT'){if(!self)throw Error('WORKER_SELF_ACCEPT_REQUIRED');}
 else if(!owner)throw Error('ORG_OWNER_PERMISSION_DENIED');
 const before=state.members[workerId],copy={
  ...state,members:{...state.members},assignments:{...state.assignments},
  events:[...state.events],keys:{...state.keys}
 };
 if(action==='INVITE'){
  if(before&&before.status!=='REVOKED')throw Error('ALREADY_ASSOCIATED');
  copy.members[workerId]={orgId:state.org.id,workerId,status:'INVITED'};
 }else if(action==='ACCEPT'){
  if(before?.status!=='INVITED')throw Error('INVITATION_NOT_PENDING');
  copy.members[workerId]={...before,status:'ACCEPTED'};
 }else if(action==='REVOKE'){
  if(!before||before.status==='REVOKED')throw Error('MEMBERSHIP_NOT_ACTIVE');
  if(Object.values(state.assignments).some(x=>x.workerId===workerId&&x.status==='ASSIGNED'))
   throw Error('ACTIVE_ASSIGNMENTS_REQUIRE_REVIEW');
  copy.members[workerId]={...before,status:'REVOKED'};
 }else if(action==='ASSIGN'){
  if(before?.status!=='ACCEPTED')throw Error('ACCEPTED_MEMBERSHIP_REQUIRED');
  if(workerEligible?.approved!==true||workerEligible?.active!==true||
      workerEligible?.regionAllowed!==true||workerEligible?.complianceValid!==true)
   throw Error('WORKER_NOT_ELIGIBLE');
  if(!job||job.orgId!==state.org.id||job.status!=='READY'||
     !validId(job.id)||!Number.isSafeInteger(job.start)||!Number.isSafeInteger(job.end)||job.end<=job.start)
   throw Error('UNSAFE_JOB_OR_SCOPE');
  if(state.assignments[job.id])throw Error('ALREADY_ASSIGNED');
  if(Object.values(state.assignments).some(x=>x.status==='ASSIGNED'&&
    x.workerId===workerId&&x.start<job.end&&job.start<x.end))
    throw Error('SCHEDULE_CONFLICT');
  copy.assignments[job.id]={jobId:job.id,workerId,orgId:state.org.id,
    start:job.start,end:job.end,status:'ASSIGNED'};
 }else{
  if(!job?.id||state.assignments[job.id]?.workerId!==workerId||
      state.assignments[job.id]?.status!=='ASSIGNED')throw Error('ASSIGNMENT_NOT_FOUND');
  copy.assignments[job.id]={...state.assignments[job.id],status:'RELEASED'};
 }
 copy.version++;
 copy.keys[key]={actor:actor.userId,workerId,action};
 copy.events.push({action,workerId,orgId:state.org.id,version:copy.version,kind:'DEV_SIMULATION'});
 return copy;
}
