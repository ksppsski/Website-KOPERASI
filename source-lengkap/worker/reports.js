import {PDFDocument} from 'pdf-lib';
import {Problem,stmt,getProfile} from './membership.js';
import {staffContext,requireStaffRole,actorId} from './access.js';

const MAX_REPORT=10*1024*1024;
export async function reportAccess(env,id){
 if((await staffContext(env,id)).accountRole)return;
 if((await getProfile(env,id))?.status!=='approved')throw new Problem(403,'Laporan tersedia setelah keanggotaan disetujui.');
}
const dto=r=>({id:r.id,category:r.category,title:r.title,period:r.period,projectCode:r.project_code,fileName:r.file_name,fileSize:r.file_size,uploadedBy:r.uploader_name,createdAt:r.created_at,url:'/api/workflow/reports/'+r.id+'/file'});
export async function reportList(env,id){await reportAccess(env,id);return (await stmt(env,'SELECT * FROM member_reports ORDER BY period DESC,created_at DESC').all()).results.map(dto);}
export async function uploadReport(request,env,id){
 const staff=await requireStaffRole(env,id,'manager');
 if(Number(request.headers.get('content-length')||0)>MAX_REPORT+65536)throw new Problem(413,'Ukuran laporan maksimal 10 MB.');
 const reader=request.body?.getReader(),chunks=[];let size=0;
 if(!reader)throw new Problem(400,'Lampirkan laporan PDF.');
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_REPORT+65536){await reader.cancel();throw new Problem(413,'Ukuran laporan maksimal 10 MB.');}chunks.push(value);}
 let form;try{form=await new Response(new Blob(chunks),{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();}catch{throw new Problem(400,'Formulir laporan tidak dapat dibaca.');}
 const reportId=String(form.get('id')||''),category=String(form.get('category')||''),title=String(form.get('title')||'').trim(),period=String(form.get('period')||''),projectCode=String(form.get('projectCode')||'').trim().toUpperCase(),file=form.get('file');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reportId))throw new Problem(400,'Referensi laporan tidak valid.');
 if(!['utilization','financial'].includes(category)||!title||title.length>120||!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Problem(400,'Lengkapi jenis, judul, dan periode laporan.');
 if(category==='utilization'&&(!projectCode||projectCode.length>60||/[\u0000-\u001f\u007f]/.test(projectCode)))throw new Problem(400,'Isi kode project pada laporan penggunaan dana.');
 if(form.get('confirm')!=='true')throw new Problem(400,'Konfirmasi bahwa laporan boleh dibaca anggota.');
 const prior=await stmt(env,'SELECT * FROM member_reports WHERE id=?',reportId).first();if(prior)return dto(prior);
 if(!file||typeof file.arrayBuffer!=='function'||!file.size||file.size>MAX_REPORT||!file.name.toLowerCase().endsWith('.pdf')||file.type!=='application/pdf')throw new Problem(400,'Gunakan laporan PDF maksimal 10 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 try{const pdf=await PDFDocument.load(bytes);if(!pdf.getPageCount())throw Error();}catch{throw new Problem(400,'PDF tidak dapat dibaca. Gunakan PDF yang tidak terkunci kata sandi.');}
 const key='reports/'+crypto.randomUUID()+'.pdf',at=new Date().toISOString(),name=file.name.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,180);
 await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:'application/pdf'}});
 try{await stmt(env,'INSERT INTO member_reports (id,category,title,period,project_code,file_key,file_name,file_type,file_size,uploaded_by,uploader_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',reportId,category,title,period,category==='utilization'?projectCode:null,key,name,'application/pdf',bytes.length,actorId(env,id),staff.name||'Manajer',at).run();}
 catch(error){await env.BUCKET.delete(key);const existing=await stmt(env,'SELECT * FROM member_reports WHERE id=?',reportId).first();if(existing)return dto(existing);throw error;}
 return dto(await stmt(env,'SELECT * FROM member_reports WHERE id=?',reportId).first());
}
export async function reportFile(env,id,reportId,download){
 await reportAccess(env,id);const row=await stmt(env,'SELECT * FROM member_reports WHERE id=?',reportId).first();if(!row)throw new Problem(404,'Laporan tidak ditemukan.');
 const obj=await env.BUCKET.get(row.file_key);if(!obj)throw new Problem(404,'Berkas laporan belum tersedia.');
 return new Response(obj.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow, noarchive','Content-Security-Policy':"sandbox",'Content-Disposition':(download?'attachment':'inline')+"; filename*=UTF-8''"+encodeURIComponent(row.file_name)}});
}
