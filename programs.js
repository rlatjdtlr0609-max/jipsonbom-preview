/* MASTER_11 #10. Browse planned categories only; nothing issued, redeemed, persisted or sent. */
'use strict';
(() => {
  const root=document.getElementById('benefit-programs');
  if(!root)return;
  const filters=[...root.querySelectorAll('[data-benefit-filter]')];
  const cards=[...root.querySelectorAll('[data-benefit-group]')];
  const count=root.querySelector('#benefit-visible-count');
  for(const button of filters)button.addEventListener('click',()=>{
    const group=button.dataset.benefitFilter;
    if(!['all','starter','return','region','referral'].includes(group))return;
    for(const b of filters)b.setAttribute('aria-pressed',String(b===button));
    let visible=0;
    for(const card of cards){
      card.hidden=group!=='all'&&card.dataset.benefitGroup!==group;
      if(!card.hidden)visible++;
    }
    if(count)count.textContent=visible+'개 혜택 유형 안내 · 실제 발급 가능 쿠폰 0건';
  });
})();
