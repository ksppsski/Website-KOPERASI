import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {calculateSavings} from '../worker/savings.js';

// Run both authored portal scripts together, with browser event order and a
// separate dialog subtree. Replacing dialog HTML recreates its form/attachment.
function events(){const handlers=new Map();return {addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn)},dispatchEvent(event){for(const fn of handlers.get(event.type)||[])fn(event)},async emit(type,extra={}){let stopped=false;const event={type,preventDefault(){},stopImmediatePropagation(){stopped=true},...extra};for(const fn of handlers.get(type)||[]){await fn(event);if(stopped)break}}}}
const element=()=>({...events(),innerHTML:'',textContent:'',hidden:false,disabled:false,isConnected:true,focus(){},querySelectorAll(){return []}});
const app=element(),dialog={...element(),open:false,close(){if(!this.open)return;this.open=false;this.dispatchEvent({type:'close'})},showModal(){this.open=true}},content=element();
const nodes={'#app':app,'#portal-dialog':dialog,'#dialog-content':content,'#toast':element(),'#wf-error':element(),'#wf-file-name':element()};
let panels=[],form=null,contentHTML='',appHTML='';
Object.defineProperty(app,'innerHTML',{get:()=>appHTML,set(html){appHTML=html;panels=[...html.matchAll(/data-workflow="([^"]+)"/g)].map(m=>({...element(),dataset:{workflow:m[1]}}))}});
Object.defineProperty(content,'innerHTML',{get:()=>contentHTML,set(html){contentHTML=html;form=html.includes('id="wf-capital-form"')?{id:'wf-capital-form',dataset:{revise:'',offerId:'offer-test'},values:{amount:'',signatureConsent:''},checkValidity(){return !!this.values.amount&&!!this.values.proof&&this.values.signatureConsent==='on'},reportValidity(){},querySelectorAll(){return []}}:null}});
const document={...events(),activeElement:element(),querySelector:s=>nodes[s]||(s==='[data-workflow]'?panels[0]:null),querySelectorAll:s=>s==='[data-workflow]'?panels:[]};
const window={...events(),scrollTo(){}};
const location={pathname:'/anggota.html',hash:'#masuk'};
const profile={id:'profile-test',memberNumber:'SKI-2026-0001',status:'approved',version:1,createdAt:'2026-09-21',data:{name:'ANGGOTA UJI'}};
profile.savings=calculateSavings({id:profile.id,status:'approved',created_at:'2026-09-21T03:00:00Z'},[{source_id:profile.id,source_kind:'registration',basic:100000,mandatory:10000,other:50000,accepted_at:'2026-09-21T03:00:00Z'}],'2026-09-22');
let items=[],getCount=0,postCount=0,nextGet=null,nextPost=null,postFails=false,lastSubmission;
class FormPayload extends FormData{constructor(f){super();if(f)for(const [k,v] of Object.entries(f.values))this.set(k,v)}}
const fetch=async(url,options={})=>{
 if(options.method==='POST'){
  postCount++;lastSubmission=options.body;
  if(nextPost){const wait=nextPost;nextPost=null;await wait}
  if(postFails)return {ok:false,status:503,json:async()=>({error:'Coba kirim kembali.'})};
  assert.equal(url,'/api/workflow/capital');
  const item={id:lastSubmission.get('id'),kind:'capital',memberName:profile.data.name,amount:Number(lastSubmission.get('amount')),proofName:lastSubmission.get('proof').name,status:'pending',statusLabel:'Menunggu pemeriksaan',createdAt:'2026-09-21'};items=[item];
  return {ok:true,json:async()=>({item})};
 }
 getCount++;if(nextGet){const wait=nextGet;nextGet=null;await wait}
 return {ok:true,json:async()=>({items,profile,offers:[{id:'offer-test',title:'Kebutuhan Mitra',projectCode:'MRBH-2026-09-01',quota:100000000,remaining:100000000,reserved:0}]})};
};
const context=vm.createContext({window,document,location,history:{replaceState(a,b,hash){location.hash=hash}},console,crypto,File,FormData:FormPayload,HTMLFormElement:class {},CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},fetch,setTimeout:()=>0,setInterval:()=>0,clearTimeout(){}});
const source=path=>readFileSync(new URL('../dist/assets/'+path,import.meta.url),'utf8');
vm.runInContext(source('workflow.js'),context);vm.runInContext(source('portal.js'),context);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const click=async(dataset)=>document.emit('click',{target:{closest(selector){return selector==='[data-action]'&&dataset.action||selector==='[data-wf-action]'&&dataset.wfAction?{dataset}:null}}});
await click({action:'enter-portal'});await window.emit('hashchange');await settle();
location.hash='#modal';await window.emit('hashchange');await settle();

// Refresh starts before the form opens; its late response must not close it.
let releaseGet;nextGet=new Promise(resolve=>releaseGet=resolve);
await window.emit('focus');await click({wfAction:'capital',id:'offer-test'});
assert(dialog.open);assert(form);assert(content.innerHTML.includes(profile.memberNumber));assert(!content.innerHTML.includes('profile-test'));assert(app.innerHTML.includes(profile.memberNumber));form.values={amount:'17500000',proof:new File(['payment proof'],'bukti.png',{type:'image/png'}),signatureConsent:'on'};
const originalForm=form,originalProof=form.values.proof,originalHTML=content.innerHTML;
releaseGet();await settle();
assert.equal(dialog.open,true,'late profile refresh must not close the form');
assert.equal(form,originalForm);assert.equal(content.innerHTML,originalHTML);

// Returning from a file chooser/tab should not request a background refresh.
const before=getCount;await window.emit('focus');await window.emit('focus');await settle();
assert.equal(getCount,before);assert(dialog.open);assert.equal(form.values.amount,'17500000');assert.equal(form.values.proof,originalProof);

// Network failure keeps amount, file and consent available for retry.
postFails=true;await document.emit('submit',{target:form});
assert.equal(postCount,1);assert(dialog.open);assert.equal(form,originalForm);assert.equal(form.values.proof,originalProof);assert.equal(nodes['#wf-error'].hidden,false);
const requestId=lastSubmission.get('id');
postFails=false;let releasePost;nextPost=new Promise(resolve=>releasePost=resolve);
const pending=document.emit('submit',{target:form});await settle();
await window.emit('focus');window.dispatchEvent(new context.CustomEvent('kspps-profile-loaded',{detail:profile}));
assert(dialog.open,'in-flight submission remains visible');assert.equal(form,originalForm);assert.equal(getCount,before);
releasePost();await pending;await settle();
assert.equal(dialog.open,false,'successful submission closes the form');assert.equal(lastSubmission.get('id'),requestId,'retry keeps the same request ID');assert.equal(lastSubmission.get('offerId'),'offer-test');assert.equal(lastSubmission.get('amount'),'17500000');assert.equal(lastSubmission.get('proof').name,'bukti.png');assert.equal(lastSubmission.get('signatureConsent'),'true');assert(app.innerHTML.includes('data-workflow="member-capital"'));assert.match(panels.find(x=>x.dataset.workflow==='member-capital').innerHTML,/Menunggu pemeriksaan/);

await click({wfAction:'capital',id:'offer-test'});assert(dialog.open);await click({wfAction:'close'});assert.equal(dialog.open,false,'explicit cancel still closes');
await click({wfAction:'capital',id:'offer-test'});location.hash='#ringkasan';await window.emit('hashchange');assert.equal(dialog.open,false,'intentional navigation still closes');
await window.emit('focus');await settle();assert(getCount>before,'refresh resumes outside dialogs');
console.log('PASS: late refresh, file-chooser/tab focus, form data and file retention, submission retry, pending/successful submission, explicit cancel and navigation.');
