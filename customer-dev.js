/* WORK165: DEV ONLY | Supabase Auth + confirmed member intake + owned profile.
 * Original WORK164 demo remains unchanged. No service-role key, no session persistence.
 * Do not use real personal data on the public preview. Never expose session tokens.
 */
'use strict';
(()=>{
 const API='https://ohwkywomdqgcnptsnhwk.supabase.co';
 const KEY='sb_publishable_tNSrR-mJYeChyS1J_5Ykkg_oH15pvXd'; // Supabase publishable (public) key, already in public admin.js
 const VALID_ORIGIN=/^(?:https:\/\/rlatjdtlr0609-max\.github\.io|http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?)$/i;
 const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
 const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 const status=document.getElementById('w165-status');
 const authForm=document.getElementById('w165-auth');
 const requestForm=document.getElementById('w165-request');
 const list=document.getElementById('w165-list');
 const detail=document.getElementById('w165-detail');
 const sessionLabel=document.getElementById('w165-session');
 const signup=document.getElementById('w165-signup');
 const signout=document.getElementById('w165-signout');
 const reload=document.getElementById('w165-reload');
 if(!authForm||!requestForm||!list||!status)return;
 let session=null,revision=0,rows=[],nextBefore=null,pending=null,busy=false;
 const write=(x)=>{status.textContent=x;};
 const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=String(value??'');return e;};
 const normalizePhone=v=>String(v).replace(/[^0-9]/g,'');
 const sessionValid=()=>!!(session&&Date.now()<session.expiresAt&&UUID.test(session.id));
 const clearWork=()=>{rows=[];nextBefore=null;pending=null;list.replaceChildren();detail.replaceChildren();};
 const reset=()=>{
  revision++;session=null;clearWork();requestForm.hidden=true;reload.disabled=true;
  signout.hidden=true;authForm.hidden=false;sessionLabel.textContent='로그인하지 않음';
 };
 function requireSession(){
  if(!sessionValid()){reset();throw Error('로그인이 만료되었습니다. 다시 로그인하세요.');}
  return session;
 }
 async function api(path,{method='GET',body=null,token=null}={}){
  if(!VALID_ORIGIN.test(location.origin))throw Error('허용되지 않은 개발용 출처입니다.');
  if(!path.startsWith('/auth/v1/')&&!path.startsWith('/rest/v1/rpc/'))throw Error('허용되지 않은 API 경로');
  const headers={'apikey':KEY,'content-type':'application/json'};
  if(token)headers.authorization='Bearer '+token;
  const r=await fetch(API+path,{
   method,mode:'cors',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',
   headers, ...(body===null?{}:{body:JSON.stringify(body)})
  });
  let data=null;
  try{data=await r.json();}catch{}
  if(!r.ok){
   const code=String(data?.code||data?.error_code||'');
   if(r.status===401||r.status===403)throw Error('인증 또는 소유권 검증에 실패했습니다.');
   if(code==='email_not_confirmed')throw Error('이메일 확인 후 로그인하세요.');
   if(code==='invalid_credentials')throw Error('로그인 정보가 올바르지 않습니다.');
   throw Error('개발 서버 요청이 거부되었습니다. ('+r.status+')');
  }
  return data;
 }
 function makeIdempotencyKey(){
  const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
  return [...bytes].map(n=>n.toString(16).padStart(2,'0')).join('');
 }
 function setBusy(value){
  busy=value;
  for(const button of [authForm.querySelector('button[type=submit]'),signup,signout,reload,
                        requestForm.querySelector('button[type=submit]')]){
   if(button)button.disabled=value;
  }
 }
 function renderList(){
  list.replaceChildren();
  for(const record of rows){
   const id=record?.request_id;
   if(!UUID.test(id||''))continue;
   const li=text('li','');
   const btn=text('button','접수번호 '+id.slice(0,8)+'… · '+String(record.submitted_at||'접수'));
   btn.type='button';btn.className='btn small soft';
   btn.dataset.w165Open=id;li.append(btn);list.append(li);
  }
  if(!rows.length)list.append(text('li','내 접수 기록이 없습니다.'));
 }
 async function loadProfile(before=null){
  const s=requireSession(),rev=revision;
  const data=await api('/rest/v1/rpc/jsb_w16_member_profile',{method:'POST',token:s.token,body:{p_before:before}});
  if(rev!==revision||!sessionValid())return;
  if(data?.account_id!==s.id||!Array.isArray(data?.intakes))
   throw Error('계정과 접수 소유자 검증이 일치하지 않습니다.');
  const received=data.intakes.filter(x=>UUID.test(x?.request_id||''));
  rows=before?rows.concat(received.filter(x=>!rows.some(y=>y.request_id===x.request_id))):received;
  nextBefore=UUID.test(data.next_before||'')?data.next_before:null;
  renderList();
  const more=document.getElementById('w165-more');if(more)more.hidden=!nextBefore;
  write('서버 검증 완료: 현재 로그인 계정의 접수 '+rows.length+'건만 조회했습니다.');
 }
 function validatedPayload(){
  const f=requestForm.elements;
  const name=f.name.value.trim(),phone=normalizePhone(f.phone.value),category=f.category.value.trim();
  const description=f.description.value.trim(),address=f.address.value.trim();
  if(name.length<1||name.length>80||!/^[0-9]{8,11}$/.test(phone)||
     category.length<1||category.length>80||description.length<1||description.length>2000||
     address.length<1||address.length>300)throw Error('이름, 연락처, 수리내용, 주소를 다시 확인하세요.');
  if(!f.contactConfirmed.checked||!f.terms.checked||!f.privacy.checked)
   throw Error('연락처 확인과 필수 동의 두 가지가 필요합니다.');
  return {name,phone,category,description,address,
   terms:true,privacy:true,policyVersion:'work01-dev-v1',contactConfirmed:true};
 }
 // Existing WORK164 login/signup CTAs now focus the new DEV auth panel.
 // Capture before the legacy demo-only click handler; do not intercept any other role.
 document.addEventListener('click',event=>{
  const link=event.target.closest('[data-auth="login"],[data-auth="signup"]');
  if(!link||!link.closest('[data-screen="customer"]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  document.getElementById('w165-dev')?.scrollIntoView({behavior:'smooth',block:'start'});
  authForm.querySelector('input[name="email"]')?.focus({preventScroll:true});
  write('개발용 회원 인증 화면입니다. 실제 고객정보 대신 합성 데이터만 사용하세요.');
 },true);
 authForm.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const f=authForm.elements,email=f.email.value.trim(),password=f.password.value;
  if(!EMAIL.test(email)||!password){write('이메일과 비밀번호를 확인하세요.');return;}
  // Existing session must be revoked before changing account. No user data persists.
  const old=session?.token;reset();setBusy(true);write('개발용 이메일 계정을 인증 중입니다.');
  try{
   if(old)await api('/auth/v1/logout',{method:'POST',token:old,body:{}}).catch(()=>{});
   const response=await api('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
   if(typeof response?.access_token!=='string'||!Number.isFinite(response?.expires_in)||
       response.expires_in<=30)throw Error('유효한 인증 세션을 발급받지 못했습니다.');
   const user=await api('/auth/v1/user',{token:response.access_token});
   if(!UUID.test(user?.id||'')||user?.email?.toLowerCase()!==email.toLowerCase()||
      !user?.email_confirmed_at||user?.is_anonymous===true)
    throw Error('이메일 확인이 끝난 본인 계정만 이용할 수 있습니다.');
   session={token:response.access_token,id:user.id,expiresAt:Date.now()+response.expires_in*1000-15000};
   revision++;
   clearWork();authForm.hidden=true;requestForm.hidden=false;reload.disabled=false;
   signout.hidden=false;sessionLabel.textContent='이메일 확인된 고객 계정: '+email;
   write('로그인 완료. 서버에서 본인 접수만 조회합니다.');
   await loadProfile();
  }catch(e){reset();write(e.message||'인증에 실패했습니다.');}
  finally{f.password.value='';setBusy(false);}
 });
 signup.addEventListener('click',async()=>{
  if(busy)return;
  const f=authForm.elements,email=f.email.value.trim(),password=f.password.value;
  if(!EMAIL.test(email)||password.length<12){write('회원가입에는 이메일과 12자 이상의 비밀번호가 필요합니다.');return;}
  reset();setBusy(true);
  try{
   await api('/auth/v1/signup',{method:'POST',body:{
    email,password
   }});
   write('가입 요청을 접수했습니다. 등록 메일에서 확인 후 로그인하세요. 실제 계정이 활성화되었는지는 서버 인증으로 다시 검증합니다.');
  }catch(e){write(e.message||'가입 요청 실패');}
  finally{f.password.value='';setBusy(false);}
 });
 signout.addEventListener('click',async()=>{
  const t=session?.token;reset();write('로그아웃했습니다. 다른 고객의 접수내역은 표시하지 않습니다.');
  if(t)await api('/auth/v1/logout',{method:'POST',token:t,body:{}}).catch(()=>{});
 });
 reload.addEventListener('click',async()=>{
  if(busy)return;setBusy(true);
  try{await loadProfile();}catch(e){write(e.message||'조회 실패');}
  finally{setBusy(false);}
 });
 document.getElementById('w165-more')?.addEventListener('click',async()=>{
  if(busy||!nextBefore)return;setBusy(true);
  try{await loadProfile(nextBefore);}catch(e){write(e.message||'추가 조회 실패');}
  finally{setBusy(false);}
 });
 list.addEventListener('click',async e=>{
  const id=e.target.closest('button[data-w165-open]')?.dataset.w165Open;
  if(!UUID.test(id||'')||!rows.some(x=>x.request_id===id)||busy)return;
  const s=requireSession(),rev=revision;setBusy(true);
  try{
   const data=await api('/rest/v1/rpc/jsb_member_request',{method:'POST',token:s.token,body:{p_id:id}});
   if(rev!==revision||!sessionValid())return;
   if(!data||data.id!==id)throw Error('해당 접수는 조회할 수 없습니다.');
   detail.replaceChildren(text('h4','내 접수 상세'),text('p','접수번호: '+data.id),
    text('p','상태: '+String(data.status||'-')),text('p','수리 분야: '+String(data.category||'-')),
    text('p','설명: '+String(data.description||'-')));
   write('본인 접수의 상세정보만 서버에서 확인했습니다.');
  }catch(e){detail.replaceChildren();write(e.message||'상세 조회 불가');}
  finally{setBusy(false);}
 });
 requestForm.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;setBusy(true);
  try{
   const s=requireSession(),rev=revision,payload=validatedPayload();
   const canonical=JSON.stringify(payload);
   if(!pending||pending.canonical!==canonical)pending={canonical,key:makeIdempotencyKey()};
   const result=await api('/rest/v1/rpc/jsb_member_submit_once',{
    method:'POST',token:s.token,body:{p_data:payload,p_key:pending.key}
   });
   if(rev!==revision||!sessionValid())return;
   if(!UUID.test(result?.id||''))throw Error('접수번호가 올바르지 않아 저장을 확인할 수 없습니다.');
   pending=null;
   requestForm.reset();
   detail.replaceChildren();
   write('개발 DB에 접수 저장됨 · '+result.id+' (가상 시험정보만 사용)');
   await loadProfile();
  }catch(e){
   write((e.message||'접수 실패')+' 동일한 내용으로 재시도하면 중복 방지 키를 재사용합니다.');
  }finally{setBusy(false);}
 });
 reset();write('개발용 고객 인증 준비. 실제 개인정보·시공사진은 입력하지 마세요.');
 // No refresh tokens, session/case data or credentials persisted.
})();
