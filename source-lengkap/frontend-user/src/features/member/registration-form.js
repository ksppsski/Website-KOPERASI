/**
 * Tahapan pendaftaran, perhitungan setoran, dan canvas tanda tangan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createRegistrationForm({ state, $, rupiah }) {
  function specialFirst() {
    const r = state.registration;
    return r.special === 'Ya'
      ? r.specialPayment === 'Angsur'
        ? Math.ceil(Number(r.specialAmount) / Math.max(1, Number(r.installments)))
        : Number(r.specialAmount)
      : 0;
  }

  function registrationTotal() {
    const r = state.registration;
    return (
      Number(r.basic) +
      Number(r.monthly) * (r.paymentOption === 'Tahunan' ? 12 : 1) +
      Number(r.transactionSaving) +
      specialFirst() +
      Number(r.admin)
    );
  }

  function saveRegistration(form) {
    const r = state.registration;
    for (const [k, v] of new FormData(form)) {
      if (typeof v === 'string') r[k] = v;
    }
    for (const check of form.querySelectorAll('input[type="checkbox"]'))
      r[check.name] = check.checked;
    if (r.sameAddress) r.address = r.identityAddress;
    if (r.name) r.name = r.name.toUpperCase();
  }

  function updateSavingsForm(form) {
    saveRegistration(form);
    const r = state.registration;
    $('#special-fields').hidden = r.special !== 'Ya';
    $('#installment-fields').hidden = r.specialPayment !== 'Angsur';
    form.elements.specialAmount.required = r.special === 'Ya';
    form.elements.specialAmount.disabled = r.special !== 'Ya';
    form.elements.installments.required = r.special === 'Ya' && r.specialPayment === 'Angsur';
    form.elements.installments.disabled = r.special !== 'Ya' || r.specialPayment !== 'Angsur';
    $('#special-monthly').textContent = 'Angsuran per bulan: ' + rupiah(specialFirst());
    $('#registration-total').textContent = rupiah(registrationTotal());
  }

  function setupSignature() {
    const canvas = $('#signature');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#183e7c';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (state.registration.signatureImage) {
      const im = new Image();
      im.onload = () => ctx.drawImage(im, 0, 0);
      im.src = state.registration.signatureImage;
    }
    let down = false;
    function point(e) {
      const rect = canvas.getBoundingClientRect();
      return [
        ((e.clientX - rect.left) * canvas.width) / rect.width,
        ((e.clientY - rect.top) * canvas.height) / rect.height,
      ];
    }
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      down = true;
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = point(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      e.preventDefault();
      const [x, y] = point(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      state.signature = true;
    });
    function finish() {
      if (!down) return;
      down = false;
      state.registration.signatureImage = canvas.toDataURL('image/png');
    }
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
  }
  return { specialFirst, registrationTotal, saveRegistration, updateSavingsForm, setupSignature };
}
