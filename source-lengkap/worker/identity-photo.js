import {PDFDocument} from 'pdf-lib';
import UPNGModule from '@pdf-lib/upng';
import {Problem} from './membership.js';
const UPNG=UPNGModule.default||UPNGModule;
export const MAX_KTP=10*1024*1024;

export async function ktpCheck(file){
 if(!file||typeof file.arrayBuffer!=='function'||!file.size)throw new Problem(400,'Foto KTP wajib diunggah.');
 if(file.size>MAX_KTP)throw new Problem(413,'Ukuran foto KTP maksimal 10 MB.');
 const extension=String(file.name||'').split('.').pop().toLowerCase(),types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'},type=types[extension];
 if(!Object.hasOwn(types,extension)||(file.type&&file.type!=='application/octet-stream'&&file.type!==type))throw new Problem(400,'Gunakan foto KTP berformat JPG atau PNG.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 try{
  if(type==='image/png'){
   if(bytes.length<33||![137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))throw Error();
   const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),width=view.getUint32(16),height=view.getUint32(20);
   // Bound decompression before decoding an untrusted PNG inside a Worker.
   if(!width||!height||width>12000||height>12000||width*height>8000000)throw new Problem(400,'Resolusi PNG KTP maksimal 8 megapiksel. Gunakan JPG untuk foto beresolusi lebih tinggi.');
   const image=UPNG.decode(bytes.buffer);if(!image.data?.length||image.frames?.length>1)throw Error();
  }else{
   if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error();
   const image=await (await PDFDocument.create()).embedJpg(bytes);
   if(!image.width||!image.height||image.width>16000||image.height>16000||image.width*image.height>50000000)throw new Problem(400,'Resolusi foto KTP terlalu besar. Gunakan foto maksimal 50 megapiksel.');
  }
 }catch(error){if(error instanceof Problem)throw error;throw new Problem(400,'Foto KTP tidak dapat dibaca. Unggah gambar JPG atau PNG yang valid.');}
 return {bytes,type,name:String(file.name).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,180)};
}
