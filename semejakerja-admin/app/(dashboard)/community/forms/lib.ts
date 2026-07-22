import type {
  Form, FormResponse, FormStatus, FormQuestion, FormQuestionType, FormAnswerValue,
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
export const WFC_WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/BMzJMgEsOVgCCVDnM4EeJP'

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

const WFC_SUCCESS = 'Makasih udah daftar! Undangan resmi akan dikirim via WhatsApp ke peserta terpilih. Sambil nunggu, join grup WhatsApp Semeja Kerja dulu yuk 👇'

export function wfcTemplateQuestions(): FormQuestion[] {
  const q = (
    type: FormQuestionType,
    label: string,
    extra: Partial<FormQuestion> = {},
  ): FormQuestion => ({ id: crypto.randomUUID(), type, label, required: true, ...extra })

  return [
    q('short_text', 'Nama kamu siapa? (nickname juga boleh)'),
    q('short_text', 'Sekarang lagi sibuk apa?'),
    q('short_text', 'Domisili kamu di mana?'),
    q('phone', 'Tulis nomor WhatsApp aktif ya, supaya mudah kirim info dan undangan'),
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
    whatsapp_group_label: 'Klik Sini',
    questions: wfcTemplateQuestions(),
  }
}

// ── Export CSV respons ──────────────────────────────────────
const cellText = (val: FormAnswerValue | undefined): string =>
  val == null ? '' : Array.isArray(val) ? val.join('; ') : String(val)

const csvEscape = (s: string): string =>
  /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s

export function responsesToCsv(questions: FormQuestion[], responses: FormResponse[]): string {
  const cols = questions.filter(q => isAnswerable(q.type))
  const header = ['Waktu', ...cols.map((q, i) => q.label || `Pertanyaan ${i + 1}`), 'Hadir']
  const rows = responses.map(r => [
    r.created_at,
    ...cols.map(q => cellText(r.answers?.[q.id])),
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
