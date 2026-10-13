/**
 * Sinkronisasi profil dan pembukaan ulang pendaftaran yang perlu diperbaiki.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindMemberProfileEvents({
  state,
  render,
  runtime,
  toast,
  resetRegistrationKtp,
  modal,
  go,
}) {
  window.addEventListener('kspps-profile-loaded', (event) => {
    state.profile = event.detail ? { ...event.detail.data } : {};
    state.savedProfile = !!event.detail;
    if (state.signedIn && location.hash !== '#daftar') render();
  });

  window.addEventListener('kspps-edit-registration', async (event) => {
    if (runtime.editingRegistration) return;
    runtime.editingRegistration = true;
    const p = event.detail;
    toast('Memuat data pendaftaran…');
    try {
      const fetchFile = async (url, name) => {
        if (!url) return null;
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Berkas tersimpan belum dapat dimuat. Coba lagi.');
        return new File([await response.blob()], name, {
          type: response.headers.get('content-type') || '',
        });
      };
      const [signature, proof, ktp] = await Promise.all([
        fetchFile(p.signatureUrl, 'tanda-tangan.png'),
        fetchFile(p.proofUrl, p.proofName),
        fetchFile(p.ktpUrl, p.ktpName || 'ktp.png'),
      ]);
      const signatureImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(signature);
      });
      state.registration = {
        ...p.data,
        paymentOption: p.data.paymentOption || 'Bulanan',
        signatureImage,
      };
      state.registrationId = p.id;
      state.registrationVersion = p.version;
      state.registrationStep = 1;
      state.signature = true;
      runtime.registrationProofSequence++;
      state.registrationProofBusy = false;
      state.registrationProof = proof;
      state.registrationProofError = '';
      resetRegistrationKtp();
      state.registrationKtp = ktp;
      state.registrationKtpUrl = ktp ? URL.createObjectURL(ktp) : '';
      if (modal.open) modal.close();
      go('daftar');
      render();
    } catch (error) {
      toast(error.message || 'Data belum dapat dimuat. Coba lagi.');
    } finally {
      runtime.editingRegistration = false;
    }
  });

  window.addEventListener('kspps-new-registration', () => {
    resetRegistrationKtp();
    runtime.registrationProofSequence++;
    state.registrationProof = null;
    state.registrationProofError = '';
    state.registrationProofBusy = false;
    state.registrationId = crypto.randomUUID();
    state.registrationVersion = 0;
    state.registrationStep = 1;
    state.signature = false;
    state.profile = {};
    state.savedProfile = false;
    state.requests = [];
    state.deposits = [];
    state.registration = {
      office: 'Kantor KSPPS Makassar',
      identityType: 'KTP',
      religion: 'Islam',
      monthly: 10000,
      paymentOption: 'Bulanan',
      basic: 100000,
      transactionSaving: 50000,
      special: 'Tidak',
      specialAmount: 1000000,
      specialPayment: 'Tunai',
      installments: 10,
      admin: 30000,
    };
    go('daftar');
    render();
  });
}
