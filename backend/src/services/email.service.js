// ============================================================
//  Service Email
//  Mengirim notifikasi email untuk berbagai event sistem.
//  Tidak memblokir operasi utama jika email gagal terkirim.
// ============================================================

const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');
const {
  templateKonfirmasiPengajuan,
  templateStatusUpdate,
  templateKeterlambatan,
  templateNotifikasiAdmin,
} = require('../utils/emailTemplates');

// Inisialisasi transporter nodemailer
let transporter = null;

function getTransporter() {
  if (!env.email?.enabled) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.email.smtp?.host,
      port: env.email.smtp?.port || 587,
      secure: env.email.smtp?.port === 465, // true untuk port 465, false untuk yang lain
      auth: {
        user: env.email.smtp?.user,
        pass: env.email.smtp?.pass,
      },
    });
  }

  return transporter;
}

// Kirim email (async, tidak memblokir)
async function kirim({ ke, subjek, html }) {
  if (!env.email?.enabled) {
    logger.info(`[EMAIL] Disabled. Would send to: ${ke}`);
    return { success: false, reason: 'EMAIL_DISABLED' };
  }

  const t = getTransporter();
  if (!t) {
    logger.warn('[EMAIL] Transporter not available');
    return { success: false, reason: 'NO_TRANSPORTER' };
  }

  try {
    const info = await t.sendMail({
      from: env.email.from || '"SIPP-BMN" <noreply@bmn.go.id>',
      to: ke,
      subject: subjek,
      html,
    });

    logger.success(`[EMAIL] Sent to ${ke}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`[EMAIL] Failed to send to ${ke}:`, error.message);
    return { success: false, reason: error.message };
  }
}

// Kirim konfirmasi pengajuan ke peminjam
async function kirimKonfirmasiPengajuan(peminjaman, peminjam) {
  const html = templateKonfirmasiPengajuan({ peminjaman, peminjam });
  return kirim({
    ke: peminjam.email,
    subjek: `Konfirmasi Pengajuan Peminjaman - ${peminjaman.kodeTransaksi}`,
    html,
  });
}

// Kirim update status ke peminjam
async function kirimStatusUpdate(peminjaman, peminjam, statusLama, statusBaru, catatan) {
  const html = templateStatusUpdate({
    peminjaman,
    peminjam,
    statusLama,
    statusBaru,
    catatan,
  });
  return kirim({
    ke: peminjam.email,
    subjek: `Update Status Peminjaman - ${statusBaru}`,
    html,
  });
}

// Kirim warning keterlambatan ke peminjam
async function kirimKeterlambatan(peminjaman, peminjam) {
  const html = templateKeterlambatan({ peminjaman, peminjam });
  return kirim({
    ke: peminjam.email,
    subjek: `⚠️ Peringatan: Peminjaman Terlambat - ${peminjaman.kodeTransaksi}`,
    html,
  });
}

// Kirim notifikasi ke admin (ada pengajuan baru)
async function kirimNotifikasiAdmin(peminjaman, peminjam, adminEmail) {
  const html = templateNotifikasiAdmin({ peminjaman, peminjam });
  return kirim({
    ke: adminEmail || env.admin?.email,
    subjek: `📋 Pengajuan Peminjaman Baru - ${peminjaman.kodeTransaksi}`,
    html,
  });
}

// Kirim notifikasi ke admin: peminjam mengajukan pengembalian barang
async function kirimPermintaanPengembalian(peminjaman, peminjam, adminEmail) {
  const kode = peminjaman.kodeTransaksi || peminjaman.kodePeminjaman || peminjaman.id;
  const html = `
  <!DOCTYPE html>
  <html lang="id">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background-color:#f3f4f6;color:#1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:20px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr><td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:30px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;">📦 Permintaan Pengembalian Barang</h1>
          </td></tr>
          <tr><td style="padding:30px;">
            <p style="margin:0 0 16px;color:#374151;">Peminjam <strong>${peminjam?.nama || '-'}</strong> mengajukan pengembalian barang dan menunggu konfirmasi Anda.</p>
            <div style="background-color:#eff6ff;padding:16px;border-radius:8px;margin-bottom:24px;">
              <p style="margin:0;color:#1e40af;"><strong>Kode Peminjaman:</strong> ${kode}</p>
            </div>
            <p style="margin:0;color:#6b7280;font-size:14px;">Silakan buka menu Manajemen Peminjaman untuk mengkonfirmasi pengembalian.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;

  return kirim({
    ke: adminEmail || env.admin?.email,
    subjek: `📦 Permintaan Pengembalian - ${kode}`,
    html,
  });
}

// Kirim email reset password
async function kirimResetPassword(user, passwordBaru) {
  const html = `
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Segoe UI', sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
            <tr>
              <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 24px;">🔐 Reset Password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px;">
                <p style="margin: 0 0 16px; color: #374151;">Halo ${user.nama},</p>
                <p style="margin: 0 0 24px; color: #374151;">Password Anda telah direset oleh administrator. Silakan gunakan password baru berikut:</p>
                <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                  <p style="margin: 0; font-family: monospace; font-size: 18px; color: #1e40af; font-weight: 600;">${passwordBaru}</p>
                </div>
                <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px;">
                  Setelah login, segera ubah password Anda untuk keamanan.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;

  return kirim({
    ke: user.email,
    subjek: '🔐 Password Anda Telah Direset',
    html,
  });
}

module.exports = {
  kirim,
  kirimKonfirmasiPengajuan,
  kirimStatusUpdate,
  kirimKeterlambatan,
  kirimNotifikasiAdmin,
  kirimPermintaanPengembalian,
  kirimResetPassword,
  getTransporter,
};
