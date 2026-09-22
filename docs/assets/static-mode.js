/* GitHub Pages visual preview. All values are empty, in memory, and never saved.
 * This is NOT an authentication provider. Use source-lengkap for backend work.
 */
(() => {
'use strict';
let previewRole='manager', timer;
const message='Layanan belum aktif. Versi ini hanya menampilkan rancangan website; tidak ada data yang dikirim.';
const isStaff=location.pathname.endsWith('petugas.html');
function staff(){return isStaff?{role:previewRole,accountRole:'manager',allowedRoles:['manager','admin','finance'],name:'Pratinjau',concept:true}:{role:null,accountRole:null,allowedRoles:[]};}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function notice(){const el=document.querySelector('#toast');if(!el)return;clearTimeout(timer);el.textContent=message;el.hidden=false;timer=setTimeout(()=>el.hidden=true,5500);}
async function api(path='',options={}){
 const url=new URL(path||'/', 'https://preview.invalid');
 const method=String(options.method||'GET').toUpperCase();
 // Workspace changes only select a drawing of the interface; no account exists.
 if(url.pathname==='/staff/role'&&method==='POST'){
  const role=JSON.parse(options.body||'{}').role;
  if(!isStaff||!['manager','admin','finance'].includes(role))throw new Error(message);
  previewRole=role;return {staff:staff()};
 }
 if(method!=='GET')throw new Error(message);
 switch(url.pathname){
  case '/': return {profile:null,items:[],offers:[],staff:staff(),members:[],selectedMember:''};
  case '/offers': return {offers:[]};
  case '/reports': return {reports:[]};
  case '/staff/tasks': return {tasks:[]};
  case '/staff/activity': {
   const to=url.searchParams.get('to')||today();const start=new Date(to+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-7);
   return {tasks:[],range:{from:url.searchParams.get('from')||start.toISOString().slice(0,10),to}};
  }
  case '/staff/accounts': return {accounts:[]};
  case '/finance/reconciliations': return {items:[]};
  case '/finance/payouts': return {date:url.searchParams.get('date')||today(),total:0,memberCount:0,transferCount:0,contractCount:0,members:[],missingAccountCount:0,referenceDates:[],task:null};
  default: throw new Error(message);
 }
}
function protectForms(){
 document.querySelectorAll('form').forEach(form=>{
  form.querySelectorAll('input,textarea,select').forEach(el=>{el.disabled=true;el.title='Pratinjau — pengisian data belum aktif';});
  form.querySelectorAll('button').forEach(el=>{
   const stepPreview=form.id==='registration-form'&&el.type==='submit'&&el.textContent.includes('Lihat langkah');
   const back=el.dataset.action==='registration-back';
   const close=el.dataset.wfAction==='close'||el.dataset.action==='close-dialog';
   if(!stepPreview&&!back&&!close){el.disabled=true;el.title='Layanan belum aktif';}
  });
 });
 document.querySelectorAll('canvas').forEach(el=>{el.style.pointerEvents='none';el.setAttribute('aria-disabled','true');el.title='Tanda tangan belum diaktifkan';});
 document.querySelectorAll('a[href*="signin-with-chatgpt"],a[href*="signout-with-chatgpt"]').forEach(el=>{el.removeAttribute('href');el.setAttribute('aria-disabled','true');el.textContent='Layanan akun belum aktif';});
}
// Registered before the application: neither server-backed nor legacy local forms submit.
document.addEventListener('submit',event=>{
 if(event.target.id==='registration-form')return; // Step navigation only; patched portal.js never sends data.
 event.preventDefault();event.stopImmediatePropagation();notice();
},true);
window.KsppsStatic=Object.freeze({api,notice});
new MutationObserver(protectForms).observe(document.querySelector('#app'),{childList:true,subtree:true});
new MutationObserver(protectForms).observe(document.querySelector('#portal-dialog'),{childList:true,subtree:true});
protectForms();
})();
