// ============================================================
//  CSRF Token Stability Test
//  Simulasi: apakah token CSRF tetap stabil di antar-request
//  berurutan ke /api/peminjaman/* setelah fix.
//  HAPUS file ini setelah test selesai.
// ============================================================

const https = require('https');
const http = require('http');

// Konfigurasi
const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@bmn.go.id';
const ADMIN_PASSWORD = 'Admin123!';
const TEST_ITEMS = [
  { barangId: '015110199411868000KP-3100102002-0001', jumlahPinjam: 1 }
];

// Helper: HTTP request dengan cookie jar
function httpRequest(method, path, { body, headers, cookieJar, token } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
    };

    const cookies = [];
    if (cookieJar) {
      for (const [k, v] of Object.entries(cookieJar)) {
        cookies.push(`${k}=${v}`);
      }
    }
    if (cookies.length) {
      opts.headers['Cookie'] = cookies.join('; ');
    }

    if (token) {
      opts.headers['x-csrf-token'] = token;
    }

    const req = lib.request(opts, (res) => {
      // Update cookie jar dari Set-Cookie header
      const setCookie = res.headers['set-cookie'];
      if (setCookie && cookieJar) {
        for (const sc of setCookie) {
          const [pair] = sc.split(';');
          const [k, v] = pair.split('=');
          if (k && v !== 'deleted') {
            cookieJar[k.trim()] = v.trim();
          } else if (v === 'deleted') {
            delete cookieJar[k.trim()];
          }
        }
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timeout')); });

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
      req.write(bodyStr);
    }
    req.end();
  });
}

// Helper: sleep ms
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Helper: singkat token untuk display
function shortToken(token) {
  if (!token) return '(null)';
  return token.slice(0, 8) + '...' + token.slice(-4);
}

// ============================================================
//  TEST 1: Token stabil di antar-request berurutan
// ============================================================
async function testTokenStability() {
  console.log('\n========================================');
  console.log('TEST 1: CSRF Token Stability (with auth)');
  console.log('========================================');

  const cookieJar = {};

  // Login
  console.log('\n[1.1] Login sebagai admin...');
  const loginRes = await httpRequest('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    cookieJar,
  });
  console.log(`    Status: ${loginRes.status}`);
  if (loginRes.status !== 200) {
    console.log('    FAIL: Login gagal'); process.exit(1);
  }

  // Ambil csrf_token dari cookie jar setelah login
  const tokenAfterLogin = cookieJar['csrf_token'];
  console.log(`    csrf_token setelah login: ${shortToken(tokenAfterLogin)}`);

  if (!tokenAfterLogin) {
    console.log('    FAIL: Tidak ada csrf_token di cookie setelah login');
    process.exit(1);
  }

  // Kirim 5 request berurutan ke /api/peminjaman/preview-surat
  // Setiap request harus MEMPERTAHANKAN token yang sama
  console.log('\n[1.2] Kirim 5 request berurutan ke /preview-surat (dengan jeda 200ms)...');
  const previewPayload = {
    items: TEST_ITEMS,
    pangkatGolongan: 'Penata Muda / III-a',
    tanggalPinjamRencana: '2026-08-01',
    tanggalKembaliRencana: '2026-08-15',
  };

  let previousToken = tokenAfterLogin;
  let allMatch = true;

  for (let i = 1; i <= 5; i++) {
    await sleep(200);
    const res = await httpRequest('POST', '/api/peminjaman/preview-surat', {
      body: previewPayload,
      cookieJar,
    });

    const tokenNow = cookieJar['csrf_token'];
    const match = tokenNow === previousToken;
    const changed = tokenNow !== tokenAfterLogin;
    if (!match) allMatch = false;

    console.log(`    Request ${i}: status=${res.status}, csrf=${shortToken(tokenNow)} ${match ? '✓ SAMA' : '✗ BERUBAH'} ${changed && match ? '(rotated sebelumnya)' : ''}`);
    previousToken = tokenNow;
  }

  // Kirim request FINAL dengan token dari request pertama (TOKEN_1)
  // Ini mensimulasikan: preview → retry → upload → SUBMIT (final)
  console.log('\n[1.3] Request FINAL dengan token dari langkah 1.1 (TOKEN_1)...');
  const finalRes = await httpRequest('POST', '/api/peminjaman/preview-surat', {
    body: previewPayload,
    cookieJar,
    // Kirim token dari request PERTAMA (simulasi: token awal tetap dipakai di akhir alur)
    // Kita pakai tokenAfterLogin (token dari langkah 1.1)
    token: tokenAfterLogin,
  });

  console.log(`    Status: ${finalRes.status}`);
  console.log(`    Token dikirim: ${shortToken(tokenAfterLogin)}`);
  console.log(`    CSRF cookie saat ini: ${shortToken(cookieJar['csrf_token'])}`);

  const PASS_STABILITY = allMatch;
  const PASS_FINAL = finalRes.status === 200;

  console.log(`\n  [RESULT] Stability (token tidak berubah antar-request): ${PASS_STABILITY ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  [RESULT] Final request dengan TOKEN_1: ${PASS_FINAL ? 'PASS ✓' : 'FAIL ✗'}`);

  return PASS_STABILITY && PASS_FINAL;
}

