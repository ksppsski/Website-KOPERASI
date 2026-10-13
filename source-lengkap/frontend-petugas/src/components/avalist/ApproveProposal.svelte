<script>
  let { proposal, data, busy, submit, onRegister } = $props();
  let personId = $state(''),
    rate = $state('');
  let missing = $derived(proposal.completionNeeded || []);
  let needsPerson = $derived(missing.some((m) => m.needsPerson));
  let needsRate = $derived(missing.some((m) => m.needsRate));
  async function approve(e) {
    e.preventDefault();
    if ((needsPerson && !personId) || (needsRate && !rate)) {
      e.currentTarget.reportValidity();
      return;
    }
    await submit(
      missing.length
        ? {
            completion: {
              personId: needsPerson ? personId : null,
              rate: needsRate ? Number(rate) : null,
            },
          }
        : {},
    );
  }
</script>

<form class="av-form av-approval" onsubmit={approve}>
  {#if missing.length}
    <div class="info-box">
      <strong>Lengkapi sebelum menyetujui</strong>
      {#each missing as m}<p>
          {m.contractId
            ? data.contracts.find((c) => c.id === m.contractId)?.number || m.contractId
            : 'Pengajuan akad baru'} belum memiliki {[
            m.needsPerson ? 'nama avalist' : null,
            m.needsRate ? 'persentase' : null,
          ]
            .filter(Boolean)
            .join(' dan ')} pada periode usulan.
        </p>{/each}
    </div>
    {#if needsPerson && !data.people.some((p) => p.active && p.available)}
      <div class="info-box">
        <p>
          Belum ada avalist aktif yang dapat dipilih. Manajer cukup mendaftarkan email avalist
          terlebih dahulu.
        </p>
        <button type="button" class="btn secondary small-btn" disabled={busy} onclick={onRegister}
          >Daftarkan avalist</button
        >
      </div>
    {/if}
    {#if needsPerson}<label
        >Avalist untuk penetapan awal<select required bind:value={personId}
          ><option value="">Pilih avalist</option
          >{#each data.people.filter((p) => p.active && p.available) as p}<option value={p.id}
              >{p.name}</option
            >{/each}</select
        ></label
      >{/if}
    {#if needsRate}<label
        >Bagian avalist untuk penetapan awal<select required bind:value={rate}
          ><option value="">Pilih persentase</option><option value="1">1% · koperasi 4%</option
          ><option value="2">2% · koperasi 3%</option></select
        ></label
      >{/if}
    <p class="field-hint">
      Pilihan ini hanya mengisi data awal yang belum ada. Data pada akad lain tetap mengikuti
      usulan. Pelengkap ini dicatat sebagai keputusan Manajer.
    </p>
  {/if}
  <button
    class="btn small-btn"
    disabled={busy || (needsPerson && !personId) || (needsRate && !rate)}
    >{missing.length ? 'Lengkapi dan setujui' : 'Setujui penetapan'}</button
  >
</form>
