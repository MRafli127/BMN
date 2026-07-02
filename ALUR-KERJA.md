# Alur Kerja SIPP-BMN — Admin & Peminjam

Dokumen ini memuat **flowchart lengkap dari awal hingga akhir** untuk masing-masing
peran: **Peminjam** dan **Admin**. Semua diagram ditulis dalam sintaks **Mermaid**
sehingga dapat dirender langsung di GitHub, VS Code (dengan ekstensi Mermaid),
Obsidian, dan sebagian besar penampil Markdown modern.

Status peminjaman yang dipakai sistem:
`MENUNGGU → DISETUJUI → DIPINJAM → DIKEMBALIKAN`, dengan cabang `DITOLAK`
dan status otomatis `TERLAMBAT` (bila melewati tenggat).

---

## 1. Alur Peminjam (dari awal hingga akhir)

```mermaid
flowchart TD
    Start([Mulai]) --> Punya{Sudah punya akun?}
    Punya -- Belum --> Reg[Registrasi:\nnama, NIP, email, password,\nEselon III & IV]
    Reg --> RegCek{Email / NIP\nsudah terdaftar?}
    RegCek -- Ya --> RegGagal[Tampilkan error\nEmail/NIP sudah dipakai]
    RegGagal --> Reg
    RegCek -- Tidak --> Akun[Akun dibuat\nrole = PEMINJAM]
    Akun --> Login
    Punya -- Sudah --> Login[Login\nemail + password]
    Login --> LoginCek{Kredensial benar?}
    LoginCek -- Tidak --> Login
    LoginCek -- Ya --> Dash[Dashboard Peminjam]

    Dash --> Katalog[Telusuri Katalog Barang]
    Katalog --> Pilih[Pilih barang + jumlah\nMasukkan ke Keranjang]
    Pilih --> Lagi{Tambah barang lain?}
    Lagi -- Ya --> Katalog
    Lagi -- Tidak --> FormAju[Isi form pengajuan:\ntanggal pinjam & kembali rencana,\nalasan, pangkat/golongan]

    FormAju --> Preview[Pratinjau & Unduh\nSurat Pernyataan Peminjaman PDF]
    Preview --> TTD[Tanda tangan surat\nsecara fisik / elektronik]
    TTD --> Upload[Unggah kembali\nsurat yang sudah ditandatangani]
    Upload --> Kirim[Kirim Pengajuan]

    Kirim --> Valid{Lolos validasi?\n- maks 3 peminjaman aktif\n- tidak duplikat barang aktif\n- stok cukup\n- dokumen terlampir}
    Valid -- Tidak --> ErrAju[Tampilkan pesan error]
    ErrAju --> FormAju
    Valid -- Ya --> Menunggu[[Status: MENUNGGU]]

    Menunggu --> Notif1[Terima notifikasi\n& email konfirmasi]
    Notif1 --> Tunggu[Menunggu keputusan admin]

    Tunggu --> Keputusan{Keputusan Admin}
    Keputusan -- Ditolak --> Ditolak[[Status: DITOLAK]]
    Ditolak --> LihatAlasan[Lihat alasan penolakan\ndi Riwayat]
    LihatAlasan --> Selesai1([Selesai])

    Keputusan -- Disetujui --> Disetujui[[Status: DISETUJUI]]
    Disetujui --> AmbilBarang[Ambil barang ke petugas\nAdmin menyerahkan barang]
    AmbilBarang --> Dipinjam[[Status: DIPINJAM]]

    Dipinjam --> CekWaktu{Melewati tenggat\npengembalian?}
    CekWaktu -- Ya --> Terlambat[[Status: TERLAMBAT]]
    CekWaktu -- Tidak --> MauKembali[Ingin mengembalikan]
    Terlambat --> MauKembali

    MauKembali --> UnduhKembali[Unduh Surat Pernyataan\nPengembalian PDF]
    UnduhKembali --> TTDKembali[Tanda tangan\n Yang menerima BMN ]
    TTDKembali --> UploadKembali[Unggah surat pengembalian\n+ Ajukan Pengembalian]
    UploadKembali --> MintaKembali[[Permintaan pengembalian\nmenunggu konfirmasi admin]]
    MintaKembali --> TungguKonfirm[Menunggu admin\nmengkonfirmasi]
    TungguKonfirm --> Dikembalikan[[Status: DIKEMBALIKAN]]
    Dikembalikan --> Riwayat[Peminjaman tercatat\ndi Riwayat]
    Riwayat --> Selesai2([Selesai])
```

