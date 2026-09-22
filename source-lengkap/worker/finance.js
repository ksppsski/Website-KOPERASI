import {requireStaffRole,actorId} from './access.js';
import {creditStatement} from './savings.js';
import {trackedRun,finish,payoutTask,ensurePayoutTasks,activityState} from './activity.js';
import {Problem,stmt,getProfile} from './membership.js';

const stamp=()=>new Date().toISOString();
export function makassarToday(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;
}
export function calendarDate(value){
 const s=String(value||''),d=new Date(s+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==s||d.getUTCFullYear()<1901||d.getUTCFullYear()>9998)throw new Problem(400,'Pilih tanggal yang valid.');
 return d;
}
const dateKey=d=>d.toISOString().slice(0,10);
const lastDay=(y,m)=>new Date(Date.UTC(y,m+1,0,12)).getUTCDate();
export function scheduledDate(effective,monthOffset){
 const d=calendarDate(effective),y=d.getUTCFullYear(),m=d.getUTCMonth()+monthOffset;
 const first=new Date(Date.UTC(y,m,1,12));
 first.setUTCDate(Math.min(d.getUTCDate(),lastDay(first.getUTCFullYear(),first.getUTCMonth())));
 return dateKey(first);
}
export function referenceDates(value){
 const d=calendarDate(value),dates=[];
 for(let ago=12;ago>=1;ago--){
  const x=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-ago,1,12));
  if(d.getUTCDate()<=lastDay(x.getUTCFullYear(),x.getUTCMonth())){x.setUTCDate(d.getUTCDate());dates.push(dateKey(x));}
 }
 return dates;
}
export const savingsTotal=data=>Number(data.basic||0)+Number(data.monthly||0)*(data.paymentOption==='Tahunan'?12:1)+Number(data.transactionSaving||0)+(data.special==='Ya'?Math.ceil(Number(data.specialAmount||0)/(data.specialPayment==='Angsur'?Math.max(1,Number(data.installments||1)):1)):0)+Number(data.admin||0);

