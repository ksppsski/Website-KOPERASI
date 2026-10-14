<script>
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  let { context } = $props();
  let { wf, state, queue, dateKey, button, panel, summary, results, csv } = $derived(context);
</script>

{#if context}
  {#if wf().getStaff()?.role === 'manager'}
    {@const latest = state.range?.latest || dateKey(new Date())}
    {@const d = new Date(latest + 'T12:00:00Z')}
    {@const earliest =
      state.range?.earliest || new Date(d.getTime() - 7 * 86400000).toISOString().slice(0, 10)}
    <div class="page-heading">
      <div>
        <h1>Pekerjaan & Waktu Kerja</h1>
        <p class="subtext">Aktivitas Admin dan Finance · WITA</p>
      </div>
      <div class="wf-actions">
        <Content value={button('refresh', 'Perbarui') ?? ''} /><Content
          value={button('csv', 'Unduh CSV', { disabled: !state.loaded }) ?? ''}
        />
      </div>
    </div>
    <Content value={queue() ?? ''} />
    <div class="work-period-actions">
      <Content value={button('today', 'Hari ini') ?? ''} /><Content
        value={button('week', 'Hari ini + 7 hari sebelumnya') ?? ''}
      /><span class="field-hint">{earliest} — {latest}</span>
    </div>
    <section class="panel work-filters">
      <label class="form-field"
        ><span>Peran</span><select class="filter-select" data-work-filter="role"
          ><option value="">Semua peran</option><option
            value="admin"
            {...state.role === 'admin' ? { selected: true } : {}}>Admin</option
          ><option value="finance" {...state.role === 'finance' ? { selected: true } : {}}
            >Finance</option
          ></select
        ></label
      ><label class="form-field"
        ><span>Status</span><select class="filter-select" data-work-filter="status"
          ><option value="">Semua status</option
          >{#each [['queued', 'Belum dimulai'], ['working', 'Dikerjakan'], ['completed', 'Selesai'], ['closed', 'Ditutup / diganti']] as [v, l]}
            <option value={v} {...state.status === v ? { selected: true } : {}}>{l}</option>
          {/each}</select
        ></label
      ><label class="form-field"
        ><span>Tanggal aktivitas, dari</span><input
          type="date"
          data-work-filter="from"
          min={earliest}
          max={latest}
          value={state.from || latest}
        /></label
      ><label class="form-field"
        ><span>Sampai</span><input
          type="date"
          data-work-filter="to"
          min={earliest}
          max={latest}
          value={state.to || latest}
        /></label
      >
    </section>
    <div id="work-results"><Region name="work-results" value={results() ?? ''} /></div>
    <details class="panel work-method">
      <summary>Cara membaca catatan KPI</summary>
      <p>
        Respons = mulai − masuk. Pengerjaan = selesai − mulai. Durasi adalah waktu kalender,
        termasuk waktu menunggu; bukan jam kerja aktif atau absensi.
      </p>
      <p>
        Filter mencakup tugas yang masuk, dimulai, selesai, ditutup, atau masih dikerjakan dalam
        tanggal pilihan. Tugas lama yang selesai hari ini tetap terlihat. Status antrean menunjukkan
        kondisi terkini. Jumlah selesai dan rata-rata mengikuti tanggal tindakan. Rata-rata memakai
        pasangan waktu lengkap; tugas yang ditutup atau diganti tidak dihitung.
      </p>
      <p>
        Catatan berasal dari server. Perbaikan membuka putaran baru tanpa menghapus riwayat. Nama
        akun pelaksana dicatat saat pekerjaan dilakukan.
      </p>
    </details>
  {/if}
{/if}
