import type {
  Form, FormResponse, FormStatus, FormResponseStatus, FormQuestion, FormQuestionType, FormAnswerValue, ProfileSyncField,
} from '@/types'

// ── Status form ─────────────────────────────────────────────
export const STATUS_LABELS: Record<FormStatus, string> = {
  draft: 'Draft',
  open: 'Terbuka',
  closed: 'Ditutup',
}

export const STATUS_COLORS: Record<FormStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-slate-200 text-slate-500',
}

export const STATUS_OPTIONS: { value: FormStatus; label: string }[] =
  (Object.keys(STATUS_LABELS) as FormStatus[]).map(v => ({ value: v, label: STATUS_LABELS[v] }))

// ── Jenis event (approval) ───────────────────────────────────
export const APPROVAL_MODE_OPTIONS: { value: boolean; label: string; hint: string }[] = [
  { value: false, label: 'Otomatis', hint: 'Submit langsung terhitung peserta.' },
  { value: true, label: 'Perlu approval admin', hint: 'Submit masuk antrian dulu, admin approve baru terhitung peserta.' },
]

// ── Status respons ────────────────────────────────────────────
export const RESPONSE_STATUS_LABELS: Record<FormResponseStatus, string> = {
  pending: 'Menunggu Approval',
  registered: 'Terdaftar',
  cancelled: 'Dibatalkan',
  rejected: 'Ditolak',
}

export const RESPONSE_STATUS_COLORS: Record<FormResponseStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  registered: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-200 text-slate-500',
  rejected: 'bg-red-100 text-red-600',
}

// ── Tipe pertanyaan ─────────────────────────────────────────
export const QUESTION_TYPE_LABELS: Record<FormQuestionType, string> = {
  short_text: 'Jawaban singkat',
  paragraph: 'Paragraf',
  radio: 'Pilihan ganda (satu)',
  checkbox: 'Kotak centang (banyak)',
  dropdown: 'Dropdown',
  email: 'Email',
  phone: 'No. WhatsApp',
  section: 'Blok info (tanpa jawaban)',
}

export const QUESTION_TYPE_OPTIONS: { value: FormQuestionType; label: string }[] =
  (Object.keys(QUESTION_TYPE_LABELS) as FormQuestionType[]).map(v => ({ value: v, label: QUESTION_TYPE_LABELS[v] }))

// Tipe yang butuh daftar opsi.
export const OPTION_TYPES: FormQuestionType[] = ['radio', 'checkbox', 'dropdown']
export const needsOptions = (t: FormQuestionType) => OPTION_TYPES.includes(t)
// Tipe yang menampung jawaban (bukan blok info statis).
export const isAnswerable = (t: FormQuestionType) => t !== 'section'

// ── Sinkron ke profil user ──────────────────────────────────
export const PROFILE_FIELD_LABELS: Record<ProfileSyncField, string> = {
  full_name: 'Nama lengkap',
  nickname: 'Nickname',
  occupation: 'Pekerjaan / kesibukan',
  city: 'Kota / domisili',
  phone: 'No. WhatsApp',
}

export const PROFILE_FIELD_OPTIONS: { value: ProfileSyncField; label: string }[] =
  (Object.keys(PROFILE_FIELD_LABELS) as ProfileSyncField[]).map(v => ({ value: v, label: PROFILE_FIELD_LABELS[v] }))

// Hanya tipe jawaban teks tunggal yang masuk akal disinkron ke profil.
export const PROFILE_SYNC_TYPES: FormQuestionType[] = ['short_text', 'paragraph', 'phone']
export const canSyncProfile = (t: FormQuestionType) => PROFILE_SYNC_TYPES.includes(t)

// ── Factory pertanyaan baru ─────────────────────────────────
export function newQuestion(type: FormQuestionType): FormQuestion {
  const q: FormQuestion = { id: crypto.randomUUID(), type, label: '', required: false }
  if (needsOptions(type)) q.options = ['Opsi 1']
  if (type === 'section') { q.label = 'Judul bagian'; q.help = '' }
  return q
}

// ── Template WFC Bareng Strangers ───────────────────────────
// Nilai default sesuai Google Form yang biasa dipakai; admin tinggal
// mengganti detail event (nama cafe, tanggal, jam, kuota, handle IG).
export const WFC_WHATSAPP_GROUP_URL = 'chat.whatsapp.com/BMzJMgEsOVgCCVDnM4EeJP'