export {staffContext,changeStaffRole,requireStaffRole} from './access.js';
export function reconciliationDTO(record,proofKey,amount){
 if(!record||record.proof_key!==proofKey||record.expected_amount!==amount)return {status:'pending',label:'Menunggu Finance',version:record?.version||0};
 return {status:record.status,label:record.status==='approved'?'Sudah direkonsiliasi':'Perlu perbaikan',version:record.version,receivedAmount:record.received_amount,transferDate:record.transfer_date,reference:record.reference,note:record.note,checkedAt:record.checked_at,checkedByRole:'Finance'};
}
export async function reconciliationFor(env,owner,kind,id,proofKey,amount){
 const row=await stmt(env,'SELECT * FROM finance_reconciliations WHERE owner = ? AND target_kind = ? AND target_id = ?',owner,kind,id).first();
 return reconciliationDTO(row,proofKey,amount);
}
export async function requireReconciled(env,owner,kind,row){
 const amount=kind==='registration'?savingsTotal(JSON.parse(row.data)):row.amount;
 const r=await reconciliationFor(env,owner,kind,row.id,row.proof_key,amount);
 if(r.status!=='approved')throw new Problem(409,'Menunggu rekonsiliasi Finance. Admin belum dapat melanjutkan persetujuan atau pembuatan akad.');
 return r;
}
export async function reconciliationQueue(env,owner){
 const p=await getProfile(env,owner),requests=(await stmt(env,"SELECT * FROM workflow_requests WHERE owner = ? AND kind IN ('capital','savings') ORDER BY created_at DESC",owner).all()).results;
 const records=(await stmt(env,'SELECT * FROM finance_reconciliations WHERE owner = ?',owner).all()).results;
 const items=[];
 if(p){const data=JSON.parse(p.data);items.push({id:p.id,kind:'registration',label:'Simpanan pendaftaran',memberName:data.name,memberId:p.member_number,amount:savingsTotal(data),sourceVersion:p.version,proofKey:p.proof_key,proofName:p.proof_name,proofUrl:'/api/workflow/profile/proof',createdAt:p.created_at,sourceStatus:p.status});}
 for(const r of requests){if(['rejected','cancelled'].includes(r.status))continue;const member=r.member_snapshot?JSON.parse(r.member_snapshot):null;items.push({projectCode:r.project_code||null,offerTitle:r.offer_title||null,id:r.id,kind:r.kind,label:r.kind==='savings'?'Setoran simpanan wajib':'Penyertaan modal',memberName:r.member_name,memberId:member?.memberNumber||p?.member_number||'—',amount:r.amount,sourceVersion:r.version,proofKey:r.proof_key,proofName:r.proof_name,proofUrl:'/api/workflow/'+r.id+'/proof',createdAt:r.created_at,sourceStatus:r.status});}
 return items.map(({proofKey,...item})=>({...item,reconciliation:reconciliationDTO(records.find(r=>r.target_kind===item.kind&&r.target_id===item.id),proofKey,item.amount)}));
}
export async function reconcile(env,owner,body){
 await requireStaffRole(env,owner,'finance');
 const kind=body.kind,id=String(body.id||'');
 if(!['registration','capital','savings'].includes(kind))throw new Problem(400,'Jenis setoran tidak valid.');
 const source=kind==='registration'?await getProfile(env,owner):await stmt(env,"SELECT * FROM workflow_requests WHERE owner = ? AND id = ? AND kind = ?",owner,id,kind).first();
 if(!source||source.id!==id||['rejected','cancelled','correction'].includes(source.status))throw new Problem(404,'Setoran tidak ditemukan.');
 const expected=kind==='registration'?savingsTotal(JSON.parse(source.data)):source.amount;
 const existing=await stmt(env,'SELECT * FROM finance_reconciliations WHERE owner = ? AND target_kind = ? AND target_id = ?',owner,kind,id).first();
 const current=reconciliationDTO(existing,source.proof_key,expected);
 if(current.status==='approved')throw new Problem(409,'Bukti transfer ini sudah direkonsiliasi.');
 if(Number(body.sourceVersion)!==source.version||Number(body.version)!==(existing?.version||0))throw new Problem(409,'Data setoran berubah. Muat ulang pemeriksaan Finance.');
 const amount=Number(body.receivedAmount),date=String(body.transferDate||''),reference=String(body.reference||'').trim(),note=String(body.note||'').trim(),decision=body.decision;
 if(typeof body.receivedAmount!=='number'||!Number.isSafeInteger(amount)||amount<0||amount>1e13)throw new Problem(400,'Isi nominal dana masuk dalam rupiah bulat.');
 calendarDate(date);if(date>makassarToday())throw new Problem(400,'Tanggal dana masuk tidak boleh melewati hari ini.');
 if(reference.length<3||reference.length>160)throw new Problem(400,'Isi referensi mutasi atau transaksi bank (3–160 karakter).');
 if(!['approve','return'].includes(decision)||note.length>1500)throw new Problem(400,'Hasil rekonsiliasi tidak valid.');
 if(decision==='approve'&&(amount!==expected||body.confirm!==true))throw new Problem(400,'Nominal dana masuk harus sama dengan pengajuan dan pemeriksaan mutasi harus dikonfirmasi.');
 if(decision==='return'&&note.length<5)throw new Problem(400,'Jelaskan perbaikan yang diperlukan (minimal 5 karakter).');
 if(current.status==='correction')throw new Problem(409,'Tunggu anggota mengirim perbaikan sebelum memeriksa ulang.');
 const at=stamp(),extra=decision==='approve'&&['registration','savings'].includes(kind)?[creditStatement(env,owner,kind,source)]:[];
 const table=kind==='registration'?'member_profiles':'workflow_requests';
 const guard=`EXISTS (SELECT 1 FROM ${table} WHERE owner = ? AND id = ? AND proof_key = ? AND version = ?)`;
 const args=[source.proof_key,expected,amount,date,reference,decision==='approve'?'approved':'correction',note,actorId(env,owner),stamp()];
 let result;
 if(existing){result=await trackedRun(env,stmt(env,`UPDATE finance_reconciliations SET proof_key=?, expected_amount=?, received_amount=?, transfer_date=?, reference=?, status=?, note=?, checked_by=?, checked_at=?, version=version+1 WHERE owner=? AND target_kind=? AND target_id=? AND version=? AND ${guard}`,...args,owner,kind,id,existing.version,owner,id,source.proof_key,source.version),owner,id,'finance',[finish(id,['reconciliation'],decision==='approve'?'reconciled':'correction')],at,extra);}
 else{result=await trackedRun(env,stmt(env,`INSERT INTO finance_reconciliations (id,owner,target_kind,target_id,proof_key,expected_amount,received_amount,transfer_date,reference,status,note,checked_by,checked_at,version) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,1 WHERE ${guard} ON CONFLICT(owner,target_kind,target_id) DO NOTHING`,crypto.randomUUID(),owner,kind,id,...args,owner,id,source.proof_key,source.version),owner,id,'finance',[finish(id,['reconciliation'],decision==='approve'?'reconciled':'correction')],at,extra);}
 if(!result.meta?.changes)throw new Problem(409,'Data berubah saat disimpan. Muat ulang pemeriksaan Finance.');
 return reconciliationFor(env,owner,kind,id,source.proof_key,expected);
}
function sumSafe(values){let n=0n;for(const v of values)n+=BigInt(v);if(n>BigInt(Number.MAX_SAFE_INTEGER))throw new Problem(422,'Total melampaui kapasitas perhitungan. Persempit data yang diproses.');return Number(n);}
export function buildPayoutSchedule(requests,reconciliations,value){
 const day=calendarDate(value),date=dateKey(day),items=[];
 for(const r of requests){
  if(r.kind!=='capital'||!['generated','signed'].includes(r.status)||!r.contract_data||!r.member_snapshot)continue;
  const c=JSON.parse(r.contract_data),m=JSON.parse(r.member_snapshot);
  if(!c.effectiveDate||!c.endDate||!Number.isSafeInteger(r.amount)||r.amount<=0)continue;
  const effective=calendarDate(c.effectiveDate),month=(day.getUTCFullYear()-effective.getUTCFullYear())*12+day.getUTCMonth()-effective.getUTCMonth();
  if(month<1||month>12||scheduledDate(c.effectiveDate,month)!==date||date>c.endDate)continue;
  const rec=reconciliationDTO(reconciliations.find(x=>x.target_kind==='capital'&&x.target_id===r.id),r.proof_key,r.amount);
  if(rec.status!=='approved')continue;
  const amount=Number((BigInt(r.amount)*5n+50n)/100n),data=m.data||{};
  items.push({id:r.id,memberId:m.memberNumber||'—',memberName:data.name||r.member_name,bankName:data.bankName||'',bankAccount:data.bankAccount||'',accountName:data.name||r.member_name,contractNumber:r.contract_number,agreementDate:c.agreementDate,effectiveDate:c.effectiveDate,endDate:c.endDate,period:month,principal:r.amount,rate:5,amount,contractStatus:r.status,missingAccount:!data.bankName||!data.bankAccount,memberKey:m.id||r.owner});
 }
 items.sort((a,b)=>a.memberName.localeCompare(b.memberName,'id')||a.effectiveDate.localeCompare(b.effectiveDate)||a.id.localeCompare(b.id));
 const groups=new Map();
 for(const item of items){const key=JSON.stringify([item.memberKey,item.bankName,item.bankAccount]);if(!groups.has(key))groups.set(key,{memberId:item.memberId,memberName:item.memberName,accountName:item.accountName,bankName:item.bankName,bankAccount:item.bankAccount,missingAccount:item.missingAccount,contracts:[]});groups.get(key).contracts.push(item);}
 const members=[...groups.values()].map(g=>({...g,contractCount:g.contracts.length,principal:sumSafe(g.contracts.map(x=>x.principal)),amount:sumSafe(g.contracts.map(x=>x.amount))}));
 return {date,timeZone:'Asia/Makassar',rate:5,basis:'effectiveDate',referenceDates:referenceDates(date),items,members,total:sumSafe(items.map(x=>x.amount)),contractCount:items.length,memberCount:new Set(items.map(x=>x.memberKey)).size,transferCount:members.length,missingAccountCount:members.filter(x=>x.missingAccount).length};
}
export async function payouts(env,owner,value){
 await requireStaffRole(env,owner,'finance');
 return payoutData(env,owner,value);
}
export async function payoutData(env,owner,value){
 const requests=(await stmt(env,"SELECT * FROM workflow_requests WHERE owner = ? AND kind = 'capital' AND status IN ('generated','signed') AND contract_data IS NOT NULL",owner).all()).results;
 const rec=(await stmt(env,"SELECT * FROM finance_reconciliations WHERE owner = ? AND target_kind = 'capital' AND status = 'approved'",owner).all()).results;
 const result=buildPayoutSchedule(requests,rec,value||makassarToday());
 const {trackingSince}=await activityState(env,owner);
 result.task=await payoutTask(env,owner,result,requests,rec,makassarToday(),trackingSince?makassarToday(new Date(trackingSince)):makassarToday());
 return result;
}

// Reconstruct elapsed due dates from the immutable contract schedule. Missed days
// remain in the KPI queue even when nobody opened Finance on their due date.
export async function syncDuePayoutTasks(env,owner){
 const {trackingSince}=await activityState(env,owner),today=makassarToday(),since=trackingSince?makassarToday(new Date(trackingSince)):today;
 const requests=(await stmt(env,"SELECT * FROM workflow_requests WHERE owner=? AND kind='capital' AND status IN ('generated','signed') AND contract_data IS NOT NULL",owner).all()).results;
 const rec=(await stmt(env,"SELECT * FROM finance_reconciliations WHERE owner=? AND target_kind='capital' AND status='approved'",owner).all()).results;
 const dates=new Set();
 for(const row of requests){const c=JSON.parse(row.contract_data);if(!c.effectiveDate||!c.endDate)continue;for(let month=1;month<=12;month++){const day=scheduledDate(c.effectiveDate,month);if(day>=since&&day<=today&&day<=c.endDate)dates.add(day);}}
 await ensurePayoutTasks(env,owner,[...dates].sort().map(date=>buildPayoutSchedule(requests,rec,date)),requests,rec,today,since);
}
