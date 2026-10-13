<script>
  import { untrack, tick } from 'svelte';
  import ApproveProposal from './ApproveProposal.svelte';
  import AssignmentForm from './AssignmentForm.svelte';
  import RegistryForm from './RegistryForm.svelte';
  import Payments from '../../../../shared/components/avalist/Payments.svelte';
  import PersonalView from '../../../../shared/components/avalist/PersonalView.svelte';
  import Badge from '../../../../shared/components/Badge.svelte';
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
  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  const person = (id) => data?.people?.find((p) => p.id === id)?.name || '—';
  const member = (id) => data?.members?.find((m) => m.id === id)?.name || id;
  const contract = (id) => data?.contracts?.find((c) => c.id === id)?.number || id;
  const scopeNames = { new: 'Akad baru', selected: 'Akad pilihan', all: 'Semua akad berjalan' };
  let visibleHistory = $derived(
    (data?.history || []).filter((p) => !personal || p.status === 'paid'),
  );
  let groups = $derived.by(() => {
    const groups = new Map();
    for (const x of data?.items || []) {
      if (!x.personId) continue;
      const p = groups.get(x.personId) || { name: x.personName, amount: 0, count: 0, paid: 0 };
      p.amount += x.avalist || 0;
      p.count++;
      if (x.status === 'paid') p.paid += x.avalist;
      groups.set(x.personId, p);
    }
    return [...groups.values()];
  });
  async function api(path = '', body = null) {
    const form = body instanceof FormData;
    const r = await fetch('/api/workflow/avalist' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: {
        'X-KSPPS-Portal': 'staff',
        ...(!form ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || 'Data avalist belum dapat diproses.');
    return result;
  }
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
  let rejection = $state(''),
    rejectId = $state('');
  let correctionOriginal = $state(''),
    correctionPerson = $state(''),
    correctionAmount = $state(),
    correctionReason = $state(''),
    correctionId = $state('');
  async function correct(e) {
    e.preventDefault();
    correctionId ||= crypto.randomUUID();
    if (
      await save(
        '/adjustments',
        {
          id: correctionId,
          originalId: correctionOriginal,
          personId: correctionPerson,
          amount: correctionAmount,
          reason: correctionReason,
        },
        'Koreksi disetujui. Finance dapat mencatat penyelesaiannya.',
      )
    ) {
      correctionOriginal = '';
      correctionPerson = '';
      correctionAmount = undefined;
      correctionReason = '';
      correctionId = '';
    }
  }
  let payment = $state(null),
    dialog,
    amount = $state(),
    transferDate = $state(''),
    reference = $state(''),
    proof = $state(),
    confirmed = $state(false);
  async function openPayment(p) {
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
        <section class="panel av-form-panel">
          <h2>Usulan perubahan</h2>
          {#each data.proposals as p}<article class="av-proposal">
              <div>
                <strong>{member(p.payload.memberId)}</strong>
                <Badge
                  text={{ pending: 'Menunggu Manajer', approved: 'Disetujui', rejected: 'Ditolak' }[
                    p.status
                  ]}
                  variant={p.status === 'rejected'
                    ? 'red'
                    : p.status === 'approved'
                      ? 'green'
                      : 'blue'}
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
                  onRegister={() => (tab = 'people')}
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
                : 'Email avalist terdaftar. Pemilik email dapat masuk melalui ChatGPT dengan email yang sama.',
            )}
        />
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
      {:else if manager && tab === 'history'}
        <section class="panel">
          <div class="av-form-panel">
            <h2>Riwayat penetapan</h2>
            <p class="field-hint">
              Penetapan baru ditambahkan sebagai riwayat. Catatan lama tetap tersimpan.
            </p>
          </div>
          <div class="av-table-wrap">
            <table class="data-table av-table">
              <thead
                ><tr
                  ><th>Anggota / akad</th><th>Berlaku</th><th>Avalist / persentase</th><th
                    >Alasan</th
                  ></tr
                ></thead
              ><tbody
                >{#each data.events as e}<tr
                    ><td
                      >{member(e.memberId)}<small
                        >{e.contractId ? contract(e.contractId) : 'Bawaan untuk akad baru'}</small
                      ></td
                    ><td
                      >{e.date === '1901-01-01' ? 'Sejak akad dibuat' : e.date}<small
                        >Dicatat {new Date(e.createdAt).toLocaleDateString('id-ID')}</small
                      ></td
                    ><td
                      >{e.personId ? person(e.personId) : 'Avalist tetap'}<small
                        >{e.rate
                          ? `${e.rate}% · koperasi ${5 - e.rate}%`
                          : 'Persentase tetap'}</small
                      ></td
                    ><td>{e.reason}<small>Dicatat oleh {e.actorName || e.actor}</small></td></tr
                  >{:else}<tr
                    ><td colspan="4" class="empty-state">Belum ada penetapan avalist.</td></tr
                  >{/each}</tbody
              >
            </table>
          </div>
        </section>
        <section class="panel av-form-panel">
          <h2>Koreksi pembayaran selesai</h2>
          <p class="subtext">
            Buat penyesuaian terpisah. Untuk pemindahan hak, catat pengembalian dari avalist lama
            dan pembayaran ke avalist baru sebagai dua koreksi.
          </p>
          <form class="av-form" onsubmit={correct}>
            <label
              >Pembayaran asal<select required bind:value={correctionOriginal}
                ><option value="">Pilih pembayaran selesai</option
                >{#each data.history.filter((p) => p.status === 'paid' && p.kind === 'regular') as p}<option
                    value={p.id}
                    >{p.detail.contractNumber} · {p.date} · {p.detail.personName} · {money(
                      p.amount,
                    )}</option
                  >{/each}</select
              ></label
            ><label
              >Avalist penerima / pengembali<select required bind:value={correctionPerson}
                ><option value="">Pilih avalist</option
                >{#each data.people.filter((p) => p.active && p.available) as p}<option value={p.id}
                    >{p.name}</option
                  >{/each}</select
              ></label
            ><label
              >Nominal koreksi (Rp)<input
                type="number"
                required
                step="1"
                bind:value={correctionAmount}
              /><small
                >Positif untuk pembayaran tambahan; negatif untuk pengembalian ke koperasi. Selisih
                menjadi penyesuaian bagian koperasi.</small
              ></label
            ><label
              >Alasan koreksi<textarea
                required
                minlength="5"
                maxlength="500"
                bind:value={correctionReason}></textarea></label
            ><button class="btn" disabled={busy}>Setujui koreksi pembayaran</button>
          </form>
        </section>
        <section class="panel">
          <div class="av-form-panel"><h2>Riwayat pembayaran dan koreksi</h2></div>
          <Payments rows={visibleHistory} />
        </section>
      {:else if finance}
        <div class="av-date">
          <label
            >Tanggal bagi hasil<input
              type="date"
              bind:value={date}
              onchange={(e) => {
                date = e.currentTarget.value;
                void load();
              }}
            /></label
          >
        </div>
        <div class="av-metrics">
          <section class="panel">
            <span>Bagian anggota · 5%</span><strong
              >{money(data.items.reduce((n, x) => n + (x.member || 0), 0))}</strong
            >
          </section>
          <section class="panel">
            <span>Bagian avalist · 1–2%</span><strong
              >{money(data.items.reduce((n, x) => n + (x.avalist || 0), 0))}</strong
            >
          </section>
          <section class="panel">
            <span>Bagian koperasi · 3–4%</span><strong
              >{money(data.items.reduce((n, x) => n + (x.cooperative || 0), 0))}</strong
            >
          </section>
        </div>
        {#if data.items.some((x) => x.blocked)}<p class="form-error">
            Ada penetapan yang belum lengkap. Total pembagian hanya mencakup akad dengan persentase
            yang sudah ditetapkan.
          </p>{/if}
        <section class="panel">
          <div class="av-form-panel">
            <h2>Pembagian per akad</h2>
            <p class="field-hint">
              Mengikuti jadwal bagi hasil anggota dan dana modal yang telah direkonsiliasi.
            </p>
          </div>
          <div class="av-table-wrap">
            <table class="data-table av-table">
              <thead
                ><tr
                  ><th>Anggota / akad</th><th>Avalist</th><th>Anggota</th><th>Avalist</th><th
                    >Koperasi</th
                  ><th>Tindakan</th></tr
                ></thead
              ><tbody
                >{#each data.items as x}<tr
                    ><td
                      ><strong>{x.memberName}</strong><small
                        >{x.contractNumber} · periode {x.period}</small
                      ><small>Modal {money(x.principal)}</small></td
                    ><td
                      >{x.personName || 'Belum ditetapkan'}<small
                        >{x.rate ? `${x.rate}%` : ''}</small
                      ></td
                    ><td>{x.member == null ? '—' : money(x.member)}</td><td
                      >{x.avalist == null ? '—' : money(x.avalist)}</td
                    ><td
                      >{x.cooperative == null ? '—' : money(x.cooperative)}<small
                        >{x.cooperativeRate ? `${x.cooperativeRate}%` : ''}</small
                      ></td
                    ><td
                      >{#if x.blocked}<Badge
                          text={x.blocked}
                          variant="red"
                        />{:else if x.status === 'paid'}<Badge
                          text="Sudah dibayar"
                          variant="green"
                        />{:else if x.status === 'prepared'}<button
                          class="btn secondary small-btn"
                          disabled={busy}
                          onclick={() => openPayment(x.payment)}>Catat transfer</button
                        >{:else}{#if x.status === 'needs_review'}<Badge
                            text="Perlu diperiksa ulang"
                            variant="red"
                          />{/if}<button
                          class="btn secondary small-btn"
                          disabled={busy}
                          onclick={() =>
                            save(
                              '/prepare',
                              { contractId: x.contractId, date: data.date },
                              'Pembagian dan rekening disiapkan untuk pemeriksaan transfer.',
                            )}
                          >{x.status === 'needs_review'
                            ? 'Periksa ulang'
                            : 'Siapkan pembayaran'}</button
                        >{/if}</td
                    ></tr
                  >{:else}<tr
                    ><td colspan="6" class="empty-state"
                      >Tidak ada bagi hasil terjadwal pada tanggal ini.</td
                    ></tr
                  >{/each}</tbody
              >
            </table>
          </div>
        </section>
        <section class="panel av-form-panel">
          <h2>Total per avalist · {data.date}</h2>
          {#each groups as g}<div class="av-person">
              <div>
                <strong>{g.name}</strong><small
                  >{g.count} akad · tercatat dibayar {money(g.paid)}</small
                >
              </div>
              <strong>{money(g.amount)}</strong>
            </div>{:else}<p class="empty-state">Belum ada pembagian pada tanggal ini.</p>{/each}
        </section>
        <section class="panel">
          <div class="av-form-panel">
            <h2>Persiapan, riwayat, dan koreksi</h2>
            <p class="field-hint">
              Transfer dilakukan melalui bank. Tombol pencatatan menyimpan bukti transaksi yang
              telah dilakukan.
            </p>
          </div>
          <Payments rows={visibleHistory} finance={true} {busy} pay={openPayment} {review} />
        </section>
      {/if}
    {/if}
  {/if}
</div>
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
