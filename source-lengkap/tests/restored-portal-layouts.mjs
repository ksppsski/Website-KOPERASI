import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateSavings} from '../worker/savings.js';
import {agreementRules} from '../worker/contract-rules.js';

const source=name=>readFileSync(new URL('../dist/assets/'+name,import.meta.url),'utf8');
function events(){const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn)},dispatchEvent(e){for(const fn of listeners.get(e.type)||[])fn(e)},async emit(type,extra={}){if(extra.target)extra.target.dataset??={};for(const fn of listeners.get(type)||[])await fn({type,preventDefault(){},...extra})}}}
function harness(staff=false,accountRole='manager'){
 const element=()=>({...events(),innerHTML:'',textContent:'',hidden:false,focus(){}});
 const app=element(),nodes={'#app':app,'#portal-dialog':{...element(),open:false,close(){this.open=false},showModal(){this.open=true}},'#dialog-content':element(),'#toast':element(),'#staff-table':element(),'#document-list':element(),'#document-search':{value:''},'#document-filter':{value:''},'#savings-rows':element(),'#savings-search':{value:''},'#savings-filter':{value:''},'#wf-automatic-dates':element()};
 let html='',panels=[],data={profile:null,items:[]},staffRole=accountRole==='finance'?'finance':'admin';
 Object.defineProperty(app,'innerHTML',{get:()=>html,set(value){html=value;panels=[...value.matchAll(/data-workflow="([^"]+)"/g)].map(m=>({...element(),dataset:{workflow:m[1]}}))}});
 const document={...events(),activeElement:element(),querySelector:s=>nodes[s]||(s==='[data-workflow]'?panels[0]:null),querySelectorAll:s=>s==='[data-workflow]'?panels:[]};
 const window={...events(),scrollTo(){}};
 const location={pathname:staff?'/petugas.html':'/anggota.html'};let hash='#masuk';Object.defineProperty(location,'hash',{get:()=>hash,set:value=>hash=value.startsWith('#')?value:'#'+value});
 const context=vm.createContext({document,window,location,history:{replaceState(a,b,hash){location.hash=hash}},console,crypto,URLSearchParams,FormData,HTMLFormElement:class{},CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},fetch:async(path,options)=>({ok:true,json:async()=>{if(path.endsWith('/staff/access'))return {staff:{role:staffRole,accountRole,allowedRoles:accountRole==='manager'?['manager','admin','finance']:[accountRole]},identity:{name:'Manager',email:'manager@example.test'},configured:true};if(path.endsWith('/staff/accounts'))return {accounts:[]};if(path.endsWith('/reports'))return {reports:[]};if(path.endsWith('/staff/role')){staffRole=JSON.parse(options.body).role;return {staff:{role:staffRole,accountRole,allowedRoles:accountRole==='manager'?['manager','admin','finance']:[accountRole],concept:false}}}if(path.includes('/staff/activity')||path.endsWith('/staff/tasks'))return {tasks:data.tasks||[],range:{from:'2026-09-21',to:'2026-09-22',earliest:'2026-09-15',latest:'2026-09-22'}};if(path.includes('/finance/reconciliations'))return {items:[]};if(path.includes('/finance/payouts'))return {date:'2026-09-05',total:0,contractCount:0,memberCount:0,transferCount:0,members:[],referenceDates:[]};return {...data,staff:{role:staffRole,accountRole,allowedRoles:accountRole==='manager'?['manager','admin','finance']:[accountRole],concept:false}}}}),setTimeout:()=>0,setInterval:()=>0,clearTimeout(){}});
 vm.runInContext(source('workflow.js'),context);vm.runInContext(source('reports.js'),context);if(staff){vm.runInContext(source('staff-access.js'),context);vm.runInContext(source('activity.js'),context);vm.runInContext(source('finance.js'),context);}vm.runInContext(source(staff?'petugas.js':'portal.js'),context);
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 return {app,nodes,document,window,panel:key=>panels.find(p=>p.dataset.workflow===key),async click(dataset){await document.emit('click',{target:{closest:s=>s==='[data-action]'?{dataset}:null}});await window.emit('hashchange');await settle()},async route(value){location.hash='#'+value;await window.emit('hashchange');await settle()},async update(value){data=value;await window.emit('focus');await settle()}};
}
const profile={id:'profile-test',memberNumber:'SKI-2026-0042',status:'approved',version:1,createdAt:'2026-09-21T03:00:00Z',data:{name:'ANGGOTA UJI',basic:100000,monthly:10000,transactionSaving:50000,paymentOption:'Bulanan'}};
profile.savings=calculateSavings({id:profile.id,status:'approved',created_at:'2026-09-21T03:00:00Z'},[{source_id:profile.id,source_kind:'registration',basic:100000,mandatory:10000,other:50000,accepted_at:'2026-09-21T03:00:00Z'}],'2026-09-22');
const signed={id:'contract-test',kind:'capital',memberId:profile.memberNumber,memberName:profile.data.name,status:'signed',statusLabel:'Akad lengkap',amount:7000000,contractNumber:'0007/SPK-SKI-MRBH-1/I/2026',createdAt:'2026-01-21T00:00:00Z',signedAt:'2026-01-22T00:00:00Z',signedUrl:'/api/workflow/contract-test/signed',contractData:agreementRules('2026-01-21')};
const member=harness();assert.match(member.app.innerHTML,/password-field/);assert(!member.app.innerHTML.includes('value="anggota@'));
await member.click({action:'enter-portal'});
for(const token of ['summary-banner','member-card-meta','stats','content-grid','quick-actions','Belum terdaftar','Rp0'])assert(member.app.innerHTML.includes(token),token);
assert(!member.app.innerHTML.includes('Anggota Demo'));
await member.update({profile,items:[signed]});assert.match(member.app.innerHTML,/SKI-2026-0042/);assert.match(member.app.innerHTML,/Rp160\.000/);
await member.route('simpanan');assert.match(member.app.innerHTML,/balance-breakdown/);assert.match(member.app.innerHTML,/Rp100\.000/);assert.match(member.app.innerHTML,/Simpanan Lainnya/);
member.nodes['#savings-filter'].value='Simpanan Lainnya';await member.document.emit('change',{target:{id:'savings-filter',value:'Simpanan Lainnya'}});assert.match(member.nodes['#savings-rows'].innerHTML,/Rp50\.000/);assert(!member.nodes['#savings-rows'].innerHTML.includes('Rp100.000'));
await member.route('modal');assert.match(member.app.innerHTML,/contract-list/);assert.match(member.app.innerHTML,/0007\/SPK-SKI/);assert(!member.app.innerHTML.includes('NaN'));assert.match(member.app.innerHTML,/1 Feb 2026/);
await member.route('pembiayaan');assert.match(member.app.innerHTML,/content-grid/);assert.match(member.app.innerHTML,/Angsuran berikutnya/);assert(!member.app.innerHTML.includes('MRB-2026-003'));
await member.route('dokumen');assert.match(member.app.innerHTML,/document-grid/);assert.match(member.app.innerHTML,/href="\/api\/workflow\/contract-test\/signed\?download=1"/);
member.nodes['#document-search'].value='tidak-cocok';await member.document.emit('input',{target:{id:'document-search',value:'tidak-cocok'}});assert.match(member.nodes['#document-list'].innerHTML,/Belum ada dokumen/);
// The displayed dates must agree with the authoritative server across month/year boundaries.
for(const day of ['2026-01-21','2026-12-21','2028-01-21','2026-01-20','2028-02-19']){
 await member.document.emit('input',{target:{name:'agreementDate',value:day,form:{id:'wf-generate-form'}}});
 const actual=member.nodes['#wf-automatic-dates'].innerHTML,expected=agreementRules(day);
 for(const field of ['effectiveDate','endDate'])assert(actual.includes(new Date(expected[field]+'T12:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})),day+' '+field);
 assert(actual.includes(expected.code));
}
const staff=harness(true);await staff.click({action:'enter'});for(const token of ['stats','content-grid','Antrean pemeriksaan','Aktivitas petugas','timeline'])assert(staff.app.innerHTML.includes(token),token);
const pending={...signed,id:'pending-test',status:'pending',statusLabel:'Menunggu pemeriksaan',contractNumber:null,contractData:null,signedUrl:null};
await staff.update({profile:{...profile,status:'pending'},items:[pending]});assert.match(staff.app.innerHTML,/2 menunggu/);assert.match(staff.app.innerHTML,/data-wf-action="registration-review"/);assert.match(staff.app.innerHTML,/data-wf-action="review"/);
await staff.route('pendaftaran');assert.match(staff.app.innerHTML,/staff-search/);assert.match(staff.app.innerHTML,/SKI-2026-0042/);
await staff.document.emit('change',{target:{id:'staff-filter',value:'Disetujui'}});assert(!staff.nodes['#staff-table'].innerHTML.includes('ANGGOTA UJI'));
await staff.update({profile,items:[signed,{...pending,id:'ready-test',status:'ready',statusLabel:'Siap dibuat'}]});await staff.route('anggota');assert.match(staff.app.innerHTML,/Rp110\.000/);assert.match(staff.app.innerHTML,/Rp7\.000\.000/);
await staff.route('akad');for(const token of ['Penyiapan akad','1 pengajuan','Daftar dokumen','0007/SPK-SKI','Buat PDF'])assert(staff.app.innerHTML.includes(token),token);
console.log('PASS: restored member/staff layouts with empty/current data, savings/document/status filters, live queues and document links, and browser/server date parity.');

assert.match(staff.app.innerHTML,/id="staff-role"/);
assert.equal(await staff.window.KsppsWorkflow.setStaffRole('finance'),true);
await staff.route('finance-ringkasan');await new Promise(resolve=>setImmediate(resolve));
for(const token of ['Ringkasan Finance','Total bagi hasil','Bukti transfer masuk','Bagi Hasil Harian'])assert(staff.app.innerHTML.includes(token),token);
assert(!staff.app.innerHTML.includes('href="#pendaftaran"'),'Finance navigation does not expose Admin approval screens');
await staff.route('finance-rekonsiliasi');assert.match(staff.app.innerHTML,/finance-queue-table/);
await staff.route('finance-bagi-hasil');assert.match(staff.app.innerHTML,/id="finance-date"/);assert.match(staff.app.innerHTML,/Daftar transfer/);assert.match(staff.app.innerHTML,/Tidak ada akad yang terjadwal/);
await staff.route('akad');assert.match(staff.app.innerHTML,/Ringkasan Finance/,'Admin routes redirect within Finance view');
await staff.window.KsppsWorkflow.setStaffRole('admin');await staff.route('ringkasan');assert.match(staff.app.innerHTML,/Antrean pemeriksaan/);
console.log('PASS: Admin/Finance selection, role-specific navigation, Finance data loading, reconciliation screen and daily payout empty state.');

// Monitoring navigation and data are reserved for the Manager role.
assert(!staff.app.innerHTML.includes('href="#waktu-kerja"'));
await staff.route('waktu-kerja');assert.match(staff.app.innerHTML,/Antrean pemeriksaan/);
await staff.window.KsppsWorkflow.setStaffRole('finance');await staff.route('waktu-kerja');assert(!staff.app.innerHTML.includes('href="#waktu-kerja"'));assert.match(staff.app.innerHTML,/Ringkasan Finance/);
await staff.window.KsppsWorkflow.setStaffRole('manager');await staff.route('waktu-kerja');await new Promise(resolve=>setImmediate(resolve));
for(const token of ['Pekerjaan & Waktu Kerja','Ringkasan per peran','Rata-rata respons','Riwayat tahap pekerjaan','data-work-filter="from"','Unduh CSV','Belum ada catatan yang sesuai','bukan jam kerja aktif','Hari ini + 7 hari sebelumnya'])assert(staff.app.innerHTML.includes(token),token);
assert(!staff.app.innerHTML.includes('href="#pendaftaran"'));assert(!staff.app.innerHTML.includes('href="#finance-rekonsiliasi"'));
await staff.route('manager-penawaran');assert.match(staff.app.innerHTML,/Buat penawaran/);assert.match(staff.app.innerHTML,/data-workflow="manager-offers"/);
await staff.route('waktu-kerja');
console.log('PASS: Manager-only monitoring and offer navigation; Admin/Finance cannot open reports.');

await staff.update({profile,items:[signed],tasks:[{id:'task-fixture',targetId:'abc12345',stage:'registration',role:'admin',label:'Pemeriksaan pendaftaran',memberName:'<script>unsafe</script>',receivedAt:'2026-09-21T00:00:00Z',startedAt:'2026-09-21T00:02:00Z',completedAt:'2026-09-21T00:07:00Z',startedBy:'account',completedBy:'account',responseSeconds:120,processingSeconds:300,status:'completed'}]});await new Promise(resolve=>setImmediate(resolve));
assert.match(staff.app.innerHTML,/08\.00\.00/,'timestamps shown in WITA');assert.match(staff.app.innerHTML,/2 mnt 0 dtk/);assert.match(staff.app.innerHTML,/5 mnt 0 dtk/);assert.match(staff.app.innerHTML,/&lt;script&gt;unsafe&lt;\/script&gt;/);assert(!staff.app.innerHTML.includes('<script>unsafe'));
console.log('PASS: populated KPI report, WITA timestamps, duration rendering and escaped member data.');

const registrationUi=harness();await registrationUi.route('daftar');
assert.match(registrationUi.app.innerHTML,/<input type="file" id="registration-ktp"[^>]*required/);
assert.match(registrationUi.app.innerHTML,/JPG atau PNG/);
const identityHtml=registrationUi.window.KsppsWorkflow.identityMedia({...profile,signatureUrl:'/api/workflow/profile/signature',ktpUrl:'/api/workflow/profile/ktp',ktpCheckedAt:'2026-09-21T01:00:00Z'});
assert(identityHtml.indexOf('class="wf-signature"')<identityHtml.indexOf('class="wf-ktp"'),'KTP follows signature in the two-column grid');
assert.match(identityHtml,/<img src="\/api\/workflow\/profile\/ktp\?v=1"/);assert.match(identityHtml,/Sudah diperiksa Admin/);assert.match(identityHtml,/aria-label="Lihat foto KTP ukuran penuh"/);
assert.match(registrationUi.window.KsppsWorkflow.identityMedia(profile),/Foto KTP belum diunggah/);
const responsiveCss=source('workflow.css');assert.match(responsiveCss,/\.wf-identity-media\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);assert.match(responsiveCss,/@media\(max-width:540px\)\{\.wf-identity-media\{grid-template-columns:1fr\}/);
await staff.window.KsppsWorkflow.setStaffRole('admin');await staff.update({profile:{...profile,status:'pending',signatureUrl:'/api/workflow/profile/signature',ktpUrl:'/api/workflow/profile/ktp',finance:{status:'approved'}},items:[]});
await staff.document.emit('click',{target:{closest:s=>s==='[data-wf-action]'?{dataset:{wfAction:'registration-review'}}:null}});
assert.match(staff.nodes['#dialog-content'].innerHTML,/name="ktp"/);assert.match(staff.nodes['#dialog-content'].innerHTML,/Foto KTP terbaca dan sesuai data calon anggota/);assert.match(staff.nodes['#dialog-content'].innerHTML,/class="wf-identity-media"/);
assert(!staff.nodes['#dialog-content'].innerHTML.includes('WAKTU KERJA'));assert(!staff.nodes['#dialog-content'].innerHTML.includes('Masuk ke antrean'));
console.log('PASS: mandatory registration KTP input, signature-left/KTP-right layout, narrow-screen stacking, image links and Admin KTP verification control.');

// Both staff roles' correction notes must lead directly to a member action.
member.nodes['#portal-dialog'].close();
const needsFix={...pending,id:'correction-capital',finance:{status:'correction',note:'Nominal tidak sesuai mutasi.',label:'Perlu perbaikan',version:2},version:3};
const savingsFix={...needsFix,id:'correction-savings',kind:'savings',amount:120000,finance:{status:'correction',note:'Bukti simpanan kurang jelas.',label:'Perlu perbaikan',version:1}};
await member.route('ringkasan');await member.update({profile:{...profile,status:'pending',finance:{status:'correction',note:'Periksa setoran pendaftaran.'},savings:{...profile.savings,active:false}},items:[needsFix,savingsFix]});
for(const text of ['Perbaiki pendaftaran','Nominal tidak sesuai mutasi.','Bukti simpanan kurang jelas.','Periksa setoran pendaftaran.','data-id="correction-capital"','data-id="correction-savings"'])assert(member.app.innerHTML.includes(text),text);
await member.route('modal');assert.match(member.app.innerHTML,/Simpanan belum aktif/);assert(!member.app.innerHTML.includes('data-action="apply-capital"'));assert.match(member.app.innerHTML,/Perbaiki pengajuan/);
await member.route('pembiayaan');assert.match(member.app.innerHTML,/Simpanan belum aktif/);assert(!member.app.innerHTML.includes('data-action="apply-finance"'));
await member.document.emit('click',{target:{closest:s=>s==='[data-wf-action]'?{dataset:{wfAction:'revise',id:needsFix.id}}:null}});
assert.match(member.nodes['#dialog-content'].innerHTML,/Perbaiki penyertaan modal/);assert.match(member.nodes['#dialog-content'].innerHTML,/Nominal tidak sesuai mutasi/);assert.match(member.nodes['#dialog-content'].innerHTML,/data-version="3"/);
member.nodes['#portal-dialog'].close();await member.update({profile,items:[savingsFix]});
await member.document.emit('click',{target:{closest:s=>s==='[data-wf-action]'?{dataset:{wfAction:'revise',id:savingsFix.id}}:null}});
assert.match(member.nodes['#dialog-content'].innerHTML,/wf-savings-form/);assert.match(member.nodes['#dialog-content'].innerHTML,/Perbaiki setoran simpanan wajib/);assert.match(member.nodes['#dialog-content'].innerHTML,/value="120000" selected/);
member.nodes['#portal-dialog'].close();
await member.route('simpanan');assert.match(member.app.innerHTML,/Sisa simpanan wajib di muka/);assert.match(member.app.innerHTML,/Riwayat alokasi bulanan/);assert.match(member.app.innerHTML,/Segera setor simpanan wajib/);
const atThreshold={...profile,savings:{...profile.savings,remaining:30000,low:true}};await member.update({profile:atThreshold,items:[]});
assert.match(member.app.innerHTML,/Sisa saldo di muka Rp30\.000/);assert.match(member.app.innerHTML,/Segera setor/);
await member.click({action:'notifications'});assert.match(member.nodes['#dialog-content'].innerHTML,/Rp30\.000/);
console.log('PASS: actionable Admin/Finance notes, inactive service screens, accessible existing corrections, prefilled revision amount/version, reconciled savings view and low-balance notification.');

const openOffer={id:'offer-open',title:'Pengadaan Barang Mitra',projectCode:'MRBH-2026-09-01',quota:1000000000,reserved:800000000,remaining:200000000};
const fullOffer={...openOffer,id:'offer-full',projectCode:'MRBH-2026-08-01',reserved:1000000000,remaining:0};
member.nodes['#portal-dialog'].close();await member.route('ringkasan');await member.update({profile,items:[],offers:[openOffer,fullOffer]});
assert.match(member.app.innerHTML,/data-workflow="member-offers"/);
let cards=member.panel('member-offers').innerHTML;assert.match(cards,/MRBH-2026-09-01/);assert.match(cards,/MRBH-2026-08-01/);assert.match(cards,/Rp200\.000\.000/);assert.match(cards,/data-id="offer-full" disabled/);
await member.document.emit('click',{target:{closest:s=>s==='[data-wf-action]'?{dataset:{wfAction:'capital',id:'offer-open'}}:null}});
assert.match(member.nodes['#dialog-content'].innerHTML,/data-offer-id="offer-open"/);assert.match(member.nodes['#dialog-content'].innerHTML,/max="200000000"/);assert.match(member.nodes['#dialog-content'].innerHTML,/MRBH-2026-09-01/);
member.nodes['#portal-dialog'].close();await member.update({profile:{...profile,savings:{...profile.savings,active:false}},items:[],offers:[openOffer]});assert.match(member.panel('member-offers').innerHTML,/data-id="offer-open" disabled/);
staff.nodes['#portal-dialog'].close();await staff.window.KsppsWorkflow.setStaffRole('manager');await staff.route('manager-penawaran');await staff.update({profile,items:[],offers:[openOffer,fullOffer]});assert.match(staff.panel('manager-offers').innerHTML,/MRBH-2026-09-01/);
await staff.document.emit('click',{target:{closest:s=>s==='[data-wf-action]'?{dataset:{wfAction:'new-offer'}}:null}});
assert.match(staff.nodes['#dialog-content'].innerHTML,/name="projectCode"[^>]+required/);assert.match(staff.nodes['#dialog-content'].innerHTML,/name="quota"[^>]+required/);assert.match(staff.nodes['#dialog-content'].innerHTML,/Buka penawaran/);
console.log('PASS: offer codes and quotas on member/manager views, full/inactive disabled controls, offer-bound amount form and mandatory Manager project code.');

const onlyAdmin=harness(true,'admin');await onlyAdmin.click({action:'enter',role:'admin'});assert(!onlyAdmin.app.innerHTML.includes('id="staff-role"'));assert.match(onlyAdmin.app.innerHTML,/Antrean pemeriksaan/);
const onlyFinance=harness(true,'finance');await onlyFinance.click({action:'enter',role:'finance'});assert(!onlyFinance.app.innerHTML.includes('id="staff-role"'));assert(!onlyFinance.app.innerHTML.includes('href="#pendaftaran"'));
await staff.window.KsppsWorkflow.setStaffRole('manager');await staff.route('manager-laporan');assert.match(staff.app.innerHTML,/Laporan Koperasi/);assert.match(staff.app.innerHTML,/data-report-action="upload"/);
await staff.document.emit('click',{target:{closest:s=>s==='[data-report-action]'?{dataset:{reportAction:'upload'}}:null}});
assert.match(staff.nodes['#dialog-content'].innerHTML,/id="report-upload"/);assert.match(staff.nodes['#dialog-content'].innerHTML,/accept=".pdf,application\/pdf"/);assert.match(staff.nodes['#dialog-content'].innerHTML,/name="period" type="month" required/);
member.nodes['#portal-dialog'].close();await member.route('laporan');assert.match(member.app.innerHTML,/Laporan Koperasi/);assert(!member.app.innerHTML.includes('data-report-action="upload"'));
assert(!member.app.innerHTML.includes('petugas.html'));
console.log('PASS: account-restricted role picker, Manager report upload form, member report page without upload control, and member/staff entrance separation.');
