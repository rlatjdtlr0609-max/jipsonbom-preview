'use strict';

const screen = document.querySelector('#screen');
const routes = new Map([...screen.querySelectorAll('[data-screen]')].map(node=>[node.dataset.screen,node]));
const request = document.querySelector('#requestForm');
const receipt = document.querySelector('#preview-receipt');
const media = document.querySelector('#preview-media');
const construction = document.querySelector('#constructionContract');
let toastTimer;
let pendingCategory = '';
const intakeDialog = document.querySelector('#intake-choice');

function toast(message) {
  const status = document.querySelector('#toast');
  status.textContent = message;
  status.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>status.classList.remove('show'),4000);
}

function show(page, anchor) {
  if (!routes.has(page)) page = 'home';
  for (const [name, view] of routes) view.hidden = page!==name;
  let selectedMobile = false;
  for (const tab of document.querySelectorAll('#tabs [data-go], .mobile-menu nav [data-go]')) {
    const isMobile = !!tab.closest('.mobile-menu');
    const active = tab.dataset.go===page && (!isMobile || !selectedMobile);
    if (active && isMobile) selectedMobile=true;
    tab.classList.toggle('active',active);
    if(active) tab.setAttribute('aria-current','page');
    else tab.removeAttribute('aria-current');
  }
  if (anchor) {
    const section=document.getElementById(anchor);
    if (section) {
      section.tabIndex=-1;
      section.focus({preventScroll:true});
      section.scrollIntoView({block:'start'});
    }
  }
  else window.scrollTo(0,0);
}

function navigate(page, anchor) {
  if(location.hash!=='#'+page) history.pushState(null,'','#'+page);
  show(page,anchor);
  const heading=routes.get(page)?.querySelector('h1');
  if(heading&&!anchor){heading.tabIndex=-1;heading.focus({preventScroll:true});}
}

window.addEventListener('popstate',()=>show(location.hash.slice(1)));

function startRequest(category, guest=false) {
  if(category&&[...request.elements.category.options].some(option=>option.value===category))request.elements.category.value=category;
  if(guest) request.elements.account.selectedIndex=0;
  navigate('customer','reception');
}
function openIntake(category='') {
  pendingCategory=category;
  document.querySelector('.mobile-menu')?.removeAttribute('open');
  if(typeof intakeDialog?.showModal === 'function') intakeDialog.showModal();
  else toast('접수 방법을 선택해주세요. 실제 접수는 개발환경 검증 후 제공됩니다.');
}

const actions={
 approve:['예시 견적 승인','예시 견적 승인 상태입니다.'],
 book:['예시 예약','예시 방문일을 선택한 상태입니다. 실제 방문이나 보류 거래는 발생하지 않습니다.'],
 cancel:['예시 취소','예시 취소 상태입니다. 실제 취소나 거래 변경은 없습니다.'],
 claim:['예시 작업 선택','예시 작업 선택 화면입니다. 실제 배정은 발생하지 않습니다.'],
 quote:['예시 견적 제안','예시 견적 제안 상태입니다. 실제 고객에게 전송되지 않습니다.'],
 complete:['예시 수리완료','예시 작업완료 상태입니다. 실제 거래는 변경되지 않습니다.'],
};

