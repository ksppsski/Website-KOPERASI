<script>
  let { data, busy, save } = $props();
  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  let correctionOriginal = $state(''),
    correctionPerson = $state(''),
    correctionAmount = $state(),
    correctionReason = $state(''),
    correctionId = $state('');
  async function correct(e) {
    e.preventDefault();
    correctionId ||= crypto.randomUUID();
    if (
      await save(
        '/adjustments',
        {
          id: correctionId,
          originalId: correctionOriginal,
          personId: correctionPerson,
          amount: correctionAmount,
          reason: correctionReason,
        },
        'Koreksi disetujui. Finance dapat mencatat penyelesaiannya.',
      )
    ) {
      correctionOriginal = '';
      correctionPerson = '';
      correctionAmount = undefined;
      correctionReason = '';
      correctionId = '';
    }
  }
</script>

<section class="panel av-form-panel">
  <h2>Koreksi pembayaran selesai</h2>
  <p class="subtext">
    Buat penyesuaian terpisah. Untuk pemindahan hak, catat pengembalian dari avalist lama dan
    pembayaran ke avalist baru sebagai dua koreksi.
  </p>
  <form class="av-form" onsubmit={correct}>
    <label
      >Pembayaran asal<select required bind:value={correctionOriginal}
        ><option value="">Pilih pembayaran selesai</option
        >{#each data.history.filter((p) => p.status === 'paid' && p.kind === 'regular') as p}<option
            value={p.id}
            >{p.detail.contractNumber} · {p.date} · {p.detail.personName} · {money(
              p.amount,
            )}</option
          >{/each}</select
      ></label
    ><label
      >Avalist penerima / pengembali<select required bind:value={correctionPerson}
        ><option value="">Pilih avalist</option
        >{#each data.people.filter((p) => p.active && p.available) as p}<option value={p.id}
            >{p.name}</option
          >{/each}</select
      ></label
    ><label
      >Nominal koreksi (Rp)<input
        type="number"
        required
        step="1"
        bind:value={correctionAmount}
      /><small
        >Positif untuk pembayaran tambahan; negatif untuk pengembalian ke koperasi. Selisih menjadi
        penyesuaian bagian koperasi.</small
      ></label
    ><label
      >Alasan koreksi<textarea required minlength="5" maxlength="500" bind:value={correctionReason}
      ></textarea></label
    ><button class="btn" disabled={busy}>Setujui koreksi pembayaran</button>
  </form>
</section>
