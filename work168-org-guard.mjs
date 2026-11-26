/* WORK168 — synthetic-only organization authorization guard.
 * This is testable policy boundary logic, not an operating DB authorization.
 * Actual access MUST be checked again by RLS / server RPC for every request.
 */
export function canReadOrganization(actor,org){
 return Boolean(actor&&org&&actor.authenticated===true&&actor.active===true
  &&typeof actor.userId==='string'&&typeof org.ownerId==='string'
  &&actor.userId===org.ownerId
  &&org.status==='APPROVED'
  &&org.type==='REPAIR_TEAM');
}
export function canViewAssignedWorker(actor,org,link){
 return canReadOrganization(actor,org)
  &&Boolean(link&&link.orgId===org.id&&link.status==='ACCEPTED'
    &&typeof link.workerId==='string'&&link.workerId.length>0);
}
export function preflightAssignment({actor,org,link,job,conflicts=[]}){
 if(!canViewAssignedWorker(actor,org,link))return 'DENIED_ORGANIZATION_SCOPE';
 if(!job||job.orgId!==org.id||job.state!=='ASSIGNABLE')return 'DENIED_JOB_SCOPE';
 if(!job.id||!link.workerId)return 'INVALID_ASSIGNMENT';
 if(conflicts.some(x=>x.workerId===link.workerId&&x.start<job.end&&job.start<x.end))
  return 'BLOCKED_SCHEDULE_CONFLICT';
 if(!Number.isFinite(job.start)||!Number.isFinite(job.end)||job.end<=job.start)
  return 'INVALID_SCHEDULE';
 return 'PREFLIGHT_ONLY_NO_WRITE';
}