const WFC_DESCRIPTION = `haloo teman semeja!
Sebelum isi form pendaftaran, yuk cek dulu info penting berikut:

Semeja Kerja x [Nama Cafe]
Hari: [hari, tanggal]
Tempat: [nama tempat]
Waktu: [jam] WIB

Kuota terbatas hanya untuk [jumlah] orang. Termasuk diskon [x]% untuk peserta.

Syarat: pastikan sudah follow [@cafe] dan @semejakerja di Instagram & TikTok. Undangan resmi akan dikirim via WhatsApp ke peserta terpilih.`

const WFC_RULES = `1. Datang on time di tanggal & jam yang sudah ditentukan.
2. Bersedia upload story Instagram tentang aktivitas selama acara dan share rekomendasi tempat WFC.
3. Bersedia kasih ulasan cafe di Google Review.
4. Bersedia ikut dokumentasi acara (foto/video, wajah akan ditampilkan di media sosial).
5. Membeli minimal 1 minuman.`

// Nada "resmi terdaftar" (bukan "nunggu diseleksi") — cocok buat mode
// Otomatis, di mana submit = langsung jadi peserta, tidak ada seleksi
// lagi. Event requires_approval=true sudah punya pesan sendiri yang
// menjelaskan status antrian (lihat RegistrationStatus di landing).
const WFC_SUCCESS = 'Yeay, kamu resmi jadi peserta! 🎉 Gabung ke grup WhatsApp di bawah buat info lengkap acaranya ya.'

// Default template buat tombol "Kirim WA" di baris respons approved —
// admin klik, WhatsApp pribadinya kebuka dengan pesan ini udah keisi.
// Sengaja TANPA emoji: WhatsApp Desktop (Electron) sering gagal decode
// emoji yang dikirim lewat deep-link wa.me?text=... (beda dari emoji yang
// diketik manual) — jadi disini "�" bukan bug encoding di kode ini,
// tapi limitasi client WhatsApp Desktop pas nerima teks prefilled.
export const DEFAULT_WHATSAPP_APPROVAL_MESSAGE =
  `Hi, {{nama}}!

Congratulations! You are selected to join {{event}} pada:
Tanggal: {{tanggal}}
Jam: {{jam}}
Lokasi: {{lokasi}} ({{link_maps}})

Terima kasih atas antusiasmenya untuk mengikuti collaboration WFC bareng Strangers kali ini! Dimohon konfirmasi kedatangan dengan membalas pesan ini dan datang tepat waktu yaa, see you soon!

Jangan lupa join grup WA juga untuk info lebih update-nya yaa
Link grup: {{link_grup}}`;

export function wfcTemplateQuestions(): FormQuestion[] {
  const q = (
    type: FormQuestionType,
    label: string,
    extra: Partial<FormQuestion> = {},
  ): FormQuestion => ({ id: crypto.randomUUID(), type, label, required: true, ...extra })

  return [
    q('short_text', 'Nama kamu siapa? (nickname juga boleh)', { profile_field: 'nickname' }),
    q('short_text', 'Sekarang lagi sibuk apa?', { profile_field: 'occupation' }),
    q('short_text', 'Domisili kamu di mana?', { profile_field: 'city' }),
    q('phone', 'Tulis nomor WhatsApp aktif ya, supaya mudah kirim info dan undangan', { profile_field: 'phone' }),
    q('radio', 'Sudah follow cafe & @semejakerja di Instagram/TikTok?', {
      options: ['Sudah', 'Belum, akan segera follow'],
    }),
    q('short_text', 'Tulis username Instagram kamu di sini (pakai akun utama yang follow cafe & @semejakerja, jangan second account atau diprivate supaya mudah dicek)'),
    q('email', 'Email', { required: false }),
    q('section', 'Rules kecil yang harus dipahami ya', { required: false, help: WFC_RULES }),
    q('radio', 'Dengan submit form ini, kamu dianggap setuju sama rules di atas.', {
      options: ["Let's go, kita seru-seruan dan produktif bareng di WFC kali ini!"],
    }),
  ]
}

