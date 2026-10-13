<script>
  let { data, busy, submit } = $props();
  let id = $state(''),
    email = $state(''),
    name = $state(''),
    bankName = $state(''),
    bankAccount = $state(''),
    accountName = $state(''),
    active = $state(true),
    reason = $state(''),
    version = $state(0);
  function select(value = '') {
    id = value;
    const p = data.people.find((p) => p.id === id);
    email = p?.email || '';
    name = p?.name || '';
    bankName = p?.bankName || '';
    bankAccount = p?.bankAccount || '';
    accountName = p?.accountName || '';
    active = p?.active ?? true;
    version = p?.version || 0;
    reason = '';
  }
  async function send(e) {
    e.preventDefault();
    if (
      await submit({ id, email, name, bankName, bankAccount, accountName, active, reason, version })
    )
      select();
  }
</script>

<section class="panel av-form-panel">
  <h2>Daftar avalist internal</h2>
  <p class="subtext">
    Manajer cukup mendaftarkan email. Avalist masuk melalui ChatGPT dengan email yang sama dan
    mendapat akses ke data avalist miliknya. Tidak perlu menjadi Admin atau Finance.
  </p>
  <p class="field-hint">
    Tautan masuk khusus avalist: <a href="/avalist.html" target="_blank" rel="noreferrer"
      >Buka Portal Avalist</a
    >
  </p>
  <form class="av-form" onsubmit={send}>
    {#if data.people.length}
      <label
        >Data avalist<select bind:value={id} onchange={(e) => select(e.currentTarget.value)}>
          <option value="">Daftarkan email baru</option>
          {#each data.people as p}<option value={p.id}>{p.name}</option>{/each}
        </select></label
      >
    {/if}
    <label
      >Email avalist<input
        type="email"
        required={!id}
        readonly={!!id}
        maxlength="200"
        autocomplete="off"
        bind:value={email}
        placeholder="nama@kantor.co.id"
      /></label
    >
    {#if id}<p class="field-hint">
        Email tetap terhubung ke akun yang sama untuk menjaga kepemilikan riwayat.
      </p>{/if}
    <label
      >Nama avalist <span class="field-hint">(opsional)</span><input
        minlength="2"
        maxlength="160"
        bind:value={name}
      /></label
    >
    <p class="field-hint">
      Rekening boleh dilengkapi kemudian. Pembayaran hanya dapat diproses setelah rekening lengkap.
    </p>
    <div class="av-grid">
      <label
        >Bank <span class="field-hint">(opsional)</span><input
          minlength="2"
          maxlength="100"
          bind:value={bankName}
        /></label
      >
      <label
        >Nomor rekening <span class="field-hint">(opsional)</span><input
          minlength="3"
          maxlength="60"
          inputmode="numeric"
          bind:value={bankAccount}
        /></label
      >
    </div>
    <label
      >Nama pemilik rekening <span class="field-hint">(opsional)</span><input
        minlength="2"
        maxlength="160"
        bind:value={accountName}
      /></label
    >
    {#if id}
      <label class="av-check"
        ><input type="checkbox" bind:checked={active} />Aktif untuk penetapan dan pembayaran</label
      >
      <label
        >Alasan perubahan<textarea
          required
          minlength="5"
          maxlength="500"
          rows="2"
          bind:value={reason}></textarea></label
      >
    {/if}
    <button class="btn" disabled={busy || (!id && !email.trim())}
      >{busy ? 'Menyimpan…' : id ? 'Simpan perubahan' : 'Daftarkan avalist'}</button
    >
  </form>
</section>
