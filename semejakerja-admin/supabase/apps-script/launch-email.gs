/**
 * Semeja Kerja — Launch code emailer (Google Apps Script Web App)
 * ---------------------------------------------------------------
 * Menerima POST dari Supabase (migration 019 → pg_net) dan mengirim
 * email kode diskon launch ke pendaftar via Gmail-mu.
 *
 * CARA DEPLOY:
 *  1. script.google.com → New project → tempel seluruh file ini.
 *  2. Ganti SHARED_TOKEN dengan string acak (mis. hasil `openssl rand -hex 16`).
 *     Nilai ini HARUS sama dengan yang disimpan di Supabase Vault
 *     (secret bernama `launch_gas_token`).
 *  3. Deploy → New deployment → pilih "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Salin URL yang berakhiran /exec → simpan ke Vault (`launch_gas_url`).
 *  4. Saat pertama jalan, Google minta izin GmailApp — Allow.
 *
 * Kuota kirim: Gmail biasa ~100/hari, Google Workspace ~1.500/hari.
 */

var SHARED_TOKEN = 'GANTI_DENGAN_TOKEN_RAHASIA';
var SENDER_NAME = 'Semeja Kerja';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    if (body.token !== SHARED_TOKEN) {
      return jsonOut({ ok: false, error: 'unauthorized' });
    }
    if (!body.to || !body.code) {
      return jsonOut({ ok: false, error: 'missing to/code' });
    }

    var name = body.name || 'Sobat Semeja';
    var code = String(body.code);
    var discount = body.discount != null ? body.discount + '%' : '';
    var expires = body.expires_at
      ? new Date(body.expires_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    var subject = 'Kode diskon launch kamu: ' + code;
    var plain =
      'Halo ' + name + ',\n\n' +
      'Terima kasih sudah daftar! Ini kode diskon ' + discount + ' kamu:\n\n' +
      '  ' + code + '\n\n' +
      (expires ? 'Berlaku sampai ' + expires + '.\n\n' : '') +
      'Pakai kode ini saat checkout membership di website Semeja Kerja.\n\n' +
      'Sampai jumpa di kafe! ☕';

    GmailApp.sendEmail(body.to, subject, plain, {
      name: SENDER_NAME,
      htmlBody: htmlTemplate(name, code, discount, expires),
    });

    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err) });
  }
}

function htmlTemplate(name, code, discount, expires) {
  return '' +
    '<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a">' +
      '<div style="background:#3D155F;color:#fff;padding:24px;border-radius:16px 16px 0 0">' +
        '<h2 style="margin:0;font-size:20px">🚀 Selamat datang, ' + escapeHtml(name) + '!</h2>' +
      '</div>' +
      '<div style="border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px;padding:24px">' +
        '<p style="margin:0 0 16px;line-height:1.6">Terima kasih sudah daftar campaign launch Semeja Kerja. Ini kode diskon <b>' + discount + '</b> kamu:</p>' +
        '<div style="border:2px dashed #F0C733;background:#FEFBEA;border-radius:12px;padding:16px;text-align:center;margin:0 0 16px">' +
          '<span style="font-family:monospace;font-size:24px;font-weight:800;letter-spacing:2px;color:#3D155F">' + escapeHtml(code) + '</span>' +
        '</div>' +
        (expires ? '<p style="margin:0 0 8px;color:#666;font-size:14px">Berlaku sampai <b>' + expires + '</b>.</p>' : '') +
        '<p style="margin:0;line-height:1.6">Pakai kode ini saat checkout membership di website Semeja Kerja. Sampai jumpa di kafe! ☕</p>' +
      '</div>' +
    '</div>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
