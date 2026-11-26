/* WORK103~106 / MASTER_11
 * Static GitHub Pages hosts NO privileged records or keys.
 * Dev Supabase Auth + TOTP provides AAL2; public.jsb_w103 and jsb_w108 (DB) gate
 * operations_read / requests_publish / access_review / recent MFA.
 * ALL access tokens stay in JS memory only (no storage/cookies/URL).
 * WORK113-118 listings remain pseudonymized read-only statuses, NOT full E2E certification.
 */
'use strict';
(()=>{
 const API='https://ohwkywomdqgcnptsnhwk.supabase.co';
 const KEY='sb_publishable_tNSrR-mJYeChyS1J_5Ykkg_oH15pvXd';
 const groups=[
  {title:'A. 통합 운영관제',entries:[
   ['overview','통합 운영 대시보드','전체 접수·매칭·예약·운영업무 요약','customer_requests','work_opportunities','open_operation_tasks'],
   ['tasks','오늘 처리할 운영업무','기존 OPERATION_TASKS 중 미완료 업무 건수','open_operation_tasks'],
   ['requests','고객접수 · 작업게시판','고객 접수 및 작업게시 집계','customer_requests','work_opportunities'],
   ['booking','미매칭 · 선점 · 예약','작업·확정예약 건수만 조회','work_opportunities','confirmed_bookings'],
   ['alerts','SLA · 지연 관제','SLA 상세 판정 미연결 · 운영업무 건수만 표시','open_operation_tasks']]},
  {title:'B. 고객 · 기사 · 업체 관리',entries:[
   ['members','고객 회원관리','고객 개별정보 조회는 아직 연결되지 않았습니다','customer_requests'],
   ['guests','비회원 고객관리','비회원 개인정보 조회는 아직 연결되지 않았습니다','customer_requests'],
   ['applications','기사 가입 · 승인 심사','기사 신청·서류 건수 요약','worker_applications','worker_documents'],
   ['workers','활동기사 관리','기사별 활동·심사 상세조회는 미연결','worker_applications'],
   ['providers','수리업체 · 소속기사','업체/소속기사 관리 기능은 추가 검증 필요','worker_applications']]},
  {title:'C. 기사 캐시 · 재무 관리',entries:[
   ['cash','공식 수리단가 · 캐시 관제','실 결제와 캐시 차감은 비활성 · 확정예약 요약','confirmed_bookings'],
   ['recon','PG 결제 · 취소 · 환불','실 PG/환불 업무는 아직 실행할 수 없습니다'],
   ['directpay','직접지급 · 거래원장','고객 직접지급과 기사 플랫폼 이용료를 구분 관리. 거래 상세 미연결']]},
  {title:'D. 고객 · 운영 예외관리',entries:[
   ['cases','A/S · 분쟁','미해결 A/S 및 수리문제 건수','open_aftercare_cases'],
   ['incidents','사고 · 보험','사고·보험 상세 및 대응업무는 별도 보호 API 검증 필요'],
   ['integrity','예약 · 결제 무결성','확정예약과 영향검토 건수 확인','confirmed_bookings','booking_impact_reviews']]},
  {title:'E. 서비스 · 운영정책 관리',entries:[
   ['catalog','수리 카테고리 · 단가','공식 수리단가 변경·반올림 정책 임의 수정 불가'],
   ['settings','지역 · 매칭 · 긴급중지','승인된 자격규칙 활성화 여부 요약','active_compliance_policy'],
   ['notifications','알림 · 주소 정책','실제 문자 발송 및 주소 자동화는 미연결'],
   ['bulk','대량작업 운영설정','대량수정 차단 · 개별 검증 필요']]},
  {title:'F. 보안 · 시스템 · 출시관리',entries:[
   ['security','권한 · 개인정보 보호','DB가 관리자 권한·최근 MFA를 검증한 읽기 전용 응답'],
   ['roles','관리자 권한분리 · MFA','사용자 권한부여·MFA 초기화 기능 비공개'],
   ['audit','감사기록 · 시스템','전체 원장 감사 기능 별도 검증 필요','open_operation_tasks'],
   ['release','백업 · 복구 · 출시검증','운영 배포 미승인 · 실제 복구훈련·법률/PG 검증 필요','active_compliance_policy']]}
 ];
 const labels={
  customer_requests:'수리접수',
  worker_applications:'기사 가입신청',
  work_opportunities:'작업게시물',
  confirmed_bookings:'확정예약',
  open_operation_tasks:'미처리 운영업무',
  worker_documents:'기사서류',
  open_aftercare_cases:'진행 중 A/S·분쟁',
  active_compliance_policy:'활성 자격정책',
  booking_impact_reviews:'예약 영향검토'
 };
 const select=id=>document.getElementById(id);
 const authLayout=select('auth-layout'),dashboard=select('dashboard');
 const login=select('login-form'),mfa=select('mfa-form'),enroll=select('enroll-form');
 const status=select('auth-status'),logout=select('logout');
 const mfaInput=select('totp-code'),topSession=select('session-label');
 const message=select('dashboard-message'),nav=select('screen-nav');
 const metrics=select('metrics');
 const opsSection=select('operation-console'),opsItems=select('ops-items'),opsStatus=select('ops-status');
 const finSection=select('finance-console'),finItems=select('finance-items'),finStatus=select('finance-status');
 const provSection=select('provider-console'),provItems=select('provider-items'),provStatus=select('provider-status');
 const records=select('records-list'),recordsState=select('records-state');
 const recordsPrev=select('records-prev'),recordsNext=select('records-next');
 const recordsPage=select('records-page');
 const sections=groups.flatMap(g=>g.entries.map(([id,label,description,...keys])=>({id,label,description,keys,group:g.title})));
 let token=null;let expiresAt=0;let factorId=null;let enrollFactorId=null;let busy=false;let selected='overview';let snapshot=null;
 let panelRequestSequence=0,recordRequestSequence=0,recordOffset=0,recordBusy=false,recordHasMore=false;
 let opsSequence=0,financeSequence=0,providerSequence=0,commandBusy=false;
 const RECORD_LIMIT=15;
 const create=(tag,cls,text)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=String(text);
  return e;
 };
 const showStatus=(msg,error=false)=>{
  status.textContent=msg;status.dataset.error=error?'true':'false';
 };
 const emptySession=()=>{
  panelRequestSequence++;opsSequence++;financeSequence++;providerSequence++;commandBusy=false;
  opsSection.hidden=true;finSection.hidden=true;provSection.hidden=true;
  opsItems.replaceChildren();finItems.replaceChildren();provItems.replaceChildren();
  recordRequestSequence++;recordBusy=false;recordHasMore=false;recordOffset=0;
  records.replaceChildren();recordsPrev.disabled=true;recordsNext.disabled=true;
  recordsPage.textContent='0건';recordsState.textContent='관리자 인증 후 업무목록을 조회합니다.';
  token=null;expiresAt=0;factorId=null;enrollFactorId=null;snapshot=null;
  select('enroll-qr').removeAttribute('src');select('enroll-qr-wrap').hidden=true;
  select('enroll-start').hidden=false;enroll.reset();enroll.hidden=true;
  login.reset();mfa.reset();mfa.hidden=true;login.hidden=false;
  dashboard.hidden=true;authLayout.hidden=false;logout.hidden=true;topSession.hidden=true;
  metrics.replaceChildren();nav.replaceChildren();
  showStatus('관리자 권한이 부여된 계정만 이용할 수 있습니다.');
 };
 const guardBusy=loading=>{
  busy=loading;select('login-submit').disabled=loading;
  select('mfa-submit').disabled=loading;select('refresh').disabled=loading;
 };
 async function request(path,{method='GET',body,accessToken}={}){
  const headers={'apikey':KEY};
  if(accessToken)headers.authorization='Bearer '+accessToken;
  if(body!==undefined)headers['content-type']='application/json';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(API+path,{method,headers,
    body:body===undefined?undefined:JSON.stringify(body),
    mode:'cors',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',
    cache:'no-store',signal:controller.signal});
   const data=await response.json().catch(()=>null);
   if(!response.ok){
    const err=new Error(response.status===401?'AUTH_INVALID':
     response.status===403?'ACCESS_DENIED':
     response.status===429?'RATE_LIMITED':'UPSTREAM_FAILURE');
    err.status=response.status;throw err;
   }
   return data;
  }finally{clearTimeout(timer);}
 }
 const isExpired=()=>!token||Date.now()>=expiresAt;
 async function authUser(accessToken){
  const user=await request('/auth/v1/user',{accessToken});
  if(!user?.id||user?.role!=='authenticated'||user?.is_anonymous===true)throw Error('AUTH_INVALID');
  return user;
 }
 async function readSnapshot(){
  if(isExpired())throw Error('AUTH_EXPIRED');
  const data=await request('/rest/v1/rpc/jsb_w103_admin_snapshot',{
   method:'POST',accessToken:token,body:{}});
  if(!data||data.read_only!==true||data.environment!=='DEVELOPMENT'||
   data.mfa_and_backend_permissions_verified!==true||data.screen_count!==24||
   data.pii_included!==false||data.production_deployment!==false||
   !data.counts||typeof data.counts!=='object')throw Error('UNVERIFIED_RESPONSE');
  return data;
 }
 async function readPanel(screenId){
  if(isExpired())throw Error('AUTH_EXPIRED');
  return request('/rest/v1/rpc/jsb_w108_admin_panel',{
   method:'POST',accessToken:token,body:{p_screen:screenId}});
 }
 const safePanel=(data,screenId)=>
  data&&data.read_only===true&&data.environment==='DEVELOPMENT'&&
  data.production_deployment===false&&data.mfa_and_backend_permissions_verified===true&&
  data.pii_included===false&&data.full_business_e2e_certified===false&&
  data.workflow_actions_enabled===false&&data.real_pg_actions_enabled===false&&
  data.screen_count===24&&data.screen_id===screenId&&
  data.schema_version==='WORK108_READ_ONLY_V1'&&
  data.screen_coverage==='AGGREGATE_ONLY'&&
  Array.isArray(data.metrics)&&data.metrics.length>0&&data.metrics.length<=8&&
  data.metrics.every(m=>m&&typeof m.key==='string'&&m.key.length<=60&&
    typeof m.label==='string'&&m.label.length<=100&&
    typeof m.source==='string'&&m.source.length<=120&&
    Number.isSafeInteger(m.value)&&m.value>=0);
 async function loadPanel(){
  const screenId=selected,serial=++panelRequestSequence,issuedToken=token;
  metrics.replaceChildren();
  metrics.append(create('p','loading-message','보호된 개발 DB 조회 중…'));
  message.textContent='관리자 권한·인증 앱·화면별 업무권한을 DB에서 확인하고 있습니다.';
  try{
   const data=await readPanel(screenId);
   if(serial!==panelRequestSequence||issuedToken!==token||dashboard.hidden||screenId!==selected)return;
   if(isExpired())throw Error('AUTH_EXPIRED');
   if(!safePanel(data,screenId))throw Error('UNVERIFIED_RESPONSE');
   metrics.replaceChildren();
   for(const metric of data.metrics){
    const tile=create('article','metric');
    tile.append(create('div','metric-label',metric.label),
     create('div','metric-value',metric.value.toLocaleString('ko-KR')),
     create('div','metric-note',metric.source+' · 개발 DB 집계'));
    metrics.append(tile);
   }
   message.textContent='보호된 업무별 조회 성공 · '+data.metrics.length+
    '개 집계 · 실제 업무처리/정산/PG 미연결 · 24개 상세업무 전체 E2E 인증은 아직 미완료';
  }catch(e){
   if(serial!==panelRequestSequence||issuedToken!==token||dashboard.hidden||screenId!==selected)return;
   metrics.replaceChildren();
   if(e.message==='AUTH_INVALID'||e.message==='AUTH_EXPIRED'){
    emptySession();showStatus(friendly(e),true);return;
   }
   const blocked=e.status===403;
   message.textContent=blocked
    ?'해당 화면은 별도 업무권한 또는 최근 MFA가 필요합니다. 서버가 조회를 거부했으며 데이터는 표시하지 않았습니다.'
    :friendly(e)+' · 서버의 보호된 데이터는 표시하지 않았습니다.';
   metrics.append(create('p','metric-empty',blocked
    ?'접근 권한이 없는 업무입니다. 담당 권한 승인 전에는 조회할 수 없습니다.'
    :'보호된 화면 데이터 연결 상태를 확인해야 합니다.'));
  }
 }

 const safeList=(data,screen,offset)=>
  data&&data.read_only===true&&data.environment==='DEVELOPMENT'&&
  data.production_deployment===false&&data.pii_included===false&&
  data.real_pg_actions_enabled===false&&data.workflow_actions_enabled===false&&
  data.full_business_e2e_certified===false&&
  data.mfa_and_backend_permissions_verified===true&&data.screen_count===24&&
  data.schema_version==='WORK114_SAFE_LIST_V1'&&data.screen_id===screen&&
  data.list_coverage==='PSEUDONYMIZED_STATUS_ONLY'&&
  data.limit===RECORD_LIMIT&&data.offset===offset&&
  Number.isSafeInteger(data.total)&&data.total>=0&&
  typeof data.has_more==='boolean'&&Array.isArray(data.items)&&
  data.items.length<=RECORD_LIMIT&&
  data.items.every(v=>v&&/^[0-9a-f]{12}$/.test(v.ref)&&
    typeof v.title==='string'&&v.title.length<=72&&
    typeof v.status==='string'&&v.status.length<=44&&
    typeof v.source==='string'&&v.source.startsWith('WORK')&&v.source.length<=120&&
    (v.time===null||typeof v.time==='string')&&
    (v.amount_krw===null||(typeof v.amount_krw==='string'&&/^[0-9]{1,20}$/.test(v.amount_krw))));
 const fmtDate=value=>{
  if(!value)return '시각 미등록';
  const d=new Date(value);
  return Number.isFinite(d.getTime())?d.toLocaleString('ko-KR',{dateStyle:'short',timeStyle:'short'}):'시각 확인 불가';
 };
 function setRecordNav(total,offset,hasMore){
  recordsPrev.disabled=recordBusy||offset===0;
  recordsNext.disabled=recordBusy||!hasMore||offset+RECORD_LIMIT>500;
  recordsPage.textContent=total===0?'0건':(offset+1)+'–'+Math.min(total,offset+RECORD_LIMIT)+' / '+total+'건';
 }
 async function loadRecords(offset=0){
  const screen=selected,issuedToken=token,serial=++recordRequestSequence;
  recordOffset=offset;recordBusy=true;recordHasMore=false;
  records.replaceChildren();recordsState.dataset.error='false';
  recordsState.textContent='화면별 개인정보 비식별 상태목록을 조회하고 있습니다…';
  setRecordNav(0,0,false);
  try{
   if(isExpired())throw Error('AUTH_EXPIRED');
   const data=await request('/rest/v1/rpc/jsb_w114_admin_list',{
    method:'POST',accessToken:token,
    body:{p_screen:screen,p_limit:RECORD_LIMIT,p_offset:offset}
   });
   if(serial!==recordRequestSequence||issuedToken!==token||dashboard.hidden||selected!==screen)return;
   if(isExpired())throw Error('AUTH_EXPIRED');
   if(!safeList(data,screen,offset))throw Error('UNVERIFIED_RESPONSE');
   records.replaceChildren();
   for(const item of data.items){
    const article=create('article','record-item');
    const information=create('div','record-info');
    information.append(create('div','record-title',item.title),
     create('div','record-meta',item.source+' · '+fmtDate(item.time)+' · 참조 '+item.ref));
    const state=create('span','record-status',item.status);
    article.append(information,state);
    if(item.amount_krw!==null){
     const a=create('div','record-amount',
      new Intl.NumberFormat('ko-KR').format(BigInt(item.amount_krw))+'원');
     information.append(a);
    }
    records.append(article);
   }
   if(!data.items.length)records.append(create('div','records-empty','개발 DB에 표시할 업무 기록이 없습니다.'));
   recordHasMore=data.has_more;
   recordsState.textContent='서버 MFA·업무권한 검증 완료 · '+data.items.length+'개 비식별 상태 기록 · 실제 업무 승인·수정 비활성';
   recordBusy=false;setRecordNav(data.total,offset,recordHasMore);
  }catch(e){
   if(serial!==recordRequestSequence||issuedToken!==token||dashboard.hidden||selected!==screen)return;
   records.replaceChildren();recordBusy=false;recordHasMore=false;
   recordsPrev.disabled=true;recordsNext.disabled=true;recordsPage.textContent='조회 제한';
   if(e.message==='AUTH_INVALID'||e.message==='AUTH_EXPIRED'){
    emptySession();showStatus(friendly(e),true);return;
   }
   recordsState.dataset.error='true';
   recordsState.textContent=e.status===403
    ?'이 목록은 별도 업무권한 또는 최근 MFA 인증이 필요합니다. 데이터가 표시되지 않았습니다.'
    :'업무목록 조회를 완료하지 못했습니다. 보호된 자료는 표시되지 않았습니다.';
  }
 }
 recordsPrev.addEventListener('click',()=>{
  if(recordBusy||recordOffset<=0||!snapshot||isExpired())return;
  void loadRecords(Math.max(0,recordOffset-RECORD_LIMIT));
 });
 recordsNext.addEventListener('click',()=>{
  if(recordBusy||!recordHasMore||recordOffset+RECORD_LIMIT>500||!snapshot||isExpired())return;
  void loadRecords(recordOffset+RECORD_LIMIT);
 });


 // WORK119-124 / MASTER_11 #128: a RESOLVED task is not a source request,
 // contractor membership, booking, worker approval or payment decision.
 const opsScreens=new Set(['overview','tasks','requests','alerts','applications','providers','booking','cases','incidents']);
 const financeScreens=new Set(['cash','recon','directpay','integrity','catalog']);
 const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const taskLabels={
  INCIDENT_SAFETY_REVIEW:'사고·안전검토',
  REQUEST_PUBLICATION_REVIEW:'수리접수 게시검토',
  AFTERCARE_REVIEW:'A/S 검토',
  REPAIR_DISPUTE_REVIEW:'수리 분쟁 검토',
  WORKER_APPROVAL_REVIEW:'기사 가입심사',
  WORKER_EVIDENCE_REVERIFY_REVIEW:'기사 자격·서류 재검토'
 };
 const safeOps=(data)=>
  data&&data.environment==='DEVELOPMENT'&&data.read_only===true&&
  data.production_deployment===false&&data.pii_included===false&&
  data.approval_or_payment_enabled===false&&data.source_mutated===false&&
  data.schema_version==='WORK120_QUEUE_V1'&&
  typeof data.task_command_enabled==='boolean'&&Array.isArray(data.items)&&
  data.items.length<=15&&data.items.every(t=>t&&uuid.test(t.id)&&
   Number.isSafeInteger(t.row_version)&&t.row_version>0&&
   Object.hasOwn(taskLabels,t.task_type)&&
   ['OPEN','CLAIMED'].includes(t.status)&&
   ['CRITICAL','HIGH','NORMAL','LOW'].includes(t.priority)&&
   typeof t.can_claim==='boolean'&&typeof t.can_release==='boolean'&&
   typeof t.can_resolve==='boolean'&&
   (t.created_at===null||typeof t.created_at==='string'));
 async function taskCommand(task,action,data={}){
  if(commandBusy||dashboard.hidden||isExpired())return;
  if(!opsSection.isConnected||opsSection.hidden||!['CLAIM','RELEASE','RESOLVE'].includes(action))return;
  commandBusy=true;opsStatus.textContent='서버에서 관리자 MFA·업무권한·버전을 확인하고 있습니다…';
  const issuedToken=token,issuedScreen=selected;
  try{
   const result=await request('/rest/v1/rpc/jsb_w120_admin_task_command',{
    method:'POST',accessToken:token,
    body:{p_task:task.id,p_expected_version:task.row_version,p_action:action,
      p_key:crypto.randomUUID(),p_data:data}
   });
   if(token!==issuedToken||selected!==issuedScreen||dashboard.hidden)return;
   if(!result||result.source_record_modified!==false||
     result.booking_changed!==false||result.cash_changed!==false||
     result.worker_approved!==false||result.result?.id!==task.id||
     result.result?.row_version!==task.row_version+1)
    throw Error('UNVERIFIED_RESPONSE');
   opsStatus.textContent='운영업무 원장에 '+action+' 기록을 저장했습니다. 원접수·기사승인·예약·결제는 변경되지 않았습니다.';
   await loadOps();
  }catch(e){
   if(token!==issuedToken||selected!==issuedScreen||dashboard.hidden)return;
   opsStatus.dataset.error='true';
   opsStatus.textContent=e.status===403
    ?'관리자 업무권한·최근 MFA 또는 승인 정책이 없어 처리할 수 없습니다.'
    :'처리거부 또는 버전 충돌입니다. 원본을 보존했고 업무목록을 다시 조회할 수 있습니다.';
  }finally{commandBusy=false;}
 }
 async function loadOps(){
  const version=++opsSequence,issuedScreen=selected,issuedToken=token;
  opsItems.replaceChildren();opsStatus.dataset.error='false';
  opsStatus.textContent='서버 원장과 선점 정책을 확인하는 중…';
  try{
   if(isExpired())throw Error('AUTH_EXPIRED');
   const data=await request('/rest/v1/rpc/jsb_w120_admin_task_queue',{
    method:'POST',accessToken:token,body:{p_limit:15}});
   if(version!==opsSequence||token!==issuedToken||selected!==issuedScreen||dashboard.hidden)return;
   if(!safeOps(data))throw Error('UNVERIFIED_RESPONSE');
   opsItems.replaceChildren();
   if(!data.items.length)opsItems.append(create('div','ops-empty','현재 활성 관리자 원장 업무가 없습니다. 원업무가 없다는 뜻은 아닙니다.'));
   for(const task of data.items){
    const card=create('article','ops-item');
    const top=create('div','ops-item-top'),heading=create('div','');
    heading.append(create('div','ops-item-title',taskLabels[task.task_type]));
    heading.append(create('div','ops-item-sub','우선순위 '+task.priority+
      ' · 원장 버전 '+task.row_version+' · 등록 '+fmtDate(task.created_at)+
      (task.due_at?' · 기한 '+fmtDate(task.due_at):' · 승인된 기한 없음')));
    top.append(heading,create('span','ops-item-status',task.status));
    card.append(top);
    const controls=create('div','ops-controls');
    const actionButton=(label,action)=>{
     const b=create('button','',label);b.type='button';
     b.addEventListener('click',()=>{
      if(!snapshot||!token||isExpired())return;
      void taskCommand(task,action,{});
     });controls.append(b);
    };
    if(task.can_claim&&data.task_command_enabled)actionButton('처리 시작 · 선점','CLAIM');
    if(task.can_release)actionButton('내 선점 해제','RELEASE');
    if(controls.childNodes.length)card.append(controls);
    if(task.can_resolve){
     const form=create('form','ops-resolve-form');
     const label1=create('label','', '업무종료 사유 코드 · 대문자/숫자/밑줄');
     const code=create('input','');code.type='text';code.placeholder='REVIEW_HANDOFF';code.maxLength=64;code.required=true;
     code.pattern='[A-Z][A-Z0-9_]{1,63}';
     const label2=create('label','', '검토기록 참조 · 최소 8자');
     const reference=create('input','');reference.type='text';reference.placeholder='근거 문서번호 또는 업무처리 참조';reference.minLength=8;reference.maxLength=250;reference.required=true;
     const submit=create('button','ops-confirm','업무원장만 처리완료');submit.type='submit';
     form.append(label1,code,label2,reference,submit);
     form.addEventListener('submit',e=>{
      e.preventDefault();
      if(!form.reportValidity()||!snapshot||isExpired())return;
      if(!window.confirm('운영업무 원장만 종료합니다. 고객 접수·기사·예약·결제는 변경되지 않습니다. 진행하시겠습니까?'))return;
      void taskCommand(task,'RESOLVE',{resolution_code:code.value.trim(),resolution_reference:reference.value.trim()});
     });
     card.append(form);
    }
    opsItems.append(card);
   }
   opsStatus.textContent='서버에서 확인한 활성 원장 '+data.items.length+
    '건 · 선점정책 '+(data.task_command_enabled?'관리자 별도승인됨':'미승인(처리 시작 차단)')+
    ' · 원접수/기사승인/예약/금전 업무 미변경';
  }catch(e){
   if(version!==opsSequence||token!==issuedToken||selected!==issuedScreen||dashboard.hidden)return;
   opsItems.replaceChildren();
   opsStatus.dataset.error='true';
   opsStatus.textContent=e.status===403
    ?'원장 조회에 필요한 권한이 없거나 최근 MFA가 만료되었습니다.'
    :'보호된 관리자 업무원장 조회를 완료하지 못했습니다.';
  }
 }
 const financeLabels=[
  ['booking_count','개발 DB 예약'],
  ['hold_count','캐시 보류원장'],
  ['held_count','현재 HELD'],
  ['debited_count','완료 DEBITED'],
  ['fee_rule_mismatches','공식단가 10% 불일치'],
  ['confirmed_booking_missing_hold','확정예약 보류 누락'],
  ['hold_snapshot_mismatches','예약 스냅샷 불일치'],
  ['orphan_holds','예약 없는 보류'],
  ['duplicate_holds_for_booking','예약별 이중 보류'],
  ['refund_review_requests','환불 검토 요청']
 ];
 const safeFin=data=>data&&data.environment==='DEVELOPMENT'&&
   data.adapter==='DEV_VIRTUAL'&&data.read_only===true&&
   data.source_of_fee==='OFFICIAL_SERVICE_PRICE'&&data.fee_percent===10&&
   data.actual_pg_reconciled===false&&data.actual_payment_enabled===false&&
   data.full_cash_e2e_certified===false&&data.booking_or_cash_changed===false&&
   data.production_deployment===false&&data.schema_version==='WORK123_CASH_AUDIT_V1'&&
   financeLabels.every(([key])=>Number.isSafeInteger(data[key])&&data[key]>=0);
 async function loadFinance(){
  const version=++financeSequence,issuedScreen=selected,issuedToken=token;
  finItems.replaceChildren();finStatus.dataset.error='false';
  finStatus.textContent='재무 업무권한·공식단가 스냅샷을 검증하고 있습니다…';
  try{
   if(isExpired())throw Error('AUTH_EXPIRED');
   const data=await request('/rest/v1/rpc/jsb_w123_admin_cash_integrity',{
    method:'POST',accessToken:token,body:{}});
   if(version!==financeSequence||token!==issuedToken||selected!==issuedScreen||dashboard.hidden)return;
   if(!safeFin(data))throw Error('UNVERIFIED_RESPONSE');
   finItems.replaceChildren();
   for(const [key,label] of financeLabels){
    const tile=create('article','finance-item');
    tile.append(create('div','finance-label',label),
      create('div','finance-count',data[key].toLocaleString('ko-KR')));
    finItems.append(tile);
   }
   finStatus.textContent='DEV 가상캐시 조회만 완료 · 수리 공식단가 10% · PG/법률/세무/실거래 미검증';
  }catch(e){
   if(version!==financeSequence||token!==issuedToken||selected!==issuedScreen||dashboard.hidden)return;
   finItems.replaceChildren();finStatus.dataset.error='true';
   finStatus.textContent=e.status===403
    ?'개별 재무관리 권한(prices_manage) 또는 최근 MFA가 없어 접근할 수 없습니다.'
    :'재무 무결성 조회를 완료하지 못했습니다. 실제 PG 대사로 간주하지 않습니다.';
  }
 }

 const providerLabels=[
  ['org_count','수리업체 등록'],
  ['membership_count','소속기사 관계'],
  ['invited_memberships','기사 초대대기'],
  ['accepted_memberships','기사 초대수락'],
  ['ended_memberships','종료된 소속'],
  ['booking_membership_links','예약 연결 기록'],
  ['confirmed_bookings_with_nonaccepted_member','확정예약 연결 검토 필요'],
  ['document_count','업체 제출서류'],
  ['verified_document_count','검증된 제출서류'],
  ['region_link_count','업체 서비스지역 연결']
 ];
 const safeProvider=data=>data&&data.schema_version==='WORK122_ORG_BOOKING_READ_V1'&&
  data.environment==='DEVELOPMENT'&&data.read_only===true&&data.pii_included===false&&
  data.production_deployment===false&&data.assignment_action_enabled===false&&
  data.booking_change_enabled===false&&data.company_or_worker_record_modified===false&&
  data.full_company_e2e_certified===false&&
  providerLabels.every(([key])=>Number.isSafeInteger(data[key])&&data[key]>=0);
 async function loadProvider(){
  const version=++providerSequence,issuedScreen=selected,issuedToken=token;
  provItems.replaceChildren();provStatus.dataset.error='false';
  provStatus.textContent='업체·기사·예약 연결 관계를 서버에서 검증하고 있습니다…';
  try{
   if(isExpired())throw Error('AUTH_EXPIRED');
   const data=await request('/rest/v1/rpc/jsb_w122_admin_org_booking_integrity',{
    method:'POST',accessToken:token,body:{}});
   if(version!==providerSequence||issuedToken!==token||selected!==issuedScreen||dashboard.hidden)return;
   if(!safeProvider(data))throw Error('UNVERIFIED_RESPONSE');
   provItems.replaceChildren();
   for(const [key,label] of providerLabels){
    const tile=create('article','finance-item');
    tile.append(create('div','finance-label',label),
     create('div','finance-count',data[key].toLocaleString('ko-KR')));
    provItems.append(tile);
   }
   provStatus.textContent='업체·기사·예약 연결 진단 완료 · 실제 업체 승인·배정·예약변경 미활성';
  }catch(e){
   if(version!==providerSequence||issuedToken!==token||selected!==issuedScreen||dashboard.hidden)return;
   provItems.replaceChildren();provStatus.dataset.error='true';
   provStatus.textContent=e.status===403
    ?'업체·기사 업무권한(workers_review)이나 최근 MFA가 없어 조회할 수 없습니다.'
    :'보호된 업체·기사·예약 관계 점검을 완료하지 못했습니다.';
  }
 }

 function loadAdminConsoles(){
  opsSequence++;financeSequence++;providerSequence++;
  opsItems.replaceChildren();finItems.replaceChildren();provItems.replaceChildren();
  opsSection.hidden=!opsScreens.has(selected);
  finSection.hidden=!financeScreens.has(selected);
  provSection.hidden=selected!=='providers';
  if(!opsSection.hidden)void loadOps();
  if(!finSection.hidden)void loadFinance();
  if(!provSection.hidden)void loadProvider();
 }

 function renderScreen(){
  const current=sections.find(x=>x.id===selected)||sections[0];selected=current.id;
  select('workarea-title').textContent=current.label;
  select('workarea-description').textContent=current.group;
  select('detail-title').textContent=current.label;
  select('detail-info').textContent=current.description;
  select('detail-safety').textContent='개발용 요약 데이터만 조회할 수 있습니다. 이 화면의 실제 업무처리·고객 개인정보 열람·금전거래·전체 E2E 연결은 아직 검증되지 않았습니다.';
  for(const button of nav.querySelectorAll('button[data-screen-id]')){
   button.setAttribute('aria-current',button.dataset.screenId===selected?'page':'false');
  }
  void loadPanel();
  void loadRecords(0);
  loadAdminConsoles();
 }
 function buildNav(){
  nav.replaceChildren();
  for(const group of groups){
   const box=create('section','nav-group');
   box.append(create('h3','',group.title));
   for(const [id,label] of group.entries){
    const b=create('button','nav-link',label);
    b.type='button';b.dataset.screenId=id;
    b.addEventListener('click',()=>{
     if(!snapshot||isExpired()){emptySession();return;}
     selected=id;renderScreen();
     if(window.matchMedia('(max-width:760px)').matches)
      select('workarea-title').scrollIntoView({block:'start',behavior:'auto'});
    });
    box.append(b);
   }
   nav.append(box);
  }
 }
 function showDashboard(data){
  snapshot=data;selected='overview';buildNav();
  authLayout.hidden=true;dashboard.hidden=false;logout.hidden=false;topSession.hidden=false;
  message.textContent='관리자 인증 완료 · 업무별 DB 권한 및 집계 조회 준비 중 · 운영 실행 차단';
  renderScreen();
 }
 const friendly=e=>{
  const code=e?.message||'UPSTREAM_FAILURE';
  if(code==='AUTH_EXPIRED'||code==='AUTH_INVALID')return '세션이 만료되었거나 로그인 정보가 올바르지 않습니다. 다시 로그인해주세요.';
  if(code==='ACCESS_DENIED')return '이 계정에는 필요한 관리자 권한 또는 최근 MFA 인증이 없습니다.';
  if(code==='RATE_LIMITED')return '로그인 시도 제한이 적용되었습니다. 잠시 후 다시 시도해주세요.';
  if(code==='UNVERIFIED_RESPONSE')return '보호된 관리자 응답을 확인하지 못했습니다. 업무 화면을 열지 않습니다.';
  return '인증 또는 서버 연결을 완료하지 못했습니다. 연결 상태를 확인해주세요.';
 };
 login.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const email=select('login-email').value.trim();
  const password=select('login-password').value;
  if(!email||!password)return;
  guardBusy(true);showStatus('Supabase 관리자 계정 확인 중…');
  try{
   const result=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
   if(typeof result?.access_token!=='string'||!Number.isFinite(result?.expires_in)||
    result.expires_in<=0)throw Error('AUTH_INVALID');
   token=result.access_token;expiresAt=Date.now()+result.expires_in*1000-15000;
   // No access/refresh token or password is stored in HTML, URL, localStorage,
   // sessionStorage, cookies, console, or user-facing log.
   select('login-password').value='';
   await authUser(token);
   const factors=await request('/auth/v1/factors',{accessToken:token});
   const verified=(Array.isArray(factors?.totp)?factors.totp:
    Array.isArray(factors?.all)?factors.all:
    Array.isArray(factors?.factors)?factors.factors:[])
    .find(x=>x?.factor_type==='totp'&&x.status==='verified')||
    (Array.isArray(factors?.totp)?factors.totp:[]).find(x=>x?.status==='verified');
   if(!verified?.id){
    login.hidden=true;mfa.hidden=true;enroll.hidden=false;
    showStatus('인증 앱 최초 등록을 진행할 수 있습니다. 등록 후에도 관리자 업무권한은 별도 승인 전까지 차단됩니다.');
    return;
   }
   factorId=verified.id;login.hidden=true;mfa.hidden=false;
   mfaInput.focus();showStatus('등록된 인증 앱의 6자리 번호를 입력해주세요.');
  }catch(e){emptySession();showStatus(friendly(e),true);}
  finally{guardBusy(false);}
 });

 // WORK160: self-service TOTP registration; NEVER grants administrator permissions.
 select('enroll-start').addEventListener('click',async()=>{
  if(busy||isExpired()||snapshot)return;
  guardBusy(true);showStatus('인증 앱 등록용 QR을 생성하는 중입니다.');
  try{
   const d=await request('/auth/v1/factors',{method:'POST',accessToken:token,
    body:{factor_type:'totp',friendly_name:'집손봄 관리자 인증'}});
   if(typeof d?.id!=='string'||typeof d?.totp?.qr_code!=='string')throw Error('BAD_ENROLLMENT');
   const qr=d.totp.qr_code;
   if(!qr.startsWith('data:image/svg+xml')||!qr.includes(',')||qr.length>500000)
    throw Error('BAD_QR');
   enrollFactorId=d.id;
   select('enroll-qr').src=qr;select('enroll-qr-wrap').hidden=false;
   select('enroll-start').hidden=true;
   showStatus('QR을 인증 앱으로 스캔한 뒤 6자리 인증번호를 입력하세요. QR 비밀정보는 공유하지 마세요.');
  }catch{showStatus('인증 앱 등록 QR을 만들지 못했습니다. 서버 설정을 확인하세요.',true);}
  finally{guardBusy(false);}
 });
 enroll.addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!enrollFactorId||isExpired())return;
  const code=select('enroll-code').value.trim();
  if(!/^[0-9]{6}$/.test(code)){showStatus('6자리 인증번호를 확인해주세요.',true);return;}
  guardBusy(true);showStatus('인증 앱 등록을 검증하고 있습니다.');
  try{
   const challenge=await request('/auth/v1/factors/'+encodeURIComponent(enrollFactorId)+'/challenge',{
    method:'POST',accessToken:token,body:{}});
   if(typeof challenge?.id!=='string')throw Error('AUTH_INVALID');
   const result=await request('/auth/v1/factors/'+encodeURIComponent(enrollFactorId)+'/verify',{
    method:'POST',accessToken:token,body:{challenge_id:challenge.id,code}});
   if(typeof result?.access_token!=='string'||!Number.isFinite(result?.expires_in)||result.expires_in<=0)
    throw Error('AUTH_INVALID');
   token=result.access_token;expiresAt=Date.now()+result.expires_in*1000-15000;
   select('enroll-qr').removeAttribute('src');select('enroll-code').value='';enrollFactorId=null;
   await authUser(token);
   try{const data=await readSnapshot();showDashboard(data);}
   catch{
    emptySession();
    showStatus('인증 앱 등록이 완료됐습니다. 관리자 업무권한이 아직 승인되지 않아 업무 화면은 열리지 않습니다.');
   }
  }catch{showStatus('인증번호 검증에 실패했습니다. 새로운 6자리 번호로 다시 시도하세요.',true);}
  finally{guardBusy(false);}
 });
 select('enroll-cancel').addEventListener('click',()=>{void doLogout();});
 mfa.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!token||!factorId)return;
  const code=mfaInput.value.trim();
  if(!/^[0-9]{6}$/.test(code)){showStatus('6자리 인증번호를 확인해주세요.',true);return;}
  guardBusy(true);showStatus('인증 앱 및 관리자 권한 검증 중…');
  try{
   if(isExpired())throw Error('AUTH_EXPIRED');
   const challenge=await request('/auth/v1/factors/'+encodeURIComponent(factorId)+'/challenge',{
    method:'POST',accessToken:token,body:{}});
   if(typeof challenge?.id!=='string')throw Error('AUTH_INVALID');
   const result=await request('/auth/v1/factors/'+encodeURIComponent(factorId)+'/verify',{
    method:'POST',accessToken:token,body:{challenge_id:challenge.id,code}});
   if(typeof result?.access_token!=='string'||!Number.isFinite(result?.expires_in))throw Error('AUTH_INVALID');
   token=result.access_token;expiresAt=Date.now()+result.expires_in*1000-15000;
   mfaInput.value='';factorId=null;
   await authUser(token);
   const data=await readSnapshot();
   showDashboard(data);
  }catch(e){emptySession();showStatus(friendly(e),true);}
  finally{guardBusy(false);}
 });
 async function doLogout(){
  const previous=token;
  emptySession();
  if(previous)try{await request('/auth/v1/logout',{method:'POST',accessToken:previous});}catch{ /* No privileged local state persists */ }
 }
 logout.addEventListener('click',doLogout);
 select('mfa-cancel').addEventListener('click',doLogout);
 select('refresh').addEventListener('click',async()=>{
  if(busy||!snapshot)return;
  guardBusy(true);
  try{
   const data=await readSnapshot();
   snapshot=data;renderScreen();
   // readPanel() independently checks the current selected admin screen scope.
   // Do not overwrite an in-flight per-screen denial or display stale counts.
  }catch(e){emptySession();showStatus(friendly(e),true);}
  finally{guardBusy(false);}
 });
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&token&&isExpired()){
   emptySession();showStatus('관리자 세션이 만료되었습니다. 다시 로그인해주세요.',true);
  }
 });
 // A hard reload intentionally forces a new login: no persistent session.
 emptySession();
})();
