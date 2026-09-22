import {requireStaffRole,actorId,staffContext} from './access.js';
import {Problem,stmt,hash} from './membership.js';

const now=()=>new Date().toISOString();
export const STAGES={registration:['admin','Pemeriksaan pendaftaran'],capital:['admin','Pemeriksaan penyertaan modal'],withdrawal:['admin','Pemeriksaan pengunduran diri'],reconciliation:['finance','Rekonsiliasi bukti transfer'],generate:['admin','Pembuatan PDF akad'],archive:['admin','Unggah akad lengkap'],payout:['finance','Persiapan bagi hasil harian']};
export function receive(targetId,stage,memberName,receivedAt=now(),extra={}){
 return {type:'receive',task:{id:crypto.randomUUID(),targetId,stage,role:STAGES[stage][0],label:STAGES[stage][1],memberName,receivedAt,...extra}};
}
export const finish=(targetId,stages,outcome='completed')=>({type:'finish',targetId,stages,outcome});
export const closeTasks=(targetId,outcome='superseded')=>({type:'close',targetId,outcome});
export function submission(targetId,kind,name,time=now()){
 return [closeTasks(targetId),...(kind==='savings'?[]:[receive(targetId,kind,name,time)]),...(kind==='withdrawal'?[]:[receive(targetId,'reconciliation',name,time)])];
}
function eventStatement(env,owner,targetId,role,ops,{key=crypto.randomUUID(),at=now(),guard='',args=[]}={}){
 return stmt(env,`INSERT INTO staff_activity (owner,event_key,target_id,occurred_at,role,actor_id,payload) SELECT ?,?,?,?,?,?,? ${guard} ON CONFLICT(owner,event_key) DO NOTHING`,owner,key,targetId,at,role,role?actorId(env,owner):null,JSON.stringify(ops.map(op=>({...op,actorName:env.ACTOR_NAME||null,actorRole:env.ACTOR_ROLE||role}))),...args);
}
// D1 batch is transactional. changes() refers to the immediately preceding business
// statement, so failed optimistic updates cannot produce successful audit events.
export async function trackedRun(env,statement,owner,targetId,role,ops,at=now(),extra=[]){
 const results=await env.DB.batch([statement,eventStatement(env,owner,targetId,role,ops,{at,guard:'WHERE changes() > 0'}),...extra]);
 return results[0];
}
export function projectEvents(events){
 const tasks=new Map();
 for(const e of events){
  for(const op of JSON.parse(e.payload)){
   if(op.type==='receive'){
    if(!tasks.has(op.task.id))tasks.set(op.task.id,{...op.task,startedAt:null,completedAt:null,closedAt:null,startedBy:null,completedBy:null,outcome:null});
    continue;
   }
   for(const t of tasks.values()){
    if(t.completedAt||t.closedAt)continue;
    if(op.taskId?t.id!==op.taskId:t.targetId!==op.targetId)continue;
    if(op.stages&&!op.stages.includes(t.stage))continue;
    if(op.type==='start'&&!t.startedAt){t.startedAt=e.occurred_at;t.startedBy=e.actor_id;t.startedName=op.actorName||null;t.startedRole=op.actorRole||e.role;}
    if(op.type==='finish'){t.completedAt=e.occurred_at;t.completedBy=e.actor_id;t.completedName=op.actorName||null;t.completedRole=op.actorRole||e.role;t.outcome=op.outcome||'completed';}
    if(op.type==='close'){t.closedAt=e.occurred_at;t.outcome=op.outcome||'superseded';}
   }
  }
 }
 return [...tasks.values()].map(t=>({...t,status:t.closedAt?'closed':t.completedAt?'completed':t.startedAt?'working':'queued',responseSeconds:t.receivedAt&&t.startedAt?Math.max(0,(Date.parse(t.startedAt)-Date.parse(t.receivedAt))/1000):null,processingSeconds:t.startedAt&&t.completedAt?Math.max(0,(Date.parse(t.completedAt)-Date.parse(t.startedAt))/1000):null}));
}
// Existing records have no historic start time. Snapshot only open stages and
// known arrival dates; never use updated_at as a guessed employee start time.
export async function bootstrapActivity(env,owner){
 if(await stmt(env,"SELECT sequence FROM staff_activity WHERE owner=? AND event_key='baseline'",owner).first())return;
 const profiles=(await stmt(env,'SELECT * FROM member_profiles WHERE owner=?',owner).all()).results;
 const rows=(await stmt(env,'SELECT * FROM workflow_requests WHERE owner=?',owner).all()).results;
 const recs=(await stmt(env,'SELECT * FROM finance_reconciliations WHERE owner=?',owner).all()).results;
 const ops=[];
 for(const row of [...profiles.map(p=>({...p,kind:'registration',member_name:JSON.parse(p.data).name})),...rows]){
  if(['correction','rejected','cancelled'].includes(row.status))continue;
  const name=row.member_name,arrival=row.version===1?row.created_at:null;
  const add=(stage,at)=>ops.push(receive(row.id,stage,name,at,{legacy:true}));
  if(row.kind!=='savings'&&['pending','reviewing'].includes(row.status))add(row.kind,arrival);
  if(row.kind!=='withdrawal'){
   const rec=recs.find(r=>r.target_id===row.id&&r.proof_key===row.proof_key&&r.status==='approved');
   if(!rec)add('reconciliation',arrival);
  }
  if(row.status==='ready')add('generate',null);
  if(row.status==='generated'&&row.contract_data)add('archive',row.generated_at);
 }
 await eventStatement(env,owner,'baseline',null,ops,{key:'baseline'}).run();
}
export async function activityState(env,owner){
 const events=(await (owner===null?stmt(env,'SELECT * FROM staff_activity ORDER BY sequence'):stmt(env,'SELECT * FROM staff_activity WHERE owner=? ORDER BY sequence',owner)).all()).results;
 return {tasks:projectEvents(events),cursor:events.at(-1)?.sequence||0,trackingSince:events.find(e=>e.event_key==='baseline')?.occurred_at||null};
}
export async function startTask(env,owner,body){
 const {tasks,cursor}=await activityState(env,owner),task=tasks.find(t=>t.id===body.taskId);
 if(!task)throw new Problem(404,'Tugas tidak ditemukan.');
 await requireStaffRole(env,owner,task.role);
 const context=await staffContext(env,owner);
 if(context.role!==task.role)throw new Problem(403,'Buka portal yang sesuai sebelum memulai tugas.');
 if(task.startedAt)return {task};
 if(task.completedAt||task.closedAt)throw new Problem(409,'Tahap tugas sudah selesai. Perbarui daftar.');
 if(task.receivedAt&&task.receivedAt>now())throw new Problem(409,'Jadwal tugas belum dimulai.');
 const result=await eventStatement(env,owner,task.targetId,task.role,[{type:'start',taskId:task.id}],{key:'start:'+task.id,guard:'WHERE NOT EXISTS (SELECT 1 FROM staff_activity WHERE owner=? AND sequence>?)',args:[owner,cursor]}).run();
 const latest=(await activityState(env,owner)).tasks.find(t=>t.id===task.id);
 if(!result.meta?.changes&&!latest?.startedAt)throw new Problem(409,'Data tugas berubah. Perbarui daftar.');
 return {task:latest};
}
export function summarize(tasks){
 const active=tasks.filter(t=>!t.closedAt),responses=active.filter(t=>t.responseSeconds!==null),completed=active.filter(t=>t.completedAt),durations=completed.filter(t=>t.processingSeconds!==null);
 const avg=(list,key)=>list.length?list.reduce((n,t)=>n+t[key],0)/list.length:null;
 return {total:active.length,queued:active.filter(t=>!t.startedAt&&!t.completedAt).length,working:active.filter(t=>t.startedAt&&!t.completedAt).length,completed:completed.length,closed:tasks.length-active.length,responseSamples:responses.length,processingSamples:durations.length,avgResponseSeconds:avg(responses,'responseSeconds'),avgProcessingSeconds:avg(durations,'processingSeconds')};
}

