import {actorId,identity,accessState,activateManager,requestStaffAccess,accessDirectory,assignAccess,memberDirectory,selectedOwner,requireStaff,cooperativeOwner} from './access.js';
import {reportList,uploadReport,reportFile} from './reports.js';
import {offers,createOffer,reservedSql} from './offers.js';
import {managerActivity} from './manager.js';
import {savingsState,requireActiveSavings} from './savings.js';
import { PDFDocument } from 'pdf-lib';
import {ktpCheck,MAX_KTP} from './identity-photo.js';
import {trackedRun,submission,receive,finish,closeTasks,bootstrapActivity,activityState,startTask,summarize,finishPayoutTask} from './activity.js';
import {agreementRules} from './contract-rules.js';
import {resetPreviousDemo} from './reset-demo.js';
import {buildContractPdf,TEMPLATE_VERSION} from './contract-pdf.js';
import {Problem,stmt,getProfile as rawProfile,profileDTO,snapshot,hash,signatureCheck,validateProfile} from './membership.js';
import {staffContext,changeStaffRole,requireStaffRole,reconciliationFor,reconciliationDTO,requireReconciled,reconciliationQueue,reconcile,payouts,syncDuePayoutTasks,savingsTotal} from './finance.js';
async function getProfile(env,owner){const p=await rawProfile(env,owner);if(p){p.finance=await reconciliationFor(env,owner,'registration',p.id,p.proof_key,savingsTotal(JSON.parse(p.data)));p.savings=await savingsState(env,owner,p);}return p;}
/* Connected concept workflows. Every record/file is isolated by the Sites user.
   Switching member/staff views demonstrates roles; it is not operational staff authorization. */
