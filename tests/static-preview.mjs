import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';



const source=name=>readFileSync(new URL('../docs/assets/'+name,import.meta.url),'utf8');
function events(){const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},dispatchEvent(e){for(const fn of listeners.get(e.type)||[])fn(e)},async emit(type,extra={}){if(extra.target)extra.target.dataset??={};let stopped=false;const e={type,preventDefault(){},stopImmediatePropagation(){stopped=true},...extra};for(const fn of listeners.get(type)||[]){await fn(e);if(stopped)break;}}}}
function harness(staff=false,accountRole='manager'){
 const element=()=>({...events(),innerHTML:'',textContent:'',hidden:false,focus(){}});
 const app=element(),nodes={'#app':app,'#portal-dialog':{...element(),open:false,close(){this.open=false},showModal(){this.open=true}},'#dialog-content':element(),'#toast':element(),'#staff-table':element(),'#document-list':element(),'#document-search':{value:''},'#document-filter':{value:''},'#savings-rows':element(),'#savings-search':{value:''},'#savings-filter':{value:''},'#wf-automatic-dates':element()};
 let html='',panels=[],data={profile:null,items:[]},staffRole=accountRole==='finance'?'finance':'admin';
 Object.defineProperty(app,'innerHTML',{get:()=>html,set(value){html=value;panels=[...value.matchAll(/data-workflow="([^"]+)"/g)].map(m=>({...element(),dataset:{workflow:m[1]}}))}});
 const document={...events(),activeElement:element(),querySelector:s=>nodes[s]||(s==='[data-workflow]'?panels[0]:null),querySelectorAll:s=>s==='[data-workflow]'?panels:[]};
 const window={...events(),scrollTo(){}};
 const location={pathname:staff?'/petugas.html':'/anggota.html'};let hash='#masuk';Object.defineProperty(location,'hash',{get:()=>hash,set:value=>hash=value.startsWith('#')?value:'#'+value});
 const context=vm.createContext({document,window,location,history:{replaceState(a,b,hash){location.hash=hash}},console,crypto,URL,URLSearchParams,MutationObserver:class{observe(){}},FormData:class extends FormData{constructor(){super()}},HTMLFormElement:class{},CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},fetch:async()=>{throw new Error('Static version attempted a network/API call');},setTimeout:()=>0,setInterval:()=>0,clearTimeout(){}});
 vm.runInContext(source('static-mode.js'),context);vm.runInContext(source('workflow.js'),context);vm.runInContext(source('reports.js'),context);if(staff){vm.runInContext(source('staff-access.js'),context);vm.runInContext(source('activity.js'),context);vm.runInContext(source('finance.js'),context);}vm.runInContext(source(staff?'petugas.js':'portal.js'),context);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 return {app,nodes,document,window,context,panel:key=>panels.find(p=>p.dataset.workflow===key),async click(dataset){await document.emit('click',{target:{closest:s=>s==='[data-action]'?{dataset}:null}});await window.emit('hashchange');await settle()},async route(value){location.hash='#'+value;await window.emit('hashchange');await settle()},async update(value){data=value;await window.emit('focus');await settle()}};
}

const member=harness();
await new Promise(resolve=>setImmediate(resolve));
assert.match(member.app.innerHTML,/Login belum aktif/);
await member.click({action:'enter-portal'});
for(const page of ['ringkasan','simpanan','modal','pembiayaan','dokumen','laporan','profil','bantuan','pengunduran']){
 await member.route(page);
 assert.match(member.app.innerHTML,/Penyimpanan, unggahan, dan transaksi belum aktif/);
 assert(!member.app.innerHTML.includes('NaN'),page);
 assert(!member.app.innerHTML.includes('petugas.html'),page);
 assert(!member.app.innerHTML.includes('signin-with-chatgpt'),page);
}
await member.route('daftar');assert.match(member.app.innerHTML,/Foto KTP/);
const form=new member.context.HTMLFormElement();form.id='registration-form';form.elements={specialAmount:{},installments:{}};form.querySelectorAll=()=>[];
member.nodes['#registration-form']=form;
for(const k of ['#special-fields','#installment-fields','#special-monthly','#registration-total'])member.nodes[k]={};
await member.document.emit('submit',{target:form});assert.match(member.app.innerHTML,/Total setoran awal/);
await member.document.emit('submit',{target:form});assert.match(member.app.innerHTML,/canvas id="signature"/);
await member.document.emit('submit',{target:form});assert.match(member.app.innerHTML,/Pengiriman belum aktif/);
await member.document.emit('submit',{target:form});assert(!member.app.innerHTML.includes('Pendaftaran tersimpan.'));
await member.route('daftar-selesai');assert.match(member.app.innerHTML,/Pendaftaran belum aktif/);
for(const path of ['/profile','/capital','/reports','/offers','/staff/accounts','/finance/reconcile'])await assert.rejects(member.window.KsppsStatic.api(path,{method:'POST',body:'{}'}),/Layanan belum aktif/);
const staff=harness(true);await new Promise(resolve=>setImmediate(resolve));
assert.match(staff.app.innerHTML,/Pratinjau publik tanpa data/);
for(const [role,routes] of Object.entries({admin:['ringkasan','pendaftaran','anggota','setoran','pengajuan','penyertaan','akad','pengunduran'],finance:['finance-ringkasan','finance-rekonsiliasi','finance-bagi-hasil'],manager:['manager-penawaran','manager-laporan','manager-akses','waktu-kerja']})){
 await staff.click({action:'enter',role});
 for(const route of routes){await staff.route(route);await new Promise(resolve=>setImmediate(resolve));assert(!staff.app.innerHTML.includes('NaN'),route);assert(!staff.app.innerHTML.includes('Memuat data Finance'),route);assert(!staff.app.innerHTML.includes('signin-with-chatgpt'),route);}
}
console.log('PASS: static member/staff navigation; all 4 registration steps without input; no false submission success; reports, payouts, KPI empty state; write requests rejected; no network API calls.');
// Verify protection of freshly rendered forms, with registration preview navigation intact.
const fields=[{type:'file'},{type:'password'},{type:'text'}];
const next={type:'submit',textContent:'Lihat langkah berikutnya',dataset:{}},back={type:'button',textContent:'Kembali',dataset:{action:'registration-back'}},send={type:'submit',textContent:'Kirim',dataset:{}};
const forms=[{id:'registration-form',querySelectorAll:s=>s==='button'?[next,back]:fields},{id:'report-upload',querySelectorAll:s=>s==='button'?[send]:fields}];
const canvas={style:{},setAttribute(){}};
const doc={querySelector:()=>({}),querySelectorAll:s=>s==='form'?forms:s==='canvas'?[canvas]:[],addEventListener(){}};
vm.runInNewContext(source('static-mode.js'),{document:doc,window:{},location:{pathname:'/anggota.html'},MutationObserver:class{observe(){}},URL,Intl,Date,clearTimeout(){},setTimeout(){}});
assert(fields.every(x=>x.disabled));assert(send.disabled);assert(!next.disabled);assert(!back.disabled);assert.equal(canvas.style.pointerEvents,'none');
console.log('PASS: file/password/identity fields and mutation buttons disabled; registration next/back remain available; signature drawing disabled.');