---

## 2. Alur Admin (dari awal hingga akhir)

```mermaid
flowchart TD
    Start([Mulai]) --> Login[Login sebagai Admin]
    Login --> Cek{Kredensial benar\n& role = ADMIN?}
    Cek -- Tidak --> Login
    Cek -- Ya --> Dash[Dashboard Admin\nstatistik & ringkasan]

    Dash --> Menu{Pilih aktivitas}

    %% --- Manajemen Barang ---
    Menu -- Manajemen Barang --> Barang[Kelola Data Barang]
    Barang --> BOp{Operasi}
    BOp -- Tambah/Edit/Hapus --> BCrud[CRUD barang\nkode, NUP, stok, foto]
    BOp -- Impor --> BImport[Impor massal\ndari Excel/CSV]
    BOp -- QR & Stempel --> BQr[Generate QR identitas barang\n& kelola stempel dokumen]
    BCrud --> Dash
    BImport --> Dash
    BQr --> Dash

    %% --- Manajemen Peminjaman ---
    Menu -- Manajemen Peminjaman --> Ajuan[Daftar Pengajuan]
    Ajuan --> Filter[Filter: MENUNGGU / DISETUJUI /\nDIPINJAM / TERLAMBAT / dll]
    Filter --> BukaAjuan[Buka detail pengajuan\nMENUNGGU]
    BukaAjuan --> Periksa[Periksa dokumen surat\n& kelengkapan data]

    Periksa --> Milik{Pengajuan milik\nsendiri?}
    Milik -- Ya --> TolakDiri[Tidak boleh proses\npengajuan sendiri]
    TolakDiri --> Ajuan
    Milik -- Tidak --> Putusan{Keputusan}

    Putusan -- Tolak --> InputAlasan[Isi catatan/alasan\nwajib]
    InputAlasan --> SetTolak[[Set status: DITOLAK]]
    SetTolak --> NotifTolak[Kirim notifikasi\n& email ke peminjam]
    NotifTolak --> Ajuan

    Putusan -- Setujui --> CekStok{Stok mencukupi?}
    CekStok -- Tidak --> GagalStok[Tampilkan error stok]
    GagalStok --> Ajuan
    CekStok -- Ya --> SetSetuju[[Set status: DISETUJUI\nStok dikurangi otomatis\nGenerate QR]]
    SetSetuju --> NotifSetuju[Kirim notifikasi\n& email ke peminjam]
    NotifSetuju --> Serah

    %% --- Penyerahan ---
    Serah[Peminjam mengambil barang] --> Serahkan[Klik Serahkan\nsatuan / massal]
    Serahkan --> SetDipinjam[[Set status: DIPINJAM]]
    SetDipinjam --> Pantau

    %% --- Pengembalian ---
    Pantau[Pantau peminjaman berjalan] --> AdaMinta{Ada permintaan\npengembalian?}
    AdaMinta -- Belum --> Pantau
    AdaMinta -- Ya --> CekSurat[Periksa surat pernyataan\npengembalian dari peminjam]
    CekSurat --> KonfirmKembali[Konfirmasi Pengembalian\nsatuan / massal]
    KonfirmKembali --> SetKembali[[Set status: DIKEMBALIKAN\nStok dikembalikan otomatis]]
    SetKembali --> CatatanAdmin[Opsional: catatan pengembalian\nhanya terlihat admin]
    CatatanAdmin --> Selesai1([Selesai / arsip])

    %% --- Scan QR ---
    Menu -- Scan QR --> Scan[Scan QR pada barang]
    DetailScan --> Dash

    %% --- Administrasi Lain ---
    Menu -- Administrasi --> Admin2{Modul}
    Admin2 -- Manajemen User --> UserMgmt[Kelola akun & role\nimpor pegawai/peminjam]
    Admin2 -- Audit Log --> Audit[Telusuri log aktivitas]
    Admin2 -- Ekspor --> Export[Ekspor laporan data]
    UserMgmt --> Dash
    Audit --> Dash
    Export --> Dash
```

