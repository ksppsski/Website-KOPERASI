import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import UPNGModule from '@pdf-lib/upng';
import layout from '../templates/contract-layout.json' with { type: 'json' };
import {Problem} from './membership.js';
const UPNG=UPNGModule.default||UPNGModule;
import fontkitModule from '@pdf-lib/fontkit';

export const TEMPLATE_VERSION = layout.version;
export function terbilang(n) {
  const words=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  if(n<12)return words[n];
  if(n<20)return terbilang(n-10)+' belas';
  if(n<100)return terbilang(Math.floor(n/10))+' puluh '+terbilang(n%10);
  if(n<200)return 'seratus '+terbilang(n-100);
  if(n<1000)return terbilang(Math.floor(n/100))+' ratus '+terbilang(n%100);
  if(n<2000)return 'seribu '+terbilang(n-1000);
  for(const [unit,name] of [[1e12,'triliun'],[1e9,'miliar'],[1e6,'juta'],[1e3,'ribu']])if(n>=unit)return (terbilang(Math.floor(n/unit))+' '+name+' '+terbilang(n%unit)).replace(/\s+/g,' ').trim();
  return '';
}
export function contractValues(row,details) {
  const member=JSON.parse(row.member_snapshot).data;
  const date=x=>new Date(x+'T12:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  return {nospk:details.serial,kodesurat:details.code,tanggalakad:date(details.agreementDate),nama:member.name,alamat:member.identityAddress,kelurahan:member.village,kecamatan:member.district,'kota/kab':member.city,provinsi:member.province,nilaiinvestasi:'Rp'+Number(row.amount).toLocaleString('id-ID'),terbilang:terbilang(row.amount).replace(/\s+/g,' ').trim(),tanggalnisbah:date(details.effectiveDate),tanggalselesai:date(details.endDate),namabank:member.bankName,norekening:member.bankAccount,notelepon:member.phone,email:member.email};
}

// Crop empty margins before fitting the handwritten signature into the original
// member signature area. Never stretch its aspect ratio or overlap the name.
export function cropSignature(bytes){
 const decoded=UPNG.decode(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 const pixels=new Uint8Array(UPNG.toRGBA8(decoded)[0]);
 let left=decoded.width,top=decoded.height,right=-1,bottom=-1;
 for(let y=0;y<decoded.height;y++)for(let x=0;x<decoded.width;x++){
  const i=(y*decoded.width+x)*4;
  if(pixels[i+3]>32&&Math.min(pixels[i],pixels[i+1],pixels[i+2])<220){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 }
 if(right<left)throw new Problem(400,'Tanda tangan anggota kosong.');
 left=Math.max(0,left-4);top=Math.max(0,top-4);right=Math.min(decoded.width-1,right+4);bottom=Math.min(decoded.height-1,bottom+4);
 const width=right-left+1,height=bottom-top+1,crop=new Uint8Array(width*height*4);
 for(let y=0;y<height;y++)crop.set(pixels.subarray(((top+y)*decoded.width+left)*4,((top+y)*decoded.width+left+width)*4),y*width*4);
 return new Uint8Array(UPNG.encode([crop.buffer],width,height,0));
}
const labels={nama:'Nama lengkap',alamat:'Alamat identitas',kelurahan:'Kelurahan',kecamatan:'Kecamatan','kota/kab':'Kota/kabupaten',provinsi:'Provinsi',namabank:'Nama bank',norekening:'Nomor rekening',notelepon:'Telepon',email:'Email','member-sign-name':'Nama lengkap'};
function wrap(text,font,size,width){
 const lines=[];let line='';
 for(const word of text.replace(/\s+/g,' ').trim().split(' ')){
  if(font.widthOfTextAtSize(word,size)>width)return null;
  const next=line?line+' '+word:word;
  if(line&&font.widthOfTextAtSize(next,size)>width){lines.push(line);line=word}else line=next;
 }
 if(line)lines.push(line);return lines;
}
export async function buildContractPdf(row,details,signatureBytes){
 if(typeof PDF_CONTRACT_TEMPLATE==='undefined')throw Error('Original contract template is missing from the build');
 const decode=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
 const pdf=await PDFDocument.load(decode(PDF_CONTRACT_TEMPLATE),{updateMetadata:false});
 pdf.registerFontkit(fontkitModule.default||fontkitModule);
 const regular=await pdf.embedFont(typeof PDF_FONT_REGULAR==='undefined'?StandardFonts.Helvetica:decode(PDF_FONT_REGULAR),{subset:true});
 const bold=await pdf.embedFont(typeof PDF_FONT_BOLD==='undefined'?StandardFonts.HelveticaBold:decode(PDF_FONT_BOLD),{subset:true});
 pdf.setTitle('Akad Penyertaan Modal '+details.serial+'/'+details.code);
 pdf.setAuthor('KSPPS Syirkah Kebaikan Indonesia');pdf.setLanguage('id-ID');
 pdf.setSubject('Pratinjau konsep berdasarkan template '+TEMPLATE_VERSION);
 const values=contractValues(row,details),pages=pdf.getPages();
 if(pages.length!==layout.pageCount)throw Error('Unexpected original template page count');
 for(const slot of layout.slots){
  const text=slot.text.replace(/<<([^>]+)>>/g,(_,key)=>{if(values[key]===undefined)throw Error('Unknown contract field '+key);return values[key]});
  const page=pages[slot.page],font=slot.bold?bold:regular,[x0,y0,x1,y1]=slot.box;
  const width=x1-x0,height=y1-y0;let fitted;
  for(let size=slot.size;size>=4.5;size=Math.round((size-.1)*10)/10){
   const lines=wrap(text,font,size,width),leading=size*1.257;
   if(lines&&lines.length*leading<=height+.05){fitted={lines,size,leading};break}
  }
  if(!fitted)throw new Problem(400,(labels[slot.key]||'Isian akad')+' terlalu panjang untuk ruang pada template. Periksa data pendaftaran sebelum membuat akad.');
  const {lines,size,leading}=fitted;
  // Preserve every surrounding paragraph, header, footer and signature label.
  lines.forEach((line,index)=>page.drawText(line,{x:slot.center?x0+(width-font.widthOfTextAtSize(line,size))/2:x0,y:page.getHeight()-y0-size-index*leading,font,size,color:rgb(0,0,0)}));
 }
 const signature=await pdf.embedPng(cropSignature(signatureBytes));
 const [x0,y0,x1,y1]=layout.signature.box,dims=signature.scaleToFit(x1-x0,y1-y0),page=pages[layout.signature.page];
 page.drawImage(signature,{x:x0+(x1-x0-dims.width)/2,y:page.getHeight()-y1+(y1-y0-dims.height)/2,...dims});
 return pdf.save();
}
