<script>
  import Content from '../Content.svelte';
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  let { context, route } = $props();
  let { staff, frame, action } = $derived(context);
</script>

{#if route === 'penyertaan'}
  <div class="page-heading">
    <div>
      <h1>Penyertaan Modal</h1>
      <p class="subtext">Periksa nominal dan bukti transfer sebelum membuat akad.</p>
    </div>
  </div>
  <Content value={frame('staff-capital', 'Draf penyertaan modal')} />
{:else if staff}
  <div class="page-heading">
    <div>
      <h1>Pengunduran Diri</h1>
      <p class="subtext">Periksa kontrak yang berjalan, lalu setujui atau tolak permohonan.</p>
    </div>
  </div>
  <Content value={frame('staff-withdrawal', 'Permohonan anggota')} />
{:else}
  <div class="page-heading">
    <div>
      <h1>Pengunduran Diri</h1>
      <p class="subtext">
        Pantau pemeriksaan Admin, pengembalian Finance, dan persetujuan final Manajer.
      </p>
    </div>
    <Content value={action('withdrawal', '', 'Ajukan pengunduran diri', true)} />
  </div>
  <Content value={app.services.withdrawal?.eligibility() || ''} />
  <Content value={frame('member-withdrawal', 'Permohonan Anda')} />
{/if}
