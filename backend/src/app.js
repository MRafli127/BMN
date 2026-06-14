// ============================================================
//  Konfigurasi aplikasi Express (middleware global & rute).
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Keamanan header HTTP. crossOriginResourcePolicy dilonggarkan agar
// file di /uploads (foto, QR) dapat dimuat dari domain frontend.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS — izinkan frontend mengirim cookie (refresh token)
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// Parser body & cookie
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logger request (mode pengembangan)
if (env.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Sajikan file upload secara statis (foto barang, QR, dokumen stempel)
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Rute utama API
app.use('/api', apiRoutes);

// Rute root
app.get('/', (req, res) => {
  res.json({ sukses: true, pesan: 'Server SIPP-BMN berjalan. Akses API di /api' });
});

// Penanganan rute tidak ditemukan & error terpusat
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
