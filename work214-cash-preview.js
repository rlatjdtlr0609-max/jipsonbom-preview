/* WORK214 · MASTER_11 official-price × 10% synthetic state machine.
 * Public preview only. NO wallet, cash sale, PG, storage or backend command.
 * Rounding and multi-job price policies remain NOT APPROVED.
 */
'use strict';
(()=>{
 if(document.body.dataset.rolePage!=='worker')return;
 const anchor=document.getElementById('wallet');
 if(!anchor||document.getElementById('work214-cash'))return;
 const mk=(tag,value,cls)=>{const n=document.createElement(tag);if(value!==undefined)n.textContent=String(value);if(cls)n.className=cls;return n;};
 const root=mk('section',undefined,'panel space24 work214-cash');root.id='work214-cash';
 root.setAttribute('aria-labelledby','work214-title');
 const title=mk('h3','공식 수리단가 10% · 가상 캐시 흐름');title.id='work214-title';
 root.append(title,mk('p','공식단가 100,000원이라는 순수 예시입니다. 실제 공식 단가표, 고객 견적, 캐시 충전 및 결제와 연결되지 않습니다.','work214-intro'));
 const summary=mk('div',undefined,'work214-values');
 for(const [label,value] of [['가정한 공식 수리단가','100,000원'],['기사 플랫폼 이용료 (정확히 10%)','10,000원'],['실제 고객 수리비','기사 견적과 별도']]){
  const item=mk('div');item.append(mk('span',label),mk('strong',value));summary.append(item);
 }
 root.append(summary);
 const controls=mk('div',undefined,'work214-actions');
 const buttons=[
  ['hold','예약확정 → 모의 보류'],
  ['debit','정상완료 → 모의 차감'],
  ['release','미성립 → 모의 환입'],
  ['reset','예시 초기화']
 ];
 const stateOut=mk('output','초기 상태 · 모의 거래 없음','work214-state');stateOut.setAttribute('aria-live','polite');stateOut.setAttribute('role','status');
 const history=mk('ol',undefined,'work214-history');
 let state='EMPTY',actions=0;
 const transitions=Object.freeze({EMPTY:Object.freeze({hold:'HELD'}),HELD:Object.freeze({debit:'DEBITED',release:'RELEASED'})});
 const stateLabels=Object.freeze({EMPTY:'초기 상태 · 모의 거래 없음',HELD:'보류 중 (HELD) · 가상 10,000원',DEBITED:'정상 완료 · 가상 10,000원 최종 차감',RELEASED:'작업 미성립 · 가상 10,000원 보류 해제'});
 const sync=()=>{
  stateOut.textContent=stateLabels[state];
  controls.querySelectorAll('button').forEach(b=>{
   b.disabled=b.dataset.work214Action!=='reset'&&!Object.hasOwn(transitions[state]||{},b.dataset.work214Action);
  });
 };
 const record=(action)=>{
  if(action==='reset'){state='EMPTY';actions=0;history.replaceChildren();sync();return;}
  const next=transitions[state]?.[action];
  if(!next)return;
  state=next;
  const label=action==='hold'?'예약확정 시 보류':action==='debit'?'정상 완료 시 단일 차감':'작업 미성립 시 보류 해제';
  const line=mk('li',++actions+'. '+label+' · 10,000원 · 예시 상태 '+state);
  history.append(line);sync();
 };
 for(const [name,label] of buttons){const b=mk('button',label);b.type='button';b.dataset.work214Action=name;
  b.addEventListener('click',()=>record(name));controls.append(b);}
 root.append(controls,stateOut,mk('h4','이 브라우저에만 표시되는 가상 상태 이력'),history);
 root.append(mk('p','미확정 반올림·복합수리 기준은 임의 적용하지 않습니다. 예약 당시 공식 단가표 버전 보존, 동일 예약 이중보류·이중차감 방지는 실제 서버 원장에서 별도 검증해야 합니다.','work214-note'));
 sync();anchor.insertAdjacentElement('afterend',root);
})();