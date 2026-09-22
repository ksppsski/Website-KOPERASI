import {stmt} from './membership.js';
// One-time reset explicitly requested by the site owner. The fixed cutoff protects
// every registration/file created after this release was prepared, including retries.
export const RESET_ID='clear-previous-demo-2026-09-21';
export const RESET_CUTOFF='2026-09-21T05:53:39.000Z';
export async function resetPreviousDemo(env){
 if(await stmt(env,'SELECT id FROM maintenance_tasks WHERE id = ?',RESET_ID).first())return;
 for(const prefix of ['proof/','contracts/','signed/','signatures/','registration/']){
  let cursor;
  do{
   const page=await env.BUCKET.list({prefix,limit:500,...(cursor?{cursor}:{})});
   const keys=page.objects.filter(o=>new Date(o.uploaded).toISOString()<RESET_CUTOFF).map(o=>o.key);
   if(keys.length)await env.BUCKET.delete(keys);
   cursor=page.truncated?page.cursor:undefined;
  }while(cursor);
 }
 await stmt(env,'DELETE FROM contract_numbers WHERE request_id IN (SELECT id FROM workflow_requests WHERE created_at < ?)',RESET_CUTOFF).run();
 await stmt(env,'DELETE FROM workflow_requests WHERE created_at < ?',RESET_CUTOFF).run();
 await stmt(env,'DELETE FROM member_profiles WHERE created_at < ?',RESET_CUTOFF).run();
 await stmt(env,'INSERT OR IGNORE INTO maintenance_tasks (id,completed_at) VALUES (?,?)',RESET_ID,new Date().toISOString()).run();
}
