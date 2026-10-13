<script>
  import MemberLayout from './components/member/MemberLayout.svelte';
  import MemberLogin from './components/member/MemberLogin.svelte';
  import ForgotPassword from './components/member/ForgotPassword.svelte';
  import RegistrationComplete from './components/member/RegistrationComplete.svelte';
  import MemberDashboard from './components/member/MemberDashboard.svelte';
  import MemberSavings from './components/member/MemberSavings.svelte';
  import MemberCapital from './components/member/MemberCapital.svelte';
  import MemberFinancing from './components/member/MemberFinancing.svelte';
  import MemberDocuments from './components/member/MemberDocuments.svelte';
  import MemberProfile from './components/member/MemberProfile.svelte';
  import MemberHelp from './components/member/MemberHelp.svelte';
  import MemberRegistration from './components/member/MemberRegistration.svelte';
  import FeaturePage from './components/FeaturePage.svelte';
  import PortalFrame from '../../shared/components/PortalFrame.svelte';
  let { view } = $props();
  const memberPages = {
    ringkasan: MemberDashboard,
    simpanan: MemberSavings,
    modal: MemberCapital,
    pembiayaan: MemberFinancing,
    dokumen: MemberDocuments,
    profil: MemberProfile,
    bantuan: MemberHelp,
  };
</script>

<PortalFrame>
  <div id="app">
    {#if $view}
      {@const model = $view}
      {@const context = model.context}
      {@const route = model.route}
      {#key model}
        {#if route === 'masuk'}
          <MemberLogin {context} />
        {:else if route === 'lupa-sandi'}
          <ForgotPassword {context} />
        {:else if route === 'daftar-selesai'}
          <RegistrationComplete {context} />
        {:else if route === 'daftar'}
          <MemberRegistration {context} />
        {:else}
          <MemberLayout {context} {route}>
            {#if window.KsppsWorkflow?.getProfile()?.status === 'closed'}
              {@html window.KsppsWithdrawal?.closedPage() || '<p>Keanggotaan ditutup.</p>'}
            {:else if memberPages[route]}
              {@const Page = memberPages[route]}
              <Page {context} {route} />
            {:else}
              <FeaturePage {route} />
            {/if}
          </MemberLayout>
        {/if}
      {/key}
    {/if}
  </div>
</PortalFrame>
