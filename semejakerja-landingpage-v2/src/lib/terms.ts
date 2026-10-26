// Syarat & Ketentuan Komunitas Semeja Kerja — satu sumber untuk halaman
// /syarat-ketentuan dan modal persetujuan (pembayaran + tombol masuk grup).
// Kalau isinya diubah, update juga TERMS_UPDATED_AT.

export const TERMS_UPDATED_AT = "26 Oktober 2026";

export type TermsBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "numbered"; items: { no: string; text: string }[] };

export interface TermsSection {
  no: number;
  title: string;
  blocks: TermsBlock[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    no: 1,
    title: "Pendahuluan",
    blocks: [
      {
        kind: "p",
        text: "Selamat datang di Semeja Kerja. Syarat dan Ketentuan ini mengatur penggunaan layanan, partisipasi dalam komunitas, serta keikutsertaan dalam kegiatan yang diselenggarakan oleh Semeja Kerja.",
      },
      {
        kind: "p",
        text: "Dengan bergabung dalam grup komunitas, menggunakan layanan Semeja Kerja, atau mendaftarkan diri dalam kegiatan melalui situs resmi semejakerja.com, pengguna dianggap telah membaca, memahami, dan menyetujui Syarat dan Ketentuan ini.",
      },
    ],
  },
  {
    no: 2,
    title: "Ruang Lingkup Komunitas",
    blocks: [
      {
        kind: "p",
        text: "Semeja Kerja merupakan komunitas yang menyediakan wadah untuk bekerja bersama, berolahraga, belajar, berbagi pengetahuan, dan membangun relasi melalui berbagai kegiatan, termasuk:",
      },
      {
        kind: "list",
        items: [
          "Semeja Kerja (WFC with Strangers), yaitu wadah untuk kegiatan Work From Cafe bersama anggota komunitas.",
          "Semeja Moves, yaitu wadah kegiatan olahraga bersama.",
          "Semeja English, yaitu wadah untuk belajar dan mempraktikkan bahasa Inggris.",
          "Semeja Talks, yaitu wadah untuk workshop, diskusi, dan sesi berbagi pengetahuan.",
        ],
      },
      {
        kind: "p",
        text: "Setiap kegiatan tunduk pada ketentuan komunitas serta ketentuan tambahan yang ditetapkan oleh penyelenggara untuk kegiatan terkait.",
      },
    ],
  },
  {
    no: 3,
    title: "Etika dan Perilaku Pengguna",
    blocks: [
      {
        kind: "p",
        text: "Setiap anggota wajib menjaga sikap, sopan santun, dan kenyamanan bersama, baik dalam komunikasi digital maupun saat mengikuti kegiatan secara langsung.",
      },
      { kind: "p", text: "Anggota dilarang untuk:" },
      {
        kind: "list",
        items: [
          "Melakukan diskriminasi berdasarkan suku, agama, ras, antargolongan (SARA), menyebarkan ujaran kebencian, melakukan pelecehan, atau membagikan konten pornografi.",
          "Melakukan tindakan yang mengganggu, mengintimidasi, merendahkan, atau merugikan anggota lain.",
          "Memulai atau menyebarkan perdebatan politik yang berpotensi mengganggu keharmonisan komunitas.",
          "Melakukan tindakan lain yang bertentangan dengan hukum, norma yang berlaku, atau ketentuan komunitas.",
        ],
      },
    ],
  },
  {
    no: 4,
    title: "Ketentuan Kegiatan dan Pendaftaran",
    blocks: [
      {
        kind: "numbered",
        items: [
          { no: "4.1", text: "Informasi mengenai kegiatan resmi Semeja Kerja hanya dinyatakan sah apabila diumumkan melalui admin atau kanal resmi yang ditetapkan oleh Semeja Kerja." },
          { no: "4.2", text: "Pendaftaran kegiatan resmi hanya dilakukan melalui situs web semejakerja.com, kecuali ditentukan lain secara resmi oleh pengelola." },
          { no: "4.3", text: "Anggota yang telah mendaftar wajib hadir sesuai jadwal dan ketentuan kegiatan. Apabila berhalangan hadir, anggota diharapkan memberi tahu admin sesegera mungkin agar kuota dapat dialihkan kepada peserta lain." },
          { no: "4.4", text: "Selama kegiatan berlangsung, setiap peserta wajib menghormati kenyamanan peserta lain, termasuk menjaga ketenangan dan tidak mengganggu peserta yang sedang bekerja atau berkonsentrasi." },
          { no: "4.5", text: "Peserta diharapkan menghormati tempat kegiatan dan mitra Semeja Kerja, termasuk dengan memesan produk atau layanan sesuai ketentuan tempat, menjaga kebersihan, serta mematuhi peraturan yang berlaku di lokasi." },
          { no: "4.6", text: "Informasi kegiatan yang tidak diumumkan melalui admin atau kanal resmi tidak dapat dianggap sebagai kegiatan resmi Semeja Kerja." },
        ],
      },
    ],
  },
  {
    no: 5,
    title: "Ketentuan Pembayaran Kegiatan",
    blocks: [
      {
        kind: "numbered",
        items: [
          { no: "5.1", text: "Biaya pendaftaran kegiatan berbayar yang telah dibayarkan tidak dapat dikembalikan (non-refundable), termasuk apabila peserta tidak hadir atau membatalkan keikutsertaannya." },
          { no: "5.2", text: "Ketentuan pada poin 5.1 dikecualikan untuk kegiatan yang menerapkan Commitment Fee. Commitment Fee merupakan biaya jaminan kehadiran yang akan dikembalikan kepada peserta yang hadir sesuai ketentuan kegiatan terkait. Peserta yang tidak hadir tidak berhak atas pengembalian Commitment Fee." },
          { no: "5.3", text: "Penerapan Commitment Fee beserta mekanisme pengembaliannya akan diinformasikan secara jelas pada informasi atau halaman pendaftaran kegiatan terkait." },
        ],
      },
    ],
  },
  {
    no: 6,
    title: "Ketentuan Promosi dan Penawaran Produk",
    blocks: [
      {
        kind: "numbered",
        items: [
          { no: "6.1", text: "Anggota diperbolehkan membagikan informasi mengenai produk atau jasa yang ditawarkan sepanjang tidak bertentangan dengan hukum, norma yang berlaku, dan ketentuan komunitas." },
          { no: "6.2", text: "Anggota dilarang mempromosikan atau menawarkan produk maupun layanan ilegal, perjudian, pinjaman online ilegal, investasi bodong, penipuan, atau penawaran lain yang berpotensi merugikan anggota." },
          { no: "6.3", text: "Aktivitas promosi wajib dilakukan secara wajar dan tidak berlebihan. Anggota dilarang melakukan spam, mengirimkan promosi berulang kali, atau memenuhi percakapan grup dengan materi komersial yang mengganggu." },
          { no: "6.4", text: "Pengelola berhak menghapus materi promosi yang dinilai melanggar ketentuan ini atau mengganggu kenyamanan komunitas." },
        ],
      },
    ],
  },
  {
    no: 7,
    title: "Ketentuan Berbagi Informasi Lowongan Kerja",
    blocks: [
      {
        kind: "numbered",
        items: [
          { no: "7.1", text: "Anggota diperbolehkan membagikan informasi lowongan kerja dengan ketentuan bahwa informasi tersebut disampaikan dalam bentuk teks tanpa menyertakan tautan (link)." },
          { no: "7.2", text: "Informasi lowongan kerja disarankan memuat posisi yang ditawarkan, lokasi kerja, dan kualifikasi yang dibutuhkan. Anggota yang berminat dapat menghubungi pengirim secara pribadi untuk memperoleh informasi lebih lanjut." },
          { no: "7.3", text: "Anggota diimbau untuk memeriksa kebenaran informasi lowongan kerja secara mandiri. Anggota harus waspada terhadap lowongan yang meminta pembayaran biaya administrasi, biaya rekrutmen, atau pembayaran lain yang mencurigakan." },
          { no: "7.4", text: "Semeja Kerja tidak menjamin keaslian, ketersediaan, maupun kebenaran setiap informasi lowongan kerja yang dibagikan oleh anggota, kecuali dinyatakan secara tegas oleh pengelola." },
        ],
      },
    ],
  },
  {
    no: 8,
    title: "Privasi dan Keamanan Data",
    blocks: [
      {
        kind: "numbered",
        items: [
          { no: "8.1", text: "Setiap anggota wajib menghormati privasi anggota lainnya." },
          { no: "8.2", text: "Anggota wajib memperoleh persetujuan dari orang yang bersangkutan sebelum mengambil, memublikasikan, atau menyebarkan foto, video, maupun rekaman yang menampilkan orang tersebut, khususnya untuk penggunaan di luar kebutuhan pribadi." },
          { no: "8.3", text: "Anggota dilarang menyebarkan nomor telepon, alamat, identitas, informasi kontak, atau data pribadi anggota lain tanpa persetujuan yang sah, kecuali diwajibkan berdasarkan ketentuan hukum yang berlaku." },
          { no: "8.4", text: "Komunikasi pribadi antaranggota wajib dilakukan secara wajar, sopan, dan tidak mengandung unsur pelecehan, intimidasi, penipuan, atau tindakan yang tidak diinginkan." },
          { no: "8.5", text: "Anggota dapat melaporkan dugaan pelanggaran privasi atau tindakan yang menimbulkan ketidaknyamanan kepada admin untuk ditindaklanjuti sesuai kebijakan komunitas." },
        ],
      },
    ],
  },
  {
    no: 9,
    title: "Hak dan Kewenangan Pengelola",
    blocks: [
      { kind: "p", text: "Pengelola Semeja Kerja berhak untuk:" },
      {
        kind: "list",
        items: [
          "Mengelola grup, kegiatan, dan kanal komunikasi resmi komunitas.",
          "Memberikan teguran kepada anggota yang diduga melanggar Syarat dan Ketentuan ini.",
          "Menghapus konten atau pesan yang melanggar aturan komunitas.",
          "Membatasi aktivitas atau mengeluarkan anggota dari grup apabila terjadi pelanggaran berulang atau pelanggaran berat.",
          "Menetapkan ketentuan tambahan yang diperlukan untuk menjaga keamanan, ketertiban, dan kenyamanan komunitas.",
        ],
      },
      {
        kind: "p",
        text: "Pengelola dapat mengambil tindakan berdasarkan tingkat pelanggaran dan dampaknya terhadap komunitas. Untuk pelanggaran berat, pengelola berhak mengambil tindakan tanpa memberikan pemberitahuan terlebih dahulu.",
      },
    ],
  },
  {
    no: 10,
    title: "Pembatasan Tanggung Jawab",
    blocks: [
      {
        kind: "numbered",
        items: [
          { no: "10.1", text: "Setiap anggota bertanggung jawab atas tindakan, pernyataan, konten, penawaran, dan komunikasi yang dilakukannya di dalam maupun di luar komunitas." },
          { no: "10.2", text: "Semeja Kerja tidak bertanggung jawab atas kerugian yang timbul akibat transaksi pribadi antaranggota, informasi lowongan kerja yang dibagikan anggota, atau tindakan pihak ketiga, sepanjang tanggung jawab tersebut tidak diwajibkan berdasarkan hukum yang berlaku." },
          { no: "10.3", text: "Keikutsertaan dalam kegiatan dilakukan dengan kewajiban untuk mematuhi instruksi penyelenggara serta peraturan di lokasi kegiatan." },
          { no: "10.4", text: "Ketentuan pembatasan tanggung jawab ini tidak menghapus hak atau kewajiban yang tidak dapat dikesampingkan berdasarkan peraturan perundang-undangan." },
        ],
      },
    ],
  },
  {
    no: 11,
    title: "Pelanggaran dan Sanksi",
    blocks: [
      {
        kind: "p",
        text: "Setiap pelanggaran terhadap Syarat dan Ketentuan ini dapat dikenai tindakan sesuai tingkat keparahan pelanggaran, termasuk:",
      },
      {
        kind: "list",
        items: [
          "Teguran secara pribadi atau melalui grup.",
          "Penghapusan konten atau pesan yang melanggar.",
          "Pembatasan partisipasi dalam kegiatan atau aktivitas komunitas.",
          "Pengeluaran anggota dari grup atau penghentian akses terhadap komunitas.",
        ],
      },
      {
        kind: "p",
        text: "Untuk pelanggaran berulang atau pelanggaran berat, pengelola berhak menjatuhkan sanksi tanpa pemberitahuan terlebih dahulu. Pengelola dapat mempertimbangkan sifat pelanggaran, dampak yang ditimbulkan, dan riwayat pelanggaran anggota.",
      },
    ],
  },
  {
    no: 12,
    title: "Perubahan Syarat dan Ketentuan",
    blocks: [
      {
        kind: "p",
        text: "Semeja Kerja berhak mengubah atau memperbarui Syarat dan Ketentuan ini sesuai kebutuhan pengelolaan komunitas atau perubahan ketentuan hukum yang berlaku.",
      },
      {
        kind: "p",
        text: "Perubahan akan diinformasikan melalui kanal komunikasi resmi atau situs web Semeja Kerja. Anggota diharapkan memeriksa pembaruan yang berlaku secara berkala.",
      },
    ],
  },
  {
    no: 13,
    title: "Hukum yang Berlaku",
    blocks: [
      {
        kind: "p",
        text: "Syarat dan Ketentuan ini ditafsirkan berdasarkan hukum yang berlaku di Republik Indonesia. Setiap permasalahan yang timbul sehubungan dengan pelaksanaan ketentuan ini akan diupayakan penyelesaiannya secara musyawarah terlebih dahulu, tanpa mengurangi hak para pihak berdasarkan hukum yang berlaku.",
      },
    ],
  },
  {
    no: 14,
    title: "Persetujuan Pengguna",
    blocks: [
      {
        kind: "p",
        text: "Dengan bergabung dalam komunitas Semeja Kerja, menggunakan layanan komunitas, atau mendaftarkan diri pada kegiatan resmi, anggota menyatakan bahwa dirinya telah membaca, memahami, dan menyetujui Syarat dan Ketentuan ini.",
      },
      {
        kind: "p",
        text: "Apabila anggota tidak menyetujui ketentuan yang berlaku, anggota diharapkan tidak melanjutkan partisipasi dalam komunitas atau kegiatan Semeja Kerja.",
      },
    ],
  },
];
