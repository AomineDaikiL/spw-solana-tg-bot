import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { getTokenInfo, getPriceAlert, formatNumber, formatAge } from "./utils.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN tidak ditemukan di .env!");

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Simpan alert per user: { chatId: [{ ca, targetPrice, direction }] }
const alerts = {};

// ─── MENU UTAMA ───────────────────────────────────────────
const mainMenu = {
  reply_markup: {
    keyboard: [
      ["🔍 Cek Token", "📊 Portfolio"],
      ["🔔 Alert Saya", "❓ Bantuan"],
    ],
    resize_keyboard: true,
  },
};

// ─── START ────────────────────────────────────────────────
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || "Trader";
  bot.sendMessage(
    msg.chat.id,
    `👋 Halo *${name}*\\! Selamat datang di *Solana Memecoin Bot* 🚀\n\n` +
    `Apa yang bisa saya lakukan:\n` +
    `🔍 *Cek Token* — Info harga, market cap, liquidity\n` +
    `🔔 *Price Alert* — Notifikasi kalau harga naik/turun\n` +
    `📊 *Portfolio* — Track wallet kamu\n\n` +
    `Kirim *contract address* Solana langsung untuk cek token\\!`,
    { parse_mode: "MarkdownV2", ...mainMenu }
  );
});

// ─── BANTUAN ──────────────────────────────────────────────
bot.onText(/\/help|❓ Bantuan/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `📖 *Panduan Penggunaan*\n\n` +
    `*Cek Token:*\n` +
    `Kirim contract address Solana langsung, contoh:\n` +
    `\`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v\`\n\n` +
    `*Command:*\n` +
    `/start \\- Menu utama\n` +
    `/alert \\- Set price alert\n` +
    `/myalerts \\- Lihat alert aktif\n` +
    `/cancelalert \\- Hapus alert\n` +
    `/help \\- Bantuan\n\n` +
    `*Format Alert:*\n` +
    `/alert \\<CA\\> \\<harga target\\>\n` +
    `Contoh: /alert EPjFW\\.\\.\\. 0\\.0015`,
    { parse_mode: "MarkdownV2", ...mainMenu }
  );
});

// ─── CEK TOKEN (contract address) ─────────────────────────
bot.on("message", async (msg) => {
  const text = msg.text?.trim();
  if (!text) return;

  // Deteksi contract address Solana (base58, 32-44 karakter)
  const isSolanaCA = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text);
  if (!isSolanaCA) return;

  const chatId = msg.chat.id;
  const loadingMsg = await bot.sendMessage(chatId, "🔍 Mencari token...");

  try {
    const token = await getTokenInfo(text);
    if (!token) {
      bot.editMessageText("❌ Token tidak ditemukan. Pastikan contract address benar.", {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
      });
      return;
    }

    const priceChange = token.priceChange24h;
    const changeEmoji = priceChange >= 0 ? "📈" : "📉";
    const changeSign = priceChange >= 0 ? "+" : "";

    const safeEscape = (str) => String(str).replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");

    const message =
      `🪙 *${safeEscape(token.name)}* \\(${safeEscape(token.symbol)}\\)\n` +
      `\`${safeEscape(text)}\`\n\n` +
      `💰 *Harga:* $${safeEscape(token.price)}\n` +
      `${changeEmoji} *24h:* ${safeEscape(changeSign + priceChange?.toFixed(2))}%\n` +
      `📊 *Market Cap:* $${safeEscape(formatNumber(token.marketCap))}\n` +
      `💧 *Liquidity:* $${safeEscape(formatNumber(token.liquidity))}\n` +
      `📦 *Volume 24h:* $${safeEscape(formatNumber(token.volume24h))}\n` +
      `👥 *Holders:* ${safeEscape(formatNumber(token.holders))}\n` +
      `🕐 *Umur Token:* ${safeEscape(formatAge(token.createdAt))}\n\n` +
      `🔗 [DexScreener](${safeEscape(token.dexUrl)}) \\| [Birdeye](https://birdeye\\.so/token/${safeEscape(text)})`;

    const keyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🔔 Set Alert", callback_data: `setalert_${text}` },
            { text: "🔄 Refresh", callback_data: `refresh_${text}` },
          ],
          [
            { text: "📈 Chart", url: token.dexUrl },
            { text: "🛒 Buy di Jupiter", url: `https://jup.ag/swap/SOL-${text}` },
          ],
        ],
      },
    };

    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
      ...keyboard,
    });
  } catch (err) {
    console.error(err);
    bot.editMessageText("⚠️ Gagal mengambil data. Coba lagi nanti.", {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
    });
  }
});

