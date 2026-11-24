/*
 * Jipsonbom Atelier SVG and UX enhancements. Presentation-only, no network or storage.
 * Honors existing data-go, data-auth, data-intake-open and all role/API handlers.
 */
(function(){
'use strict';
const NS='http://www.w3.org/2000/svg';
const iconPaths=Object.freeze({
 home:['M3 11.2 12 3l9 8.2','M5.5 9.4V21h13V9.4','M9 21v-6h6v6'],
 camera:['M4 6.5h4l1.5-2h5L16 6.5h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z','M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'],
 menu:['M4 7h16','M4 12h16','M4 17h16'],
 arrow:['M5 19 19 5','M9 5h10v10'],
 heart:['M20.8 8.7c0 4-5.2 8.1-8.8 11-3.6-2.9-8.8-7-8.8-11C3.2 2.5 9.7 2.9 12 6c2.3-3.1 8.8-3.5 8.8 2.7Z'],
 wrench:['M14.5 7.5a5.2 5.2 0 0 0-6.8 6.8L3 19l2 2 4.8-4.7a5.2 5.2 0 0 0 6.8-6.8l-3.5 3.5-3-3 4.4-4.5Z'],
 users:['M16 20v-1.7c0-2.1-2-3.8-4.5-3.8S7 16.2 7 18.3V20','M11.5 11.8a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z','M18 5.7c1.8.5 2.7 1.9 2.7 3.4 0 1.5-.9 2.8-2.7 3.3','M18.1 15.2c1.5.5 2.9 1.6 2.9 3.3V20'],
 grid:['M3 3h8v8H3z','M13 3h8v8h-8z','M3 13h8v8H3z','M13 13h8v8h-8z'],
 file:['M6 3h8l4 4v14H6z','M14 3v5h4','M9 12h6','M9 16h6'],
 clock:['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z','M12 7v5l3.2 1.9'],
 shield:['M12 2 20 5v6c0 5.2-3.2 8.4-8 11-4.8-2.6-8-5.8-8-11V5z','m8.5 12 2.5 2.5 4.7-5'],
 money:['M3 7h18v12H3z','M7 11h10','M7 15h10','M12 4v3'],
 settings:['M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z','M10.7 2.8h2.6l.5 2.2 1.8.8 2-.9 1.9 1.9-.9 2 .8 1.8 2.2.5v2.6l-2.2.5-.8 1.8.9 2-1.9 1.9-2-.9-1.8.8-.5 2.2h-2.6l-.5-2.2-1.8-.8-2 .9-1.9-1.9.9-2-.8-1.8-2.2-.5v-2.6l2.2-.5.8-1.8-.9-2L6.4 5l2 .9 1.8-.8z'],
 bell:['M4.5 17.5h15c-1.4-1.6-2-2.9-2-6.4 0-4-1.9-6.1-5.5-6.1s-5.5 2.1-5.5 6.1c0 3.5-.6 4.8-2 6.4Z','M10 20h4'],
 alert:['M12 3 22 21H2z','M12 9v5','M12 17.5v.5'],
 calendar:['M4 5h16v16H4z','M8 3v4','M16 3v4','M4 10h16'],
 location:['M12 22s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Z','M12 12.8a2.8 2.8 0 1 0 0-5.6 2.8 2.8 0 0 0 0 5.6Z'],
 search:['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z','m16 16 5 5'],
 layers:['M12 2 2 8l10 6 10-6z','M2 13l10 6 10-6','M2 18l10 6 10-6'],
 check:['M4 12 9 17 20 6'],
 info:['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z','M12 11v5','M12 7.5h.01']
});
const tabs=Object.freeze({
 overview:'grid',tasks:'check',requests:'file',booking:'calendar',alerts:'bell',
 members:'users',guests:'users',applications:'file',workers:'wrench',providers:'layers',
 cash:'money',recon:'money',directpay:'money',cases:'file',incidents:'alert',integrity:'shield',
 catalog:'layers',settings:'settings',notifications:'bell',bulk:'layers',
 security:'shield',roles:'users',audit:'clock',release:'check'
});
const symbolNames=Object.freeze({'⌂':'home','📷':'camera','💜':'heart','☰':'menu','↗':'arrow'});
function svgIcon(name){
 const svg=document.createElementNS(NS,'svg');
 svg.setAttribute('viewBox','0 0 24 24');
 svg.setAttribute('class','jsb-svg-icon');svg.setAttribute('focusable','false');
 svg.setAttribute('aria-hidden','true');
 for(const d of iconPaths[name]||iconPaths.info){
  const p=document.createElementNS(NS,'path');p.setAttribute('d',d);svg.append(p);
 }
 return svg;
}
function swapSymbols(root){
 const parent=root.nodeType===1?root:document.body;
 if(!parent||parent.closest?.('script,style,textarea,noscript,[contenteditable="true"]'))return;
 const walker=document.createTreeWalker(parent,NodeFilter.SHOW_TEXT);
 const texts=[];
 while(walker.nextNode()){
  const n=walker.currentNode;
  if(n.parentElement?.closest('script,style,textarea,noscript,svg,[contenteditable="true"]'))continue;
  if(/[⌂📷💜☰↗]/u.test(n.nodeValue||''))texts.push(n);
 }
 for(const n of texts){
  const frag=document.createDocumentFragment();
  for(const bit of n.nodeValue.split(/([⌂📷💜☰↗])/u)){
   if(symbolNames[bit])frag.append(svgIcon(symbolNames[bit]));
   else if(bit)frag.append(document.createTextNode(bit));
  }
  n.replaceWith(frag);
 }
}
function upgradeMenu(root){
 const menu=root.querySelectorAll?.('.oa-link[data-ops-tab] .oa-i, [data-ops-tab] > .oa-i')||[];
 for(const n of menu){
  const id=n.closest('[data-ops-tab]')?.getAttribute('data-ops-tab');
  const type=tabs[id];
  if(!type||n.querySelector('svg'))continue;
  n.replaceChildren(svgIcon(type));
 }
}
function updateCurrent(){
 const selected=[...document.querySelectorAll('#tabs .tab')].filter(x=>x.classList.contains('active'));
 for(const tab of document.querySelectorAll('#tabs .tab')){
  if(selected.includes(tab))tab.setAttribute('aria-current','page');
  else tab.removeAttribute('aria-current');
 }
}
function enhanceImages(root){
 const imgs=root.querySelectorAll?.('img')||[];
 for(const img of imgs){
  img.decoding='async';
  const hero=img.classList.contains('hy-hero-img');
  img.loading=hero?'eager':'lazy';
  if(hero)img.setAttribute('fetchpriority','high');
  else img.removeAttribute('fetchpriority');
 }
}
function apply(root=document.body){
 if(!root)return;
 swapSymbols(root);
 upgradeMenu(root.nodeType===1?root:document.body);
 enhanceImages(root.nodeType===1?root:document.body);
 updateCurrent();
}
function init(){
 const body=document.body;if(!body)return;
 if(!document.querySelector('.jsb-skip-link')){
  const a=document.createElement('a');
  a.className='jsb-skip-link';a.href='#screen';a.textContent='본문으로 바로가기';
  body.prepend(a);
 }
 const main=document.querySelector('#screen');
 if(main)main.tabIndex=-1;
 apply();
 let queued=false;
 const observer=new MutationObserver(records=>{
  if(queued)return;
  const changed=records.some(r=>r.addedNodes.length||(r.type==='attributes'&&r.attributeName==='class'));
  if(!changed)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;apply();});
 });
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 // Do not override any application handler, login, storage or network behavior.
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