// ============================================================
//  TEST 2: Request pertama (tanpa cookie CSRF) generate token baru
// ============================================================
async function testFirstRequestGeneration() {
  console.log('\n========================================');
  console.log('TEST 2: First Request — Generate Token Baru');
  console.log('========================================');

  const cookieJar = {};

  // Login dulu untuk dapat access token
  console.log('\n[2.1] Login...');
  const loginRes = await httpRequest('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    cookieJar,
  });
  console.log(`    Status: ${loginRes.status}`);

  // Hapus csrf_token dari cookie jar untuk simulasi "cookie belum ada"
  const csrfBefore = cookieJar['csrf_token'];
  console.log(`    csrf_token sebelum dihapus: ${shortToken(csrfBefore)}`);
  delete cookieJar['csrf_token'];

  // Kirim request pertama TANPA cookie csrf_token
  console.log('\n[2.2] Request pertama tanpa csrf_token di cookie...');
  const previewPayload = {
    items: TEST_ITEMS,
    pangkatGolongan: 'Penata Muda / III-a',
  };

  const res = await httpRequest('POST', '/api/peminjaman/preview-surat', {
    body: previewPayload,
    cookieJar,
  });

  const csrfAfter = cookieJar['csrf_token'];
  console.log(`    Status: ${res.status}`);
  console.log(`    csrf_token setelah request: ${shortToken(csrfAfter)}`);

  const PASS = res.status === 200 && !!csrfAfter;
  console.log(`\n  [RESULT] Token baru di-generate pada request pertama: ${PASS ? 'PASS ✓' : 'FAIL ✗'}`);
  return PASS;
}

