/* WORK103~106 / MASTER_11
 * Static GitHub Pages hosts NO privileged records or keys.
 * Dev Supabase Auth + TOTP provides AAL2; public.jbs_w103... (server DB) gates
 * operations_read / requests_publish / access_review / recent MFA.
 * ALL access tokens stay in JS memory only (no storage/cookies/URL).
 * The 24 screens are read-only development dashboards, NOT full E2E certification.
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
 const login=select('login-form'),mfa=select('mfa-form');
 const status=select('auth-status'),logout=select('logout');
 const mfaInput=select('totp-code'),topSession=select('session-label');
 const message=select('dashboard-message'),nav=select('screen-nav');
 const metrics=select('metrics');
 const sections=groups.flatMap(g=>g.entries.map(([id,label,description,...keys])=>({id,label,description,keys,group:g.title})));
 let token=null;let expiresAt=0;let factorId=null;let busy=false;let selected='overview';let snapshot=null;
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
  token=null;expiresAt=0;factorId=null;snapshot=null;
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
 const count=(key)=>Number.isSafeInteger(snapshot?.counts?.[key])&&snapshot.counts[key]>=0
  ?snapshot.counts[key].toLocaleString('ko-KR'):'—';
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
  const ids=current.keys.length?current.keys:['customer_requests','open_operation_tasks','active_compliance_policy'];
  metrics.replaceChildren();
  for(const key of ids){
   const tile=create('article','metric');
   tile.append(create('div','metric-label',labels[key]||key),
    create('div','metric-value',count(key)),create('div','metric-note','개발 DB · 서버 권한검사 후 집계'));
   metrics.append(tile);
  }
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
  message.textContent='관리자 권한·최근 인증 앱 확인 완료 · 개발 DB 읽기 전용 요약 · 실제 관리자 업무처리 및 운영 출시 비활성';
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
    emptySession();showStatus('이 계정에는 검증된 TOTP 인증 앱이 없습니다. 관리자 MFA 등록과 업무권한 승인이 먼저 필요합니다.',true);
    return;
   }
   factorId=verified.id;login.hidden=true;mfa.hidden=false;
   mfaInput.focus();showStatus('등록된 인증 앱의 6자리 번호를 입력해주세요.');
  }catch(e){emptySession();showStatus(friendly(e),true);}
  finally{guardBusy(false);}
 });
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
   message.textContent='개발 DB 요약을 다시 조회했습니다. '+new Date().toLocaleString('ko-KR')+' · 고객·기사 원문은 내려받지 않습니다.';
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
