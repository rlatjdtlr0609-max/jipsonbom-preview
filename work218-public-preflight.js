/* WORK218 + WORK244 PUBLIC: local media validation only.
 * No photo or personal data is stored, uploaded, authenticated or transmitted.
 * The real private WORK11 scanner must check files again after server ingestion.
 */
'use strict';
(()=>{
 if(document.body.dataset.rolePage!=='customer')return;
 const input=document.getElementById('preview-media');
 const output=document.getElementById('preview-file');
 if(!input||!output)return;
 input.setAttribute('accept','image/jpeg,image/png,video/mp4');
 const EXT=Object.freeze({'image/jpeg':['jpg','jpeg'],'image/png':['png'],'video/mp4':['mp4']});
 const LIMIT=50*1024*1024;
 let generation=0;
 function evaluateFiles(files){
  if(!files.length)return {valid:true,photos:0,videos:0};
  let photos=0,videos=0;
  for(const file of files){
   const ext=file.name?.split('.').at(-1)?.toLowerCase();
   if(!Object.hasOwn(EXT,file.type)||!EXT[file.type].includes(ext)||
      !Number.isSafeInteger(file.size)||file.size<1||file.size>LIMIT)
     return {valid:false,reason:'지원 형식(JPEG·PNG·MP4)과 파일별 50MB 제한을 확인해 주세요.'};
   file.type.startsWith('image/')?photos++:videos++;
  }
  if(photos>5||videos>1)return {valid:false,reason:'사진은 최대 5장, 동영상은 최대 1개만 선택할 수 있습니다.'};
  return {valid:true,photos,videos};
 }
 const prefix=(buffer,expected)=>expected.every((value,i)=>buffer[i]===value);
 async function validSignature(file){
  const head=new Uint8Array(await file.slice(0,16).arrayBuffer());
  if(file.type==='image/png')
   return head.length>=8&&prefix(head,[137,80,78,71,13,10,26,10]);
  if(file.type==='image/jpeg'){
   if(head.length<3||!prefix(head,[255,216,255]))return false;
   const end=new Uint8Array(await file.slice(-2).arrayBuffer());
   return end.length===2&&prefix(end,[255,217]);
  }
  if(file.type==='video/mp4'){
   if(head.length<16||!prefix(head.slice(4,8),[102,116,121,112]))return false;
   const size=new DataView(head.buffer,head.byteOffset,head.byteLength).getUint32(0);
   return size>=16&&size<=file.size;
  }
  return false;
 }
 input.addEventListener('change',async()=>{
  const current=++generation,files=[...input.files];
  const result=evaluateFiles(files);
  const reject=reason=>{
   if(current!==generation)return;
   input.value='';
   output.textContent='선택 불가 · '+reason+' 파일은 업로드되지 않았습니다. 파일을 서버로 전송하지 않습니다.';
  };
  if(!result.valid){reject(result.reason);return;}
  if(files.length===0){output.textContent='파일을 선택하지 않았습니다.';return;}
  output.textContent='파일 서명 확인 중 · 파일을 서버로 전송하지 않습니다.';
  try{
   for(const file of files){
    if(!await validSignature(file)){reject('파일 확장자 또는 내용이 지원 형식과 일치하지 않습니다.');return;}
    if(current!==generation)return;
   }
   if(current===generation){
    output.textContent='브라우저 사전검사 통과 · 사진 '+result.photos+'장, 동영상 '+result.videos+'개. 서버 업로드·검역은 수행되지 않았습니다. 파일을 서버로 전송하지 않습니다.';
   }
  }catch{reject('선택한 파일을 읽지 못했습니다.');}
 });
})();
