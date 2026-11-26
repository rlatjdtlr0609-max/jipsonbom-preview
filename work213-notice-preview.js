/* WORK213 · MASTER_11: informational event/notification template explorer.
   No API, provider messages, tokens, browser notifications or outbound delivery. */
'use strict';
(()=>{
 if(document.body.dataset.rolePage!=='repairCompany')return;
 const anchor=document.querySelector('#team-agenda');
 if(!anchor||document.querySelector('#work213-notices'))return;
 const templates=Object.freeze([
  {key:'request',label:'수리접수',recipient:'고객 · 관리자',message:'접수가 접수되었습니다. 관리자 검토 후 다음 단계가 안내됩니다.',gate:'승인된 접수 상태와 수신 동의 필요'},
  {key:'match',label:'기사 매칭',recipient:'승인된 기사 · 고객',message:'담당 가능한 작업 또는 견적 상태가 변경되었습니다.',gate:'기사 승인·매칭 권한·개인정보 노출 검증 필요'},
  {key:'booking',label:'방문예약',recipient:'고객 · 배정 기사',message:'견적 승인 및 방문예약 확정 상태를 확인해 주세요.',gate:'서버 예약원장 확정 및 중복 예약 방지 필요'},
  {key:'aftercare',label:'A/S·분쟁',recipient:'접수 고객 · 운영 담당자',message:'접수된 A/S·분쟁의 검토 상태를 확인해 주세요.',gate:'해당 사건 소유권·수신 동의·보호된 증빙 확인 필요'},
  {key:'exception',label:'운영 예외',recipient:'권한 있는 관리자',message:'처리 지연 또는 운영 무결성 검토가 필요합니다.',gate:'MFA 및 역할별 알림·감사 접근통제 필요'}
 ]);
 const mk=(tag,val,cls)=>{const n=document.createElement(tag);if(val!==undefined)n.textContent=val;if(cls)n.className=cls;return n;};
 const root=mk('section',undefined,'panel space24 work213-notices');root.id='work213-notices';
 root.setAttribute('aria-labelledby','work213-title');
 const heading=mk('h3','업무 알림 유형 · 개발 미리보기');heading.id='work213-title';
 root.append(heading,mk('p','수리업체가 받거나 관리해야 하는 알림의 종류와 서버 연결 조건을 확인합니다. 예시 메시지는 전송되지 않습니다.','work213-description'));
 const tabs=mk('div',undefined,'work213-tabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','알림 종류');
 const detail=mk('div',undefined,'work213-content');detail.setAttribute('aria-live','polite');
 const status=mk('output','알림 발송·기록 없음','work213-status');status.setAttribute('role','status');
 root.append(tabs,detail,status);
 const render=(current)=>{
  tabs.querySelectorAll('button').forEach(btn=>{const on=btn.dataset.work213Type===current.key;btn.setAttribute('aria-pressed',on?'true':'false');});
  detail.replaceChildren(mk('h4',current.label+' 알림 조건'),mk('p','수신 대상: '+current.recipient),mk('p','알림 예시: '+current.message),mk('p','서버 연결 선행조건: '+current.gate));
  status.textContent='시연 화면 · 실제 알림 전송 0건 · 개인정보 저장 0건';
 };
 for(const t of templates){const b=mk('button',t.label);b.type='button';b.dataset.work213Type=t.key;b.addEventListener('click',()=>render(t));tabs.append(b);}
 render(templates[0]);anchor.insertAdjacentElement('afterend',root);
})();