// Field default form saat dibuat dari template WFC (di-spread ke insert).
export function wfcTemplateForm() {
  return {
    description: WFC_DESCRIPTION,
    success_message: WFC_SUCCESS,
    whatsapp_group_url: WFC_WHATSAPP_GROUP_URL,
    whatsapp_group_label: 'Gabung Grup WhatsApp',
    whatsapp_approval_message: DEFAULT_WHATSAPP_APPROVAL_MESSAGE,
    questions: wfcTemplateQuestions(),
  }
}

// ── Kirim WA (wa.me, manual — admin pakai nomor pribadinya) ──

// Cari jawaban lewat profile_field pertanyaan (mis. 'phone', 'nickname')
// daripada nebak dari label, karena label bebas diedit admin per event.
function answerByProfileField(form: Form, response: FormResponse, field: ProfileSyncField): string {
  const q = form.questions.find(q => q.profile_field === field)
  if (!q) return ''
  const v = response.answers?.[q.id]
  return v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v)
}

function participantName(form: Form, response: FormResponse): string {
  return answerByProfileField(form, response, 'nickname')
    || answerByProfileField(form, response, 'full_name')
    || 'Kak'
}

// Fallback ke tipe 'phone' kalau admin lupa set profile_field-nya.
function participantPhone(form: Form, response: FormResponse): string {
  const byField = answerByProfileField(form, response, 'phone')
  if (byField) return byField
  const q = form.questions.find(q => q.type === 'phone')
  if (!q) return ''
  const v = response.answers?.[q.id]
  return v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v)
}

// Nomor Indonesia ke format internasional wa.me (62xxx, tanpa +/spasi/strip).
// null kalau kependekan buat dianggap nomor valid — pemanggil nonaktifkan
// tombol Kirim WA daripada buka wa.me dengan nomor yang jelas salah.
export function normalizePhoneForWa(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  return '62' + digits
}

function formatEventDateID(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
}

// Bangun pesan approval + nomor siap pakai buat tombol "Kirim WA".
// Return null kalau nomornya nggak ada/nggak valid (nggak ada peserta
// tanpa nomor WA di form WFC, tapi form custom lain bisa aja lupa
// nambah pertanyaan nomor WA).
export function buildApprovalWa(form: Form, response: FormResponse): { phone: string; message: string } | null {
  const phone = normalizePhoneForWa(participantPhone(form, response))
  if (!phone) return null

  const jamMulai = form.event_time_start || ''
  const jamSelesai = form.event_time_end || ''
  const jam = jamMulai && jamSelesai ? `${jamMulai} - ${jamSelesai}` : (jamMulai || jamSelesai)

  const template = form.whatsapp_approval_message || DEFAULT_WHATSAPP_APPROVAL_MESSAGE
  const message = fillTemplate(template, {
    nama: participantName(form, response),
    event: form.title || 'acara',
    tanggal: formatEventDateID(form.event_date),
    tempat: form.location ? ` di ${form.location}` : (form.cafe_name ? ` di ${form.cafe_name}` : ''),
    lokasi: form.location || form.cafe_name || '',
    jam_mulai: jamMulai,
    jam_selesai: jamSelesai,
    jam,
    link_maps: form.event_maps_url || '',
    link_grup: form.whatsapp_group_url || '',
  })
  return { phone, message }
}

export function waComposeUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

// ── Export CSV respons ──────────────────────────────────────
const cellText = (val: FormAnswerValue | undefined): string =>
  val == null ? '' : Array.isArray(val) ? val.join('; ') : String(val)

const csvEscape = (s: string): string =>
  /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s

export function responsesToCsv(questions: FormQuestion[], responses: FormResponse[]): string {
  const cols = questions.filter(q => isAnswerable(q.type))
  const header = ['Waktu', ...cols.map((q, i) => q.label || `Pertanyaan ${i + 1}`), 'Status', 'Hadir']
  const rows = responses.map(r => [
    r.created_at,
    ...cols.map(q => cellText(r.answers?.[q.id])),
    RESPONSE_STATUS_LABELS[r.status],
    r.attended ? 'Ya' : 'Tidak',
  ])
  return [header, ...rows]
    .map(row => row.map(c => csvEscape(String(c))).join(','))
    .join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  // BOM supaya Excel baca UTF-8 (emoji/aksen) dengan benar.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Ringkas judul form → nama file.
export function slugifyTitle(title: string): string {
  return (title || 'form').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'form'
}

export type { Form, FormResponse }
