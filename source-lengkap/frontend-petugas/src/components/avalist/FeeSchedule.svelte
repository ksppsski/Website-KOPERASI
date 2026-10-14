<script>
  import { formatMoney as money } from '../../../../shared/lib/formatters.js';
  import Badge from '../../../../shared/components/Badge.svelte';
  import Payments from '../../../../shared/components/avalist/Payments.svelte';
  let { data, date = $bindable(), busy, save, openPayment, review, load } = $props();
  let visibleHistory = $derived(data.history || []);
  let groups = $derived.by(() => {
    const groups = new Map();
    for (const x of data?.items || []) {
      if (!x.personId) continue;
      const p = groups.get(x.personId) || { name: x.personName, amount: 0, count: 0, paid: 0 };
      p.amount += x.avalist || 0;
      p.count++;
      if (x.status === 'paid') p.paid += x.avalist;
      groups.set(x.personId, p);
    }
    return [...groups.values()];
  });
</script>

<div class="av-date">
  <label
    >Tanggal bagi hasil<input
      type="date"
      bind:value={date}
      onchange={(e) => {
        date = e.currentTarget.value;
        void load();
      }}
    /></label
  >
</div>
<div class="av-metrics">
  <section class="panel">
    <span>Bagian anggota · 5%</span><strong
      >{money(data.items.reduce((n, x) => n + (x.member || 0), 0))}</strong
    >
  </section>
  <section class="panel">
    <span>Bagian avalist · 1–2%</span><strong
      >{money(data.items.reduce((n, x) => n + (x.avalist || 0), 0))}</strong
    >
  </section>
  <section class="panel">
    <span>Bagian koperasi · 3–4%</span><strong
      >{money(data.items.reduce((n, x) => n + (x.cooperative || 0), 0))}</strong
    >
  </section>
</div>
{#if data.items.some((x) => x.blocked)}<p class="form-error">
    Ada penetapan yang belum lengkap. Total pembagian hanya mencakup akad dengan persentase yang
    sudah ditetapkan.
  </p>{/if}
<section class="panel">
  <div class="av-form-panel">
    <h2>Pembagian per akad</h2>
    <p class="field-hint">
      Mengikuti jadwal bagi hasil anggota dan dana modal yang telah direkonsiliasi.
    </p>
  </div>
  <div class="av-table-wrap">
    <table class="data-table av-table">
      <thead
        ><tr
          ><th>Anggota / akad</th><th>Avalist</th><th>Anggota</th><th>Avalist</th><th>Koperasi</th
          ><th>Tindakan</th></tr
        ></thead
      ><tbody
        >{#each data.items as x}<tr
            ><td
              ><strong>{x.memberName}</strong><small>{x.contractNumber} · periode {x.period}</small
              ><small>Modal {money(x.principal)}</small></td
            ><td>{x.personName || 'Belum ditetapkan'}<small>{x.rate ? `${x.rate}%` : ''}</small></td
            ><td>{x.member == null ? '—' : money(x.member)}</td><td
              >{x.avalist == null ? '—' : money(x.avalist)}</td
            ><td
              >{x.cooperative == null ? '—' : money(x.cooperative)}<small
                >{x.cooperativeRate ? `${x.cooperativeRate}%` : ''}</small
              ></td
            ><td
              >{#if x.blocked}<Badge
                  text={x.blocked}
                  variant="red"
                />{:else if x.status === 'paid'}<Badge
                  text="Sudah dibayar"
                  variant="green"
                />{:else if x.status === 'prepared'}<button
                  class="btn secondary small-btn"
                  disabled={busy}
                  onclick={() => openPayment(x.payment)}>Catat transfer</button
                >{:else}{#if x.status === 'needs_review'}<Badge
                    text="Perlu diperiksa ulang"
                    variant="red"
                  />{/if}<button
                  class="btn secondary small-btn"
                  disabled={busy}
                  onclick={() =>
                    save(
                      '/prepare',
                      { contractId: x.contractId, date: data.date },
                      'Pembagian dan rekening disiapkan untuk pemeriksaan transfer.',
                    )}
                  >{x.status === 'needs_review' ? 'Periksa ulang' : 'Siapkan pembayaran'}</button
                >{/if}</td
            ></tr
          >{:else}<tr
            ><td colspan="6" class="empty-state"
              >Tidak ada bagi hasil terjadwal pada tanggal ini.</td
            ></tr
          >{/each}</tbody
      >
    </table>
  </div>
</section>
<section class="panel av-form-panel">
  <h2>Total per avalist · {data.date}</h2>
  {#each groups as g}<div class="av-person">
      <div>
        <strong>{g.name}</strong><small>{g.count} akad · tercatat dibayar {money(g.paid)}</small>
      </div>
      <strong>{money(g.amount)}</strong>
    </div>{:else}<p class="empty-state">Belum ada pembagian pada tanggal ini.</p>{/each}
</section>
<section class="panel">
  <div class="av-form-panel">
    <h2>Persiapan, riwayat, dan koreksi</h2>
    <p class="field-hint">
      Transfer dilakukan melalui bank. Tombol pencatatan menyimpan bukti transaksi yang telah
      dilakukan.
    </p>
  </div>
  <Payments rows={visibleHistory} finance={true} {busy} pay={openPayment} {review} />
</section>
