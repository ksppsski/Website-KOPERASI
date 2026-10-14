import {
  ProfileDetails2View,
  ProfileDetailsView,
  IdentityMedia2View,
  IdentityMedia3View,
  IdentityMedia4View,
  IdentityMedia5View,
  IdentityMediaView,
  CompleteKtpDialogView,
  ProfilePanelView,
  AdminNoteView,
  LetterLinkView,
  ReviewRegistrationView,
  ProfilePanel2View,
  StaffRegistrationPanelView,
  FinanceStatus2View,
  FinanceStatus3View,
  FinanceStatusView,
  RegistrationReview2View,
  RegistrationReview3View,
  RegistrationReview4View,
  RegistrationReviewView,
} from './views/registration.svelte';
import { needsCorrection, esc, date, action, empty, checks } from './presentation.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Data pendaftaran, foto identitas, dan pemeriksaan admin.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export function createWorkflowRegistration({ app, state, show, staff, workPanel }) {
  const profileStatus = (p) =>
    needsCorrection(p)
      ? 'Perlu perbaikan'
      : {
          pending: 'Menunggu pemeriksaan',
          approved: 'Pendaftaran disetujui',
          correction: 'Perlu perbaikan',
          closed: 'Keanggotaan ditutup',
        }[p.status] || p.status;

  function profileDetails(p) {
    const d = p.data;
    return snippetView(ProfileDetailsView, {
      Rows: [
        ['Nomor anggota', p.memberNumber || '—'],
        ['Nama lengkap', d.name],
        ['Identitas', d.identityType + ' · ' + d.identityNumber],
        ['Alamat sesuai identitas', d.identityAddress],
        ['Kelurahan', d.village],
        ['Kecamatan', d.district],
        ['Kota/kabupaten', d.city],
        ['Provinsi', d.province],
        ['Alamat domisili', d.address],
        ['Bank', d.bankName],
        ['Nomor rekening', d.bankAccount],
        ['Telepon', d.phone],
        ['Email', d.email],
      ].map(([a, b]) => snippetView(ProfileDetails2View, { a: a, b: esc(b) })),
    });
  }

  function identityMedia(p) {
    const version = p.version ? '?v=' + Number(p.version) : '',
      sig = p.signatureUrl ? esc(p.signatureUrl + version) : '',
      ktp = p.ktpUrl ? esc(p.ktpUrl + version) : '';
    return snippetView(IdentityMediaView, {
      sigContent: sig
        ? snippetView(IdentityMedia2View, { sig: sig })
        : snippetView(IdentityMedia3View),
      ktpContent: ktp
        ? snippetView(IdentityMedia4View, {
            ktp: ktp,
            ktpValue: ktp,
            ktpCheckedAtContent: p.ktpCheckedAt
              ? 'Sudah diperiksa Admin · ' + date(p.ktpCheckedAt)
              : 'Klik gambar untuk memperbesar.',
          })
        : snippetView(IdentityMedia5View),
    });
  }

  function completeKtpDialog() {
    const p = state.profile;
    if (!p || p.ktpUrl) return;
    show('Lengkapi foto KTP', snippetView(CompleteKtpDialogView, { version: p.version }));
  }

  function profilePanel() {
    const p = state.profile;
    if (!p) return snippetView(ProfilePanelView);
    const adminNote = p.note ? snippetView(AdminNoteView, { note: esc(p.note) }) : '';
    const financeNote = !staff && p.finance?.status === 'correction' ? financeStatus(p) : '';
    const letterLink = p.letter ? snippetView(LetterLinkView, { url: esc(p.letter.url) }) : '';
    const completeIdentity =
      !staff && !p.ktpUrl && p.status !== 'correction'
        ? action('complete-ktp', '', 'Lengkapi foto KTP', true)
        : '';
    const correctRegistration =
      !staff && needsCorrection(p)
        ? action('edit-registration', '', 'Perbaiki pendaftaran', true)
        : '';
    const reviewRegistration = staff
      ? snippetView(ReviewRegistrationView, {
          action: action('registration-review', '', 'Periksa pendaftaran', true),
        })
      : '';

    return snippetView(ProfilePanel2View, {
      fieldName: esc(p.data.name),
      statusColor: statusColor(profileStatus(p)),
      profileStatus: profileStatus(p),
      adminNote: adminNote,
      financeNote: financeNote,
      profileDetails: profileDetails(p),
      identityMedia: identityMedia(p),
      letterLink: letterLink,
      completeIdentity: completeIdentity,
      correctRegistration: correctRegistration,
      reviewRegistration: reviewRegistration,
    });
  }

  function staffRegistrationPanel() {
    return state.profiles.length
      ? state.profiles.map((p) =>
          snippetView(StaffRegistrationPanelView, {
            fieldName: esc(p.data.name),
            memberNumber: esc(p.memberNumber || '—'),
            date: date(p.createdAt),
            profileStatus: profileStatus(p),
            action: action('registration-review', p.id, 'Lihat pendaftaran', true),
          }),
        )
      : empty('Belum ada pendaftaran anggota.');
  }

  function financeStatus(record) {
    const r = record?.finance;
    return snippetView(FinanceStatusView, {
      label: esc(r?.label || 'Menunggu Finance'),
      referenceContent: r?.reference
        ? snippetView(FinanceStatus2View, { reference: esc(r.reference), date: date(r.checkedAt) })
        : '',
      noteContent: r?.note ? snippetView(FinanceStatus3View, { note: esc(r.note) }) : '',
    });
  }

  function registrationReview(id) {
    const p = state.profiles.find((x) => x.id === id);
    if (!p) return;
    show(
      'Pemeriksaan pendaftaran',
      snippetView(RegistrationReviewView, {
        workPanel: workPanel(p.id, 'registration'),
        profileDetails: profileDetails(p),
        identityMedia: identityMedia(p),
        proofUrl: p.proofUrl,
        noteContent: p.note ? snippetView(RegistrationReview2View, { note: esc(p.note) }) : '',
        financeStatus: financeStatus(p),
        statusContent:
          p.status === 'pending'
            ? snippetView(RegistrationReview3View, {
                id: esc(p.id),
                version: p.version,
                checks: checks([
                  ['identity', 'Data identitas dan rekening sesuai.'],
                  ['ktp', 'Foto KTP terbaca dan sesuai data calon anggota.'],
                  ['signature', 'Tanda tangan dan persetujuan tersedia.'],
                ]),
                statusContent:
                  p.finance?.status !== 'approved' || !p.ktpUrl ? { disabled: true } : {},
                ktpUrlContent: !p.ktpUrl
                  ? 'Menunggu foto KTP'
                  : p.finance?.status === 'approved'
                    ? 'Setujui pendaftaran'
                    : 'Menunggu Finance',
              })
            : snippetView(RegistrationReview4View, { profileStatus: profileStatus(p) }),
      }),
    );
  }
  return {
    profileStatus,
    profileDetails,
    identityMedia,
    completeKtpDialog,
    profilePanel,
    staffRegistrationPanel,
    financeStatus,
    registrationReview,
  };
}
