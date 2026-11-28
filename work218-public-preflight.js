/* WORK218 PUBLIC: preflight only; approved private WORK11 ingestion remains server-side.
 * This static fixed URL cannot upload files, authenticate users or save personal data.
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
 input.addEventListener('change',()=>{
  const result=evaluateFiles([...input.files]);
  if(!result.valid){input.value='';output.textContent='선택 불가 · '+result.reason+' 파일은 업로드되지 않았습니다.';return;}
  output.textContent=result.photos+result.videos===0?'파일을 선택하지 않았습니다.':
   '브라우저 사전검사 통과 · 사진 '+result.photos+'장, 동영상 '+result.videos+'개. 서버 업로드·검역은 수행되지 않았습니다. 파일을 서버로 전송하지 않습니다.';
 });
})();
