import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {PDFDocument,StandardFonts}=require('pdf-lib');const UPNG=require('@pdf-lib/upng').default;
import worker from '../worker/index.js';
import {terbilang,cropSignature} from '../worker/contract-pdf.js';
import {agreementRules} from '../worker/contract-rules.js';
import {RESET_ID,RESET_CUTOFF} from '../worker/reset-demo.js';
globalThis.STATIC_ASSETS={'/assets/kspps-logo-color-web.png':{body:readFileSync('./dist/assets/kspps-logo-color-web.png').toString('base64')}};
globalThis.PDF_CONTRACT_TEMPLATE=readFileSync('./templates/contract-original-layout.pdf').toString('base64');
globalThis.PDF_FONT_REGULAR=readFileSync('./templates/fonts/LiberationSans-Regular.ttf').toString('base64');
globalThis.PDF_FONT_BOLD=readFileSync('./templates/fonts/LiberationSans-Bold.ttf').toString('base64');
const database=new DatabaseSync(':memory:');
for(const file of readdirSync('./drizzle').filter(f=>f.endsWith('.sql')).sort())database.exec(readFileSync('./drizzle/'+file,'utf8'));
const storage=new Map();
const env={
 DB:{batch(statements){database.exec('BEGIN');try{const results=statements.map(s=>s.execute());database.exec('COMMIT');return Promise.resolve(results)}catch(error){database.exec('ROLLBACK');throw error}},prepare(sql){return {bind(...args){return {
  execute(){return {meta:{changes:Number(database.prepare(sql).run(...args).changes)}}},
  async first(){return database.prepare(sql).get(...args)||null},
  async all(){return {results:database.prepare(sql).all(...args)}},
  async run(){return {meta:{changes:Number(database.prepare(sql).run(...args).changes)}}}
 }}}}},
 BUCKET:{async put(key,bytes){storage.set(key,new Uint8Array(bytes))},async get(key){const bytes=storage.get(key);return bytes?{body:bytes}:null},async delete(key){for(const k of Array.isArray(key)?key:[key])storage.delete(k)},async list({prefix}){return {objects:[...storage.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key,uploaded:new Date()})),truncated:false}}}
};
const base='https://kspps.test';
async function call(path='',{owner='user-a',body,origin=base,method=body?'POST':'GET'}={}){const headers={};if(owner)headers['oai-authenticated-user-id']=owner;if(method!=='GET')headers.origin=origin;if(body&&!(body instanceof FormData)){headers['content-type']='application/json';body=JSON.stringify(body)}const r=await worker.fetch(new Request(base+'/api/workflow'+path,{headers,method,body}),env);return {status:r.status,data:r.headers.get('content-type')?.includes('application/json')?await r.json():new Uint8Array(await r.arrayBuffer()),headers:r.headers};}
async function fixtureRole(role,owner='user-a'){
 const at=new Date().toISOString();database.prepare('INSERT INTO staff_accounts VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role').run(owner,role,owner,owner+'@example.test','fixture',at,at);
 return call('/staff/role',{owner,body:{role}});
}
await fixtureRole('admin');
async function beginStage(id,stage){
 const report=await call('/staff/tasks');assert.equal(report.status,200,JSON.stringify(report.data));
 const task=report.data.tasks.filter(t=>t.targetId===id&&t.stage===stage&&!t.closed&&!t.completed).at(-1);assert(task,stage+' queued');
 const started=await call('/staff/activity/start',{body:{taskId:task.id,startedAt:'2000-01-01T00:00:00Z',actorId:'forged'}});assert.equal(started.status,200,JSON.stringify(started.data));
 assert.notEqual(started.data.task.startedAt,'2000-01-01T00:00:00Z');assert.equal(started.data.task.startedBy,'user-a');
 assert.equal((await call('/staff/activity/start',{body:{taskId:task.id}})).data.task.startedAt,started.data.task.startedAt,'repeat click preserves first start');
 assert.equal((await call('/staff/activity/start',{owner:'user-b',body:{taskId:task.id}})).status,404,'cross-account start blocked');
 return started.data.task;
}
async function financeApprove(kind,id){
 assert.equal((await fixtureRole('finance')).status,200);
 const queue=await call('/finance/reconciliations');assert.equal(queue.status,200,JSON.stringify(queue.data));
 const item=queue.data.items.find(x=>x.kind===kind&&x.id===id);assert(item);
 const body={kind,id,sourceVersion:item.sourceVersion,version:item.reconciliation.version,receivedAmount:item.amount,transferDate:'2026-09-01',reference:'MUTASI-UJI-'+id,decision:'approve',confirm:true};
 assert.equal((await call('/finance/reconcile',{body:{...body,receivedAmount:item.amount+1}})).status,400);
 await beginStage(id,'reconciliation');
 const result=await call('/finance/reconcile',{body});assert.equal(result.status,200,JSON.stringify(result.data));
 assert.equal(result.data.reconciliation.status,'approved');
 assert.equal((await fixtureRole('admin')).status,200);
}
const rgba=new Uint8Array(1000*340*4);for(let x=100;x<750;x++)for(let y=0;y<5;y++){const i=((100+Math.floor(x/8)%100+y)*1000+x)*4;rgba[i]=30;rgba[i+1]=60;rgba[i+2]=120;rgba[i+3]=255;}
const sig=new Uint8Array(UPNG.encode([rgba.buffer],1000,340,0));
const profile={name:'ANGGOTA UJI SYIRKAH KEBAIKAN',identityType:'KTP',identityNumber:'0000000000000000',identityAddress:'Jl. Pengujian No. 123 RT 001/RW 002',address:'Jalan Contoh 123 Makassar',village:'Maricaya',district:'Makassar',city:'Kota Makassar',province:'Sulawesi Selatan',bankName:'Bank Syariah Indonesia',bankAccount:'0000000000',phone:'081200000000',email:'anggota@example.com',birthplace:'Makassar',birthdate:'1995-01-15',gender:'Laki-laki',job:'Karyawan Swasta',education:'Sarjana',marital:'Menikah',mother:'IBU CONTOH',heir:'AHLI WARIS CONTOH',heirPhone:'081200000001',office:'Kantor KSPPS Makassar',religion:'Islam',basic:100000,monthly:10000,transactionSaving:50000,specialAmount:0,installments:1,admin:30000,consent:true,signatureConsent:true};
const file=()=>new File([sig],'bukti.png',{type:'image/png'}),regId=crypto.randomUUID();
function registration(data=profile,signature=sig,id=regId,version=0){const f=new FormData();f.set('id',id);f.set('version',String(version));f.set('data',JSON.stringify(data));f.set('signature',new File([signature],'tanda-tangan.png',{type:'image/png'}));f.set('proof',file());f.set('ktp',new File([sig],'ktp-uji.png',{type:'image/png'}));return f;}
let offerId,bigOfferId;
function capital(id=crypto.randomUUID(),amount=10050717){const f=new FormData();f.set('id',id);f.set('amount',String(amount));f.set('offerId',amount>100000000000?bigOfferId:offerId);f.set('version',String(database.prepare('SELECT version FROM workflow_requests WHERE id=?').get(id)?.version||0));f.set('proof',file());f.set('signatureConsent','true');return f}
assert.equal((await call('',{owner:null})).status,401);
assert.equal((await call('/profile',{body:registration(),origin:'https://other.test'})).status,403);
assert.equal((await call('/capital',{body:capital()})).status,409);
for(const key of ['name','email','bankName','bankAccount','village','district','city','province','identityAddress'])assert.equal((await call('/profile',{body:registration({...profile,[key]:''})})).status,400,key);
assert.equal((await call('/profile',{body:registration({...profile,signatureConsent:false})})).status,400);
assert.equal((await call('/profile',{body:registration({...profile,identityAddress:'W'.repeat(200)})})).status,400,'registration blocks field overflow before approval');
const blank=new Uint8Array(UPNG.encode([new Uint8Array(1000*340*4).buffer],1000,340,0));assert.equal((await call('/profile',{body:registration(profile,blank)})).status,400);
const withoutKtp=registration();withoutKtp.delete('ktp');assert.equal((await call('/profile',{body:withoutKtp})).status,400,'KTP is mandatory on the server');
for(const invalid of [new File(['%PDF-1.7 fake'],'ktp.pdf',{type:'application/pdf'}),new File(['not an image'],'ktp.png',{type:'image/png'}),new File([new Uint8Array(10*1024*1024+1)],'ktp.jpg',{type:'image/jpeg'})]){const f=registration();f.set('ktp',invalid);assert([400,413].includes((await call('/profile',{body:f})).status),'invalid KTP rejected');}
let r=await call('/profile',{body:registration()});assert.equal(r.status,201,JSON.stringify(r.data));let p=r.data.profile;const assignedMemberNumber=p.memberNumber;assert.match(assignedMemberNumber,/^SKI-\d{4}-0001$/);assert.equal(p.id,regId);assert.equal(p.status,'pending');assert.equal(storage.size,3);
assert.equal((await call('/profile',{body:registration()})).status,200);assert.equal(storage.size,3);
const ktpResponse=await call('/profile/ktp');assert.equal(ktpResponse.status,200);assert.deepEqual(ktpResponse.data,sig);assert.equal(ktpResponse.headers.get('content-type'),'image/png');assert.equal(ktpResponse.headers.get('cache-control'),'private, no-store');assert.equal((await call('/profile/ktp',{owner:'user-b'})).status,404);assert.equal((await call('/profile/ktp',{owner:null})).status,401);
assert.equal((await call('/profile/signature',{owner:'user-b'})).status,404);
assert.equal((await call('',{owner:'user-b'})).data.profile,null);
assert.equal((await call('/capital',{body:capital()})).status,409);
r=await call('/profile/review',{body:{version:p.version,action:'return',note:'Perbaiki alamat sesuai identitas.'}});assert.equal(r.data.profile.status,'correction');
r=await call('/profile',{body:registration(profile,sig,regId,r.data.profile.version)});assert.equal(r.status,201);p=r.data.profile;assert.equal(p.memberNumber,assignedMemberNumber);
assert.equal((await call('/profile/review',{body:{version:p.version,action:'approve',checks:{identity:true,reconciled:true,signature:true,ktp:true}}})).status,409,'Admin cannot self-reconcile registration');
assert.equal((await call('/finance/reconcile',{body:{}})).status,403,'Admin cannot use Finance mutation');
await financeApprove('registration',p.id);
assert.equal((await call('/profile/review',{body:{version:p.version,action:'approve',checks:{identity:true}}})).status,400);
assert.equal((await call('/profile/review',{body:{version:p.version,action:'approve',checks:{identity:true,signature:true,ktp:false}}})).status,400,'explicit KTP check required');
await beginStage(p.id,'registration');
r=await call('/profile/review',{body:{version:p.version,action:'approve',checks:{identity:true,reconciled:true,signature:true,ktp:true}}});assert.equal(r.data.profile.status,'approved');assert.equal(r.data.profile.memberNumber,assignedMemberNumber);assert(r.data.profile.ktpCheckedAt);assert.equal(database.prepare('SELECT ktp_checked_by FROM member_profiles WHERE owner=?').get('user-a').ktp_checked_by,'user-a');
// A previously approved legacy member can add their missing photo without changing
// the bank proof, signature or member number. Admin rechecks the registration.
const beforeLegacy=database.prepare('SELECT * FROM member_profiles WHERE owner=?').get('user-a');
database.prepare('UPDATE member_profiles SET ktp_key=NULL,ktp_type=NULL,ktp_name=NULL,ktp_checked_at=NULL,ktp_checked_by=NULL WHERE owner=?').run('user-a');
function legacyKtp(version){const f=new FormData();f.set('version',String(version));f.set('ktp',new File([sig],'ktp-lengkap.png',{type:'image/png'}));return f;}
assert.equal((await call('/profile/ktp',{body:legacyKtp(9999)})).status,409);
r=await call('/profile/ktp',{body:legacyKtp(beforeLegacy.version)});assert.equal(r.status,200,JSON.stringify(r.data));p=r.data.profile;assert.equal(p.status,'pending');assert.equal(p.finance.status,'approved');assert(p.ktpUrl);assert.equal(p.memberNumber,assignedMemberNumber);
assert.equal(database.prepare('SELECT proof_key FROM member_profiles WHERE owner=?').get('user-a').proof_key,beforeLegacy.proof_key);
assert.equal((await call('/profile/ktp',{body:legacyKtp(p.version)})).status,409,'already stored KTP cannot silently be replaced');
const savedKtp=database.prepare('SELECT ktp_key FROM member_profiles WHERE owner=?').get('user-a').ktp_key;
database.prepare('UPDATE member_profiles SET ktp_key=NULL WHERE owner=?').run('user-a');
assert.equal((await call('/profile/review',{body:{version:p.version,action:'approve',checks:{identity:true,signature:true,ktp:true}}})).status,409,'a checkbox cannot substitute for the actual KTP');
database.prepare('UPDATE member_profiles SET ktp_key=? WHERE owner=?').run(savedKtp,'user-a');
await beginStage(p.id,'registration');r=await call('/profile/review',{body:{version:p.version,action:'approve',checks:{identity:true,signature:true,ktp:true}}});assert.equal(r.status,200);assert(r.data.profile.ktpCheckedAt);
await fixtureRole('manager');
for(const [title,code,big] of [['Uji kebutuhan Mitra','TEST-REGULAR',false],['Uji nilai besar','TEST-LARGE',true]]){const offer=await call('/offers',{body:{id:crypto.randomUUID(),title,projectCode:code,quota:1000000000000}});assert.equal(offer.status,201,JSON.stringify(offer.data));if(big)bigOfferId=offer.data.offer.id;else offerId=offer.data.offer.id;}
await fixtureRole('admin');
const id=crypto.randomUUID();r=await call('/capital',{body:capital(id)});assert.equal(r.status,201,JSON.stringify(r.data));let item=r.data.item;assert.equal(item.memberName,profile.name);assert.equal(item.memberId,assignedMemberNumber);assert.equal(item.member.bankAccount,profile.bankAccount);assert(item.signatureUrl);
assert.equal((await call('/'+id+'/generate',{body:{}})).status,409);
assert.equal((await call('/'+id+'/review',{body:{action:'approve',version:99,checks:{identity:true,amount:true,reconciled:true}}})).status,409);
await financeApprove('capital',id);
r=await call('/'+id+'/review',{body:{action:'return',version:item.version,note:'Perbaiki bukti pembayaran.'}});assert.equal(r.data.item.status,'correction');r=await call('/'+id+'/revise',{body:capital(id)});assert.equal(r.status,200);item=r.data.item;
assert.equal(item.finance.status,'pending','A replaced proof invalidates a prior Finance reconciliation');
assert.equal((await call('/'+id+'/review',{body:{action:'approve',version:item.version,checks:{identity:true,amount:true,reconciled:true}}})).status,409,'Admin checkbox cannot bypass Finance');
await financeApprove('capital',id);
await beginStage(id,'capital');
r=await call('/'+id+'/review',{body:{action:'approve',version:item.version,checks:{identity:true,amount:true,reconciled:true}}});item=r.data.item;assert.equal(item.status,'ready');
await beginStage(id,'generate');
const details={version:item.version,agreementDate:'2026-09-21',confirm:true};
const originalProof=database.prepare('SELECT proof_key FROM workflow_requests WHERE id = ?').get(id).proof_key;
database.prepare('UPDATE workflow_requests SET proof_key = ? WHERE id = ?').run('replacement-proof',id);
assert.equal((await call('/'+id+'/generate',{body:{...details,reconciled:true}})).status,409,'Generation rechecks Finance independently of prior Admin approval');
database.prepare('UPDATE workflow_requests SET proof_key = ? WHERE id = ?').run(originalProof,id);
assert.equal((await call('/'+id+'/generate',{body:{...details,agreementDate:'2026-02-31'}})).status,400);
assert.equal((await call('/'+id+'/generate',{body:{...details,confirm:false}})).status,400);
r=await call('/'+id+'/generate',{body:{...details,serial:'9999',code:'MANUAL',effectiveDate:'2000-01-01',endDate:'2000-01-02'}});assert.equal(r.status,200,JSON.stringify(r.data));item=r.data.item;assert.equal(item.status,'generated');assert.equal(item.contractNumber,'0001/SPK-SKI-MRBH-9/IX/2026');assert.equal(item.contractData.effectiveDate,'2026-10-01');assert.equal(item.contractData.endDate,'2027-10-01');assert(!item.signedUrl);
const pdf=await call('/'+id+'/contract?download=1');assert.equal(pdf.status,200);assert(pdf.headers.get('content-disposition').includes('attachment'));writeFileSync('/tmp/kspps-contract-test.pdf',pdf.data);
assert.equal((await call('/'+id+'/generate',{body:details})).data.item.contractNumber,item.contractNumber);
for(const part of ['proof','contract','signature','signed'])assert.equal((await call('/'+id+'/'+part,{owner:'user-b'})).status,404);
const draft=await PDFDocument.load(pdf.data);assert.equal(draft.getPageCount(),2,'original two-page layout');const font=await draft.embedFont(StandardFonts.Helvetica);draft.getPages().at(-1).drawText('KETUA - SIMULASI PENGUJIAN',{x:310,y:120,size:9,font});const full=await draft.save();
await beginStage(id,'archive');
function signed(bytes=full,confirmed=true){const f=new FormData();f.set('signed',new File([bytes],'akad-lengkap.pdf',{type:'application/pdf'}));f.set('version',String(item.version));f.set('confirm',String(confirmed));return f}
assert.equal((await call('/'+id+'/upload-signed',{body:signed(pdf.data)})).status,400);
assert.equal((await call('/'+id+'/upload-signed',{body:signed(new TextEncoder().encode('%PDF-broken'))})).status,400);
assert.equal((await call('/'+id+'/upload-signed',{body:signed(full,false)})).status,400);
r=await call('/'+id+'/upload-signed',{body:signed()});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.item.status,'signed');assert(r.data.item.signedUrl);
assert.equal((await call('/'+id+'/upload-signed',{body:signed()})).status,200);
const final=await call('/'+id+'/signed');assert.deepEqual(final.data,new Uint8Array(full),'signed upload preserved byte-for-byte');assert.equal((await call()).data.items.find(x=>x.id===id).status,'signed');
const id2=crypto.randomUUID();r=await call('/capital',{body:capital(id2,999999999999)});let i2=r.data.item;await financeApprove('capital',id2);r=await call('/'+id2+'/review',{body:{action:'approve',version:i2.version,checks:{identity:true,amount:true,reconciled:true}}});i2=r.data.item;
r=await call('/'+id2+'/generate',{body:{...details,agreementDate:'2026-12-21',version:i2.version}});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.item.contractNumber,'0002/SPK-SKI-MRBH-12/XII/2026');assert.equal(r.data.item.contractData.effectiveDate,'2027-01-01');assert.equal(r.data.item.contractData.endDate,'2028-01-01');const large=await call('/'+id2+'/contract');writeFileSync('/tmp/kspps-contract-long-test.pdf',large.data);
assert.equal(terbilang(10050717).replace(/\s+/g,' ').trim(),'sepuluh juta lima puluh ribu tujuh ratus tujuh belas');
assert.equal(terbilang(1000000000000),'satu triliun');
const wd={id:crypto.randomUUID(),reason:'Mengundurkan diri untuk keperluan contoh.',consent:true};r=await call('/withdrawal',{body:wd});assert.equal(r.status,201);assert.equal(r.data.item.memberId,assignedMemberNumber);r=await call('/'+wd.id+'/cancel',{body:{}});assert.equal(r.data.item.status,'cancelled');
const nextIds=[crypto.randomUUID(),crypto.randomUUID()];
const readyItems=[];for(const requestId of nextIds){let result=await call('/capital',{body:capital(requestId)});await financeApprove('capital',requestId);result=await call('/'+requestId+'/review',{body:{action:'approve',version:result.data.item.version,checks:{identity:true,amount:true,reconciled:true}}});readyItems.push(result.data.item);}
const concurrent=await Promise.all([readyItems[0],readyItems[0],readyItems[1]].map(x=>call('/'+x.id+'/generate',{body:{...details,version:x.version}})));
assert(concurrent.every(x=>x.status===200),JSON.stringify(concurrent.map(x=>x.data)));
assert.equal(concurrent[0].data.item.contractNumber,concurrent[1].data.item.contractNumber,'concurrent retry returns same number');
assert.deepEqual(new Set(concurrent.map(x=>x.data.item.contractData.serial)),new Set(['0003','0004']));
assert.equal([...storage.keys()].filter(k=>k.startsWith('contracts/')).length,4,'concurrent PDF loser is removed');
const savedSnapshot=JSON.parse(database.prepare('SELECT member_snapshot FROM workflow_requests WHERE id = ?').get(id).member_snapshot);delete savedSnapshot.memberNumber;const legacySnapshot=JSON.stringify(savedSnapshot);database.prepare('UPDATE workflow_requests SET member_snapshot = ? WHERE id = ?').run(legacySnapshot,id);assert.equal((await call()).data.items.find(x=>x.id===id).memberId,assignedMemberNumber);assert.equal(database.prepare('SELECT member_snapshot FROM workflow_requests WHERE id = ?').get(id).member_snapshot,legacySnapshot,'display compatibility does not rewrite historical snapshot');
// Every 31st becomes the first of the following month; the end date is
// exactly 365 days after that adjusted effective date, even in a leap year.
for(const [input,effective,end] of [
 ['2026-01-21','2026-02-01','2027-02-01'],
 ['2026-03-21','2026-04-01','2027-04-01'],
 ['2026-05-21','2026-06-01','2027-06-01'],
 ['2026-07-21','2026-08-01','2027-08-01'],
 ['2026-08-21','2026-09-01','2027-09-01'],
 ['2026-10-21','2026-11-01','2027-11-01'],
 ['2026-12-21','2027-01-01','2028-01-01'],
 ['2028-01-21','2028-02-01','2029-01-31'],
 ['2026-01-20','2026-01-30','2027-01-30'],
 ['2026-02-18','2026-02-28','2027-02-28'],
 ['2028-02-19','2028-02-29','2029-02-28']
]){const d=agreementRules(input);assert.equal(d.effectiveDate,effective,input);assert.equal(d.endDate,end,input)}
const leap=agreementRules('2028-02-20');assert.deepEqual(leap,{agreementDate:'2028-02-20',code:'SPK-SKI-MRBH-2/II/2028',effectiveDate:'2028-03-01',endDate:'2029-03-01'});
const leapEnd=agreementRules('2023-03-01');assert.equal(leapEnd.effectiveDate,'2023-03-11');assert.equal(leapEnd.endDate,'2024-03-10');
for(let m=1;m<=12;m++){const d=agreementRules('2026-'+String(m).padStart(2,'0')+'-15');assert.equal(d.code,`SPK-SKI-MRBH-${m}/${['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][m-1]}/2026`)}
const cropped=UPNG.decode(cropSignature(sig).buffer);assert(cropped.width<1000&&cropped.height<340);
console.log('PASS: automatic unique serials + numeric/Roman months + calendar dates + original two-page PDF + signature crop +  registration validation + signature + review + owner isolation + capital snapshot + all contract fields + generation + auto-download response + immutable signed upload + member documents + legacy withdrawal');

