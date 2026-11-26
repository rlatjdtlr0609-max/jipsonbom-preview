/* WORK168: synthetic organization permission demonstration only. */
import {canReadOrganization,canViewAssignedWorker,preflightAssignment} from './work168-org-guard.mjs';
const container=document.getElementById('w168-panel');
if(container){
 const actorNode=container.querySelector('#w168-actor');
 const output=container.querySelector('#w168-result');
 const org={id:'DEMO-ORG-A',ownerId:'DEMO-OWNER-A',status:'APPROVED',type:'REPAIR_TEAM'};
 const member={orgId:org.id,workerId:'DEMO-WORKER-A',status:'ACCEPTED'};
 const job={id:'DEMO-JOB-1',orgId:org.id,state:'ASSIGNABLE',start:1200,end:1300};
 const conflicts=[{workerId:'DEMO-WORKER-A',start:1250,end:1350}];
 function evaluate(){
  const selected=actorNode.value;
  const actor={userId:selected,authenticated:true,active:true};
  const owner=canReadOrganization(actor,org);
  const memberVisible=canViewAssignedWorker(actor,org,member);
  const outcome=preflightAssignment({actor,org,link:member,job,conflicts:container.querySelector('#w168-conflict').checked?conflicts:[]});
  output.textContent=owner
   ?'가상 업체 A 소유자: 업체 조회 '+(owner?'허용':'거부')+', 소속기사 조회 '+(memberVisible?'허용':'거부')+', 가상 배정 검사 '+outcome
   :'다른 업체/비소유자 접근 차단: '+outcome;
 }
 container.querySelector('#w168-check').addEventListener('click',evaluate);
 evaluate();
}
