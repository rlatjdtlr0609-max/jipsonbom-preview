'use strict';

const screen = document.querySelector('#screen');
const routes = new Map([...screen.querySelectorAll('[data-screen]')].map(node=>[node.dataset.screen,node]));
const request = document.querySelector('#requestForm');
const receipt = document.querySelector('#preview-receipt');
const media = document.querySelector('#preview-media');
const construction = document.querySelector('#constructionContract');
let toastTimer;

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
  for (const tab of document.querySelectorAll('#tabs [data-go]')) {
    tab.classList.toggle('active',tab.dataset.go===page);
    if(tab.dataset.go===page) tab.setAttribute('aria-current','page');
    else tab.removeAttribute('aria-current');
  }
  if (anchor) document.getElementById(anchor)?.scrollIntoView({block:'start'});
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
  if (go) {event.preventDefault();navigate(go,scroll);return;}
  if (scroll) {event.preventDefault();document.getElementById(scroll)?.scrollIntoView({block:'start'});return;}
  if (cat) {cat==='전문 기사'?navigate('worker'):startRequest(cat);return;}
  if (auth) {
    const label={login:'로그인',signup:'회원가입',worker:'기사 등록'}[auth]??'가입 및 심사';
    toast(label+'은 개발 서버 연결 후 이용할 수 있습니다.');
    return;
  }
  if (action==='hyGuest') {startRequest('',true);return;}
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
  startRequest(card?.dataset.cat);
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