// ============================================================
//  TEST 3: Validasi CSRF token untuk request state-changing
// ============================================================
async function testCsrfValidation() {
  console.log('\n========================================');
  console.log('TEST 3: CSRF Validation — request DITERIMA dengan token valid');
  console.log('========================================');

  const cookieJar = {};

  // Login
  console.log('\n[3.1] Login...');
  await httpRequest('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    cookieJar,
  });

  const csrfToken = cookieJar['csrf_token'];
  console.log(`    csrf_token: ${shortToken(csrfToken)}`);

  // Kirim request POST /peminjaman (create — state-changing) dengan token BENAR
  console.log('\n[3.2] POST /peminjaman (create draft) dengan token BENAR...');
  // Buat FormData secara manual untuk multipart
  const boundary = '----FormBoundary' + Date.now();
  const bodyParts = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="draft"`,
    '',
    'true',
    `--${boundary}`,
    `Content-Disposition: form-data; name="items"`,
    '',
    JSON.stringify(TEST_ITEMS),
    `--${boundary}--`,
    '',
  ];

  const bodyStr = bodyParts.join('\r\n');
  const res = await httpRequest('POST', '/api/peminjaman', {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyStr,
    cookieJar,
    token: csrfToken,
  });

  console.log(`    Status: ${res.status}`);
  if (res.status !== 201) {
    console.log(`    Pesan: ${JSON.stringify(res.body?.error || res.body?.pesan || res.body)}`);
  }

  const PASS = res.status === 201;
  console.log(`\n  [RESULT] Request dengan token valid DITERIMA: ${PASS ? 'PASS ✓' : 'FAIL ✗'}`);

  // Cleanup: batalkan draft kalau berhasil dibuat
  if (PASS && res.body?.data?.id) {
    console.log('\n[3.3] Cleanup — batalkan draft...');
    const draftId = res.body.data.id;
    const csrfTokenNew = cookieJar['csrf_token']; // token setelah create
    const batalRes = await httpRequest('DELETE', `/api/peminjaman/${draftId}/batal-draft`, {
      cookieJar,
      token: csrfTokenNew,
    });
    console.log(`    Status: ${batalRes.status} (${batalRes.status === 200 || batalRes.status === 204 ? 'dibatalkan' : 'skip cleanup'})`);
  }

  return PASS;
}

// ============================================================
//  TEST 4: Request TANPA token ditolak
// ============================================================
async function testCsrfRejection() {
  console.log('\n========================================');
  console.log('TEST 4: CSRF Validation — request DITOLAK tanpa token');
  console.log('========================================');

  const cookieJar = {};

  // Login
  console.log('\n[4.1] Login...');
  await httpRequest('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    cookieJar,
  });

  const csrfToken = cookieJar['csrf_token'];
  console.log(`    csrf_token ada di cookie: ${shortToken(csrfToken)}`);

  // Kirim request TANPA header x-csrf-token (attacker scenario)
  console.log('\n[4.2] POST /peminjaman TANPA x-csrf-token header...');
  const boundary = '----FormBoundary' + Date.now();
  const bodyParts = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="draft"`,
    '',
    'true',
    `--${boundary}`,
    `Content-Disposition: form-data; name="items"`,
    '',
    JSON.stringify(TEST_ITEMS),
    `--${boundary}--`,
    '',
  ];
  const bodyStr = bodyParts.join('\r\n');

  const res = await httpRequest('POST', '/api/peminjaman', {
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: bodyStr,
    cookieJar,
    // TANPA token
  });

  console.log(`    Status: ${res.status}`);
  console.log(`    Pesan: ${JSON.stringify(res.body?.error || res.body?.pesan || res.body)}`);

  const PASS = res.status === 403;
  console.log(`\n  [RESULT] Request tanpa token DITOLAK (403): ${PASS ? 'PASS ✓' : 'FAIL ✗'}`);
  return PASS;
}

// ============================================================
//  JALANKAN SEMUA TEST
// ============================================================
async function main() {
  console.log('========================================');
  console.log('CSRF TOKEN STABILITY TEST');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Waktu: ${new Date().toISOString()}`);
  console.log('========================================');

  try {
    const r1 = await testTokenStability();
    const r2 = await testFirstRequestGeneration();
    const r3 = await testCsrfValidation();
    const r4 = await testCsrfRejection();

    console.log('\n========================================');
    console.log('OVERALL RESULT');
    console.log('========================================');
    console.log(`  Test 1 (Token Stability):      ${r1 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`  Test 2 (First-Request Gen):    ${r2 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`  Test 3 (Valid Token Accepted): ${r3 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`  Test 4 (Missing Token Rejected): ${r4 ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`\n  SEMUA TEST: ${r1 && r2 && r3 && r4 ? 'PASS ✓ — Fix CSRF token rotation BERHASIL' : 'FAIL ✗ — Ada masalah'}`);
    console.log('========================================');
  } catch (err) {
    console.error('\nTEST GAGAL DENGAN ERROR:', err.message);
    process.exit(1);
  }
}

main();
