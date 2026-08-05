// ============================================================
//  Template Email untuk Notifikasi Peminjaman BMN
// ============================================================

// Mapping status ke label dan deskripsi
const STATUS_INFO = {
  MENUNGGU: {
    label: 'Menunggu Persetujuan',
    deskripsi: 'Pengajuan Anda sedang menunggu persetujuan administrator.',
    warna: '#f59e0b',
    icon: '⏳',
  },
  DISETUJUI: {
    label: 'Disetujui',
    deskripsi: 'Pengajuan peminjaman Anda telah disetujui. Silakan mengambil barang sesuai jadwal.',
    warna: '#10b981',
    icon: '✅',
  },
  DITOLAK: {
    label: 'Ditolak',
    deskripsi: 'Maaf, pengajuan peminjaman Anda ditolak. Silakan hubungi administrator untuk informasi lebih lanjut.',
    warna: '#ef4444',
    icon: '❌',
  },
  DIPINJAM: {
    label: 'Sedang Dipinjam',
    deskripsi: 'Barang sedang dalam masa peminjaman. Pastikan mengembalikan tepat waktu.',
    warna: '#3b82f6',
    icon: '📦',
  },
  DIKEMBALIKAN: {
    label: 'Dikembalikan',
    deskripsi: 'Barang telah dikembalikan dan peminjaman telah selesai.',
    warna: '#10b981',
    icon: '🏁',
  },
  TERLAMBAT: {
    label: 'Terlambat',
    deskripsi: 'Masa peminjaman telah melewati batas waktu. Segera kembalikan barang.',
    warna: '#ef4444',
    icon: '⚠️',
  },
};

// Base template email
function baseTemplate({ content, judul, subtitle }) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${judul}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; color: #1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">📋 SIPP-BMN</h1>
              <p style="margin: 8px 0 0; color: #bfdbfe; font-size: 14px;">Sistem Informasi Peminjaman Barang Milik Negara</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">${judul}</h2>
              ${subtitle ? `<p style="margin: 0 0 24px; color: #6b7280; font-size: 14px;">${subtitle}</p>` : ''}
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Email ini dikirim secara otomatis oleh sistem SIPP-BMN.<br>
                Jangan membalas email ini.<br><br>
                &copy; ${new Date().getFullYear()} SIPP-BMN. Hak cipta dilindungi.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Format tanggal Indonesia
function formatTanggalIndonesia(date) {
  if (!date) return '-';
  const d = new Date(date);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('id-ID', options);
}

