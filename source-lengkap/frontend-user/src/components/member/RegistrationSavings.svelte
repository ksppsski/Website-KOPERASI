<script>
  import Content from '../../../../shared/components/Content.svelte';
  import TextField from '../../../../shared/components/TextField.svelte';
  import SelectField from '../../../../shared/components/SelectField.svelte';

  let { context } = $props();
  let { rupiah, state, field, specialFirst, registrationTotal, registrationProofInput } =
    $derived(context);
</script>

{#if context}
  {@const r = state.registration}
  <div class="section-label">Simpanan keanggotaan</div>
  <p class="subtext">
    Simpanan pokok dibayar sekali. Simpanan wajib Rp10.000 per bulan atau Rp120.000 per tahun.
  </p>
  <div class="form-row">
    <TextField
      label={'Simpanan pokok (Rp)'}
      name={'basic'}
      value={100000}
      options={{ type: 'number', readonly: true }}
    /><TextField
      label={'Simpanan wajib per bulan (Rp)'}
      name={'monthly'}
      value={10000}
      options={{ type: 'number', readonly: true }}
    />
  </div>
  <SelectField
    label={'Opsi setoran simpanan wajib'}
    name={'paymentOption'}
    items={['Bulanan', 'Tahunan']}
    value={r.paymentOption}
  /><TextField
    label={'Simpanan transaksi (Rp)'}
    name={'transactionSaving'}
    value={r.transactionSaving}
    options={{ type: 'number', min: 0, required: false }}
  /><SelectField
    label={'Ikut simpanan wajib khusus?'}
    name={'special'}
    items={['Tidak', 'Ya']}
    value={r.special}
  />
  <div id="special-fields" {...r.special !== 'Ya' ? { hidden: true } : {}}>
    <TextField
      label={'Simpanan wajib khusus (Rp)'}
      name={'specialAmount'}
      value={r.specialAmount}
      options={{ type: 'number', min: 1000000, required: r.special === 'Ya' }}
    /><SelectField
      label={'Cara setoran simpanan khusus'}
      name={'specialPayment'}
      items={['Tunai', 'Angsur']}
      value={r.specialPayment}
    />
    <div id="installment-fields" {...r.specialPayment !== 'Angsur' ? { hidden: true } : {}}>
      <TextField
        label={'Jumlah angsuran (kali)'}
        name={'installments'}
        value={r.installments}
        options={{
          type: 'number',
          min: 1,
          max: 60,
          required: r.special === 'Ya' && r.specialPayment === 'Angsur',
        }}
      />
      <p class="field-hint" id="special-monthly">Angsuran per bulan: {rupiah(specialFirst())}</p>
    </div>
  </div>
  <TextField
    label={'Administrasi anggota (Rp)'}
    name={'admin'}
    value={r.admin}
    options={{ type: 'number', min: 0 }}
  />
  <div class="registration-total">
    <span>Total setoran awal <small>Simpanan dan administrasi</small></span><strong
      id="registration-total">{rupiah(registrationTotal())}</strong
    >
  </div>
  <p class="field-hint">
    Simpanan wajib dialokasikan sejak bulan pendaftaran, lalu pada tanggal yang sama setiap bulan.
  </p>
  <Content value={registrationProofInput() ?? ''} />
{/if}
