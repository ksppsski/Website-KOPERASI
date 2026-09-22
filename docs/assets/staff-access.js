/* Public visual preview only. No real login or permissions are provided here. */
(() => {
'use strict';
const names={manager:'Manajer',admin:'Admin',finance:'Finance'};
function entry(){return '<p class="demo-hint">Pratinjau publik tanpa data. Akun petugas belum diaktifkan.</p><div class="staff-role-entry">'+Object.entries(names).map(([role,name])=>`<button type="button" class="btn ${role==='manager'?'':'secondary '}full" data-action="enter" data-role="${role}">Lihat tampilan ${name}</button>`).join('')+'</div>';}
function page(){return '<div class="page-heading"><div><h1>Akses Petugas</h1><p class="subtext">Pengaturan akses akan tersedia setelah layanan akun diaktifkan.</p></div></div><section class="panel"><div class="empty-state">Belum ada akun petugas.</div></section>';}
window.KsppsStaffAccess={entry,page,load:async()=>{},mount:()=>{}};
})();
