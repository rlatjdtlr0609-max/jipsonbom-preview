/* WORK184 admin 24-screen code-contract inventory.
 * It is a SOURCE audit, not live authenticated DB access certification.
 */
const requiredRpcs=['jsb_w103_admin_snapshot','jsb_w108_admin_panel','jsb_w114_admin_list'];
const sensitive=['roles','security','audit','cash','recon','directpay','members','guests'];
export function auditAdminSource(js,html){
 if(typeof js!=='string'||typeof html!=='string')throw Error('INVALID_SOURCES');
 const start=js.indexOf('const groups=['),end=js.indexOf('];',start);
 if(start<0||end<0)throw Error('GROUPS_NOT_FOUND');
 const scope=js.slice(start,end);
 const groups=[...scope.matchAll(/title:'([A-F]\. [^']+)'/g)].map(m=>({name:m[1],position:m.index}));
 const screens=[...scope.matchAll(/\['([a-z]+)','([^']+)','([^']+)'([^\]]*)\]/g)].map(m=>{
  const prefix=scope.slice(0,m.index),group=groups.filter(g=>g.position<=m.index).at(-1);
  const metricKeys=[...m[4].matchAll(/'([a-z_]+)'/g)].map(x=>x[1]);
  return {id:m[1],label:m[2],group:group?.name||'UNMAPPED',coverage:
    metricKeys.length?'AGGREGATE_PREVIEW_ONLY':'DETAILED_API_UNCONNECTED',
    sourceMetricKeys:metricKeys,requiresAdditionalPermission:sensitive.includes(m[1])};
 });
 if(groups.length!==6||screens.length!==24||new Set(screens.map(s=>s.id)).size!==24)
  throw Error('MASTER_11_6_GROUP_24_SCREEN_BROKEN');
 if(!requiredRpcs.every(r=>js.includes(r)))throw Error('SERVER_RPCS_MISSING');
 for(const x of ['mfa_and_backend_permissions_verified===true','pii_included===false',
   'real_pg_actions_enabled===false','production_deployment===false','screen_id===screenId'])
  if(!js.includes(x))throw Error('ADMIN_RESPONSE_GUARD_MISSING_'+x);
 if(!html.includes('id="dashboard"')||!html.includes('id="mfa-form"'))
  throw Error('PROTECTED_DOM_ELEMENTS_MISSING');
 return Object.freeze({groupCount:groups.length,screenCount:screens.length,
  groups:groups.map(g=>g.name),screens,rpcs:requiredRpcs,
  realSignedJwtE2eVerified:false,adminGrantChanged:false,operatingAccessAllowed:false});
}
