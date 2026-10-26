<script>
  import { formatMoney as money } from '../../../../shared/lib/formatters.js';
  import { getContext } from 'svelte';
  const api = createAvalistApi(getContext('kspps-portal').request);
  import { createAvalistApi } from '../../features/avalist/client.js';
  import FeeSchedule from './FeeSchedule.svelte';
  import PaymentDialog from './PaymentDialog.svelte';
  import CorrectionForm from './CorrectionForm.svelte';
  import AssignmentHistory from './AssignmentHistory.svelte';
  import AvalistDirectory from './AvalistDirectory.svelte';
  import ProposalList from './ProposalList.svelte';
  import { untrack } from 'svelte';
  import AssignmentForm from './AssignmentForm.svelte';
  import RegistryForm from './RegistryForm.svelte';
  import Payments from '../../../../shared/components/avalist/Payments.svelte';
  import PersonalView from '../../../../shared/components/avalist/PersonalView.svelte';
  import '../../../../shared/styles/avalist.css';
  let { route } = $props();
  let personal = $derived(route.startsWith('avalist-')),
    manager = $derived(route === 'manager-avalist'),
    admin = $derived(route === 'admin-avalist'),
    finance = $derived(route === 'finance-avalist');
  let data = $state(null),
    loading = $state(false),
    busy = $state(false),
    error = $state(''),
    notice = $state(''),
    tab = $state('assignments'),
    date = $state(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()),
    );
  let generation = 0;
  let visibleHistory = $derived(
    (data?.history || []).filter((p) => !personal || p.status === 'paid'),
  );
  async function load(clear = false) {
    const gen = ++generation;
    loading = true;
    error = '';
    if (clear) data = null;
    try {
      const value = await api('?date=' + date + (personal ? '&view=personal' : ''));
      if (gen === generation) data = value;
    } catch (e) {
      if (gen === generation) error = e.message;
    } finally {
      if (gen === generation) loading = false;
    }
  }
  $effect(() => {
    route;
    untrack(() => {
      notice = '';
      tab = 'assignments';
      void load(true);
    });
  });
  async function save(path, body, message) {
    if (busy) return false;
    busy = true;
    error = '';
    notice = '';
    try {
      await api(path, body);
      notice = message;
      await load();
      return true;
    } catch (e) {
      error = e.message;
      return false;
    } finally {
      busy = false;
    }
  }
  let paymentDialog = $state();
  const openPayment = (payment) => paymentDialog.open(payment);
  const review = (p) =>
    p.kind === 'adjustment'
      ? save('/payments/' + p.id + '/review', {}, 'Rekening koreksi telah diperiksa ulang.')
      : save(
          '/prepare',
          { contractId: p.contractId, date: p.date },
          'Pembagian terbaru siap diperiksa sebelum transfer.',
        );
</script>

<div class="av-page">
  <div class="page-heading">
    <div>
      <h1>
        {personal
          ? {
              'avalist-ringkasan': 'Ringkasan Avalist',
              'avalist-anggota': 'Anggota Referensi',
              'avalist-rincian': 'Rincian Bagian',
              'avalist-riwayat': 'Riwayat Pembayaran',
            }[route]
          : manager
            ? 'Pengelolaan Avalist'
            : admin
              ? 'Usulan Avalist'
              : 'Pembayaran Avalist'}
      </h1>
      <p class="subtext">
        {personal
          ? 'Hak bagi hasil sesuai penetapan Manajer.'
          : manager
            ? 'Penetapan, persentase, dan koreksi hanya disahkan oleh Manajer.'
            : admin
              ? 'Usulan baru berlaku setelah disetujui Manajer.'
              : 'Periksa pembagian per akad, lalu catat transaksi bank yang sudah dilakukan.'}
      </p>
    </div>
    <button class="btn secondary" disabled={loading || busy} onclick={() => load()}>Perbarui</button
    >
  </div>
  {#if error}<p class="form-error av-message" role="alert">{error}</p>{/if}
  {#if notice}<p class="info-box av-message" role="status">{notice}</p>{/if}
  {#if loading && !data}<section class="panel av-form-panel" role="status">
      Memuat data avalist…
    </section>{:else if data}
    {#if personal}
      <PersonalView {data} {route} />
    {:else}
      {#if manager}<nav class="av-tabs" aria-label="Pengelolaan avalist">
          {#each [['assignments', 'Penetapan & usulan'], ['people', 'Daftar avalist'], ['history', 'Riwayat & koreksi']] as [key, label]}<button
              class:active={tab === key}
              aria-pressed={tab === key}
              onclick={() => (tab = key)}>{label}</button
            >{/each}
        </nav>{/if}
      {#if admin || (manager && tab === 'assignments')}
        <AssignmentForm
          {data}
          {busy}
          {admin}
          submit={(b) =>
            save(
              admin ? '/proposals' : '/assignments',
              b,
              admin
                ? 'Usulan terkirim ke Manajer.'
                : 'Penetapan tersimpan sesuai periode yang dipilih.',
            )}
        />
        <ProposalList {data} {manager} {busy} {save} onRegister={() => (tab = 'people')} />
      {:else if manager && tab === 'people'}
        <RegistryForm
          {data}
          {busy}
          submit={(b) =>
            save(
              '/people',
              b,
              b.id
                ? 'Data avalist tersimpan. Persiapan pembayaran yang terpengaruh perlu diperiksa ulang.'
                : 'Email avalist terdaftar.',
            )}
        />
        <AvalistDirectory {data} />
      {:else if manager && tab === 'history'}
        <AssignmentHistory {data} />
        <CorrectionForm {data} {busy} {save} />
        <section class="panel">
          <div class="av-form-panel"><h2>Riwayat pembayaran dan koreksi</h2></div>
          <Payments rows={visibleHistory} />
        </section>
      {:else if finance}
        <FeeSchedule {data} bind:date {busy} {save} {openPayment} {review} {load} />
      {/if}
    {/if}
  {/if}
</div>
<PaymentDialog bind:this={paymentDialog} {data} {busy} {error} {save} />
