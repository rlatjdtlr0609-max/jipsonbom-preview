/* WORK186 real DEV runner — do not run on deployment, requires secure environment.
 * PASS=0, FAIL=1, BLOCKED=2; never print environment secrets, JWT or request PII.
 */
import {customerDevE2E} from '../work186-real-dev-e2e.mjs';
const r=await customerDevE2E({env:process.env});
console.log(JSON.stringify(r));
process.exitCode=r.state==='PASS'?0:r.state==='BLOCKED'?2:1;
