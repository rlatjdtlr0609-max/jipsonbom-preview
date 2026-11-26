/* WORK212 · MASTER_11 — safe customer aftercare guidance, not a repair case submission. */
'use strict';
(()=>{
 if(document.body.dataset.rolePage!=='customer')return;
 const host=document.querySelector('#asarea');
 if(!host||document.querySelector('#work212-aftercare'))return;
 const mk=(tag,txt,cls)=>{const n=document.createElement(tag);if(txt!==undefined)n.textContent=txt;if(cls)n.className=cls;return n;};
 const section=mk('section',undefined,'panel space24 work212-aftercare');
 section.id='work212-aftercare';section.setAttribute('aria-labelledby','work212-title');
 const head=mk('h3','수리완료부터 A/S까지 처리 흐름');head.id='work212-title';
 section.append(head,mk('p','아래는 처리 순서와 준비물 안내입니다. 현재 고정 링크에서 A/S 신청·사진 전송·완료확인·분쟁 접수는 실행되지 않습니다.','work212-description'));
 const stages=mk('ol',undefined,'work212-stages');
 const content=[
  ['01','기사 작업완료 보고','완료 사진·작업 체크리스트를 기사 업무 원장에 기록'],
  ['02','고객 완료확인','실제 작업과 증빙 확인 후 고객 또는 승인된 운영자가 완료여부 확정'],
  ['03','A/S·문제 접수','수리이력에 연결하여 하자·문제 내용을 접수하고 책임주체에 전달'],
  ['04','기사·관리자 검토','처리기한·증빙·분쟁·사고·보험 필요여부 판단'],
  ['05','처리결과 보존','결과와 수리 이력을 안전한 서버·감사원장에 보존']
 ];
 for(const [step,title,description] of content){
  const item=mk('li');item.append(mk('span',step,'work212-index'),mk('strong',title),mk('p',description));stages.append(item);
 }
 section.append(stages);
 const checklist=mk('fieldset',undefined,'work212-checks');
 const legend=mk('legend','A/S 상담 준비 체크리스트 (이 브라우저에서만 임시 표시)');
 checklist.append(legend);
 const checks=['기존 접수번호 및 수리일 확인','고장 상태와 수리 이후 증상 정리','필요한 사진·증빙을 별도로 준비'];
 checks.forEach((label,i)=>{
  const line=mk('label');const input=mk('input');input.type='checkbox';input.dataset.work212Check=String(i);
  line.append(input,mk('span',label));checklist.append(line);
 });
 const status=mk('output','준비항목 0/3 확인','work212-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 section.append(checklist,status);
 checklist.addEventListener('change',()=>{
  const total=checklist.querySelectorAll('input:checked').length;
  status.textContent=total===3?'준비항목 3/3 확인 · 실제 A/S는 인증된 개발환경에서만 접수됩니다.':'준비항목 '+total+'/3 확인';
 });
 const note=mk('p','실제 A/S 원장의 저장, 기사에게 알림, 보류 캐시의 최종 차감 또는 환입은 서버 승인이 필요하며 이 화면은 어느 것도 수행하지 않습니다.','work212-safety');
 section.append(note);
 host.insertAdjacentElement('afterend',section);
})();