// 抓台彩 BINGO BINGO 開獎號碼，寫入 data/<日期>.json 與 data/index.json
// 由 .github/workflows/update-bingo.yml 每 5 分鐘執行一次；也可手動：node scripts/fetch-bingo.mjs [YYYY-MM-DD ...]
import { readFile, writeFile, mkdir } from "node:fs/promises";

const API = "https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult";
const DATA = new URL("../data/", import.meta.url);
const KEEP_DAYS = 60; // index.json 最多列出幾天

const taipeiDate = (offsetDays = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(Date.now() + offsetDays * 864e5));

async function fetchDay(date) {
  const url = `${API}?openDate=${date}&pageNum=1&pageSize=250`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (bingo-simulator; GitHub Actions)" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const rows = j?.content?.bingoQueryResult;
      if (!Array.isArray(rows)) throw new Error("unexpected response: " + JSON.stringify(j).slice(0, 200));
      return rows
        .filter(x => x.drawTerm && Array.isArray(x.openShowOrder) && x.openShowOrder.length === 20)
        .map(x => [Number(x.drawTerm), x.openShowOrder.map(n => String(n).padStart(2, "0")).join("")])
        .sort((a, b) => a[0] - b[0]);
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, 2000 * attempt));
    }
  }
  throw new Error(`${date}: ${lastErr?.message}`);
}

async function readJson(name, fallback) {
  try { return JSON.parse(await readFile(new URL(name, DATA), "utf8")); } catch { return fallback; }
}

await mkdir(DATA, { recursive: true });
const dates = process.argv.slice(2).length ? process.argv.slice(2) : [taipeiDate(-1), taipeiDate()];
const index = await readJson("index.json", { dates: [], updated: "", latestTerm: 0 });
let changed = false, failures = 0;

for (const date of dates) {
  let fresh;
  try { fresh = await fetchDay(date); } catch (e) { console.error("fetch failed", e.message); failures++; continue; }
  if (!fresh.length) { console.log(date, "no draws yet"); continue; }
  const old = await readJson(`${date}.json`, { date, draws: [] });
  const merged = new Map(old.draws.map(r => [r[0], r[1]]));
  for (const [t, s] of fresh) merged.set(t, s); // 官方資料覆蓋（保留真實開出順序）
  const rows = [...merged.entries()].sort((a, b) => a[0] - b[0]);
  const before = JSON.stringify(old.draws), after = JSON.stringify(rows);
  if (before !== after) {
    await writeFile(new URL(`${date}.json`, DATA), JSON.stringify({ date, draws: rows }));
    console.log(date, `${old.draws.length} -> ${rows.length} draws`);
    changed = true;
  } else console.log(date, "unchanged", rows.length);
  if (!index.dates.includes(date)) { index.dates.push(date); index.dates.sort(); changed = true; }
  index.latestTerm = Math.max(index.latestTerm || 0, rows[rows.length - 1][0]);
}

if (changed) {
  index.dates = index.dates.slice(-KEEP_DAYS);
  index.updated = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei", dateStyle: "short", timeStyle: "medium" }).format(new Date());
  await writeFile(new URL("index.json", DATA), JSON.stringify(index, null, 1));
}
if (failures === dates.length) process.exit(1);