assert.equal((await call('/finance/payouts?date=2026-11-01')).status,403);
await fixtureRole('finance');
assert.equal((await call('/'+id+'/generate',{body:details})).status,403,'Finance cannot generate even an existing contract');
assert.equal((await call('/profile/review',{body:{}})).status,403,'Finance cannot approve member registration');
const schedule=await call('/finance/payouts?date=2026-11-01');assert.equal(schedule.status,200,JSON.stringify(schedule.data));assert(schedule.data.total>0);assert.equal(schedule.data.members[0].bankAccount,profile.bankAccount);
const outsider=await call('/finance/reconciliations',{owner:'user-b'});assert.equal(outsider.status,403,'Another account does not inherit the Finance role');
await fixtureRole('finance','user-b');assert.deepEqual((await call('/finance/reconciliations',{owner:'user-b'})).data.items,[],'No cross-account data sharing');
assert.equal((await call('/finance/payouts?date=2026-11-01',{owner:'user-b'})).data.total,0);
console.log('PASS: server-enforced Admin/Finance transitions, amount matching, reconciliation prerequisite and per-account isolation.');

await fixtureRole('manager');
const activity=await call('/staff/activity');assert.equal(activity.status,200);
const contractWork=activity.data.tasks.filter(t=>t.targetId===id&&!t.closedAt&&['capital','generate','archive'].includes(t.stage)&&t.outcome!=='correction');
assert.equal(contractWork.length,3);assert(contractWork.every(t=>t.startedAt&&t.completedAt&&t.processingSeconds!==null));
assert.equal(contractWork.find(t=>t.stage==='archive').completedAt,item.signedAt||activity.data.tasks.find(t=>t.stage==='archive').completedAt);
assert(activity.data.tasks.some(t=>t.outcome==='correction'),'earlier review cycle retained');
assert(activity.data.tasks.some(t=>t.completedAt&&!t.startedAt&&t.processingSeconds===null),'old clients without start never get fabricated zero-duration KPI');
await fixtureRole('finance','user-b');
const otherActivity=await call('/staff/activity',{owner:'user-b'});assert.equal(otherActivity.status,403);
console.log('PASS: arrival/start/completion across Finance and Admin stages, original first start, server actor/time, revision history, missing-start exclusion and report isolation.');