// Format tanggal singkat
function formatTanggalSingkat(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Template: Konfirmasi pengajuan baru
function templateKonfirmasiPengajuan({ peminjaman, peminjam }) {
  const statusInfo = STATUS_INFO.MENUNGGU;
  const itemList = peminjaman.detail?.map((d) => `<li style="margin-bottom: 8px;"><strong>${d.barang?.nama || 'Barang'}</strong> - ${d.jumlahPinjam} unit</li>`).join('') || '';

  const content = `
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        <strong>${statusInfo.icon} ${statusInfo.label}</strong><br>
        <span style="color: #3b82f6;">${statusInfo.deskripsi}</span>
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 35%;">Kode Transaksi</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">${peminjaman.kodeTransaksi || '-'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Tanggal Pengajuan</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${formatTanggalIndonesia(peminjaman.tanggalPengajuan)}</td>
      </tr>
      ${peminjaman.tanggalPinjamRencana ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Rencana Tanggal Pinjam</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${formatTanggalIndonesia(peminjaman.tanggalPinjamRencana)}</td>
      </tr>
      ` : ''}
      ${peminjaman.tanggalKembaliRencana ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Rencana Tanggal Kembali</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${formatTanggalIndonesia(peminjaman.tanggalKembaliRencana)}</td>
      </tr>
      ` : ''}
    </table>

    <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Barang yang Dipinjam</h3>
    <ul style="margin: 0 0 24px; padding-left: 20px; color: #374151; font-size: 14px;">
      ${itemList}
    </ul>

    ${peminjaman.alasanPeminjaman ? `
    <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Alasan Peminjaman</h3>
    <p style="margin: 0 0 24px; color: #374151; font-size: 14px; background-color: #f9fafb; padding: 12px; border-radius: 6px;">
      ${peminjaman.alasanPeminjaman}
    </p>
    ` : ''}

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Anda akan mendapat notifikasi email setelah administrator memproses pengajuan ini.
    </p>
  `;

  return baseTemplate({
    content,
    judul: 'Konfirmasi Pengajuan Peminjaman',
    subtitle: `Terima kasih, ${peminjam.nama}. Pengajuan Anda telah kami terima.`,
  });
}

// Template: Update status peminjaman
function templateStatusUpdate({ peminjaman, peminjam, statusLama, statusBaru, catatan }) {
  const statusInfo = STATUS_INFO[statusBaru] || STATUS_INFO.MENUNGGU;

  const itemList = peminjaman.detail?.map((d) => `<li style="margin-bottom: 8px;"><strong>${d.barang?.nama || 'Barang'}</strong> - ${d.jumlahPinjam} unit</li>`).join('') || '';

  const content = `
    <div style="background-color: ${statusInfo.warna}15; border-left: 4px solid ${statusInfo.warna}; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; color: ${statusInfo.warna}; font-size: 14px;">
        <strong>${statusInfo.icon} Status: ${statusInfo.label}</strong><br>
        <span style="color: #374151;">${statusInfo.deskripsi}</span>
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 35%;">Kode Transaksi</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">${peminjaman.kodeTransaksi || '-'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Barang</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">
          <ul style="margin: 0; padding-left: 20px;">${itemList}</ul>
        </td>
      </tr>
      ${statusBaru === 'DISETUJUI' && peminjaman.tanggalPinjamRencana ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Tanggal Ambil</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${formatTanggalIndonesia(peminjaman.tanggalPinjamRencana)}</td>
      </tr>
      ` : ''}
      ${peminjaman.tanggalKembaliRencana ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Batas Pengembalian</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${formatTanggalIndonesia(peminjaman.tanggalKembaliRencana)}</td>
      </tr>
      ` : ''}
    </table>

    ${catatan ? `
    <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Catatan Administrator</h3>
    <p style="margin: 0 0 24px; color: #374151; font-size: 14px; background-color: #fef3c7; padding: 12px; border-radius: 6px;">
      ${catatan}
    </p>
    ` : ''}

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Untuk melihat detail lengkap, silakan login ke sistem SIPP-BMN.
    </p>
  `;

  const judul =
    statusBaru === 'DISETUJUI' ? 'Pengajuan Peminjaman Disetujui!' :
    statusBaru === 'DITOLAK' ? 'Pengajuan Peminjaman Ditolak' :
    statusBaru === 'DIKEMBALIKAN' ? 'Peminjaman Telah Selesai' :
    statusBaru === 'TERLAMBAT' ? 'Peringatan: Peminjaman Terlambat!' :
    'Update Status Peminjaman';

  return baseTemplate({
    content,
    judul,
    subtitle: `Yth. ${peminjam.nama}, berikut informasi terbaru mengenai pengajuan peminjaman Anda.`,
  });
}

// Template: Warning keterlambatan
function templateKeterlambatan({ peminjaman, peminjam }) {
  const statusInfo = STATUS_INFO.TERLAMBAT;

  const itemList = peminjaman.detail?.map((d) => `<li style="margin-bottom: 8px;"><strong>${d.barang?.nama || 'Barang'}</strong> - ${d.jumlahPinjam} unit</li>`).join('') || '';

  const content = `
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; color: #dc2626; font-size: 14px;">
        <strong>⚠️ PERHATIAN: PEMINJAMAN TERLAMBAT</strong><br>
        <span style="color: #374151;">Masa peminjaman telah melewati batas waktu yang ditentukan. Segera kembalikan barang.</span>
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 35%;">Kode Transaksi</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">${peminjaman.kodeTransaksi || '-'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Batas Pengembalian</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #ef4444; font-size: 14px; font-weight: 600;">${formatTanggalIndonesia(peminjaman.tanggalKembaliRencana)} (LEWAT)</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Barang</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">
          <ul style="margin: 0; padding-left: 20px;">${itemList}</ul>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 16px; color: #374151; font-size: 14px;">
      Keterlambatan pengembalian dapat mempengaruhi hak peminjaman Anda di masa mendatang.
    </p>

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Segera hubungi administrator atau kembalikan barang Anda.
    </p>
  `;

  return baseTemplate({
    content,
    judul: '⚠️ Peringatan: Peminjaman Terlambat',
    subtitle: `Yth. ${peminjam.nama}, mohon perhatian untuk segera mengembalikan barang yang dipinjam.`,
  });
}

// Template: Notifikasi admin (ada peminjaman baru)
function templateNotifikasiAdmin({ peminjaman, peminjam }) {
  const itemList = peminjaman.detail?.map((d) => `<li style="margin-bottom: 8px;"><strong>${d.barang?.nama || 'Barang'}</strong> - ${d.jumlahPinjam} unit (Tersedia: ${d.barang?.jumlahTersedia || '-'})</li>`).join('') || '';

  const content = `
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        <strong>📋 Pengajuan Peminjaman Baru</strong><br>
        <span style="color: #3b82f6;">Ada pengajuan peminjaman baru yang menunggu persetujuan Anda.</span>
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; width: 35%;">Kode Transaksi</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 500;">${peminjaman.kodeTransaksi || '-'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Peminjam</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${peminjam.nama} (${peminjam.nip})</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Email</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${peminjam.email}</td>
      </tr>
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Tanggal Pengajuan</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${formatTanggalIndonesia(peminjaman.tanggalPengajuan)}</td>
      </tr>
      ${peminjaman.tanggalKembaliRencana ? `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">Rencana Kembali</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${formatTanggalIndonesia(peminjaman.tanggalKembaliRencana)}</td>
      </tr>
      ` : ''}
    </table>

    <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Barang yang Diminta</h3>
    <ul style="margin: 0 0 24px; padding-left: 20px; color: #374151; font-size: 14px;">
      ${itemList}
    </ul>

    ${peminjaman.alasanPeminjaman ? `
    <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Alasan</h3>
    <p style="margin: 0 0 24px; color: #374151; font-size: 14px; background-color: #f9fafb; padding: 12px; border-radius: 6px;">
      ${peminjaman.alasanPeminjaman}
    </p>
    ` : ''}

    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Silakan login ke sistem untuk memproses pengajuan ini.
    </p>
  `;

  return baseTemplate({
    content,
    judul: '📋 Pengajuan Peminjaman Baru',
    subtitle: `Pengajuan dari ${peminjam.nama} menunggu persetujuan Anda.`,
  });
}

module.exports = {
  STATUS_INFO,
  templateKonfirmasiPengajuan,
  templateStatusUpdate,
  templateKeterlambatan,
  templateNotifikasiAdmin,
  formatTanggalIndonesia,
  formatTanggalSingkat,
};
