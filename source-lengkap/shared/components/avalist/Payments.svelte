<script>
  import { formatMoney as money } from '../../lib/formatters.js';
  import Badge from '../Badge.svelte';
  let { rows = [], finance = false, personal = false, busy = false, pay, review } = $props();
  const labels = {
    paid: 'Sudah dibayar',
    prepared: 'Siap dibayar',
    needs_review: 'Perlu diperiksa ulang',
  };
</script>

<div class="av-table-wrap">
  <table class="data-table av-table">
    <thead
      ><tr
        ><th>Akad / periode</th>{#if !personal}<th>Avalist</th>{/if}<th>Nominal</th><th>Status</th
        ><th>Transaksi</th>{#if finance}<th>Tindakan</th>{/if}</tr
      ></thead
    ><tbody>
      {#each rows as p}<tr>
          <td
            ><strong>{p.detail.contractNumber}</strong><small
              >{p.detail.memberName} · {p.date}</small
            >{#if p.kind === 'adjustment'}<Badge text="Koreksi" variant="blue" /><small
                >{p.reason || 'Penyesuaian disetujui Manajer'}</small
              >{/if}</td
          >
          {#if !personal}<td
              >{p.detail.personName}<small>{p.detail.bankName} · {p.detail.bankAccount}</small
              ><small>a.n. {p.detail.accountName}</small></td
            >{/if}
          <td class="money"
            ><strong>{money(Math.abs(p.amount))}</strong><small
              >{p.amount < 0 ? 'Pengembalian ke koperasi' : 'Pembayaran ke avalist'}</small
            ></td
          >
          <td
            ><Badge
              text={p.status === 'paid' && p.amount < 0
                ? 'Pengembalian diterima'
                : labels[p.status] || p.status}
              variant={p.status === 'needs_review' ? 'red' : p.status === 'paid' ? 'green' : 'blue'}
            /></td
          >
          <td
            >{p.transferDate || '—'}<small>{p.reference || ''}</small>{#if p.proofUrl}<a
                href={p.proofUrl}
                target="_blank"
                rel="noreferrer">Bukti transaksi</a
              >{/if}</td
          >
          {#if finance}<td
              >{#if p.status === 'prepared'}<button
                  class="btn secondary small-btn"
                  disabled={busy}
                  onclick={() => pay(p)}
                  >{p.amount < 0 ? 'Catat pengembalian' : 'Catat transfer'}</button
                >{:else if p.status === 'needs_review'}<button
                  class="btn secondary small-btn"
                  disabled={busy}
                  onclick={() => review(p)}>Periksa ulang</button
                >{/if}</td
            >{/if}
        </tr>{:else}<tr
          ><td colspan={finance ? 6 : personal ? 4 : 5} class="empty-state"
            >Belum ada pembayaran pada daftar ini.</td
          ></tr
        >{/each}
    </tbody>
  </table>
</div>
