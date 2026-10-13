<script>
  import Badge from '../../../../shared/components/Badge.svelte';
  let { data } = $props();
</script>

<section class="panel av-form-panel">
  {#each data.people as p}<div class="av-person">
      <div>
        <strong>{p.name}</strong>{#if p.email}<small>{p.email}</small>{/if}<small
          >{p.bankName && p.bankAccount && p.accountName
            ? `${p.bankName} · ${p.bankAccount} · ${p.accountName}`
            : 'Rekening belum lengkap'}</small
        >
      </div>
      <Badge
        text={!p.active
          ? 'Nonaktif'
          : p.pending
            ? 'Menunggu masuk'
            : p.linked
              ? 'Avalist aktif'
              : 'Akses dicabut'}
        variant={p.active && p.pending ? 'blue' : p.linked && p.active ? 'green' : 'gray'}
      />
    </div>{:else}<p class="empty-state">Belum ada avalist internal terdaftar.</p>{/each}
</section>
