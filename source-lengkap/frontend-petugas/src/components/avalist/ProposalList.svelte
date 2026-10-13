<script>
  import Badge from '../../../../shared/components/Badge.svelte';
  import ApproveProposal from './ApproveProposal.svelte';
  let { data, manager, busy, save, onRegister } = $props();
  let rejection = $state('');
  let rejectId = $state('');
  const scopeNames = { new: 'Akad baru', selected: 'Akad pilihan', all: 'Semua akad berjalan' };

  const person = (id) => data?.people?.find((p) => p.id === id)?.name || '—';
  const member = (id) => data?.members?.find((m) => m.id === id)?.name || id;
  const contract = (id) => data?.contracts?.find((c) => c.id === id)?.number || id;
</script>

<section class="panel av-form-panel">
  <h2>Usulan perubahan</h2>
  {#each data.proposals as p}<article class="av-proposal">
      <div>
        <strong>{member(p.payload.memberId)}</strong>
        <Badge
          text={{ pending: 'Menunggu Manajer', approved: 'Disetujui', rejected: 'Ditolak' }[
            p.status
          ]}
          variant={p.status === 'rejected' ? 'red' : p.status === 'approved' ? 'green' : 'blue'}
        />
      </div>
      <p>
        {scopeNames[p.payload.scope]} · {p.payload.personId
          ? person(p.payload.personId)
          : 'Avalist tetap'} · {p.payload.rate ? `${p.payload.rate}%` : 'Persentase tetap'}
      </p>
      {#if p.payload.scope !== 'new'}<p>
          Mulai {p.payload.effectiveDate} · {p.payload.contractIds.map(contract).join(', ')}
        </p>{/if}
      <p>{p.payload.reason}</p>
      <small
        >Diajukan {new Date(p.createdAt).toLocaleString('id-ID', {
          timeZone: 'Asia/Makassar',
        })}</small
      >{#if p.decisionNote}<p>
          {p.decisionNote}
        </p>{/if}{#if manager && p.status === 'pending'}
        <ApproveProposal
          proposal={p}
          {onRegister}
          {data}
          {busy}
          submit={(b) =>
            save(
              '/proposals/' + p.id + '/approve',
              b,
              'Usulan disetujui dan penetapan telah berlaku.',
            )}
        />
        <div class="av-actions">
          <button
            class="btn secondary small-btn"
            disabled={busy}
            onclick={() => {
              rejectId = p.id;
              rejection = '';
            }}>Tolak</button
          >
        </div>
        {#if rejectId === p.id}<form
            class="av-form"
            onsubmit={async (e) => {
              e.preventDefault();
              if (
                await save(
                  '/proposals/' + p.id + '/reject',
                  { reason: rejection },
                  'Usulan ditolak.',
                )
              )
                rejectId = '';
            }}
          >
            <label
              >Alasan penolakan<textarea
                required
                minlength="5"
                maxlength="500"
                bind:value={rejection}></textarea></label
            ><button class="btn secondary" disabled={busy}>Simpan penolakan</button>
          </form>{/if}{/if}
    </article>{:else}<p class="empty-state">Belum ada usulan perubahan avalist.</p>{/each}
</section>