const MAX_PROOF = 10 * 1024 * 1024;
const STATUS = {pending:'Menunggu pemeriksaan',reviewing:'Dalam pemeriksaan',correction:'Perlu perbaikan',ready:'Siap dibuat',generating:'Sedang dibuat',generated:'Menunggu tanda tangan koperasi',signed:'Akad lengkap',approved:'Disetujui untuk penyelesaian',rejected:'Ditolak',cancelled:'Dibatalkan'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const now=()=>new Date().toISOString();
const getRecord=async(env,owner,id)=>{const row=await stmt(env,'SELECT * FROM workflow_requests WHERE id = ? AND owner = ?',id,owner).first();if(row){row.member_number=(await getProfile(env,owner))?.member_number;if(['capital','savings'].includes(row.kind))row.finance=await reconciliationFor(env,owner,row.kind,row.id,row.proof_key,row.amount);}return row};
function dto(row){const m=row.member_snapshot?JSON.parse(row.member_snapshot):null;return {offerId:row.offer_id||null,offerTitle:row.offer_title||null,projectCode:row.project_code||null,finance:row.finance||null,id:row.id,kind:row.kind,memberName:row.member_name,memberId:row.member_number||m?.memberNumber||'—',member:m?.data||null,signatureAvailable:!!m?.signatureKey,amount:row.amount,proofName:row.proof_name,proofType:row.proof_type,proofSize:row.proof_size,reason:row.reason,status:row.status,statusLabel:row.kind==='savings'&&row.finance?.status==='approved'?'Setoran terverifikasi':row.finance?.status==='correction'?'Perlu perbaikan':row.status==='generated'&&!row.contract_data?'Dokumen contoh lama':STATUS[row.status],note:row.note,contractNumber:row.contract_number,contractData:row.contract_data?JSON.parse(row.contract_data):null,createdAt:row.created_at,updatedAt:row.updated_at,version:row.version,generatedAt:row.generated_at,signedAt:row.signed_at,signedName:row.signed_name,proofUrl:row.proof_key?'/api/workflow/'+row.id+'/proof':null,contractUrl:row.contract_key?'/api/workflow/'+row.id+'/contract':null,signedUrl:row.signed_key?'/api/workflow/'+row.id+'/signed':null,signatureUrl:m?.signatureKey?'/api/workflow/'+row.id+'/signature':null}}
function shortText(value,min,max,label){const text=String(value||'').trim();if(text.length<min||text.length>max)throw new Problem(400,label+' harus berisi '+min+'–'+max+' karakter.');return text}
function requestId(value){const id=String(value||'');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new Problem(400,'Nomor pengajuan tidak valid. Muat ulang formulir.');return id}
async function limitedBody(request,limit){
 if(Number(request.headers.get('content-length')||0)>limit)throw new Problem(413,'Ukuran berkas maksimal 10 MB.');
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks=[];let length=0;
 while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new Problem(413,'Ukuran berkas maksimal 10 MB.')}chunks.push(value)}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}return bytes;
}
async function readJson(request){try{return JSON.parse(new TextDecoder().decode(await limitedBody(request,16384)))}catch(error){if(error instanceof Problem)throw error;throw new Problem(400,'Data pengajuan tidak valid.')}}
async function proofCheck(file){
 if(!file||typeof file.arrayBuffer!=='function'||!file.size)throw new Problem(400,'Lampirkan bukti transfer yang dapat dibaca.');
 if(file.size>MAX_PROOF)throw new Problem(413,'Ukuran berkas maksimal 10 MB.');
 const extension=String(file.name||'').split('.').pop().toLowerCase();
 const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',pdf:'application/pdf'};
 if(!Object.hasOwn(types,extension)||(file.type&&file.type!=='application/octet-stream'&&file.type!==types[extension]))throw new Problem(400,'Gunakan bukti transfer JPG, PNG, atau PDF.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 const signature=extension==='pdf'?[37,80,68,70,45]:extension==='png'?[137,80,78,71,13,10,26,10]:[255,216,255];
 if(!signature.every((b,i)=>bytes[i]===b))throw new Problem(400,'Isi berkas tidak sesuai format JPG, PNG, atau PDF.');
 return {bytes,type:types[extension],name:String(file.name).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,180)};
}
async function readCapital(request){
 const bytes=await limitedBody(request,MAX_PROOF+128*1024);
 let data;try{data=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData()}catch{throw new Problem(400,'Formulir tidak dapat dibaca.')}
 const amount=Number(data.get('amount'));
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000000)throw new Problem(400,'Isi nominal rupiah bulat antara Rp1 dan Rp1 triliun.');
 if(data.get('signatureConsent')!=='true')throw new Problem(400,'Setujui penggunaan tanda tangan terdaftar pada akad pengajuan ini.');
 return {offerId:String(data.get('offerId')||''),id:requestId(data.get('id')),version:Number(data.get('version')),amount,proof:await proofCheck(data.get('proof'))};
}
async function createCapital(request,env,owner){
 const data=await readCapital(request);const existing=await getRecord(env,owner,data.id);
 if(existing){if(existing.kind!=='capital')throw new Problem(409,'Referensi pengajuan berbeda.');return json({item:dto(existing)});}
 const profile=await getProfile(env,owner);if(!profile||profile.status!=='approved')throw new Problem(409,'Lengkapi pendaftaran dan tunggu persetujuan petugas sebelum mengajukan penyertaan modal.');
 await requireActiveSavings(env,owner,profile);
 const key='proof/'+crypto.randomUUID();const time=now();
 await env.BUCKET.put(key,data.proof.bytes,{httpMetadata:{contentType:data.proof.type}});
 try{const result=await trackedRun(env,stmt(env,`INSERT INTO workflow_requests (id,owner,kind,member_name,amount,proof_key,proof_name,proof_type,proof_size,status,note,created_at,updated_at,version,member_snapshot,offer_id,offer_title,project_code) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,o.id,o.title,o.project_code FROM capital_offers o WHERE o.id=? AND o.owner=? AND o.quota>=?+${reservedSql}`,data.id,owner,'capital',JSON.parse(profile.data).name,data.amount,key,data.proof.name,data.proof.type,data.proof.bytes.length,'pending','',time,time,1,snapshot(profile),data.offerId,await cooperativeOwner(env,owner),data.amount,''),owner,data.id,null,submission(data.id,'capital',JSON.parse(profile.data).name,time),time);if(!result.meta?.changes)throw new Problem(409,'Penawaran tidak tersedia atau sisa kuota tidak mencukupi. Periksa sisa kuota dan sesuaikan nominal pengajuan.');}
 catch(error){await env.BUCKET.delete(key);const prior=await getRecord(env,owner,data.id);if(prior)return json({item:dto(prior)});throw error}
 return json({item:dto(await getRecord(env,owner,data.id))},201);
}
async function createWithdrawal(request,env,owner){
 const body=await readJson(request),id=requestId(body.id),reason=shortText(body.reason,10,1500,'Alasan pengunduran diri');
 if(body.consent!==true)throw new Problem(400,'Setujui pemeriksaan hak dan kewajiban terlebih dahulu.');
 const existing=await getRecord(env,owner,id);if(existing)return json({item:dto(existing)});
 const profile=await getProfile(env,owner);if(!profile||profile.status!=='approved')throw new Problem(409,'Keanggotaan perlu disetujui sebelum mengajukan pengunduran diri.');
 const time=now();
 try{await trackedRun(env,stmt(env,'INSERT INTO workflow_requests (id,owner,kind,member_name,reason,status,note,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?)',id,owner,'withdrawal',JSON.parse(profile.data).name,reason,'pending','',time,time,1),owner,id,null,submission(id,'withdrawal',JSON.parse(profile.data).name,time),time)}
 catch(error){const prior=await getRecord(env,owner,id);if(prior)return json({item:dto(prior)});if(String(error).includes('UNIQUE'))throw new Problem(409,'Masih ada permohonan pengunduran diri yang sedang diproses.');throw error}
 return json({item:dto(await getRecord(env,owner,id))},201);
}
async function updateStatus(env,owner,row,status,note){
 const time=now(),ops=status==='reviewing'?[{type:'start',targetId:row.id,stages:[row.kind]}]:status==='cancelled'?[closeTasks(row.id,'cancelled')]:[finish(row.id,[row.kind],status),...(status==='ready'?[receive(row.id,'generate',row.member_name,time)]:[]),...(['correction','rejected'].includes(status)?[{type:'close',targetId:row.id,stages:['reconciliation'],outcome:'withdrawn'}]:[])];
 const result=await trackedRun(env,stmt(env,'UPDATE workflow_requests SET status = ?, note = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ?',status,note,now(),row.id,owner,row.version),owner,row.id,status==='cancelled'?null:'admin',ops,time);
 if(!result.meta?.changes)throw new Problem(409,'Status sudah berubah. Muat ulang daftar sebelum melanjutkan.');
 return json({item:dto(await getRecord(env,owner,row.id))});
}
async function reviewRequest(request,env,owner,row){
 await requireStaffRole(env,owner,'admin');
 const body=await readJson(request);
 if(!['pending','reviewing'].includes(row.status))throw new Problem(409,'Pengajuan ini sudah selesai diproses.');
 if(Number(body.version)!==row.version)throw new Problem(409,'Data sudah berubah. Muat ulang pemeriksaan.');
 const note=String(body.note||'').trim().slice(0,1500);
 if(body.action==='start')return updateStatus(env,owner,row,'reviewing',row.note);
 if(body.action==='return'||body.action==='reject')return updateStatus(env,owner,row,body.action==='return'?'correction':'rejected',shortText(body.note,5,1500,'Catatan petugas'));
 if(body.action!=='approve')throw new Problem(400,'Tindakan pemeriksaan tidak valid.');
 if(!['capital','withdrawal'].includes(row.kind))throw new Problem(409,'Setoran simpanan diperiksa melalui rekonsiliasi Finance.');
 if(row.kind==='capital'&&!row.member_snapshot)throw new Problem(409,'Pengajuan lama belum memiliki data dan tanda tangan anggota. Buat pengajuan baru setelah pendaftaran disetujui.');
 if(row.kind==='capital')await requireReconciled(env,owner,'capital',row);
 const keys=row.kind==='capital'?['identity','amount']:['identity','obligations','savings'];
 if(!keys.every(key=>body.checks?.[key]===true))throw new Problem(400,'Lengkapi semua pemeriksaan terlebih dahulu.');
 return updateStatus(env,owner,row,row.kind==='capital'?'ready':'approved',note);
}
function correctionAllowed(row){return row.status==='correction'||(['pending','reviewing'].includes(row.status)&&row.finance?.status==='correction');}
function revisionGuard(row){return row.finance?.status==='correction'?" AND EXISTS (SELECT 1 FROM finance_reconciliations WHERE owner=workflow_requests.owner AND target_id=workflow_requests.id AND status='correction' AND version="+Number(row.finance.version)+")":'';}
async function readSavings(request){
 const form=await readMultipart(request,MAX_PROOF+128*1024),amount=Number(form.get('amount'));
 if(![10000,120000].includes(amount))throw new Problem(400,'Pilih simpanan wajib Rp10.000 per bulan atau Rp120.000 per tahun.');
 return {id:requestId(form.get('id')),amount,version:Number(form.get('version')),proof:await proofCheck(form.get('proof'))};
}
async function createSavings(request,env,owner){
 const data=await readSavings(request),prior=await getRecord(env,owner,data.id);
 if(prior){if(prior.kind!=='savings')throw new Problem(409,'Referensi pengajuan berbeda.');return json({item:dto(prior)});}
 const p=await getProfile(env,owner);if(!p||p.status!=='approved')throw new Problem(409,'Tunggu pendaftaran disetujui sebelum mengirim setoran lanjutan.');
 const key='proof/'+crypto.randomUUID(),time=now();await env.BUCKET.put(key,data.proof.bytes,{httpMetadata:{contentType:data.proof.type}});
 try{await trackedRun(env,stmt(env,'INSERT INTO workflow_requests (id,owner,kind,member_name,amount,proof_key,proof_name,proof_type,proof_size,status,note,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)',data.id,owner,'savings',JSON.parse(p.data).name,data.amount,key,data.proof.name,data.proof.type,data.proof.bytes.length,'pending','',time,time),owner,data.id,null,submission(data.id,'savings',JSON.parse(p.data).name,time),time);}
 catch(error){await env.BUCKET.delete(key);const existing=await getRecord(env,owner,data.id);if(existing?.kind==='savings')return json({item:dto(existing)});throw error;}
 return json({item:dto(await getRecord(env,owner,data.id)),profile:profileDTO(await getProfile(env,owner))},201);
}
async function reviseRequest(request,env,owner,row){
 if(!correctionAllowed(row))throw new Problem(409,'Pengajuan hanya dapat diperbaiki jika diminta Admin atau Finance.');
 if(['capital','savings'].includes(row.kind)){
  const data=row.kind==='capital'?await readCapital(request):await readSavings(request);
  if(data.id!==row.id||data.version!==row.version)throw new Problem(409,'Pengajuan berubah. Muat ulang formulir perbaikan.');
  const key='proof/'+crypto.randomUUID();await env.BUCKET.put(key,data.proof.bytes,{httpMetadata:{contentType:data.proof.type}});
  try{const result=await trackedRun(env,stmt(env,'UPDATE workflow_requests SET amount = ?, proof_key = ?, proof_name = ?, proof_type = ?, proof_size = ?, status = ?, note = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?'+revisionGuard(row)+(row.offer_id?` AND EXISTS (SELECT 1 FROM capital_offers o WHERE o.id=workflow_requests.offer_id AND o.quota>=?+${reservedSql})`:''),data.amount,key,data.proof.name,data.proof.type,data.proof.bytes.length,'pending','',now(),row.id,owner,row.version,row.status,...(row.offer_id?[data.amount,row.id]:[])),owner,row.id,null,submission(row.id,row.kind,row.member_name));if(!result.meta?.changes)throw new Problem(409,'Pengajuan berubah atau sisa kuota tidak mencukupi. Periksa nominal dan muat ulang daftar.');}
  catch(error){await env.BUCKET.delete(key);throw error;}
  // Retain prior proof objects; financial review history must stay recoverable.
 }else{
  const data=await readJson(request);if(data.consent!==true)throw new Problem(400,'Setujui pemeriksaan hak dan kewajiban terlebih dahulu.');
  if(Number(data.version)!==row.version)throw new Problem(409,'Pengajuan berubah. Muat ulang formulir perbaikan.');
  const reason=shortText(data.reason,10,1500,'Alasan pengunduran diri');
  const result=await trackedRun(env,stmt(env,'UPDATE workflow_requests SET reason = ?, status = ?, note = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?',reason,'pending','',now(),row.id,owner,row.version,'correction'),owner,row.id,null,submission(row.id,'withdrawal',row.member_name));if(!result.meta?.changes)throw new Problem(409,'Pengajuan sudah berubah. Muat ulang daftar.');
 }
 return json({item:dto(await getRecord(env,owner,row.id)),profile:profileDTO(await getProfile(env,owner))});
}
async function generateContract(request,env,owner,row){
 await requireStaffRole(env,owner,'admin');
 if(['generated','signed'].includes(row.status)&&row.contract_data)return json({item:dto(row)});
 if(row.kind!=='capital'||row.status!=='ready')throw new Problem(409,'Periksa dan setujui data serta bukti transfer sebelum membuat akad.');
 if(!row.member_snapshot)throw new Problem(409,'Data dan tanda tangan pendaftaran belum tersedia. Buat pengajuan baru.');
 await requireReconciled(env,owner,'capital',row);
 const body=await readJson(request);if(Number(body.version)!==row.version)throw new Problem(409,'Data berubah. Muat ulang pemeriksaan.');
 const details={...agreementRules(body.agreementDate),templateVersion:TEMPLATE_VERSION};
 if(body.confirm!==true)throw new Problem(400,'Konfirmasi data akad dan tanda tangan anggota terlebih dahulu.');
 const member=JSON.parse(row.member_snapshot),sig=await env.BUCKET.get(member.signatureKey);
 if(!sig)throw new Problem(409,'Tanda tangan anggota tidak ditemukan.');
 const signatureBytes=new Uint8Array(await new Response(sig.body).arrayBuffer());
 if(await hash(signatureBytes)!==member.signatureSha256)throw new Problem(409,'Tanda tangan tidak sesuai data pendaftaran.');
 const reserved=await stmt(env,'INSERT INTO contract_numbers (request_id) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM contract_numbers WHERE request_id = ?) RETURNING serial',row.id,row.id).first()||await stmt(env,'SELECT serial FROM contract_numbers WHERE request_id = ?',row.id).first();
 details.serial=String(reserved.serial).padStart(4,'0');
 const number=details.serial+'/'+details.code,key='contracts/'+crypto.randomUUID()+'.pdf';
 const bytes=await buildContractPdf(row,details,signatureBytes);details.sha256=await hash(bytes);
 await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
 const time=now();
 try{
  const result=await trackedRun(env,stmt(env,'UPDATE workflow_requests SET status = ?, contract_key = ?, contract_number = ?, contract_data = ?, generated_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?','generated',key,number,JSON.stringify(details),time,time,row.id,owner,row.version,'ready'),owner,row.id,'admin',[finish(row.id,['generate']),receive(row.id,'archive',row.member_name,time)],time);
  if(!result.meta?.changes){const latest=await getRecord(env,owner,row.id);if(latest?.contract_data){await env.BUCKET.delete(key);return json({item:dto(latest)})}throw new Problem(409,'Pengajuan berubah saat akad dibuat. Muat ulang pemeriksaan.')}
 }catch(error){const latest=await getRecord(env,owner,row.id);if(latest?.contract_key===key)return json({item:dto(latest)});await env.BUCKET.delete(key);if(String(error).includes('UNIQUE'))throw new Problem(409,'Nomor akad belum dapat ditetapkan. Muat ulang dan coba lagi.');throw error}
 return json({item:dto(await getRecord(env,owner,row.id))});
}
async function uploadSigned(request,env,owner,row){
 await requireStaffRole(env,owner,'admin');
 if(row.kind!=='capital'||!row.contract_data||!['generated','signed'].includes(row.status))throw new Problem(409,'Buat PDF akad berdasarkan template sebelum mengunggah akad lengkap.');
 const data=await readMultipart(request,MAX_PROOF+128*1024),file=await proofCheck(data.get('signed'));
 if(file.type!=='application/pdf')throw new Problem(400,'Akad lengkap harus berupa PDF.');
 if(data.get('confirm')!=='true')throw new Problem(400,'Konfirmasi kedua tanda tangan dan kecocokan dokumen.');
 const digest=await hash(file.bytes);
 if(row.status==='signed'){if(digest===row.signed_sha256)return json({item:dto(row)});throw new Problem(409,'Akad lengkap sudah tersimpan. Dokumen tidak ditimpa.');}
 if(Number(data.get('version'))!==row.version)throw new Problem(409,'Data berubah. Muat ulang sebelum mengunggah.');
 if(digest===JSON.parse(row.contract_data).sha256)throw new Problem(400,'Ini PDF awal yang belum berubah. Unggah PDF setelah ditandatangani koperasi.');
 try{const doc=await PDFDocument.load(file.bytes,{updateMetadata:false});if(!doc.getPageCount()||doc.getPageCount()>100)throw Error()}catch{throw new Problem(400,'PDF tidak dapat dibaca atau dilindungi kata sandi. Unggah PDF yang dapat dibuka.');}
 const key='signed/'+crypto.randomUUID()+'.pdf',time=now();await env.BUCKET.put(key,file.bytes,{httpMetadata:{contentType:'application/pdf'}});
 try{const result=await trackedRun(env,stmt(env,'UPDATE workflow_requests SET status = ?, signed_key = ?, signed_name = ?, signed_sha256 = ?, signed_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?','signed',key,file.name,digest,time,time,row.id,owner,row.version,'generated'),owner,row.id,'admin',[finish(row.id,['archive'])],time);if(!result.meta?.changes)throw new Problem(409,'Akad sudah berubah. Muat ulang daftar.')}
 catch(error){const latest=await getRecord(env,owner,row.id);if(latest?.signed_key===key)return json({item:dto(latest)});await env.BUCKET.delete(key);if(latest?.signed_sha256===digest)return json({item:dto(latest)});throw error}
 return json({item:dto(await getRecord(env,owner,row.id))});
}
async function readMultipart(request,limit){const bytes=await limitedBody(request,limit);try{return await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData()}catch{throw new Problem(400,'Formulir tidak dapat dibaca.')}}
async function serveFile(env,key,type,name,download){
 if(!key)throw new Problem(404,'Berkas belum tersedia.');const object=await env.BUCKET.get(key);if(!object)throw new Problem(404,'Berkas tidak ditemukan.');
 const filename=name.replace(/[^A-Za-z0-9._-]/g,'-');
 return new Response(object.body,{headers:{'Content-Type':type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':(download?'attachment':'inline')+'; filename="'+filename+'"','Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:"}});
}
async function fileResponse(env,row,part,download){
 if(part==='signature'){const m=row.member_snapshot?JSON.parse(row.member_snapshot):null;return serveFile(env,m?.signatureKey,'image/png','tanda-tangan.png',false)}
 const type=part==='proof'?row.proof_type:'application/pdf',key=part==='proof'?row.proof_key:part==='signed'?row.signed_key:row.contract_key;
 const name=part==='proof'?'bukti-transfer.'+(type==='application/pdf'?'pdf':type==='image/png'?'png':'jpg'):row.contract_number+(part==='signed'?'-lengkap':'-ttd-anggota')+'.pdf';
 return serveFile(env,key,type,name,download);
}
async function saveProfile(request,env,owner){
 const form=await readMultipart(request,MAX_PROOF+MAX_KTP+700*1024);let raw;try{raw=JSON.parse(form.get('data'))}catch{throw new Problem(400,'Data pendaftaran tidak dapat dibaca.');}
 const data=await validateProfile(raw),signature=await signatureCheck(form.get('signature')),proof=await proofCheck(form.get('proof')),ktp=await ktpCheck(form.get('ktp'));
 const old=await getProfile(env,owner),id=requestId(form.get('id'));
 if(old&&!correctionAllowed(old)){if(old.id===id)return json({profile:profileDTO(old)});throw new Problem(409,'Pendaftaran Anda sudah tersimpan. Buka Profil Anggota untuk melihat status.');}
 if(old&&(old.id!==id||Number(form.get('version'))!==old.version))throw new Problem(409,'Data pendaftaran berubah. Muat ulang sebelum memperbaiki.');
 const credit=old?await stmt(env,"SELECT * FROM savings_credits WHERE owner=? AND source_kind='registration' AND source_id=?",owner,old.id).first():null;
 if(credit){const before=JSON.parse(old.data);if(['basic','monthly','paymentOption','transactionSaving','special','specialAmount','specialPayment','installments','admin'].some(k=>String(before[k]??'')!==String(data[k]??'')))throw new Problem(409,'Setoran awal sudah direkonsiliasi. Nominalnya tidak dapat diubah; gunakan setoran lanjutan untuk menambah simpanan wajib.');}
 const priorProof=old?.finance?.status==='approved'?await env.BUCKET.get(old.proof_key):null;
 const sameProof=priorProof&&await hash(new Uint8Array(await new Response(priorProof.body).arrayBuffer()))===await hash(proof.bytes);
 const sigKey='signatures/'+crypto.randomUUID()+'.png',proofKey=sameProof?old.proof_key:'registration/'+crypto.randomUUID(),ktpKey='identity/'+crypto.randomUUID(),time=now(),digest=await hash(signature);
 await env.BUCKET.put(sigKey,signature,{httpMetadata:{contentType:'image/png'}});
 try{if(!sameProof)await env.BUCKET.put(proofKey,proof.bytes,{httpMetadata:{contentType:proof.type}});
  await env.BUCKET.put(ktpKey,ktp.bytes,{httpMetadata:{contentType:ktp.type}});
  const result=await trackedRun(env,old?stmt(env,'UPDATE member_profiles SET data = ?, signature_key = ?, signature_sha256 = ?, proof_key = ?, proof_name = ?, proof_type = ?, ktp_key = ?, ktp_name = ?, ktp_type = ?, ktp_checked_at = NULL, ktp_checked_by = NULL, status = ?, note = ?, consent_at = ?, updated_at = ?, version = version + 1 WHERE owner = ? AND id = ? AND version = ? AND status = ?'+(old.finance?.status==='correction'?" AND EXISTS (SELECT 1 FROM finance_reconciliations WHERE owner=member_profiles.owner AND target_id=member_profiles.id AND status='correction' AND version="+Number(old.finance.version)+")":''),JSON.stringify(data),sigKey,digest,proofKey,proof.name,proof.type,ktpKey,ktp.name,ktp.type,'pending','',time,time,owner,id,old.version,old.status):stmt(env,'INSERT INTO member_profiles (owner,id,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,ktp_key,ktp_name,ktp_type,status,note,consent_at,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',owner,id,JSON.stringify(data),sigKey,digest,proofKey,proof.name,proof.type,ktpKey,ktp.name,ktp.type,'pending','',time,time,time,1),owner,id,null,submission(id,'registration',data.name,time).filter(op=>!(sameProof&&op.type==='receive'&&op.task.stage==='reconciliation')),time);
  if(!result.meta?.changes)throw new Problem(409,'Pendaftaran berubah. Muat ulang formulir.');
 }catch(error){const latest=await getProfile(env,owner);if(latest?.signature_key===sigKey)return json({profile:profileDTO(latest)});await env.BUCKET.delete(sigKey);if(!sameProof)await env.BUCKET.delete(proofKey);await env.BUCKET.delete(ktpKey);if(latest&&latest.version!==old?.version)throw new Problem(409,'Pendaftaran berubah saat disimpan. Muat ulang dan periksa data terbaru.');throw error;}
 // Keep historical signature assets immutable: a submitted contract may reference them.
 return json({profile:profileDTO(await getProfile(env,owner))},201);
}
async function completeKtp(request,env,owner){
 const p=await getProfile(env,owner);if(!p)throw new Problem(404,'Pendaftaran belum tersedia.');
 if(p.ktp_key)throw new Problem(409,'Foto KTP sudah tersimpan. Penggantian dilakukan melalui perbaikan pendaftaran dari Admin.');
 if(!['pending','approved'].includes(p.status))throw new Problem(409,'Lengkapi seluruh perbaikan melalui formulir pendaftaran.');
 const form=await readMultipart(request,MAX_KTP+128*1024);
 if(Number(form.get('version'))!==p.version)throw new Problem(409,'Data pendaftaran berubah. Muat ulang profil.');
 const ktp=await ktpCheck(form.get('ktp')),key='identity/'+crypto.randomUUID(),time=now();
 await env.BUCKET.put(key,ktp.bytes,{httpMetadata:{contentType:ktp.type}});
 try{
  const result=await trackedRun(env,stmt(env,"UPDATE member_profiles SET ktp_key=?,ktp_name=?,ktp_type=?,ktp_checked_at=NULL,ktp_checked_by=NULL,status='pending',updated_at=?,version=version+1 WHERE owner=? AND version=? AND ktp_key IS NULL",key,ktp.name,ktp.type,time,owner,p.version),owner,p.id,null,[{type:'close',targetId:p.id,stages:['registration'],outcome:'superseded'},receive(p.id,'registration',JSON.parse(p.data).name,time)],time);
  if(!result.meta?.changes)throw new Problem(409,'Data berubah. Muat ulang profil sebelum melanjutkan.');
 }catch(error){const latest=await getProfile(env,owner);if(latest?.ktp_key===key)return json({profile:profileDTO(latest)});await env.BUCKET.delete(key);throw error;}
 return json({profile:profileDTO(await getProfile(env,owner))});
}
async function reviewProfile(request,env,owner){
 await requireStaffRole(env,owner,'admin');
 const p=await getProfile(env,owner);if(!p)throw new Problem(404,'Pendaftaran belum tersedia.');const body=await readJson(request);
 if(p.status!=='pending'||Number(body.version)!==p.version)throw new Problem(409,'Pendaftaran sudah diperiksa atau berubah. Muat ulang daftar.');
 const correction=body.action==='return';if(!correction&&body.action!=='approve')throw new Problem(400,'Tindakan tidak sesuai.');
 const note=correction?shortText(body.note,5,1500,'Catatan petugas'):'';
 if(!correction)await requireReconciled(env,owner,'registration',p);
 if(!correction&&!p.ktp_key)throw new Problem(409,'Foto KTP belum tersedia. Minta anggota melengkapinya sebelum menyetujui pendaftaran.');
 if(!correction&&!['identity','signature','ktp'].every(k=>body.checks?.[k]===true))throw new Problem(400,'Periksa kecocokan foto KTP, data identitas, setoran, dan tanda tangan.');
 const checkedAt=now();
 const result=await trackedRun(env,stmt(env,'UPDATE member_profiles SET status = ?, note = ?, ktp_checked_at = ?, ktp_checked_by = ?, updated_at = ?, version = version + 1 WHERE owner = ? AND version = ? AND status = ?',correction?'correction':'approved',note,correction?null:checkedAt,correction?null:actorId(env,owner),checkedAt,owner,p.version,'pending'),owner,p.id,'admin',[finish(p.id,['registration'],correction?'correction':'approved'),...(correction?[{type:'close',targetId:p.id,stages:['reconciliation'],outcome:'withdrawn'}]:[])]);if(!result.meta?.changes)throw new Problem(409,'Pendaftaran sudah berubah.');
 return json({profile:profileDTO(await getProfile(env,owner))});
}
async function appFetch(request,env){
 if(!env.DB||!env.BUCKET)throw new Problem(503,'Penyimpanan pengajuan belum tersedia. Coba lagi sebentar.');
 await resetPreviousDemo(env);
 const url=new URL(request.url),scopedPath=url.pathname.match(/^\/api\/workflow\/member\/([a-z0-9-]+)\/(.+)$/i),pathname=scopedPath?'/api/workflow/'+scopedPath[2]:url.pathname;
 if(!pathname.startsWith('/api/workflow')){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const asset=(typeof STATIC_ASSETS==='undefined'?{}:STATIC_ASSETS)[pathname==='/'?'/index.html':pathname];
  if(!asset)return new Response('Halaman tidak ditemukan',{status:404});
  const body=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
  return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':asset.type,'Cache-Control':pathname==='/petugas.html'?'private, no-store':'no-cache','X-Content-Type-Options':'nosniff',...(pathname==='/petugas.html'?{'X-Robots-Tag':'noindex, nofollow, noarchive','Referrer-Policy':'no-referrer'}:{})}});
 }
 const signedIn=request.headers.get('oai-authenticated-user-id');
 let owner=signedIn;
 if(!owner)return json({error:'Masuk dengan ChatGPT untuk menyimpan dan mencoba alur pengajuan demo.',signInRequired:true},401);
 if(!env.DB||!env.BUCKET)throw new Problem(503,'Penyimpanan pengajuan belum tersedia. Coba lagi sebentar.');
 if(request.method!=='GET'&&request.headers.get('origin')!==url.origin)throw new Problem(403,'Permintaan harus berasal dari website KSPPS.');
 env={...env,ACTOR_ID:signedIn};
 const person=identity(request),context=await staffContext(env,signedIn);
 env.ACTOR_ROLE=context.accountRole;env.ACTOR_NAME=person.name;
 if(pathname==='/api/workflow/staff/access'&&request.method==='GET')return json(await accessState(env,signedIn,person));
 if(pathname==='/api/workflow/staff/activate'&&request.method==='POST')return json({staff:await activateManager(env,signedIn,await readJson(request),person)});
 if(pathname==='/api/workflow/staff/access-request'&&request.method==='POST')return json({request:await requestStaffAccess(env,signedIn,person)});
 if(pathname==='/api/workflow/staff/accounts'&&request.method==='GET')return json({accounts:await accessDirectory(env,signedIn)});
 if(pathname==='/api/workflow/staff/accounts'&&request.method==='POST')return json(await assignAccess(env,signedIn,await readJson(request)));
 if(pathname==='/api/workflow/reports'&&request.method==='GET')return json({reports:await reportList(env,signedIn)});
 if(pathname==='/api/workflow/reports'&&request.method==='POST')return json({report:await uploadReport(request,env,signedIn)},201);
 const reportMatch=pathname.match(/^\/api\/workflow\/reports\/([0-9a-f-]{36})\/file$/i);
 if(reportMatch&&request.method==='GET')return reportFile(env,signedIn,reportMatch[1],url.searchParams.has('download'));
 const staffView=request.headers.get('x-kspps-portal')==='staff';
 if(staffView)await requireStaff(env,signedIn);
 owner=await selectedOwner(request,env,signedIn);
 if(owner!==signedIn&&context.accountRole==='finance'&&(/\/(ktp|signature|contract|signed)$/.test(pathname)))throw new Problem(403,'Dokumen identitas dan akad diperiksa melalui portal Admin.');
 await bootstrapActivity(env,owner);
 if(pathname==='/api/workflow/staff/activity'&&request.method==='GET')return json(await managerActivity(env,owner,url.searchParams));
 if(pathname==='/api/workflow/staff/tasks'&&request.method==='GET'){const {role}=await staffContext(env,owner);if(!['admin','finance'].includes(role))throw new Problem(403,'Antrean ini khusus Admin dan Finance.');await syncDuePayoutTasks(env,owner);const {tasks}=await activityState(env,owner);return json({tasks:tasks.filter(t=>t.role===role).map(t=>({id:t.id,targetId:t.targetId,stage:t.stage,label:t.label,role:t.role,status:t.status,started:!!t.startedAt,completed:!!t.completedAt,closed:!!t.closedAt}))});}
 if(pathname==='/api/workflow/offers'&&request.method==='GET')return json({offers:await offers(env,await cooperativeOwner(env,signedIn))});
 if(pathname==='/api/workflow/offers'&&request.method==='POST')return json({offer:await createOffer(env,await cooperativeOwner(env,signedIn),await readJson(request))},201);
 if(pathname==='/api/workflow/staff/activity/start'&&request.method==='POST')return json(await startTask(env,owner,await readJson(request)));
 if(pathname==='/api/workflow'&&request.method==='GET'){
  const profile=await getProfile(env,owner);
  if((staffView||owner!==signedIn)&&context.accountRole==='finance')return json({items:[],profile:null,offers:[],staff:context,members:await memberDirectory(env,signedIn),selectedMember:profile?.id||'',demo:true});
  const result=await stmt(env,'SELECT * FROM workflow_requests WHERE owner = ? ORDER BY created_at DESC LIMIT 200',owner).all();
  const records=(await stmt(env,'SELECT * FROM finance_reconciliations WHERE owner = ?',owner).all()).results;
  return json({offers:await offers(env,await cooperativeOwner(env,signedIn)),items:result.results.map(row=>dto({...row,member_number:profile?.member_number,finance:['capital','savings'].includes(row.kind)?reconciliationDTO(records.find(x=>x.target_kind===row.kind&&x.target_id===row.id),row.proof_key,row.amount):null})),profile:profileDTO(profile),staff:context,members:staffView?await memberDirectory(env,signedIn):[],selectedMember:staffView?profile?.id||'':'',demo:true});
 }
 if(pathname==='/api/workflow/staff/role'&&request.method==='POST'){const body=await readJson(request);return json({staff:await changeStaffRole(env,owner,body.role)});}
 if(pathname==='/api/workflow/finance/reconciliations'&&request.method==='GET'){await requireStaffRole(env,owner,'finance');return json({items:await reconciliationQueue(env,owner)});}
 if(pathname==='/api/workflow/finance/reconcile'&&request.method==='POST')return json({reconciliation:await reconcile(env,owner,await readJson(request))});
 if(pathname==='/api/workflow/finance/payouts'&&request.method==='GET')return json(await payouts(env,owner,url.searchParams.get('date')));
 if(pathname==='/api/workflow/finance/payouts/complete'&&request.method==='POST'){
  const body=await readJson(request),schedule=await payouts(env,owner,body.date);
  if(schedule.missingAccountCount)throw new Problem(409,'Lengkapi rekening anggota sebelum menyelesaikan persiapan.');
  return json({task:await finishPayoutTask(env,owner,schedule.task,body)});
 }
 if(pathname==='/api/workflow/profile'&&request.method==='POST')return saveProfile(request,env,owner);
 if(pathname==='/api/workflow/profile/ktp'&&request.method==='POST')return completeKtp(request,env,owner);
 if(pathname==='/api/workflow/profile/ktp'&&request.method==='GET'){const p=await getProfile(env,owner);if(!p?.ktp_key)throw new Problem(404,'Foto KTP belum tersedia.');return serveFile(env,p.ktp_key,p.ktp_type,p.ktp_name||'foto-ktp',url.searchParams.has('download'));}
 if(pathname==='/api/workflow/profile/review'&&request.method==='POST')return reviewProfile(request,env,owner);
 if(['/api/workflow/profile/signature','/api/workflow/profile/proof'].includes(pathname)&&request.method==='GET'){const p=await getProfile(env,owner);if(!p)throw new Problem(404,'Pendaftaran belum tersedia.');const sig=pathname.endsWith('/signature');return serveFile(env,sig?p.signature_key:p.proof_key,sig?'image/png':p.proof_type,sig?'tanda-tangan.png':p.proof_name,url.searchParams.has('download'));}
 if(pathname==='/api/workflow/savings'&&request.method==='POST')return createSavings(request,env,owner);
 if(pathname==='/api/workflow/eligibility'&&request.method==='GET')return json({savings:await requireActiveSavings(env,owner,await getProfile(env,owner))});
 if(pathname==='/api/workflow/capital'&&request.method==='POST')return createCapital(request,env,owner);
 if(pathname==='/api/workflow/withdrawal'&&request.method==='POST')return createWithdrawal(request,env,owner);
 const match=pathname.match(/^\/api\/workflow\/([0-9a-f-]{36})\/(proof|contract|signed|signature|review|generate|revise|cancel|upload-signed)$/i);
 if(!match)throw new Problem(404,'Layanan tidak ditemukan.');
 const row=await getRecord(env,owner,match[1]);if(!row)throw new Problem(404,'Pengajuan tidak ditemukan.');
 const action=match[2];
 if(request.method==='GET'&&['proof','contract','signed','signature'].includes(action))return fileResponse(env,row,action,url.searchParams.has('download'));
 if(request.method!=='POST')throw new Problem(405,'Metode tidak diizinkan.');
 if(action==='review')return reviewRequest(request,env,owner,row);
 if(action==='generate')return generateContract(request,env,owner,row);
 if(action==='upload-signed')return uploadSigned(request,env,owner,row);
 if(action==='revise')return reviseRequest(request,env,owner,row);
 if(action==='cancel'){
  if(row.kind!=='withdrawal'||!['pending','correction'].includes(row.status))throw new Problem(409,'Permohonan yang sedang ditinjau atau selesai tidak dapat dibatalkan.');
  return updateStatus(env,owner,row,'cancelled',row.note);
 }
 throw new Problem(404,'Layanan tidak ditemukan.');
}
export {appFetch,proofCheck,buildContractPdf};
export default {async fetch(request,env){try{return await appFetch(request,env)}catch(error){if(error instanceof Problem)return json({error:error.message},error.status);console.error('KSPPS workflow error',error?.name,String(error?.message||error));return json({error:'Pengajuan belum dapat diproses. Data pada formulir tetap tersedia; silakan coba lagi.'},503)}}};
