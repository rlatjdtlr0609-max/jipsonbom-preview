/* WORK241 - hidden DEV test-account read-only customer profile.
 * No registration, storage, receipt mutation, booking, payment or external provider.
 * This is NOT enabled in main until real signed test-account E2E is verified.
 */
'use strict';
(()=>{
 if(document.body.dataset.rolePage!=='customer')return;
 const host=document.getElementById('autharea');
 if(!host||document.getElementById('work241-customer-readonly'))return;
 const API='https://ohwkywomdqgcnptsnhwk.supabase.co';
 const KEY='sb_publishable_tNSrR-mJYeChyS1J_5Ykkg_oH15pvXd';
 const create=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const panel=create('section');panel.id='work241-customer-readonly';panel.className='panel space24 work241-readonly';
 panel.hidden=window.location.hash!=='#work241-dev-auth';
 panel.setAttribute('aria-label','승인 테스트 계정 본인접수 읽기 전용 검사');
 const title=create('h3','개발용 테스트 계정 · 본인 접수조회');panel.append(title);
 const info=create('p','승인된 개발용 테스트 계정 2개만 이용합니다. 실제 접수·예약·사진 업로드·PG는 처리하지 않습니다.');
 info.className='work241-disclaimer';panel.append(info);
 const form=create('form');const userLabel=create('label','테스트 계정 이메일');const email=create('input');
 email.type='email';email.required=true;email.autocomplete='username';email.maxLength=254;email.name='email';userLabel.append(email);
 const passLabel=create('label','비밀번호');const pass=create('input');
 pass.type='password';pass.minLength=12;pass.required=true;pass.autocomplete='current-password';pass.name='password';passLabel.append(pass);
 const login=create('button','개발계정 인증·본인정보 확인');login.type='submit';
 form.append(userLabel,passLabel,login);panel.append(form);
 const logout=create('button','이 화면에서 로그아웃');logout.type='button';logout.hidden=true;
 const status=create('output','테스트 계정 인증 전 · 본인 정보 없음');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const list=create('ol');list.className='work241-intake-list';
 panel.append(logout,status,list);host.insertAdjacentElement('afterend',panel);
 let version=0,token=null,expiresAt=0;
 const clear=()=>{version++;token=null;expiresAt=0;logout.hidden=true;login.disabled=false;list.replaceChildren();pass.value='';email.value='';status.textContent='인증된 테스트 세션이 없습니다.';};
 const request=async(path,{method='GET',body,bearer}={})=>{
  const headers={'apikey':KEY,...(bearer?{'authorization':'Bearer '+bearer}:{}),...(body?{'content-type':'application/json'}:{})};
  const response=await fetch(API+path,{method,headers,mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',
   referrerPolicy:'no-referrer',signal:AbortSignal.timeout(12000),...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Error('DEV_AUTH_OR_OWNER_NOT_VERIFIED');
  return data;
 };
 const current=g=>g===version&&!!token&&Date.now()<expiresAt&&panel.isConnected;
 const verify=async(g)=>{
  const me=await request('/functions/v1/jsb-work241-readonly/me',{bearer:token});
  if(!current(g)||me?.member!==true||me?.read_only!==true||me?.environment!=='DEVELOPMENT')throw Error('TEST_ACCOUNT_UNVERIFIED');
  const result=await request('/functions/v1/jsb-work241-readonly/requests',{bearer:token});
  if(!current(g)||result?.read_only!==true||result?.workflow_status_included!==false||!Array.isArray(result.intakes)||result.intakes.length>25)throw Error('PROFILE_UNVERIFIED');
  if(result.intakes.some(r=>typeof r.request_id!=='string'||!Number.isInteger(r.consent_count)))throw Error('PROFILE_UNVERIFIED');
  list.replaceChildren();
  for(const [i,r] of result.intakes.entries()){
   const li=create('li','내 접수 '+(i+1)+' · '+(Number.isFinite(Date.parse(r.submitted_at))?new Date(r.submitted_at).toLocaleDateString('ko-KR'):'일자 미확인')+' · 동의기록 '+r.consent_count+'건');
   list.append(li);
  }
  status.textContent='개발 계정 본인 접수 '+result.intakes.length+'건 확인 · 상태/시공정보는 표시하지 않습니다.';
  logout.hidden=false;
 };
 form.addEventListener('submit',async e=>{
  e.preventDefault();const g=++version;token=null;expiresAt=0;login.disabled=true;list.replaceChildren();status.textContent='개발 계정 인증 및 소유권 확인 중…';
  try{
   const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email:email.value.trim(),password:pass.value}});
   if(g!==version)return;
   if(typeof data?.access_token!=='string'||!data.access_token||!Number.isInteger(data.expires_in)||data.expires_in<30||
     data.user?.role!=='authenticated'||data.user?.is_anonymous===true)throw Error('AUTH_RESPONSE_UNVERIFIED');
   token=data.access_token;expiresAt=Date.now()+data.expires_in*1000;
   await verify(g);email.value='';
  }catch{if(g===version){clear();status.textContent='테스트 계정 인증 또는 본인 접수조회가 검증되지 않아 차단했습니다.';}}
  finally{if(g===version)login.disabled=false;pass.value='';}
 });
 logout.addEventListener('click',clear);
 window.addEventListener('hashchange',()=>{const shouldShow=window.location.hash==='#work241-dev-auth';if(!shouldShow)clear();panel.hidden=!shouldShow;});
})();