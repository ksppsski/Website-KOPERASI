<script>
  import SelectField from '../../../../shared/components/SelectField.svelte';
  import TextField from '../../../../shared/components/TextField.svelte';
  import ReviewList from '../../../../shared/components/ReviewList.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';
  import MemberAuthLayout from './MemberAuthLayout.svelte';
  import RegistrationSavings from './RegistrationSavings.svelte';
  let { context, wide = false } = $props();
  let {
    rupiah,
    badge,
    state,
    field,
    registrationKtpInput,
    specialFirst,
    registrationTotal,
    heading,
  } = $derived(context);
</script>

{#if context}
  {#if window.KsppsWorkflow?.getProfile()?.status === 'closed'}<MemberAuthLayout {context}
      >{@html window.KsppsWithdrawal?.closedPage() || 'Keanggotaan ditutup.'}</MemberAuthLayout
    >{:else}
    {@const r = state.registration}
    {@const s = state.registrationStep}
    {@const names = ['Data diri', 'Simpanan', 'Persetujuan', 'Tinjau']}
    <MemberAuthLayout {context} wide={true}>
      <span class="badge">Pendaftaran Anggota</span>
      <h1>Mari bergabung bersama.</h1>
      <p class="subtext">Lengkapi data calon anggota KSPPS.</p>
      <ol class="stepper">
        {#each names as n, i}
          <li
            class={i + 1 === s ? 'active' : i + 1 < s ? 'done' : ''}
            {...i + 1 === s ? { 'aria-current': 'step' } : {}}
          >
            <span
              >{#if i + 1 < s}
                ✓
              {:else}
                {i + 1}
              {/if}</span
            >{n}
          </li>
        {/each}
      </ol>
      {#if s === 1}
        {@html window.KsppsWorkflow?.registrationAccess() || ''}
      {/if}
      <form id="registration-form">
        {#if s === 1}
          <SelectField
            label={'Kantor layanan'}
            name={'office'}
            items={['Kantor KSPPS Makassar']}
            value={r.office}
          />
          <div class="section-label">Data calon anggota</div>
          <TextField
            label={'Nama lengkap'}
            name={'name'}
            value={r.name}
            options={{ placeholder: 'Sesuai identitas, huruf kapital' }}
          />
          <div class="form-row">
            <TextField label={'Tempat lahir'} name={'birthplace'} value={r.birthplace} /><TextField
              label={'Tanggal lahir'}
              name={'birthdate'}
              value={r.birthdate}
              options={{ type: 'date', max: new Date().toISOString().slice(0, 10) }}
            />
          </div>
          <div class="form-row">
            <SelectField
              label={'Jenis kelamin'}
              name={'gender'}
              items={['', 'Laki-laki', 'Perempuan']}
              value={r.gender}
            /><SelectField
              label={'Jenis identitas'}
              name={'identityType'}
              items={['KTP', 'SIM', 'Paspor']}
              value={r.identityType}
            />
          </div>
          <TextField
            label={'Nomor identitas'}
            name={'identityNumber'}
            value={r.identityNumber}
            options={{
              placeholder: r.identityType === 'KTP' ? '16 digit NIK' : 'Nomor identitas',
              pattern: r.identityType === 'KTP' ? '[0-9]{16}' : '.{5,25}',
            }}
          />{@html registrationKtpInput() ?? ''}<SelectField
            label={'Agama'}
            name={'religion'}
            items={['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu']}
            value={r.religion}
          /><TextField
            label={'Alamat sesuai identitas'}
            name={'identityAddress'}
            value={r.identityAddress}
            options={{ maxlength: 240 }}
          />
          <div class="form-row">
            <TextField
              label={'Kelurahan / desa'}
              name={'village'}
              value={r.village}
              options={{ maxlength: 80 }}
            /><TextField
              label={'Kecamatan'}
              name={'district'}
              value={r.district}
              options={{ maxlength: 80 }}
            />
          </div>
          <div class="form-row">
            <TextField
              label={'Kota / kabupaten'}
              name={'city'}
              value={r.city}
              options={{ maxlength: 80 }}
            /><TextField
              label={'Provinsi'}
              name={'province'}
              value={r.province}
              options={{ maxlength: 80 }}
            />
          </div>
          <label class="check"
            ><input
              type="checkbox"
              name="sameAddress"
              {...r.sameAddress ? { checked: true } : {}}
            />Alamat domisili sama dengan identitas</label
          ><TextField label={'Alamat domisili'} name={'address'} value={r.address} />
          <div class="form-row">
            <SelectField
              label={'Instansi / pekerjaan'}
              name={'job'}
              items={[
                '',
                'Karyawan Swasta',
                'Wiraswasta',
                'PNS / TNI / Polri',
                'Pelajar / Mahasiswa',
                'Ibu Rumah Tangga',
                'Lainnya',
              ]}
              value={r.job}
            /><SelectField
              label={'Pendidikan terakhir'}
              name={'education'}
              items={[
                '',
                'SD / Sederajat',
                'SMP / Sederajat',
                'SMA / Sederajat',
                'Diploma',
                'Sarjana',
                'Pascasarjana',
              ]}
              value={r.education}
            />
          </div>
          <div class="form-row">
            <SelectField
              label={'Status pernikahan'}
              name={'marital'}
              items={['', 'Belum Menikah', 'Menikah', 'Cerai']}
              value={r.marital}
            /><TextField
              label={'Nomor telepon / WhatsApp'}
              name={'phone'}
              value={r.phone}
              options={{ type: 'tel', pattern: '[0-9+ ()-]{9,18}' }}
            />
          </div>
          <TextField
            label={'Email'}
            name={'email'}
            value={r.email}
            options={{ type: 'email', maxlength: 120 }}
          />
          <div class="section-label">Rekening atas nama anggota</div>
          <div class="form-row">
            <TextField
              label={'Nama bank'}
              name={'bankName'}
              value={r.bankName}
              options={{ maxlength: 80 }}
            /><TextField
              label={'Nomor rekening'}
              name={'bankAccount'}
              value={r.bankAccount}
              options={{ pattern: '[0-9]{5,40}', maxlength: 40 }}
            />
          </div>
          <p class="field-hint">Nama pemilik rekening harus sesuai nama lengkap anggota.</p>
          <TextField label={'Nama ibu kandung'} name={'mother'} value={r.mother} />
          <div class="form-row">
            <TextField label={'Nama ahli waris'} name={'heir'} value={r.heir} /><TextField
              label={'Nomor telepon ahli waris'}
              name={'heirPhone'}
              value={r.heirPhone}
              options={{ type: 'tel', pattern: '[0-9+ ()-]{9,18}' }}
            />
          </div>
        {:else if s === 2}
          <RegistrationSavings {context} />
        {:else if s === 3}
          <div class="section-label">Pelayanan anggota</div>
          <TextField
            label={'Nama petugas / marketing'}
            name={'officer'}
            value={r.officer}
            options={{ required: false, placeholder: 'Nama petugas yang mendampingi' }}
          />
          <div class="signature-heading">
            <span class="field-label">Tanda tangan *</span><button
              class="link-button"
              type="button"
              data-action="clear-signature">Hapus</button
            >
          </div>
          <canvas
            id="signature"
            width="1000"
            height="340"
            aria-label="Area tanda tangan, gunakan mouse atau sentuhan"
          ></canvas>
          <p class="field-hint">
            Bubuhkan tanda tangan dengan mouse atau sentuhan. Tanda tangan ini akan digunakan pada
            akad yang Anda ajukan.
          </p>
          <label class="check"
            ><input
              type="checkbox"
              name="signatureConsent"
              required
              {...r.signatureConsent ? { checked: true } : {}}
            />Saya mengizinkan penggunaan tanda tangan ini pada akad penyertaan modal yang saya
            ajukan.</label
          ><label class="check"
            ><input
              type="checkbox"
              name="consent"
              required
              {...r.consent ? { checked: true } : {}}
            />Saya menyetujui pengajuan keanggotaan dan bersedia mengikuti ketentuan koperasi.</label
          >
          <p class="form-error" id="signature-error" hidden role="alert">
            Bubuhkan tanda tangan sebelum melanjutkan.
          </p>
          <details class="cs-section">
            <summary>Bagian petugas / CS</summary>
            <p>
              Nomor anggota dibuat otomatis saat pendaftaran tersimpan. Petugas memeriksa data dan
              memberikan persetujuan.
            </p>
            <div class="form-row">
              <TextField
                label={'Nomor anggota'}
                name={'memberNumber'}
                value={'Dibuat otomatis oleh sistem'}
                options={{ readonly: true, required: false }}
              /><TextField
                label={'Status verifikasi'}
                name={'verification'}
                value={'Menunggu pemeriksaan'}
                options={{ readonly: true, required: false }}
              />
            </div>
          </details>
        {:else if s === 4}
          <div class="section-label">Periksa pengajuan Anda</div>
          <ReviewList
            rows={[
              ['Nama lengkap', r.name],
              ['Kantor layanan', r.office],
              ['Nomor identitas', r.identityNumber],
              ['Nomor WhatsApp', r.phone],
              ['Email', r.email || '—'],
              ['Alamat sesuai identitas', r.identityAddress],
              ['Kelurahan', r.village],
              ['Kecamatan', r.district],
              ['Kota / kabupaten', r.city],
              ['Provinsi', r.province],
              ['Bank', r.bankName],
              ['Nomor rekening', r.bankAccount],
              ['Alamat domisili', r.address],
              ['Ahli waris', r.heir],
              ['Simpanan pokok', rupiah(r.basic)],
              [
                'Simpanan wajib',
                rupiah(Number(r.monthly) * (r.paymentOption === 'Tahunan' ? 12 : 1)) +
                  ' / ' +
                  r.paymentOption.toLowerCase(),
              ],
              ['Simpanan transaksi', rupiah(r.transactionSaving)],
              ['Setoran awal simpanan khusus', rupiah(specialFirst())],
              ['Administrasi anggota', rupiah(r.admin)],
              ['Total setoran awal (contoh)', rupiah(registrationTotal())],
              ['Bukti transfer simpanan', state.registrationProof?.name || 'Belum dilampirkan'],
              ['Foto KTP', state.registrationKtp?.name || 'Belum dilampirkan'],
            ]}
          />{@html (window.KsppsWorkflow?.identityMedia({
            signatureUrl: r.signatureImage,
            ktpUrl: state.registrationKtpUrl,
          }) ||
            '') ??
            ''}
          <p class="field-hint">
            Data, foto KTP, bukti simpanan, dan tanda tangan disimpan di ruang demo Anda untuk
            diperiksa melalui portal petugas.
          </p>
        {/if}
        <p class="form-error" id="registration-submit-error" hidden role="alert"></p>
        <div class="form-actions">
          {#if s > 1}
            <button class="btn secondary" type="button" data-action="registration-back"
              >Kembali</button
            >
          {:else}
            <a class="small" href="#masuk">Sudah punya akun?</a>
          {/if}<button
            class="btn"
            type="submit"
            {...(s === 1 && state.registrationKtpBusy) || (s === 2 && state.registrationProofBusy)
              ? { disabled: true }
              : {}}
            >{#if s === 4}
              Kirim pendaftaran
            {:else}
              Lanjutkan
            {/if}
            <Icon name={'arrow'} /></button
          >
        </div>
      </form>
    </MemberAuthLayout>
  {/if}
{/if}
