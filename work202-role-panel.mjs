import {createDevRoleClient} from './work202-role-client.mjs';
const root=document.getElementById('w202-role-dev');
if(root){
 const role=document.body.dataset.rolePage;
 const status=root.querySelector('#w202-status');
 const result=root.querySelector('#w202-result');
 const form=root.querySelector('#w202-login');
 const load=root.querySelector('#w202-load');
 const logout=root.querySelector('#w202-logout');
 const say=message=>{status.textContent=message;};
 const client=createDevRoleClient({role,origin:location.origin});
 let busy=false;
 const buttons=()=>{
  const active=client.state().authenticated;
  load.disabled=!active||busy;
  logout.disabled=!active||busy;
  form.querySelector('button').disabled=busy;
 };
 const hideData=()=>{result.textContent='';form.elements.password.value='';};
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const email=form.elements.namedItem('email')?.value.trim();
  const password=form.elements.namedItem('password')?.value;
  busy=true;buttons();result.textContent='';
  try{
   await client.login(email,password);
   say('DEV 서버 로그인 확인. 조회는 서버의 역할·소유권 승인 후에만 가능합니다.');
  }catch{client.clear();say('인증에 실패했거나 개발계정이 확인되지 않았습니다.');}
  finally{busy=false;buttons();form.elements.password.value='';}
 });
 load.addEventListener('click',async()=>{
  if(busy)return;
  busy=true;buttons();hideData();
  try{
   const r=await client.read();
   result.textContent=role==='worker'
    ?'개발 DB 작업게시물 수: '+r.workOpportunityCount+'건 · 방문 조회 응답: '+(r.visitResponseVerified?'수신됨':'비어 있음')
    :'승인된 업체 본인정보 조회: '+(r.organizationResponseVerified?'응답 있음':'미등록 또는 조회 불가');
   say('DEV 읽기전용 조회를 마쳤습니다. 고객 이름·전화·상세주소·캐시 원장값은 표시하지 않습니다.');
  }catch{result.textContent='';say('서버 접근권한이 없거나 세션이 만료되었습니다. 데이터 표시를 차단했습니다.');}
  finally{busy=false;buttons();}
 });
 logout.addEventListener('click',async()=>{
  if(busy)return;
  busy=true;hideData();say('로그아웃 처리 중');
  try{await client.logout();}finally{busy=false;say('로그아웃됨. 이전 데이터는 지워졌습니다.');buttons();}
 });
 window.addEventListener('pagehide',()=>{client.clear();hideData();result.textContent='';buttons();});
 window.addEventListener('pageshow',event=>{
  if(event.persisted){client.clear();hideData();result.textContent='';say('이전 세션은 복원하지 않습니다. 다시 로그인하세요.');buttons();}
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&!client.state().authenticated){hideData();buttons();}
 });
 buttons();
}
