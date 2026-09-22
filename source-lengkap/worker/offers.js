import {Problem,stmt} from './membership.js';
import {requireStaffRole} from './finance.js';

// Reservations include pending/correction requests; final rejection releases them.
export const reservedSql = `COALESCE((SELECT SUM(r.amount) FROM workflow_requests r WHERE r.offer_id=o.id AND r.status NOT IN ('rejected','cancelled') AND r.id<>?),0)`;
export async function offers(env,owner){
 const rows=(await stmt(env,`SELECT o.*,${reservedSql} AS reserved FROM capital_offers o WHERE o.owner=? ORDER BY o.created_at DESC,o.id`, '',owner).all()).results;
 return rows.map(o=>({id:o.id,title:o.title,projectCode:o.project_code,quota:o.quota,reserved:o.reserved,remaining:Math.max(0,o.quota-o.reserved),status:o.reserved>=o.quota?'full':'open',createdAt:o.created_at}));
}
export async function createOffer(env,owner,body){
 await requireStaffRole(env,owner,'manager');
 const id=String(body.id||''),title=String(body.title||'').trim(),projectCode=String(body.projectCode||'').trim().toUpperCase(),quota=Number(body.quota);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))throw new Problem(400,'Referensi penawaran tidak valid.');
 if(!title||title.length>80)throw new Problem(400,'Isi nama penawaran, maksimal 80 karakter.');
 if(!projectCode||projectCode.length>60||/[\u0000-\u001f\u007f]/.test(projectCode))throw new Problem(400,'Kode project wajib diisi, maksimal 60 karakter.');
 if(!Number.isSafeInteger(quota)||quota<1||quota>1000000000000)throw new Problem(400,'Kuota harus berupa rupiah bulat antara Rp1 dan Rp1 triliun.');
 const prior=(await offers(env,owner)).find(o=>o.id===id);if(prior)return prior;
 try{await stmt(env,'INSERT INTO capital_offers (id,owner,title,project_code,quota,created_at,created_by) VALUES (?,?,?,?,?,?,?)',id,owner,title,projectCode,quota,new Date().toISOString(),owner).run();}
 catch(error){const rows=await offers(env,owner);if(rows.some(o=>o.id===id))return rows.find(o=>o.id===id);if(rows.some(o=>o.projectCode===projectCode))throw new Problem(409,'Kode project sudah dipakai. Gunakan kode berbeda untuk setiap penawaran.');throw error;}
 return (await offers(env,owner)).find(o=>o.id===id);
}
