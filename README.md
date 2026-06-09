# 🤖 Solana Memecoin Telegram Bot

Bot Telegram untuk monitoring harga token Solana secara real-time.

## ✨ Fitur
- 🔍 Cek info token dari contract address (harga, market cap, liquidity, volume)
- 📈 Lihat perubahan harga 24 jam
- 🔔 Set price alert — notifikasi otomatis kalau harga naik/turun
- 🔗 Link langsung ke DexScreener, Birdeye, dan Jupiter Swap
- ⏱️ Cek umur token (penting untuk deteksi rug!)

---

## 🚀 Cara Setup (Step by Step)

### Langkah 1 — Buat Bot Telegram
1. Buka Telegram → cari **@BotFather**
2. Ketik `/newbot`
3. Ikuti instruksi → beri nama bot
4. Copy **token** yang diberikan (format: `123456:ABC-DEF...`)

### Langkah 2 — Persiapan File
1. Extract ZIP ini
2. Rename file `.env.example` → `.env`
3. Buka `.env`, isi token:
   ```
   BOT_TOKEN=token_dari_botfather
   ```

### Langkah 3 — Install & Jalankan
Buka Command Prompt di folder ini, ketik:
```bash
npm install
npm start
```

Bot langsung aktif! Buka Telegram → cari nama bot kamu → `/start`

---

## 📱 Cara Pakai Bot

### Cek Token
Kirim contract address Solana langsung ke bot:
```
EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Set Price Alert
```
/alert <contract_address> <harga_target>
```
Contoh:
```
/alert EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 0.0015
```

### Lihat Alert Aktif
```
/myalerts
```

### Hapus Alert
```
/cancelalert 1
```

---

## ☁️ Deploy ke Railway (Gratis, 24/7)

Agar bot jalan terus meski laptop mati:

1. Push ke GitHub (pakai GitHub Desktop)
2. Buka https://railway.app → Login with GitHub
3. New Project → Deploy from GitHub repo
4. Tambah environment variable:
   - Key: `BOT_TOKEN`
   - Value: token dari BotFather
5. Deploy → bot jalan 24/7! ✅

---

## 🗂️ Struktur File

```
solana-memecoin-bot/
├── bot.js          ← Logic utama bot
├── utils.js        ← Helper (fetch token, format angka)
├── .env            ← Token bot (JANGAN di-share!)
├── .env.example    ← Template .env
├── package.json
└── README.md
```

---

## ⚠️ Catatan Penting
- API yang dipakai: **DexScreener** (gratis, tidak perlu API key)
- Alert dicek setiap **30 detik**
- Data alert hilang kalau bot di-restart (belum ada database)
- Bot ini hanya untuk **monitoring**, belum bisa execute trade

## 🔮 Rencana Fitur Berikutnya
- [ ] Database (simpan alert permanen)
- [ ] Execute buy/sell via Jupiter API
- [ ] Anti-rug checker (liquidity lock, mint authority)
- [ ] Auto-sniper token baru
- [ ] Portfolio tracker by wallet address
