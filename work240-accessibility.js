/* WORK240: keyboard skip-to-main on all six permanent development URLs. */
'use strict';
(()=>{
 const main=document.querySelector('main');
 if(!main||document.getElementById('jsb-skip-main'))return;
 main.tabIndex=-1;
 const skip=document.createElement('a');
 skip.id='jsb-skip-main';skip.className='jsb-skip-main';skip.href=main.id?'#'+main.id:'#main';
 skip.textContent='본문으로 바로가기';
 skip.addEventListener('click',event=>{event.preventDefault();main.focus();});
 document.body.insertBefore(skip,document.body.firstChild);
})();