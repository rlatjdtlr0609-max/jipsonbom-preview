/* WORK164 - Standalone role-based public preview. No API, storage, auth or payments. */
'use strict';
(() => {
 const page=document.body.dataset.rolePage;
 const urls=Object.freeze({
  home:'./index.html',customer:'./customer.html',worker:'./worker.html',
  provider:'./construction.html',repairCompany:'./repair-company.html',
  adminEntry:'./admin.html'
 });
 if(!['customer','worker','provider','repairCompany'].includes(page))return;
 const status=document.getElementById('toast');
 let toastTimer;
 const toast=(message)=>{
  if(!status)return;
  status.textContent=message;status.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>status.classList.remove('show'),4500);
 };
 const jump=(id)=>{const target=document.getElementById(id);if(target){target.scrollIntoView({behavior:'smooth',block:'start'});}};
 const request=document.getElementById('requestForm');
 const media=document.getElementById('preview-media');
 const previewFiles=document.getElementById('preview-file');
 const receipt=document.getElementById('preview-receipt');
 const intakeAccount=document.getElementById('intake-account');
 const roleName=Object.freeze({customer:'고객',worker:'수리기사',provider:'공사업체',repairCompany:'수리업체'});
 document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');
  if(!target)return;
  const {go,scroll,auth,action,filter,provider,constructionStep,unavailable}=target.dataset;
  if(go){
   event.preventDefault();
   if(go===page){if(scroll)jump(scroll);else window.scrollTo({top:0,behavior:'smooth'});return;}
   const url=urls[go];
   if(url){location.assign(url+(scroll?'#'+encodeURIComponent(scroll):''));return;}
   toast('내부 전용 기능지도는 공개 미리보기에서 제공되지 않습니다.');
   return;
  }
  if(scroll){
   event.preventDefault();jump(scroll);return;
  }
  if(target.hasAttribute('data-intake-guest')){
   event.preventDefault();
   if(page!=='customer'){location.assign(urls.customer+'#reception');return;}
   if(intakeAccount){intakeAccount.selectedIndex=0;intakeAccount.dispatchEvent(new Event('change'));}
   jump('reception');
   toast('비회원 수리접수 화면 시연입니다. 실제 개인정보나 사진은 전송되지 않습니다.');
   return;
  }
  if(target.hasAttribute('data-intake-open')){
   event.preventDefault();
   if(page!=='customer'){location.assign(urls.customer+'#reception');return;}
   jump('reception');toast('시연용 수리접수 화면입니다. 실제 고객 정보는 입력하지 마세요.');return;
  }
  if(target.hasAttribute('data-intake-member')){
   event.preventDefault();
   if(page!=='customer'){location.assign(urls.customer+'#autharea');return;}
   if(intakeAccount){intakeAccount.selectedIndex=1;intakeAccount.dispatchEvent(new Event('change'));}
   jump('autharea');toast('실제 회원 가입·로그인은 개발환경 통합검증 후 제공됩니다.');return;
  }
  if(target.hasAttribute('data-intake-close')){
   event.preventDefault();target.closest('dialog')?.close();return;
  }
  if(auth){
   event.preventDefault();
   if(auth==='login'||auth==='signup'){if(page!=='customer'){location.assign(urls.customer+'#autharea');return;}jump('autharea');}
   toast(roleName[page]+' 페이지의 '+(auth==='login'?'로그인':auth==='signup'?'회원가입':'등록·승인')+'은 시연 전용이며 실제 계정 처리는 불가능합니다.');
   return;
  }
  if(action){
   event.preventDefault();
   const labels={approve:'견적 승인',book:'예약',cancel:'취소',claim:'작업 선택',quote:'견적 제출',complete:'작업 완료',hyGuest:'접수'};
   if(Object.prototype.hasOwnProperty.call(labels,action)){
    toast('시연용 '+labels[action]+' 안내입니다. 실제 작업·예약·결제·캐시 원장은 변경되지 않습니다.');
    return;
   }
  }
  if(filter){
   event.preventDefault();
   const section=target.closest('#jobs');
   if(!section)return;
   for(const chip of section.querySelectorAll('[data-filter]'))chip.classList.toggle('active',chip===target);
   for(const item of section.querySelectorAll('.item'))item.hidden=filter!=='전체'&&!item.textContent.includes(filter);
   return;
  }
  if(constructionStep){
   event.preventDefault();
   const m=document.querySelector('#constructionContract [role="status"]');
   if(m)m.textContent=constructionStep==='report'
    ?'시연 전용 · 예시 계약 보고, 실제 계약 및 청구는 차단'
    :'시연 전용 · 가상 고객 문의·현장상담 안내';
   toast('공사업체 시연입니다. 실제 계약이나 청구는 발생하지 않습니다.');
   return;
  }
  if(provider||unavailable){
   event.preventDefault();toast((provider||unavailable)+' · 시연용 안내입니다. 실제 신청은 불가능합니다.');
  }
 });
 if(media){
  media.addEventListener('change',()=>{
   if(previewFiles)previewFiles.textContent=media.files.length
    ?'선택한 파일 '+media.files.length+'개 · 서버로 전송하지 않습니다.'
    :'선택한 파일이 없습니다.';
  });
 }
 if(request){
  request.addEventListener('submit',event=>{
   event.preventDefault();
   if(receipt)receipt.textContent='시연 전용 · '+(request.elements.category?.value||'수리')+' · 실제 접수·예약·계정 저장은 발생하지 않았습니다.';
   if(media)media.value='';
   if(previewFiles)previewFiles.textContent='';
  });
 }
 const calc=document.getElementById('calcprice'),calcResult=document.getElementById('calcresult');
 if(calc&&calcResult){
  const render=()=>{
   const amount=calc.valueAsNumber;
   const positive=Number.isSafeInteger(amount)&&amount>0;
   const exact=positive&&amount%10===0;
   calcResult.textContent=exact
    ?(amount/10).toLocaleString('ko-KR')+'원'
    :positive?'계산 보류 · 10% 원 미만 처리기준 미확정':'— · 유효한 공식단가 예시를 입력하세요';
   calcResult.dataset.work283Valid=exact?'true':'false';
  };
  calc.addEventListener('input',render);
 }
 if(location.hash.length>1){
  const id=decodeURIComponent(location.hash.slice(1));
  if(document.getElementById(id))requestAnimationFrame(()=>jump(id));
 }
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape')document.querySelector('.mobile-menu[open]')?.removeAttribute('open');
 });
 // No fetch(), localStorage, sessionStorage, service-role keys, cookies, or database writes.
})();
