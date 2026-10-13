<script>
  let { data } = $props();

  const person = (id) => data?.people?.find((p) => p.id === id)?.name || '—';
  const member = (id) => data?.members?.find((m) => m.id === id)?.name || id;
  const contract = (id) => data?.contracts?.find((c) => c.id === id)?.number || id;
</script>

<section class="panel">
  <div class="av-form-panel">
    <h2>Riwayat penetapan</h2>
    <p class="field-hint">
      Penetapan baru ditambahkan sebagai riwayat. Catatan lama tetap tersimpan.
    </p>
  </div>
  <div class="av-table-wrap">
    <table class="data-table av-table">
      <thead
        ><tr><th>Anggota / akad</th><th>Berlaku</th><th>Avalist / persentase</th><th>Alasan</th></tr
        ></thead
      ><tbody
        >{#each data.events as e}<tr
            ><td
              >{member(e.memberId)}<small
                >{e.contractId ? contract(e.contractId) : 'Bawaan untuk akad baru'}</small
              ></td
            ><td
              >{e.date === '1901-01-01' ? 'Sejak akad dibuat' : e.date}<small
                >Dicatat {new Date(e.createdAt).toLocaleDateString('id-ID')}</small
              ></td
            ><td
              >{e.personId ? person(e.personId) : 'Avalist tetap'}<small
                >{e.rate ? `${e.rate}% · koperasi ${5 - e.rate}%` : 'Persentase tetap'}</small
              ></td
            ><td>{e.reason}<small>Dicatat oleh {e.actorName || e.actor}</small></td></tr
          >{:else}<tr><td colspan="4" class="empty-state">Belum ada penetapan avalist.</td></tr
          >{/each}</tbody
      >
    </table>
  </div>
</section>
