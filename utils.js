// ─── DEXSCREENER API ──────────────────────────────────────
// Gratis, tidak perlu API key
export async function getTokenInfo(contractAddress) {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`
    );
    const data = await res.json();

    if (!data.pairs || data.pairs.length === 0) return null;

    // Ambil pair dengan volume terbesar (paling likuid)
    const pair = data.pairs
      .filter((p) => p.chainId === "solana")
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))[0];

    if (!pair) return null;

    return {
      name: pair.baseToken?.name || "Unknown",
      symbol: pair.baseToken?.symbol || "???",
      price: pair.priceUsd || "0",
      priceChange24h: pair.priceChange?.h24 || 0,
      marketCap: pair.marketCap || pair.fdv || 0,
      liquidity: pair.liquidity?.usd || 0,
      volume24h: pair.volume?.h24 || 0,
      holders: null, // Dexscreener tidak provide holders
      createdAt: pair.pairCreatedAt || null,
      dexUrl: pair.url || `https://dexscreener.com/solana/${contractAddress}`,
      pairAddress: pair.pairAddress,
    };
  } catch (err) {
    console.error("getTokenInfo error:", err.message);
    return null;
  }
}

// ─── FORMAT ANGKA ─────────────────────────────────────────
export function formatNumber(num) {
  if (!num || isNaN(num)) return "N/A";
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toFixed(2);
}

// ─── FORMAT UMUR TOKEN ────────────────────────────────────
export function formatAge(timestamp) {
  if (!timestamp) return "Unknown";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (days > 0) return `${days} hari`;
  if (hours > 0) return `${hours} jam`;
  return `${minutes} menit`;
}

// ─── CEK PRICE ALERT ─────────────────────────────────────
export function getPriceAlert(currentPrice, targetPrice, direction) {
  if (direction === "above") return currentPrice >= targetPrice;
  if (direction === "below") return currentPrice <= targetPrice;
  return false;
}
