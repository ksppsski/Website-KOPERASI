<script>
  import { missingAssignmentFields } from '../../../../shared/lib/avalist-assignment.js';
  let { data, busy, submit, admin = false } = $props();
  let memberId = $state(''),
    scope = $state('new'),
    personId = $state(''),
    rate = $state(''),
    effectiveDate = $state(''),
    reason = $state(''),
    contractIds = $state([]);
  let member = $derived(data.members.find((m) => m.id === memberId));
  let contracts = $derived(
    data.contracts.filter((c) => c.memberId === memberId && c.endDate >= data.today),
  );
  let targets = $derived(
    scope === 'new' ? [] : scope === 'all' ? contracts.map((c) => c.id) : contractIds,
  );
  let initialNeeds = $derived(
    missingAssignmentFields({ memberId, scope, contractIds: targets, effectiveDate }, data.events),
  );
  let missing = $derived(
    missingAssignmentFields(
      { memberId, scope, contractIds: targets, effectiveDate, personId, rate },
      data.events,
    ),
  );
  let needsPerson = $derived(initialNeeds.some((m) => m.needsPerson));
  let needsRate = $derived(initialNeeds.some((m) => m.needsRate));
  const name = (id) => data.people.find((p) => p.id === id)?.name || 'Belum ditetapkan';
  async function send(e) {
    e.preventDefault();
    if (missing.length) {
      e.currentTarget.reportValidity();
      return;
    }
    if (
      await submit({
        memberId,
        scope,
        personId: personId || null,
        rate: rate ? Number(rate) : null,
        effectiveDate,
        reason,
        contractIds,
      })
    ) {
      reason = '';
      contractIds = [];
    }
  }
</script>

<section class="panel av-form-panel">
  <h2>{admin ? 'Usulkan penetapan atau pergantian' : 'Tetapkan atau ganti avalist'}</h2>
  <p class="subtext">
    Pergantian orang dan persentase dapat dilakukan terpisah. Pembayaran yang sudah selesai tetap
    tersimpan.
  </p>
  <form onsubmit={send} class="av-form">
    <label
      >Anggota<select required bind:value={memberId} onchange={() => (contractIds = [])}
        ><option value="">Pilih anggota</option>{#each data.members as m}<option value={m.id}
            >{m.name} · {m.number || 'Belum bernomor'}</option
          >{/each}</select
      ></label
    >
    {#if member}<p class="av-current">
        Avalist untuk akad baru: <strong>{name(member.personId)}</strong>
        {member.rate ? `· ${member.rate}%` : ''}
      </p>{/if}
    <label
      >Berlaku untuk<select bind:value={scope}
        ><option value="new">Pengajuan akad baru setelah penetapan</option><option value="selected"
          >Akad berjalan yang dipilih</option
        ><option value="all">Semua akad berjalan anggota ini</option></select
      ></label
    >
    {#if scope !== 'new'}
      <fieldset>
        <legend>{scope === 'all' ? 'Akad yang akan berubah' : 'Pilih akad berjalan'}</legend>
        {#each contracts as c}<label class="av-check"
            >{#if scope === 'selected'}<input
                type="checkbox"
                value={c.id}
                bind:group={contractIds}
              />{/if}<span
              ><strong>{c.number}</strong> · {name(c.personId)}
              {c.rate ? `(${c.rate}%)` : ''}<small>{c.effectiveDate} sampai {c.endDate}</small
              ></span
            ></label
          >{:else}<p class="field-hint">Tidak ada akad berjalan untuk anggota ini.</p>{/each}
      </fieldset>
      <label
        >Tanggal mulai berlakunya perubahan<input
          type="date"
          required
          bind:value={effectiveDate}
        /><small
          >Berlaku untuk jadwal bagi hasil pada atau setelah tanggal ini. Pembayaran yang sudah
          selesai tetap memakai catatan semula.</small
        ></label
      >
    {/if}
    {#if memberId && initialNeeds.length && (scope === 'new' || effectiveDate)}
      <div class="info-box">
        <strong>Lengkapi penetapan awal</strong>
        {#each initialNeeds as m}<p>
            {m.contractId
              ? contracts.find((c) => c.id === m.contractId)?.number
              : 'Pengajuan akad baru'} belum memiliki {[
              m.needsPerson ? 'nama avalist' : null,
              m.needsRate ? 'persentase' : null,
            ]
              .filter(Boolean)
              .join(' dan ')} pada periode ini.
          </p>{/each}
      </div>
    {/if}
    {#if memberId && !data.people.some((p) => p.active && p.available)}<p class="info-box">
        Belum ada avalist aktif. Manajer perlu mendaftarkan email melalui Daftar Avalist terlebih
        dahulu.
      </p>{/if}
    <div class="av-grid">
      <label
        >Avalist<select bind:value={personId} required={needsPerson}
          ><option value=""
            >{needsPerson
              ? 'Pilih avalist untuk penetapan awal'
              : 'Pertahankan avalist saat ini'}</option
          >{#each data.people.filter((p) => p.active && p.available) as p}<option value={p.id}
              >{p.name}</option
            >{/each}</select
        ></label
      >
      <label
        >Bagian avalist<select bind:value={rate} required={needsRate}
          ><option value=""
            >{needsRate
              ? 'Pilih persentase untuk penetapan awal'
              : 'Pertahankan persentase saat ini'}</option
          ><option value="1">1% · koperasi 4%</option><option value="2">2% · koperasi 3%</option
          ></select
        ></label
      >
    </div>
    <p class="field-hint">
      Penetapan pertama memerlukan avalist dan persentase. Bagian anggota tetap 5%; total pembagian
      10% dari modal per periode.
    </p>
    <label
      >Alasan penetapan/perubahan<textarea
        required
        minlength="5"
        maxlength="500"
        bind:value={reason}
        rows="3"
        placeholder="Jelaskan dasar penetapan atau pergantian"></textarea></label
    >
    <button class="btn" disabled={busy || !memberId || (scope !== 'new' && !contracts.length)}
      >{busy
        ? 'Menyimpan…'
        : admin
          ? 'Kirim usulan ke Manajer'
          : 'Simpan penetapan Manajer'}</button
    >
  </form>
</section>