console.log('PASS: mandatory KTP, valid image persistence/serving, invalid/oversize rejection, account isolation, Admin KTP checkbox gate, review audit and legacy completion.');

// Persistent savings, corrections from either role, and server-side eligibility.
await fixtureRole('admin');
let current=(await call()).data.profile;
assert(current.savings.active);assert.equal(current.savings.basic,100000);
assert.equal(current.savings.paid,10000);
assert.equal(database.prepare("SELECT count(*) n FROM savings_credits WHERE owner='user-a'").get().n,1);
assert.equal((await call('/eligibility')).status,200);
function saving(id=crypto.randomUUID(),amount=120000,version=0){const f=new FormData();f.set('id',id);f.set('amount',String(amount));f.set('version',String(version));f.set('proof',file());return f;}
assert.equal((await call('/savings',{body:saving(crypto.randomUUID(),100000)})).status,400,'cannot pay principal a second time');
const savingId=crypto.randomUUID();r=await call('/savings',{body:saving(savingId)});assert.equal(r.status,201,JSON.stringify(r.data));
assert.equal((await call('/savings',{body:saving(savingId)})).status,200,'resubmission idempotent');
assert.equal((await call()).data.profile.savings.paid,10000,'pending transfer not credited');
assert.equal((await call('/'+savingId+'/proof',{owner:'user-b'})).status,404);
await fixtureRole('finance');
async function financeReturn(kind,id){const q=(await call('/finance/reconciliations')).data.items.find(x=>x.id===id);const rr=await call('/finance/reconcile',{body:{kind,id,sourceVersion:q.sourceVersion,version:q.reconciliation.version,receivedAmount:0,transferDate:'2026-09-01',reference:'TEST-RETURN',decision:'return',note:'Unggah bukti yang dapat dibaca.'}});assert.equal(rr.status,200,JSON.stringify(rr.data));}
await financeReturn('savings',savingId);
assert.equal((await call()).data.items.find(x=>x.id===savingId).finance.status,'correction');
assert.equal((await call('/'+savingId+'/revise',{body:saving(savingId,120000,999)})).status,409,'stale revision rejected');
r=await call('/'+savingId+'/revise',{body:saving(savingId,120000,1)});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.item.finance.status,'pending');
await financeApprove('savings',savingId);
current=(await call()).data.profile;assert.equal(current.savings.paid,130000);assert.equal(current.savings.basic,100000);assert.equal(current.savings.remaining,120000);
await call('');await call('');assert.equal((await call()).data.profile.savings.paid,130000,'refresh never credits twice');
await fixtureRole('manager');
const savingTask=(await call('/staff/activity')).data.tasks.filter(t=>t.targetId===savingId);assert(savingTask.some(t=>t.stage==='reconciliation'&&t.completedAt));assert(!savingTask.some(t=>t.role==='admin'),'additional savings needs Finance only');
const priorDate=database.prepare('SELECT created_at FROM member_profiles WHERE owner=?').get('user-a').created_at;
database.prepare("UPDATE member_profiles SET created_at='2024-01-31T12:00:00Z' WHERE owner='user-a'").run();
assert.equal((await call('/eligibility')).status,409);assert.equal((await call('/capital',{body:capital()})).status,409,'direct API cannot bypass inactive savings');
assert.equal((await call('/savings',{body:saving()})).status,201,'inactive member may replenish');
database.prepare('UPDATE member_profiles SET created_at=? WHERE owner=?').run(priorDate,'user-a');
// A Finance return opens capital revision even when Admin has not returned it.
let capitalId=crypto.randomUUID();r=await call('/capital',{body:capital(capitalId)});assert.equal(r.status,201);
await fixtureRole('finance');await financeReturn('capital',capitalId);
r=await call('/'+capitalId+'/revise',{body:capital(capitalId)});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.item.status,'pending');assert.equal(r.data.item.finance.status,'pending');
// Same behavior for pending registration, with the member number retained.
const correctionOwner='user-c',correctionId=crypto.randomUUID();
r=await call('/profile',{owner:correctionOwner,body:registration(profile,sig,correctionId)});assert.equal(r.status,201);const originalNumber=r.data.profile.memberNumber;
await fixtureRole('finance',correctionOwner);
let q=(await call('/finance/reconciliations',{owner:correctionOwner})).data.items[0];
r=await call('/finance/reconcile',{owner:correctionOwner,body:{kind:'registration',id:correctionId,sourceVersion:q.sourceVersion,version:q.reconciliation.version,receivedAmount:0,transferDate:'2026-09-01',reference:'REG-RETURN',decision:'return',note:'Perbaiki bukti setoran awal.'}});assert.equal(r.status,200);
let returned=(await call('',{owner:correctionOwner})).data.profile;assert.equal(returned.status,'pending');assert.equal(returned.finance.status,'correction');
r=await call('/profile',{owner:correctionOwner,body:registration({...profile,address:'Alamat sudah diperbaiki'},sig,correctionId,returned.version)});assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.profile.memberNumber,originalNumber);assert.equal(r.data.profile.finance.status,'pending');
assert.equal(r.data.profile.savings.paid,0,'unreconciled registration never credits');
assert.equal((await call('/eligibility',{owner:correctionOwner})).status,409);
// Admin identity revision after reconciliation preserves receipt and never charges twice.
await fixtureRole('admin');
database.prepare("UPDATE member_profiles SET status='pending' WHERE owner='user-a'").run();
current=(await call()).data.profile;r=await call('/profile/review',{body:{version:current.version,action:'return',note:'Perbaiki alamat domisili.'}});assert.equal(r.status,200);
const beforeCreditCount=database.prepare("SELECT count(*) n FROM savings_credits WHERE owner='user-a'").get().n;
r=await call('/profile',{body:registration({...profile,address:'Alamat domisili terkoreksi'},sig,regId,r.data.profile.version)});assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.profile.finance.status,'approved','unchanged transfer proof keeps reconciliation');
assert.equal(database.prepare("SELECT count(*) n FROM savings_credits WHERE owner='user-a'").get().n,beforeCreditCount);
assert.equal(r.data.profile.savings.basic,100000);assert.equal(r.data.profile.savings.paid,130000);
console.log('PASS: Finance registration/capital/savings corrections, stale version, member-number retention, immutable one-time principal, reconciled top-ups, KPI cycles, credit idempotency and inactive API gate.');