document.addEventListener('click',event=>{
  const target=event.target.closest('button,a');
  if(!target)return;
  const {go,scroll,auth,cat,action,filter,provider,constructionStep,unavailable}=target.dataset;
  if (target.hasAttribute('data-intake-open')) {event.preventDefault();openIntake();return;}
  if (target.hasAttribute('data-intake-close')) {event.preventDefault();intakeDialog?.close();return;}
  if (target.hasAttribute('data-intake-guest')) {
    event.preventDefault();
    intakeDialog?.close();
    startRequest(pendingCategory,true);
    return;
  }
  if (target.hasAttribute('data-intake-member')) {
    event.preventDefault();
    intakeDialog?.close();
    if(pendingCategory&&[...request.elements.category.options].some(option=>option.value===pendingCategory)) request.elements.category.value=pendingCategory;
    request.elements.account.selectedIndex=1;
    navigate('customer','autharea');
    toast('회원 로그인·가입은 개발환경 검증 전까지 시연 안내만 제공합니다.');
    return;
  }
  if (go) {event.preventDefault();document.querySelector('.mobile-menu')?.removeAttribute('open');navigate(go,scroll);return;}
  if (scroll) {event.preventDefault();document.getElementById(scroll)?.scrollIntoView({block:'start'});return;}
  if (cat) {cat==='전문 기사'?navigate('worker'):openIntake(cat);return;}
  if (auth) {
    if (auth==='login' || auth==='signup') navigate('customer','autharea');
    if (auth==='worker') navigate('worker','worker-apply');
    const label={login:'로그인',signup:'회원가입',worker:'기사 등록',repairCompany:'수리업체 가입'}[auth]??'가입 및 심사';
    toast(label+'은 개발 서버 연결 후 이용할 수 있습니다. 현재는 시연 안내입니다.');
    return;
  }
  if (action==='hyGuest') {openIntake();return;}
  if (action&&Object.hasOwn(actions,action)) {
    const [label,message]=actions[action];
    target.closest('.item')?.querySelector('.status')?.replaceChildren(label);
    toast(message);return;
  }
  if (filter) {
    const panel=target.closest('#jobs');
    for(const chip of panel.querySelectorAll('[data-filter]')) chip.classList.toggle('active',chip===target);
    for(const task of panel.querySelectorAll('.item'))task.hidden=filter!=='전체'&&!task.textContent.includes(filter);
    return;
  }
  if (constructionStep) {
    construction.querySelector('[role="status"]').textContent=constructionStep==='report'
      ?'시연 전용 · 예시 계약 보고, 실제 계약 및 청구 차단'
      :'시연 전용 · 가상 고객 문의와 현장상담 예시';
    return;
  }
  if (provider || unavailable) toast((provider??unavailable)+' · 예시 화면입니다. 실제 신청은 제공하지 않습니다.');
});

document.querySelector('#hySearch').addEventListener('submit',event=>{
  event.preventDefault();
  const term=document.querySelector('#hyQuery').value.trim();
  const card=[...document.querySelectorAll('.hy-service-card')].find(card=>term&&card.textContent.includes(term));
  openIntake(card?.dataset.cat??'');
});

media.addEventListener('change',()=>{
  document.querySelector('#preview-file').textContent=media.files.length
    ?'선택한 파일 '+media.files.length+'개 · 전송하지 않습니다.'
    :'선택한 파일이 없습니다.';
});

request.addEventListener('submit',event=>{
  event.preventDefault();
  receipt.textContent='시연 전용 · '+request.elements.category.value+' · 예시 접수 흐름을 확인했습니다.';
  media.value='';
  document.querySelector('#preview-file').textContent='';
});

document.querySelector('#calcprice').addEventListener('input',event=>{
  const price=event.target.valueAsNumber;
  document.querySelector('#calcresult').textContent=Number.isFinite(price)&&price>=0
    ?(price/10).toLocaleString('ko-KR')+'원':'—';
});

show(location.hash.slice(1));


// Close the mobile drawer after selection, outside tap, or Escape. No API changes.
document.addEventListener('click',event=>{
 const drawer=document.querySelector('.mobile-menu');
 if(!drawer?.open)return;
 if(!drawer.contains(event.target)||event.target.closest('.mobile-menu [data-go],.mobile-menu [data-auth],.mobile-menu [data-intake-open]')){
   drawer.removeAttribute('open');
 }
});
document.addEventListener('keydown',event=>{
 const drawer=document.querySelector('.mobile-menu[open]');
 if(event.key==='Escape' && drawer){
   drawer.open=false;
   drawer.querySelector('summary').focus({preventScroll:true});
 }
});

// The public page intentionally has no live member/intake API and no credential transport.
