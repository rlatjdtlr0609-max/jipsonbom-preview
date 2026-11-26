/* WORK167 demo — entirely in-memory. No wallet transaction is sent. */
import {officialFee,emptyCashState,stepCash} from './work167-cash-policy.mjs';
const base=document.getElementById('w167-panel');
if(base){
 const price=base.querySelector('#w167-price'),version=base.querySelector('#w167-version');
 const key=base.querySelector('#w167-booking'),out=base.querySelector('#w167-result');
 let state=emptyCashState(25000),snapshot=null;
 const render=()=>{
  base.querySelector('#w167-available').textContent=state.available.toLocaleString('ko-KR')+'원';
  base.querySelector('#w167-held').textContent=state.held.toLocaleString('ko-KR')+'원';
  base.querySelector('#w167-debited').textContent=state.debited.toLocaleString('ko-KR')+'원';
  base.querySelector('#w167-events').replaceChildren(
   ...state.events.map(x=>{
    const li=document.createElement('li');
    li.textContent=x.booking+' · '+x.action+' · '+x.fee.toLocaleString('ko-KR')+'원 · '+x.version;
    return li;
   })
  );
 };
 const report=message=>{out.textContent=message;};
 base.addEventListener('click',e=>{
  const op=e.target.closest('button[data-w167-op]')?.dataset.w167Op;
  if(!op)return;
  try{
   if(op==='CALCULATE'){
    snapshot=officialFee(Number(price.value),version.value.trim());
    report('예시 공식단가 '+snapshot.price.toLocaleString('ko-KR')+'원 × 10% = '+snapshot.fee.toLocaleString('ko-KR')+'원. 예약시각 단가표 버전 '+snapshot.version+'으로 고정 (시연).');
   }else{
    if(op==='CONFIRM_BOOKING'&&!snapshot)throw Error('CALCULATE_FIRST');
    state=stepCash(state,key.value.trim(),op,snapshot);
    report('시연 처리: '+op+' · 실제 캐시 및 예약은 변경하지 않았습니다.');
   }
  }catch(error){report('차단: '+error.message+' · 실제 과금 없음');}
  render();
 });
 render();
}
