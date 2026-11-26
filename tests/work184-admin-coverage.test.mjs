import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {auditAdminSource} from '../work184-admin-coverage.mjs';
const js=await readFile(new URL('../admin.js',import.meta.url),'utf8');
const html=await readFile(new URL('../admin.html',import.meta.url),'utf8');
const report=auditAdminSource(js,html);
test('six groups, 24 distinct screen IDs and source-based evidence labels',()=>{
 assert.equal(report.groupCount,6);assert.equal(report.screenCount,24);
 assert.equal(report.screens[0].id,'overview');
 assert.equal(report.screens.at(-1).id,'release');
 assert.equal(report.screens.filter(s=>s.coverage==='DETAILED_API_UNCONNECTED').length>0,true);
 assert.equal(report.screens.some(s=>s.requiresAdditionalPermission),true);
 assert.equal(report.screens.every(s=>s.group!=='UNMAPPED'),true);
});
test('malformed or weakened backend response guards fail closed',()=>{
 assert.throws(()=>auditAdminSource(js.replaceAll('screen_id===screenId','screen_id===anyScreen'),html),/ADMIN_RESPONSE_GUARD/);
 assert.throws(()=>auditAdminSource(js.replaceAll('mfa_and_backend_permissions_verified===true','mfa_and_backend_permissions_verified!==false'),html),/ADMIN_RESPONSE_GUARD/);
 assert.throws(()=>auditAdminSource(js.replace('const groups=[','const removed=['),html),/GROUPS_NOT_FOUND/);
});
test('no promotion of source-only API presence to real admin validation',()=>{
 assert.equal(report.realSignedJwtE2eVerified,false);
 assert.equal(report.adminGrantChanged,false);
 assert.equal(report.operatingAccessAllowed,false);
 assert.ok(report.rpcs.includes('jsb_w108_admin_panel'));
 console.log('WORK184 SOURCE_CONTRACT_PASS — 24 menus; actual MFA signed DB E2E blocked');
});
