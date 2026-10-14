<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  let { context } = $props();
  let { heading } = $derived(context);
</script>

{#if context}
  <PageHeading
    title={'Profil Anggota'}
    description={'Data pendaftaran yang digunakan pada akad Anda.'}
  /><Content value={(app.services.workflow?.memberProfile() || '') ?? ''} />
  <div class="wf-profile-link">
    <a class="btn secondary" href="#pengunduran">Pengunduran diri anggota</a>
  </div>
{/if}