const payoutKey=async schedule=>'payout:'+schedule.date+':'+await hash(new TextEncoder().encode(JSON.stringify(schedule.items.map(i=>[i.id,i.amount,i.bankName,i.bankAccount]).sort((a,b)=>a[0].localeCompare(b[0])))));
export async function ensurePayoutTasks(env,owner,schedules,requests,reconciliations,today,since=today){
 const {tasks}=await activityState(env,owner),existing=new Set(tasks.map(t=>t.scheduleKey)),statements=[];
 for(const schedule of schedules){
  if(!schedule.contractCount||schedule.date>today||schedule.date<since)continue;
  const key=await payoutKey(schedule);if(existing.has(key))continue;
  const targetId='payout:'+schedule.date;
  // Arrival is the due midnight or the time the last prerequisite became
  // available. Materialization may be later; employee inactivity never resets it.
  const available=[new Date(schedule.date+'T00:00:00+08:00').toISOString()];
  for(const item of schedule.items){
   const row=requests.find(r=>r.id===item.id),rec=reconciliations.find(r=>r.target_id===item.id);
   if(row?.generated_at)available.push(row.generated_at);
   if(rec?.checked_at)available.push(rec.checked_at);
  }
  const op=receive(targetId,'payout','Daftar '+schedule.date,available.sort().at(-1),{scheduleKey:key,paymentDate:schedule.date,contractCount:schedule.contractCount,total:schedule.total});
  statements.push(eventStatement(env,owner,targetId,null,[closeTasks(targetId),op],{key}));existing.add(key);
 }
 for(let i=0;i<statements.length;i+=40)await env.DB.batch(statements.slice(i,i+40));
}
export async function payoutTask(env,owner,schedule,requests,reconciliations,today,since=today){
 await ensurePayoutTasks(env,owner,[schedule],requests,reconciliations,today,since);
 const key=await payoutKey(schedule);
 return (await activityState(env,owner)).tasks.find(t=>t.scheduleKey===key)||null;
}
export async function finishPayoutTask(env,owner,task,body){
 if(!task||task.id!==body.taskId)throw new Problem(409,'Daftar bagi hasil berubah. Perbarui dan periksa kembali.');
 if(task.completedAt)return task;
 if(!task.startedAt||task.closedAt)throw new Problem(409,'Mulai pengerjaan daftar terlebih dahulu.');
 if(body.confirm!==true)throw new Problem(400,'Konfirmasi pemeriksaan nominal dan rekening tujuan.');
 const {cursor,tasks}=await activityState(env,owner),latest=tasks.find(t=>t.id===task.id);
 if(!latest||latest.closedAt)throw new Problem(409,'Daftar sudah diganti. Perbarui data.');
 if(latest.completedAt)return latest;
 const result=await eventStatement(env,owner,task.targetId,'finance',[{type:'finish',taskId:task.id,outcome:'prepared'}],{key:'finish:'+task.id,guard:'WHERE NOT EXISTS (SELECT 1 FROM staff_activity WHERE owner=? AND sequence>?)',args:[owner,cursor]}).run();
 if(!result.meta?.changes)throw new Problem(409,'Daftar berubah. Muat ulang sebelum menyelesaikan persiapan.');
 return (await activityState(env,owner)).tasks.find(t=>t.id===task.id);
}
