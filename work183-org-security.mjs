/* WORK183 provider and member access scope, synthetic only.
 * MASTER_11 #28/#40/#124. Organization managers cannot act as workers.
 * Historical assignment snapshots survive membership revocation/transfer.
 */
const valid=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{3,80}$/.test(x);
export function grantOrgRead({actor,org,permission}){
 if(!actor?.authenticated||!actor?.active||!valid(actor.userId)||
    !org||org.status!=='APPROVED'||!valid(org.id)||
    !['READ_MEMBERS','READ_ASSIGNMENTS','MANAGE_MEMBERS','ASSIGN_JOBS'].includes(permission))
  return false;
 if(actor.userId===org.ownerId&&actor.roles?.includes('ORG_OWNER'))return true;
 return Array.isArray(org.managers)&&org.managers.some(m=>m.userId===actor.userId&&
   m.status==='ACTIVE'&&m.permissions?.includes(permission));
}
export function canOrgAssign({actor,org,member,job,workerStatus,now}){
 if(!grantOrgRead({actor,org,permission:'ASSIGN_JOBS'}))return 'ORG_MANAGER_DENIED';
 if(member?.orgId!==org.id||member.status!=='ACCEPTED'||
    !Number.isFinite(member.start)||member.start>now||
    (member.end!==null&&(!Number.isFinite(member.end)||member.end<=now)))
  return 'MEMBERSHIP_NOT_ACTIVE_AT_ASSIGNMENT';
 if(workerStatus?.active!==true||workerStatus?.approved!==true||
    workerStatus?.regionAllowed!==true||workerStatus?.complianceValid!==true)
  return 'WORKER_NOT_ELIGIBLE';
 if(job?.orgId!==org.id||job?.state!=='ASSIGNABLE'||!valid(job.id))
  return 'JOB_NOT_OWNED_BY_ORG';
 return 'PREFLIGHT_ONLY_NEEDS_SERVER_ATOMIC_CHECK';
}
export function immutableAssignmentEvidence({actor,org,member,job,workerStatus,now}){
 if(canOrgAssign({actor,org,member,job,workerStatus,now})!=='PREFLIGHT_ONLY_NEEDS_SERVER_ATOMIC_CHECK')
  throw Error('SCOPE_OR_STATUS_DENIED');
 return Object.freeze({
  orgId:org.id,workerId:member.workerId,jobId:job.id,at:now,
  membershipStartedAt:member.start,membershipEndAt:member.end,
  orgVersion:org.version,workerApprovalSnapshot:true,
  requiredServerRLS:true,realAssignment:false
 });
}
