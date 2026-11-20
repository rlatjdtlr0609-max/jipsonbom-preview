document.addEventListener('DOMContentLoaded', () => {
 const workspace = document.querySelector('#member-workspace');
 if (!workspace) return;

 const auth = new URL('/auth/v1/', workspace.dataset.origin);
 const edge = new URL('/functions/v1/jsb-work19-api/', auth);
 const login = workspace.querySelector('#member-login');
 const intake = document.querySelector('#requestForm');
 const mode = intake.elements.account;
 const fields = intake.querySelector('#member-fields');
 const detail = document.querySelector('#member-receipt-detail');
 const list = document.querySelector('#member-receipts');
 const notice = workspace.querySelector('[role=status]');
 const information = document.querySelector('#preview-receipt');
 const signOut = workspace.querySelector('[data-member-logout]');
 const refresh = document.querySelector('[data-member-refresh]');
 const upload = intake.elements.namedItem('photo') ?? intake.querySelector('[type=file]');
 const uploadLabel = document.querySelector('[for=preview-media]');
 const publishableKey = workspace.dataset.publishable;
 const editable = ['title', 'note', 'address'];
 const samples = Object.fromEntries(editable.map(key => [key, intake.elements[key].value]));
 const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
 let session, pending, busy = false, previousMode = false;

 const memberSelected = () => mode.selectedIndex === 1;
 function syncMode() {
  const selected = memberSelected();
  fields.hidden = !selected;
  fields.disabled = !selected;
  upload.hidden = selected;
  upload.disabled = selected;
  uploadLabel.hidden = selected;
  if (selected) {
   upload.value = '';
   document.querySelector('#preview-file').textContent = '';
  }
  if (selected !== previousMode) {
   for (const key of editable) intake.elements[key].value = selected ? '' : samples[key];
   fields.querySelectorAll('input').forEach(input => {
    if (input.type === 'checkbox') input.checked = false;
    else input.value = '';
   });
   information.textContent = '';
   previousMode = selected;
  }
  for (const key of editable) intake.elements[key].readOnly = !selected;
  intake.querySelector('[type=submit]').textContent = selected ? '회원 수리접수 저장' : '예시 접수 확인하기';
 }

 function setBusy(value) {
  busy = value;
  workspace.querySelectorAll('button').forEach(button => {button.disabled = value;});
  refresh.disabled = value;
  intake.querySelector('[type=submit]').disabled = value;
  mode.disabled = value;
 }

 function clearSession() {
  session = undefined;
  login.hidden = false;
  signOut.hidden = refresh.hidden = true;
  list.replaceChildren();
  detail.replaceChildren();
  mode.selectedIndex = 0;
  syncMode();
  information.textContent = '';
 }

 async function call(url, {method = 'GET', headers = {}, body} = {}) {
  const response = await fetch(url, {
   method, credentials:'omit', redirect:'error', referrerPolicy:'no-referrer',
   cache:'no-store', signal:AbortSignal.timeout(15000),
   headers:{...headers, ...(body===undefined?{}:{'content-type':'application/json'})},
   ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error('Service request failed'), {status:response.status});
  return data;
 }

 async function memberCall(path, options = {}) {
  if (!session) throw Object.assign(new Error('Member session required'), {status:401});
  return call(new URL(path, edge), {...options, headers:{
   authorization:'Bearer '+session.token, ...options.headers,
  }});
 }

 async function viewReceipt(id) {
  if (!uuid.test(id)) return;
  const row = await memberCall('member/requests/'+id);
  if (row?.id !== id) throw new Error('Receipt response invalid');
  const items = [
   ['접수번호', row.id], ['수리 분야', row.category], ['접수 내용', row.description],
   ['접수일', new Date(row.created_at).toLocaleString('ko-KR')], ['처리 상태', row.status==='submitted'?'접수됨':row.status],
  ];
  detail.replaceChildren();
  for (const [label, value] of items) {
   const term = document.createElement('dt'), definition = document.createElement('dd');
   term.textContent = label;
   definition.textContent = value ?? '';
   detail.append(term, definition);
  }
 }

 async function loadReceipts() {
  const profile = await memberCall('member/profile');
  if (!Array.isArray(profile?.intakes)) throw new Error('Profile response invalid');
  list.replaceChildren();
  for (const receipt of profile.intakes) {
   if (!uuid.test(receipt.request_id)) continue;
   const li = document.createElement('li'), button = document.createElement('button');
   button.type = 'button';button.className = 'btn small soft';button.textContent = receipt.request_id;
   button.dataset.receiptId = receipt.request_id;
   li.append(button);
   const policies = Array.isArray(receipt.consents) ? receipt.consents.map(row =>
    [row.policy==='terms'?'이용약관':row.policy==='privacy'?'개인정보':row.policy, row.version].join(' ')) : [];
   if (policies.length) li.append(document.createTextNode(' · '+policies.join(' · ')));
   list.append(li);
  }
  if (!list.children.length) {
   const li = document.createElement('li');
   li.textContent = '저장된 본인 접수가 없습니다.';
   list.append(li);
  }
 }

 function logOut(token) {
  return call(new URL('logout?scope=local', auth), {
   method:'POST', headers:{apikey:publishableKey,authorization:'Bearer '+token},
  });
 }

 function failure(error, target) {
  if (error.status===401) {
   clearSession();
   notice.textContent = '개발 계정으로 다시 로그인해 주세요.';
   workspace.scrollIntoView({block:'nearest'});
   return;
  }
  target.textContent = ({
   403:'접근 권한이 없습니다.', 404:'본인 접수를 찾을 수 없습니다.',
   409:'요청 내용이 달라 저장하지 않았습니다. 내 접수내역을 확인하세요.',
   422:'입력값과 필수 동의를 확인하세요.', 429:'요청이 많습니다. 잠시 뒤 다시 시도하세요.',
  })[error.status] ?? '연결이 지연되고 있습니다. 내 접수내역을 확인하거나 같은 내용으로 다시 시도하세요.';
 }

 login.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  const email = login.elements.email.value.trim();
  const password = login.elements.password.value;
  login.elements.password.value = '';
  setBusy(true);
  notice.textContent = '인증 중…';
  let token;
  try {
   const result = await call(new URL('token?grant_type=password', auth), {
    method:'POST', headers:{apikey:publishableKey}, body:{email,password},
   });
   token = result?.access_token;
   if (typeof token !== 'string' || !token) throw new Error('Missing access token');
   session = {token};
   const who = await memberCall('me');
   if (!uuid.test(who?.id) || who.member !== true) throw new Error('Member not verified');
   session.id = who.id;
   if (pending && pending.owner !== session.id) pending = undefined;
   login.reset();
   login.hidden = true;
   signOut.hidden = refresh.hidden = false;
   mode.selectedIndex = 1;
   syncMode();
   if(pending){
    for(const [key,value] of Object.entries(pending.values))intake.elements[key].value=value;
    fields.querySelectorAll('[type=checkbox]').forEach(input=>{input.checked=true;});
    information.textContent = '이전 접수의 저장 결과를 확인하려면 같은 내용으로 재시도하세요.';
   }
   notice.textContent = '개발 계정에 로그인했습니다.';
   await loadReceipts().catch(error => failure(error,notice));
  } catch(error) {
   clearSession();
   if (token) await logOut(token).catch(() => {});
   notice.textContent = error.status===429 ? '요청이 많습니다. 잠시 뒤 다시 시도하세요.'
    : error.status && error.status<500 ? '이메일·비밀번호 또는 개발 계정 권한을 확인하세요.'
    : '로그인 서비스에 연결할 수 없습니다. 잠시 뒤 다시 시도하세요.';
  } finally {setBusy(false);}
 });

 mode.addEventListener('change', syncMode);
 intake.addEventListener('submit', async event => {
  if (!memberSelected()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (busy) return;
  if (!session?.id) {
   notice.textContent = '회원 수리접수는 개발 계정 로그인 후 저장할 수 있습니다.';
   workspace.scrollIntoView({block:'nearest'});
   login.elements.email.focus({preventScroll:true});
   return;
  }
  const value = key => intake.elements[key].value.trim();
  const body = {
   name:value('customerName'),phone:value('phone'),category:value('category'),address:value('address'),
   description:[value('title'),value('note')].filter(Boolean).join('\n'),
   terms:intake.elements.terms.checked, privacy:intake.elements.privacy.checked,
   contactConfirmed:intake.elements.contactConfirmed.checked,policyVersion:'work01-dev-v1',
  };
  const fingerprint = JSON.stringify(body);
  if (pending && pending.fingerprint !== fingerprint) {
   information.textContent = '이전 접수 저장 결과를 먼저 확인하세요. 동일한 내용으로 재시도할 수 있습니다.';
   return;
  }
  pending ??= {
   owner:session.id,fingerprint,
   key:Array.from(crypto.getRandomValues(new Uint8Array(32)), byte=>byte.toString(16).padStart(2,'0')).join(''),
   values:Object.fromEntries([...editable,'customerName','phone','category'].map(key=>[key,value(key)])),
  };
  setBusy(true);
  information.textContent = '접수를 저장하는 중…';
  try {
   const row = await memberCall('member/requests', {method:'POST',body,headers:{'idempotency-key':pending.key}});
   if (!uuid.test(row?.id)) throw new Error('Receipt response invalid');
   pending = undefined;
   for (const key of [...editable,'customerName','phone']) intake.elements[key].value = '';
   fields.querySelectorAll('[type=checkbox]').forEach(input => {input.checked=false;});
   information.textContent = '접수 저장 완료 · 접수번호 '+row.id;
   await loadReceipts().catch(error => failure(error,notice));
   if (session) await viewReceipt(row.id).catch(error => failure(error,notice));
  } catch(error) {
   if (error.status===422 || error.status===409) pending = undefined;
   failure(error, information);
  } finally {setBusy(false);}
 }, true);

 const runRead = async action => {
  if (busy || !session) return;
  setBusy(true);
  try {await action();} catch(error) {failure(error, notice);} finally {setBusy(false);}
 };
 refresh.addEventListener('click', () => runRead(loadReceipts));
 list.addEventListener('click', event => {
  const id = event.target.closest('[data-receipt-id]')?.dataset.receiptId;
  if (id) runRead(() => viewReceipt(id));
 });
 signOut.addEventListener('click', async () => {
  if (busy || !session) return;
  const token = session.token;
  pending = undefined;
  clearSession();
  notice.textContent = '이 화면에서 로그아웃했습니다.';
  await logOut(token).catch(() => {
   if (!session) notice.textContent = '이 화면에서 로그아웃했습니다. 서버 세션 종료를 확인하지 못했습니다.';
  });
 });
 syncMode();
});
