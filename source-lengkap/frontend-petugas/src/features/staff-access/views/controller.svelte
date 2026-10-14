<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  export {
    EntryView,
    Entry2View,
    Entry3View,
    WhoView,
    Entry5View,
    Entry6View,
    Entry4View,
    Entry7View,
    Entry9View,
    Entry10View,
    Entry8View,
    AccountRowsView,
    AccountRows4View,
    AccountRows5View,
    AccountRows3View,
    AccountRows2View,
    AccountRows6View,
    AccountsView,
  };
</script>

{#snippet EntryView()}
  <p role="status">Memeriksa akses akun…</p>
{/snippet}

{#snippet Entry2View({ error })}
  <p class="form-error" role="alert"><Content value={error} /></p>
  <button type="button" class="btn" data-access-action="refresh">Coba lagi</button>
{/snippet}

{#snippet Entry3View({ encodeURIComponent })}
  <p>Masuk menggunakan akun yang terdaftar sebagai petugas.</p>
  <a class="btn full" target="_top" href={'/signin-with-chatgpt?return_to=' + encodeURIComponent}
    >Masuk dengan ChatGPT</a
  >
{/snippet}

{#snippet WhoView({ slice, fieldName, email })}
  <div class="staff-login-box">
    <span class="avatar"><Content value={slice} /></span>
    <div>
      <strong><Content value={fieldName} /></strong><small><Content value={email} /></small>
    </div>
  </div>
{/snippet}

{#snippet Entry5View({ iContent, r, rValue })}
  <button type="button" class={'btn ' + iContent + 'full'} data-action="enter" data-role={r}>
    Buka portal <Content value={rValue} />
  </button>
{/snippet}

{#snippet Entry6View()}
  <a class="btn secondary full" href="/avalist.html">Buka Portal Avalist</a>
{/snippet}

{#snippet Entry4View({ allowedRolesRowsRows, includesContent, accountRole })}
  <div class="staff-role-entry">
    <Content value={allowedRolesRowsRows} />
    <Content value={includesContent} />
  </div>
  <p class="field-hint">Hak akses akun: <Content value={accountRole} />.</p>
{/snippet}

{#snippet Entry7View()}
  <p>Aktifkan akun di atas sebagai Manajer utama koperasi.</p>
  <button type="button" class="btn full" data-access-action="activate">
    Aktifkan akun Manajer
  </button>
  <p class="field-hint">Tautan ini hanya dapat digunakan untuk satu akun.</p>
{/snippet}

{#snippet Entry9View({ statusContent, code })}
  <p class="field-hint">
    <Content value={statusContent} />
  </p>
  <p class="access-code"><Content value={code} /></p>
{/snippet}

{#snippet Entry10View()}
  <button type="button" class="btn full" data-access-action="request"
    >Ajukan akses ke Manajer</button
  >
{/snippet}

{#snippet Entry8View({ requestContent })}
  <p>Akun ini belum memiliki akses petugas.</p>
  <Content value={requestContent} /><button
    type="button"
    class="btn secondary full"
    data-access-action="refresh"
  >
    Periksa akses
  </button>
{/snippet}

{#snippet AccountRowsView()}
  <p role="status">Memuat permintaan akses…</p>
{/snippet}

{#snippet AccountRows4View({ code, r, roleContent, rValue })}
  <button
    class="btn secondary small-btn"
    data-access-action="grant"
    data-code={code}
    data-role={r}
    {...attributeProps(roleContent)}
  >
    <Content value={rValue} />
  </button>
{/snippet}

{#snippet AccountRows5View({ code })}
  <button
    class="btn secondary small-btn"
    data-access-action="grant"
    data-code={code}
    data-role="revoke"
  >
    Cabut akses
  </button>
{/snippet}

{#snippet AccountRows3View({ fieldName, email, code, role, Rows, roleContent })}
  <tr>
    <td>
      <strong><Content value={fieldName} /></strong><small><Content value={email} /></small><small
        class="access-code"><Content value={code} /></small
      >
    </td>
    <td>
      <Content value={role} />
    </td>
    <td>
      <div class="wf-actions">
        <Content value={Rows} /><Content value={roleContent} />
      </div>
    </td>
  </tr>
{/snippet}

{#snippet AccountRows2View({ accountsRows })}
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>AKUN / KODE PERMINTAAN</th>
          <th>AKSES</th>
          <th>TINDAKAN</th>
        </tr>
      </thead>
      <tbody>
        <Content value={accountsRows} />
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet AccountRows6View()}
  <div class="empty-state">Belum ada permintaan akses petugas.</div>
{/snippet}

{#snippet AccountsView({ message })}
  <p class="form-error"><Content value={message} /></p>
{/snippet}