// ─── SET ALERT ─────────────────────────────────────────────
bot.onText(/\/alert (.+) (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const ca = match[1].trim();
  const targetPrice = parseFloat(match[2]);

  if (isNaN(targetPrice)) {
    bot.sendMessage(chatId, "❌ Format salah. Contoh:\n`/alert <CA> 0.0015`", { parse_mode: "Markdown" });
    return;
  }

  const token = await getTokenInfo(ca);
  if (!token) {
    bot.sendMessage(chatId, "❌ Token tidak ditemukan.");
    return;
  }

  const currentPrice = parseFloat(token.price);
  const direction = targetPrice > currentPrice ? "above" : "below";

  if (!alerts[chatId]) alerts[chatId] = [];
  alerts[chatId].push({ ca, symbol: token.symbol, targetPrice, direction, currentPrice });

  const dirText = direction === "above" ? "naik ke atas" : "turun ke bawah";
  bot.sendMessage(
    chatId,
    `✅ Alert aktif untuk *${token.symbol}*!\n\n` +
    `Harga sekarang: $${currentPrice}\n` +
    `Notifikasi kalau harga ${dirText} $${targetPrice}`,
    { parse_mode: "Markdown" }
  );
});

// ─── LIHAT ALERT ──────────────────────────────────────────
bot.onText(/\/myalerts|🔔 Alert Saya/, (msg) => {
  const chatId = msg.chat.id;
  const userAlerts = alerts[chatId];

  if (!userAlerts || userAlerts.length === 0) {
    bot.sendMessage(chatId, "📭 Kamu belum punya alert aktif.\n\nGunakan `/alert <CA> <harga>` untuk buat alert.", {
      parse_mode: "Markdown",
    });
    return;
  }

  let text = "🔔 *Alert Aktif Kamu:*\n\n";
  userAlerts.forEach((a, i) => {
    const dirText = a.direction === "above" ? "📈 Naik ke" : "📉 Turun ke";
    text += `${i + 1}\\. *${a.symbol}*\n   ${dirText} $${a.targetPrice}\n\n`;
  });
  text += "Hapus dengan `/cancelalert <nomor>`";

  bot.sendMessage(chatId, text, { parse_mode: "MarkdownV2" });
});

// ─── CANCEL ALERT ─────────────────────────────────────────
bot.onText(/\/cancelalert (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const index = parseInt(match[1]) - 1;

  if (!alerts[chatId] || !alerts[chatId][index]) {
    bot.sendMessage(chatId, "❌ Nomor alert tidak ditemukan.");
    return;
  }

  const removed = alerts[chatId].splice(index, 1)[0];
  bot.sendMessage(chatId, `✅ Alert *${removed.symbol}* berhasil dihapus.`, { parse_mode: "Markdown" });
});

// ─── CALLBACK BUTTONS ─────────────────────────────────────
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith("refresh_")) {
    const ca = data.replace("refresh_", "");
    bot.answerCallbackQuery(query.id, { text: "🔄 Memperbarui data..." });
    // Simulasi refresh — kirim pesan baru
    bot.sendMessage(chatId, ca); // trigger handler cek token
  }

  if (data.startsWith("setalert_")) {
    const ca = data.replace("setalert_", "");
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(
      chatId,
      `🔔 *Set Alert untuk token ini*\n\nKirim perintah:\n\`/alert ${ca} <harga target>\`\n\nContoh:\n\`/alert ${ca} 0.0025\``,
      { parse_mode: "Markdown" }
    );
  }
});

// ─── CEK ALERT SETIAP 30 DETIK ────────────────────────────
setInterval(async () => {
  for (const chatId in alerts) {
    const userAlerts = alerts[chatId];
    const toRemove = [];

    for (let i = 0; i < userAlerts.length; i++) {
      const alert = userAlerts[i];
      try {
        const token = await getTokenInfo(alert.ca);
        if (!token) continue;

        const currentPrice = parseFloat(token.price);
        const triggered =
          (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
          (alert.direction === "below" && currentPrice <= alert.targetPrice);

        if (triggered) {
          const emoji = alert.direction === "above" ? "🚀" : "📉";
          bot.sendMessage(
            chatId,
            `${emoji} *ALERT TERPICU!*\n\n` +
            `Token: *${alert.symbol}*\n` +
            `Target: $${alert.targetPrice}\n` +
            `Harga sekarang: $${currentPrice}\n\n` +
            `[Lihat di DexScreener](https://dexscreener.com/solana/${alert.ca})`,
            { parse_mode: "Markdown", disable_web_page_preview: false }
          );
          toRemove.push(i);
        }
      } catch {}
    }

    // Hapus alert yang sudah terpicu (dari belakang biar index tidak geser)
    toRemove.reverse().forEach((i) => userAlerts.splice(i, 1));
  }
}, 30_000);

console.log("🤖 Bot Solana Memecoin berjalan...");
