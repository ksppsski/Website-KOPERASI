import {Problem,stmt,hash,getProfile} from './membership.js';

export const actorId=(env,owner)=>env.ACTOR_ID||owner;
export async function staffContext(env,owner){
 const id=actorId(env,owner),account=await stmt(env,'SELECT * FROM staff_accounts WHERE user_id=?',id).first();
 const accountRole=account?.role||null,allowedRoles=accountRole==='manager'?['manager','admin','finance']:accountRole?[accountRole]:[];
 const choice=await stmt(env,'SELECT active_role FROM staff_workspaces WHERE owner=?',id).first();
 return {role:allowedRoles.includes(choice?.active_role)?choice.active_role:accountRole,accountRole,allowedRoles,name:account?.display_name||'',concept:false};
}
export async function requireStaffRole(env,owner,role){
 const context=await staffContext(env,owner);
 if(!context.allowedRoles.includes(role))throw new Problem(403,'Akun Anda tidak memiliki akses '+({manager:'Manajer',admin:'Admin',finance:'Finance'}[role]||'petugas')+'.');
 return context;
}
export async function requireStaff(env,owner){const context=await staffContext(env,owner);if(!context.accountRole)throw new Problem(403,'Akun ini belum mendapat akses petugas dari Manajer.');return context;}
export async function changeStaffRole(env,owner,role){
 const context=await requireStaff(env,owner);
 if(!context.allowedRoles.includes(role))throw new Problem(403,'Anda hanya dapat membuka portal sesuai hak akses akun.');
 await stmt(env,'INSERT INTO staff_workspaces (owner,active_role,updated_at) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET active_role=excluded.active_role,updated_at=excluded.updated_at',actorId(env,owner),role,new Date().toISOString()).run();
 return {...context,role};
}
export function identity(request){
 const email=(request.headers.get('oai-authenticated-user-email')||'').slice(0,200);let name=request.headers.get('oai-authenticated-user-full-name')||'';
 if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{name=decodeURIComponent(name);}catch{name='';}}
 return {name:(name||email||'Akun ChatGPT').slice(0,160),email};
}
export async function accessState(env,id,person){
 const staff=await staffContext(env,id),request=await stmt(env,'SELECT request_code,status,requested_at FROM staff_access_requests WHERE user_id=?',id).first();
 return {staff,identity:person,request:request?{code:request.request_code,status:request.status,requestedAt:request.requested_at}:null,configured:!!await stmt(env,"SELECT manager_id FROM staff_bootstrap WHERE id='primary' ").first()};
}
export async function activateManager(env,id,body,person){
 let config;try{config=JSON.parse(env.KSPPS_MANAGER_SETUP||'{}');}catch{config={};}
 const token=String(body.token||'');
 if(body.confirm!==true||token.length!==64||!config.hash||!Number.isFinite(Date.parse(config.expires))||Date.now()>Date.parse(config.expires)||await hash(new TextEncoder().encode(token))!==config.hash)throw new Problem(403,'Tautan aktivasi tidak valid atau sudah kedaluwarsa.');
 const at=new Date().toISOString();
 await env.DB.batch([
  stmt(env,"INSERT INTO staff_bootstrap (id,manager_id,created_at) VALUES ('primary',?,?) ON CONFLICT(id) DO NOTHING",id,at),
  stmt(env,"INSERT INTO staff_accounts (user_id,role,display_name,email,granted_by,created_at,updated_at) SELECT ?,'manager',?,?,?,?,? WHERE EXISTS (SELECT 1 FROM staff_bootstrap WHERE id='primary' AND manager_id=?) ON CONFLICT(user_id) DO NOTHING",id,person.name,person.email,id,at,at,id),
 ]);
 const primary=await stmt(env,"SELECT manager_id FROM staff_bootstrap WHERE id='primary'").first();
 if(primary.manager_id!==id)throw new Problem(409,'Tautan aktivasi telah digunakan. Hubungi Manajer untuk akses petugas.');
 return changeStaffRole(env,id,'manager');
}
export async function requestStaffAccess(env,id,person){
 if((await staffContext(env,id)).accountRole)throw new Problem(409,'Akun Anda sudah memiliki akses petugas.');
 const prior=await stmt(env,'SELECT * FROM staff_access_requests WHERE user_id=?',id).first();
 if(prior)return {code:prior.request_code,status:prior.status};
 const code=crypto.randomUUID(),at=new Date().toISOString();
 await stmt(env,"INSERT INTO staff_access_requests (user_id,request_code,display_name,email,status,requested_at) VALUES (?,?,?,?,'pending',?) ON CONFLICT(user_id) DO NOTHING",id,code,person.name,person.email,at).run();
 const row=await stmt(env,'SELECT request_code,status FROM staff_access_requests WHERE user_id=?',id).first();return {code:row.request_code,status:row.status};
}
export async function accessDirectory(env,id){
 await requireStaffRole(env,id,'manager');
 const rows=(await stmt(env,'SELECT r.*,a.role FROM staff_access_requests r LEFT JOIN staff_accounts a ON a.user_id=r.user_id ORDER BY r.requested_at DESC').all()).results;
 return rows.map(r=>({code:r.request_code,name:r.display_name,email:r.email,status:r.status,role:r.role||null,requestedAt:r.requested_at}));
}
export async function assignAccess(env,id,body){
 await requireStaffRole(env,id,'manager');
 if(!['admin','finance','revoke'].includes(body.role))throw new Problem(400,'Pilih akses Admin atau Finance.');
 const row=await stmt(env,'SELECT * FROM staff_access_requests WHERE request_code=?',String(body.code||'')).first();if(!row)throw new Problem(404,'Permintaan akses tidak ditemukan.');
 const current=await stmt(env,'SELECT role FROM staff_accounts WHERE user_id=?',row.user_id).first();if(current?.role==='manager')throw new Problem(403,'Akses Manajer utama tidak dapat diubah di sini.');
 const at=new Date().toISOString(),revoke=body.role==='revoke';
 await env.DB.batch([
  revoke?stmt(env,'DELETE FROM staff_accounts WHERE user_id=? AND role<>?',row.user_id,'manager'):stmt(env,"INSERT INTO staff_accounts (user_id,role,display_name,email,granted_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role,granted_by=excluded.granted_by,updated_at=excluded.updated_at WHERE staff_accounts.role<>'manager'",row.user_id,body.role,row.display_name,row.email,actorId(env,id),at,at),
  stmt(env,'UPDATE staff_access_requests SET status=? WHERE user_id=?',revoke?'revoked':'approved',row.user_id),
  stmt(env,'INSERT INTO staff_access_audit (id,target_user_id,role,actor_id,created_at) VALUES (?,?,?,?,?)',crypto.randomUUID(),row.user_id,body.role,actorId(env,id),at),
 ]);
 return {ok:true};
}
export async function memberDirectory(env,id){
 await requireStaff(env,id);
 return (await stmt(env,'SELECT id,data,status,member_number FROM member_profiles ORDER BY created_at DESC').all()).results.map(p=>({id:p.id,name:JSON.parse(p.data).name,number:p.member_number,status:p.status}));
}
export async function selectedOwner(request,env,id){
 const url=new URL(request.url),selected=request.headers.get('x-kspps-member')||url.searchParams.get('member')||url.pathname.match(/^\/api\/workflow\/member\/([a-z0-9-]+)\//i)?.[1];
 if(!selected)return id;
 await requireStaff(env,id);
 const profile=await stmt(env,'SELECT owner FROM member_profiles WHERE id=?',selected).first();if(!profile)throw new Problem(404,'Data anggota tidak ditemukan.');
 if(profile.owner!==id&&request.method==='POST'&&(/\/(profile|profile\/ktp|capital|savings|withdrawal)$/.test(url.pathname)||/\/(revise|cancel)$/.test(url.pathname)))throw new Problem(403,'Pengajuan dan perbaikan hanya dapat dikirim oleh anggota yang bersangkutan.');
 return profile.owner;
}
export async function cooperativeOwner(env,fallback){const row=await stmt(env,"SELECT manager_id FROM staff_bootstrap WHERE id='primary'").first();return row?.manager_id||fallback;}
