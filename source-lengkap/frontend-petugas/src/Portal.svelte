<script>
  import AvalistPage from './components/avalist/AvalistPage.svelte';
  import StaffLayout from './components/staff/StaffLayout.svelte';
  import StaffLogin from './components/staff/StaffLogin.svelte';
  import AdminDashboard from './components/staff/AdminDashboard.svelte';
  import MemberApplications from './components/staff/MemberApplications.svelte';
  import DepositReview from './components/staff/DepositReview.svelte';
  import MemberDirectory from './components/staff/MemberDirectory.svelte';
  import ContractDocuments from './components/staff/ContractDocuments.svelte';
  import FeaturePage from './components/FeaturePage.svelte';
  import PortalFrame from '../../shared/components/PortalFrame.svelte';
  let { view } = $props();
  const staffPages = {
    ringkasan: AdminDashboard,
    pendaftaran: MemberApplications,
    setoran: DepositReview,
    anggota: MemberDirectory,
    akad: ContractDocuments,
  };
</script>

<PortalFrame>
  <div id="app">
    {#if $view}
      {@const model = $view}
      {@const context = model.context}
      {@const route = model.route}
      {#if route.includes('avalist')}
        {#key route.split('-')[0]}
          <StaffLayout {context} {route}><AvalistPage {route} /></StaffLayout>
        {/key}
      {:else}
        {#key model}
          {#if route === 'masuk'}
            <StaffLogin {context} />
          {:else}
            <StaffLayout {context} {route}>
              {#if staffPages[route]}
                {@const Page = staffPages[route]}
                <Page {context} {route} />
              {:else}
                <FeaturePage {route} />
              {/if}
            </StaffLayout>
          {/if}
        {/key}
      {/if}
    {/if}
  </div>
</PortalFrame>
