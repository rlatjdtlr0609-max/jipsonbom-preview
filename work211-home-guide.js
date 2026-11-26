/* WORK211 · MASTER_11 — public home guidance. No API calls, storage or saved intake. */
'use strict';
(()=>{
 const home=document.querySelector('[data-screen="home"]');
 const anchor=home?.querySelector('.hy-search-panel');
 const originalCategory=document.querySelector('#intake-category');
 if(!anchor||!originalCategory||document.querySelector('#work211-guide'))return;
 const categories=[...originalCategory.options].map(o=>o.value).filter(Boolean);
 const e=(tag,text,className)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(className)x.className=className;return x;};
 const block=e('section',undefined,'wrap work211-guide');block.id='work211-guide';
 block.setAttribute('aria-labelledby','work211-title');
 block.append(e('p','수리 접수 준비 · STEP 01','work211-eyebrow'),e('h2','필요한 수리를 먼저 선택해 보세요'));
 const intro=e('p','수리 분야를 선택하면 기존 회원·비회원 접수방법 선택창으로 연결됩니다. 현재 공개 화면은 시연 전용입니다.','work211-intro');
 block.append(intro);
 const row=e('div',undefined,'work211-inputs');
 const label=e('label','수리 분야');label.htmlFor='work211-category';
 const select=e('select');select.id='work211-category';
 for(const c of categories){const o=e('option',c);o.value=c;select.append(o);}
 const action=e('button','접수 방법 선택하기');action.type='button';action.className='work211-action';
 row.append(label,select,action);block.append(row);
 const prep=e('div',undefined,'work211-prep');prep.setAttribute('aria-label','접수 전 준비사항');
 for(const msg of ['고장 부위가 보이도록 사진 준비','발생한 증상과 위치 설명','방문 가능한 시간대 미리 확인']){
  const item=e('span','✓ '+msg);prep.append(item);
 }
 block.append(prep);
 const note=e('p','이 안내는 개인정보·사진을 저장하거나 전송하지 않습니다. 실제 접수는 인증된 개발 업무 환경의 검증 후 제공됩니다.','work211-note');
 note.setAttribute('role','note');block.append(note);
 action.addEventListener('click',()=>{
  const selected=select.value;
  if(!categories.includes(selected))return;
  originalCategory.value=selected;
  const open=home.querySelector('.hy-hero-actions [data-intake-open]');
  if(open)open.click();
  else {action.disabled=true;note.textContent='접수 경로가 연결되지 않아 진행을 차단했습니다.';}
 });
 anchor.insertAdjacentElement('afterend',block);
})();