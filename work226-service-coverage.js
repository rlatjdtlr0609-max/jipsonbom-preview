/* WORK226 — nationwide intake vs confirmed service area; public, read-only, no network. */
'use strict';
(()=>{
 const host=document.querySelector('#service-categories');
 if(!host||document.getElementById('jsb-work226-coverage'))return;
 const create=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
 const box=create('details');box.id='jsb-work226-coverage';box.className='jsb-coverage-note wrap';
 const summary=create('summary','전국 수리접수와 실제 방문 가능지역은 어떻게 다른가요?');
 const body=create('div');body.className='jsb-coverage-body';
 body.append(
  create('p','전국 어디서나 사진으로 수리요청을 접수할 수 있습니다. 접수 자체가 기사 배정이나 방문예약 확정을 의미하지는 않습니다.'),
  create('p','실제 방문 가능 여부는 승인된 기사, 활동지역, 자격, 일정 및 고객의 견적 승인·예약확정을 거쳐 결정됩니다.'),
  create('p','기사 연결이 어려운 지역은 관리자 확인이 필요하며, 확인되지 않은 방문시간을 보장하지 않습니다.')
 );
 const note=create('p','현재 고정 페이지는 개발 미리보기입니다. 실제 접수·기사배정·예약·결제는 처리하지 않습니다.');
 note.className='jsb-coverage-disclaimer';body.append(note);
 box.append(summary,body);host.insertAdjacentElement('afterend',box);
})();