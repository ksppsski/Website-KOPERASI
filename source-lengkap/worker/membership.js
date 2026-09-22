import UPNGModule from '@pdf-lib/upng';
const UPNG = UPNGModule.default || UPNGModule;
import { StandardFonts, PDFDocument } from 'pdf-lib';
import layout from '../templates/contract-layout.json' with {type:'json'};
export class Problem extends Error {constructor(status,message){super(message);this.status=status}}
export const stmt=(env,sql,...args)=>env.DB.prepare(sql).bind(...args);
// Allocate once, in original registration order. Batch is transactional in D1;
// the unique profile mapping also makes concurrent reads/retries idempotent.
export async function assignMemberNumbers(env){
 await env.DB.batch([
  stmt(env,`INSERT INTO member_numbers (profile_id)
   SELECT p.id FROM member_profiles p
   WHERE p.member_number IS NULL AND NOT EXISTS (SELECT 1 FROM member_numbers n WHERE n.profile_id = p.id)
   ORDER BY p.created_at, p.id`),
  stmt(env,`UPDATE member_profiles SET member_number = printf('SKI-%s-%04d',
   strftime('%Y', created_at, '+8 hours'),
   (SELECT serial FROM member_numbers WHERE profile_id = member_profiles.id))
   WHERE member_number IS NULL AND EXISTS (SELECT 1 FROM member_numbers WHERE profile_id = member_profiles.id)`),
 ]);
}
export async function getProfile(env,owner){
 let p=await stmt(env,'SELECT * FROM member_profiles WHERE owner = ?',owner).first();
 if(p&&!p.member_number){await assignMemberNumbers(env);p=await stmt(env,'SELECT * FROM member_profiles WHERE owner = ?',owner).first()}
 return p;
}
export const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
export function profileDTO(p){if(!p)return null;return {savings:p.savings||null,ktpUrl:p.ktp_key?'/api/workflow/profile/ktp':null,ktpName:p.ktp_name||null,ktpCheckedAt:p.ktp_checked_at||null,finance:p.finance||null,id:p.id,memberNumber:p.member_number,data:JSON.parse(p.data),status:p.status,note:p.note,version:p.version,signatureUrl:'/api/workflow/profile/signature',proofUrl:'/api/workflow/profile/proof',proofName:p.proof_name,createdAt:p.created_at,consentAt:p.consent_at}}
export function snapshot(p){return JSON.stringify({id:p.id,memberNumber:p.member_number,data:JSON.parse(p.data),version:p.version,signatureKey:p.signature_key,signatureSha256:p.signature_sha256,consentAt:p.consent_at})}
export async function signatureCheck(file){
 if(!file||!file.size||file.size>500000||file.type!=='image/png')throw new Problem(400,'Bubuhkan tanda tangan pada formulir pendaftaran.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(bytes.length<32||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))throw new Problem(400,'Tanda tangan tidak dapat dibaca.');
 const dv=new DataView(bytes.buffer);if(dv.getUint32(16)!==1000||dv.getUint32(20)!==340)throw new Problem(400,'Ukuran tanda tangan tidak sesuai. Gambar ulang pada formulir.');
 try{const png=UPNG.decode(bytes.buffer);const frames=UPNG.toRGBA8(png);if(frames.length!==1)throw Error();const rgba=new Uint8Array(frames[0]);let ink=0;for(let i=0;i<rgba.length;i+=4)if(rgba[i+3]>40&&Math.min(rgba[i],rgba[i+1],rgba[i+2])<220)ink++;if(ink<50)throw Error()}catch{throw new Problem(400,'Area tanda tangan masih kosong atau berkas tidak valid.');}
 return bytes;
}
export async function validateProfile(raw){
 if(!raw||typeof raw!=='object')throw new Problem(400,'Data pendaftaran tidak valid.');
 const required={name:[2,120,'Nama lengkap'],identityType:[3,10,'Jenis identitas'],identityNumber:[5,25,'Nomor identitas'],identityAddress:[5,240,'Alamat identitas'],address:[5,240,'Alamat domisili'],village:[2,80,'Kelurahan'],district:[2,80,'Kecamatan'],city:[2,80,'Kota/kabupaten'],province:[2,80,'Provinsi'],bankName:[2,80,'Nama bank'],bankAccount:[5,40,'Nomor rekening'],phone:[9,25,'Nomor telepon'],email:[5,120,'Email'],birthplace:[2,100,'Tempat lahir'],birthdate:[10,10,'Tanggal lahir'],gender:[2,20,'Jenis kelamin'],job:[2,80,'Pekerjaan'],education:[2,80,'Pendidikan'],marital:[2,30,'Status pernikahan'],mother:[2,120,'Nama ibu'],heir:[2,120,'Nama ahli waris'],heirPhone:[9,25,'Telepon ahli waris']};
 const data={};const font=await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
 for(const [key,[min,max,label]] of Object.entries(required)){
  const value=String(raw[key]||'').trim();if(value.length<min||value.length>max||/[\u0000-\u001f<>]/.test(value))throw new Problem(400,label+' belum diisi dengan benar.');
  try{font.encodeText(value)}catch{throw new Problem(400,label+' mengandung karakter yang tidak didukung PDF. Gunakan huruf sesuai identitas tanpa simbol tambahan.');}data[key]=value;
 }
 if(!['KTP','SIM','Paspor'].includes(data.identityType)||(data.identityType==='KTP'&&!/^\d{16}$/.test(data.identityNumber)))throw new Problem(400,'Nomor identitas tidak sesuai.');
 if(!/^[\w.+-]+@[^\s@]+\.[^\s@]+$/.test(data.email)||!/^\d[\d -]{3,38}\d$/.test(data.bankAccount))throw new Problem(400,'Periksa email dan nomor rekening anggota.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.birthdate)||!Number.isFinite(Date.parse(data.birthdate))||data.birthdate>new Date().toISOString().slice(0,10))throw new Problem(400,'Tanggal lahir tidak valid.');
 for(const key of ['office','religion','officer','paymentOption','special','specialPayment'])data[key]=String(raw[key]||'').trim().slice(0,100);
 for(const key of ['basic','monthly','transactionSaving','specialAmount','installments','admin']){const n=Number(raw[key]||0);if(!Number.isSafeInteger(n)||n<0||n>1e12)throw new Problem(400,'Nominal simpanan tidak valid.');data[key]=n;}
 if(data.basic!==100000||data.monthly!==10000)throw new Problem(400,'Simpanan pokok Rp100.000 sekali saat mendaftar dan simpanan wajib Rp10.000 per bulan.');
 if(!data.paymentOption)data.paymentOption='Bulanan';
 if(!['Bulanan','Tahunan'].includes(data.paymentOption))throw new Problem(400,'Pilih setoran wajib Bulanan atau Tahunan.');
 data.sameAddress=raw.sameAddress===true;
 if(raw.consent!==true||raw.signatureConsent!==true)throw new Problem(400,'Setujui pendaftaran dan penggunaan tanda tangan pada akad yang diajukan.');
 data.consent=true;data.signatureConsent=true;data.name=data.name.toUpperCase();
 // Reject overflow during registration, while the user can still edit the form.
 // Helvetica and Liberation Sans are metrically compatible; use a small margin.
 const keys={nama:'name',alamat:'identityAddress',kelurahan:'village',kecamatan:'district','kota/kab':'city',provinsi:'province',namabank:'bankName',norekening:'bankAccount',notelepon:'phone',email:'email'};
 for(const slot of layout.slots){const key=keys[slot.key];if(!key)continue;const width=slot.box[2]-slot.box[0];if(font.widthOfTextAtSize(data[key],4.6)>width)throw new Problem(400,required[key][2]+' terlalu panjang untuk ruang pada template akad. Periksa penulisan sebelum melanjutkan.');}
 return data;
}
