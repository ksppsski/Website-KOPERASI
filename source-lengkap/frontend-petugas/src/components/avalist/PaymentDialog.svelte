<script>
  import { formatMoney as money } from '../../../../shared/lib/formatters.js';
  import { tick } from 'svelte';
  let { data, busy, error, save } = $props();
  let payment = $state(null),
    dialog,
    amount = $state(),
    transferDate = $state(''),
    reference = $state(''),
    proof = $state(),
    confirmed = $state(false);
  export async function open(p) {
    payment = p;
    amount = Math.abs(p.amount);
    transferDate = data.today;
    reference = '';
    proof = undefined;
    confirmed = false;
    await tick();
    dialog.showModal();
  }
  async function pay(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.set('version', String(payment.version));
    if (
      await save(
        '/payments/' + payment.id + '/pay',
        form,
        'Transaksi tersimpan. Pembayaran ini tidak dapat ditimpa.',
      )
    ) {
      dialog.close();
      payment = null;
    }
  }
</script>

<dialog class="av-dialog" bind:this={dialog} onclose={() => (payment = null)}>
  {#if payment}<div class="av-dialog-head">
      <h2>{payment.amount < 0 ? 'Catat pengembalian koreksi' : 'Catat transfer avalist'}</h2>
      <button
        type="button"
        class="btn secondary small-btn"
        disabled={busy}
        onclick={() => dialog.close()}>Tutup</button
      >
    </div>
    <p>
      <strong>{payment.detail.personName}</strong> · {payment.detail.contractNumber} · {payment.date}
    </p>
    <p>
      {payment.detail.bankName} · {payment.detail.bankAccount}<br />a.n. {payment.detail
        .accountName}
    </p>
    <p class="av-payment-amount">{money(Math.abs(payment.amount))}</p>
    {#if payment.amount < 0}<p class="info-box">
        Dana dikembalikan dari avalist ke rekening koperasi.
      </p>{/if}
    <form class="av-form" onsubmit={pay}>
      <label
        >Nominal transaksi (Rp)<input
          required
          name="amount"
          type="number"
          min="1"
          step="1"
          bind:value={amount}
        /></label
      ><label
        >Tanggal transaksi<input
          required
          type="date"
          name="transferDate"
          min={payment.date}
          max={data.today}
          bind:value={transferDate}
        /></label
      ><label
        >Referensi transaksi<input
          required
          name="reference"
          minlength="3"
          maxlength="160"
          bind:value={reference}
        /></label
      ><label
        >Bukti transaksi (JPG, PNG, PDF; maksimal 10 MB)<input
          required
          name="proof"
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          bind:files={proof}
        /></label
      ><label class="av-check"
        ><input required name="confirm" value="yes" type="checkbox" bind:checked={confirmed} />Saya
        sudah memeriksa penerima, nominal, dan transaksi bank.</label
      >{#if error}<p class="form-error" role="alert">{error}</p>{/if}<button
        class="btn"
        disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan transaksi selesai'}</button
      >
    </form>{/if}
</dialog>