---

## 3. Diagram Status Peminjaman (State Machine)

Ringkasan transisi status yang dikelola sistem — berguna untuk memahami
siapa yang memicu tiap perpindahan.

```mermaid
stateDiagram-v2
    [*] --> MENUNGGU : Peminjam mengajukan\n(+ unggah surat pernyataan)

    MENUNGGU --> DISETUJUI : Admin menyetujui\n(stok dikurangi, QR dibuat)
    MENUNGGU --> DITOLAK : Admin menolak\n(wajib catatan)

    DISETUJUI --> DIPINJAM : Admin menyerahkan barang
    DISETUJUI --> TERLAMBAT : Lewat tenggat (otomatis)

    DIPINJAM --> TERLAMBAT : Lewat tenggat (otomatis)
    TERLAMBAT --> DIPINJAM : Tenggat dihapus / dipulihkan

    DIPINJAM --> DIKEMBALIKAN : Admin konfirmasi\n(stok dikembalikan)
    TERLAMBAT --> DIKEMBALIKAN : Admin konfirmasi\n(stok dikembalikan)

    DITOLAK --> [*]
    DIKEMBALIKAN --> [*]

    note right of DIPINJAM
        Peminjam mengajukan pengembalian
        (unggah surat) sebelum admin
        mengkonfirmasi.
    end note
```

---

## 4. Interaksi Peminjam ↔ Admin (Sequence)

Alur satu siklus peminjaman utuh dari sudut pandang komunikasi kedua peran
dan sistem.

```mermaid
sequenceDiagram
    actor P as Peminjam
    participant S as Sistem SIPP-BMN
    actor A as Admin

    P->>S: Registrasi / Login
    P->>S: Telusuri katalog & isi keranjang
    S-->>P: Surat Pernyataan (PDF pratinjau)
    P->>P: Tanda tangan surat (fisik)
    P->>S: Kirim pengajuan + unggah surat
    S-->>A: Notifikasi "Pengajuan baru" (MENUNGGU)

    alt Disetujui
        A->>S: Setujui pengajuan
        S->>S: Kurangi stok + generate QR
        S-->>P: Notifikasi "Disetujui" (DISETUJUI)
        P->>A: Ambil barang
        A->>S: Serahkan barang (DIPINJAM)
    else Ditolak
        A->>S: Tolak + catatan
        S-->>P: Notifikasi "Ditolak" (DITOLAK)
    end

    P->>S: Ajukan pengembalian + unggah surat
    S-->>A: Notifikasi permintaan pengembalian
    A->>S: Konfirmasi pengembalian
    S->>S: Kembalikan stok (DIKEMBALIKAN)
    S-->>P: Notifikasi "Barang dikembalikan"
```

---

### Catatan

- **Registrasi publik** selalu menghasilkan akun ber-role `PEMINJAM`. Akun `ADMIN`
  dibuat/diatur melalui manajemen user.
- **Batas peminjaman aktif** per peminjam standarnya **3** (`MENUNGGU`, `DISETUJUI`,
  `DIPINJAM`, `TERLAMBAT`). Barang yang sama tidak bisa diajukan dua kali selama
  peminjaman sebelumnya belum selesai.
- **Surat pernyataan** (peminjaman & pengembalian) di-generate sistem, ditandatangani
  di luar sistem, lalu diunggah kembali sebagai lampiran wajib.
- **TERLAMBAT** ditentukan otomatis berdasarkan tanggal; peminjaman tanpa tenggat
  tidak pernah menjadi terlambat.
- **Catatan pengembalian** hanya terlihat oleh admin, tidak pernah dikirim ke peminjam.
