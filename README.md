# WhatsApp Bot

Bot WhatsApp yang dibuat menggunakan library whatsapp-web.js untuk memberikan respon otomatis terhadap pesan yang masuk.

## Fitur

- ✅ Respon otomatis terhadap pesan
- ✅ Perintah bantuan dan informasi
- ✅ Menampilkan waktu saat ini
- ✅ Ping/Pong untuk mengecek status bot
- ✅ Autentikasi menggunakan QR Code
- ✅ Session management (tidak perlu scan QR berulang)
- ✅ Respon di grup ketika di-mention

## Persyaratan

### Untuk menjalankan langsung:
- Node.js (versi 14 atau lebih baru)
- npm atau yarn
- WhatsApp account

### Untuk menjalankan dengan Docker:
- Docker
- Docker Compose (opsional, tapi recommended)
- WhatsApp account

## Instalasi

1. Clone atau download project ini
2. Buka terminal di folder project
3. Install dependencies:

```bash
npm install
```

## Cara Menjalankan

### Opsi 1: Menjalankan Langsung dengan Node.js

1. Jalankan bot:

```bash
npm start
```

2. Scan QR code yang muncul di terminal menggunakan WhatsApp di ponsel Anda:
   - Buka WhatsApp di ponsel
   - Tap menu (3 titik) > Linked Devices
   - Tap "Link a Device"
   - Scan QR code di terminal

3. Bot akan terhubung dan siap menerima pesan!

### Opsi 2: Menjalankan dengan Docker 🐳

#### Menggunakan Docker Compose (Recommended)

1. Build dan jalankan container:

```bash
docker-compose up -d
```

2. Lihat logs untuk mendapatkan QR code:

```bash
docker-compose logs -f whatsapp-bot
```

3. Scan QR code yang muncul dengan WhatsApp di ponsel Anda

4. Untuk menghentikan bot:

```bash
docker-compose down
```

#### Menggunakan Docker Manual

1. Build image:

```bash
docker build -t whatsapp-bot .
```

2. Jalankan container:

```bash
docker run -d --name whatsapp-bot \
  -v whatsapp_sessions:/app/.wwebjs_auth \
  -v whatsapp_cache:/app/.wwebjs_cache \
  whatsapp-bot
```

3. Lihat logs untuk QR code:

```bash
docker logs -f whatsapp-bot
```

#### Keuntungan Menggunakan Docker:

- ✅ Isolasi environment yang konsisten
- ✅ Mudah di-deploy ke server
- ✅ Session data tersimpan dalam volume (tidak hilang saat restart)
- ✅ Resource management yang lebih baik
- ✅ Tidak perlu install Node.js di host system

## Optimasi Build Docker 🚀

### Tips untuk Build Lebih Cepat:

1. **Gunakan BuildKit** (Docker 18.09+):
```bash
export DOCKER_BUILDKIT=1
docker build -t whatsapp-bot .
```

2. **Build dengan Cache Mount**:
```bash
docker build --progress=plain -t whatsapp-bot .
```

3. **Untuk Development - Gunakan Dockerfile.fast**:
```bash
docker build -f Dockerfile.fast -t whatsapp-bot:dev .
```

4. **Parallel Build dengan Docker Compose**:
```bash
docker-compose build --parallel
```

5. **Gunakan Docker Layer Caching**:
```bash
# Build dengan cache dari registry
docker build --cache-from whatsapp-bot:latest -t whatsapp-bot .
```

### Optimasi yang Sudah Diterapkan:

- ✅ **Multi-stage build** - Mengurangi ukuran final image
- ✅ **Layer caching optimal** - Package.json di-copy terpisah dari source code
- ✅ **Cache mount** - NPM cache di-mount untuk build lebih cepat
- ✅ **Minimal .dockerignore** - Mengurangi build context
- ✅ **Alpine Linux** - Base image yang ringan
- ✅ **Production dependencies only** - Tidak install devDependencies

### Perbandingan Build Time:

| Method | Build Time | Image Size |
|--------|------------|------------|
| Standard Dockerfile | ~3-5 menit | ~200MB |
| Optimized Dockerfile | ~1-2 menit | ~150MB |
| Dockerfile.fast (dev) | ~30-60 detik | ~180MB |

## Perintah Bot

Bot akan merespon perintah berikut:

| Perintah | Deskripsi |
|----------|-----------|
| `halo`, `hai`, `hello` | Menyapa bot |
| `help`, `bantuan` | Menampilkan daftar perintah |
| `info` | Informasi tentang bot |
| `waktu` | Menampilkan waktu saat ini |
| `ping` | Mengecek status bot |

Bot juga akan memberikan respon otomatis untuk pesan lainnya.

## Mode Development

Untuk development dengan auto-restart ketika ada perubahan code:

```bash
npm run dev
```

## Struktur Project

```
whatsapp-bot/
├── index.js              # File utama bot
├── package.json          # Dependencies dan scripts
├── README.md             # Dokumentasi
├── Dockerfile            # Docker configuration (production)
├── Dockerfile.fast       # Docker configuration (development)
├── docker-compose.yml    # Docker Compose configuration
├── .dockerignore         # Docker ignore file
├── .gitignore           # Git ignore file
└── .wwebjs_auth/        # Folder session (dibuat otomatis)
```

## Konfigurasi

Bot menggunakan konfigurasi default yang sudah optimal. Jika ingin mengubah perilaku bot, edit file `index.js`:

- Ubah respon pesan di bagian event `message`
- Tambah perintah baru dengan menambah kondisi `else if`
- Sesuaikan pengaturan Puppeteer jika diperlukan

## Troubleshooting

### Bot tidak bisa terhubung
- Pastikan koneksi internet stabil
- Coba hapus folder `.wwebjs_auth` dan scan QR code ulang
- Pastikan WhatsApp Web tidak dibuka di browser lain

### QR Code tidak muncul
- Pastikan terminal mendukung tampilan QR code
- Coba restart aplikasi

### Bot tidak merespon
- Cek console untuk error messages
- Pastikan bot masih terhubung (tidak ada pesan disconnect)

### Docker Issues
- **Container tidak bisa start**: Pastikan Docker daemon berjalan
- **QR code tidak terlihat**: Gunakan `docker-compose logs -f whatsapp-bot` atau `docker logs -f whatsapp-bot`
- **Session hilang**: Pastikan volume di-mount dengan benar
- **Memory issues**: Sesuaikan resource limits di docker-compose.yml

## Catatan Penting

⚠️ **Disclaimer**: Project ini menggunakan library unofficial dan tidak berafiliasi dengan WhatsApp. Penggunaan bot dapat melanggar Terms of Service WhatsApp dan berpotensi menyebabkan akun diblokir.

- Gunakan dengan akun WhatsApp yang tidak penting
- Jangan spam atau kirim pesan berlebihan
- Untuk penggunaan bisnis, pertimbangkan menggunakan WhatsApp Business API resmi

## Lisensi

MIT License

## Kontribusi

Silakan buat issue atau pull request untuk perbaikan dan penambahan fitur.

---

Dibuat dengan ❤️ menggunakan [whatsapp-web.js](https://wwebjs.dev/)