# BINGO BINGO 模擬投注

用台灣彩券 BINGO BINGO 的真實開獎號碼做模擬投注與對獎，並分析冷熱號碼、超級獎號、大小單雙。

**只是模擬與統計練習，不是投注建議。** 每期開獎彼此獨立，冷熱號、遺漏期數都不會改變下一期的機率。

## 功能

- 模擬投注：基本玩法 1–10 星、超級獎號、猜大小、猜單雙；倍數 1–50、多期投注、歷史回測
- 冷熱參考：選號單上直接點選熱號、冷號、遺漏最久的號碼
- 連續未開提醒：基本玩法、超級獎號各自設定門檻（預設 12 期）
- 開獎紀錄、冷熱分析（標準差、卡方檢定）、超級獎號分析、大小單雙分析與策略回測
- 自動更新：GitHub Actions 每 5 分鐘抓一次台彩開獎，網頁每分鐘檢查新資料

投注紀錄與設定只存在你自己的瀏覽器（localStorage）。

## 運作方式

```
GitHub Actions（每 5 分鐘）
  └─ scripts/fetch-bingo.mjs  ──>  api.taiwanlottery.com
        └─ 寫入 data/YYYY-MM-DD.json、data/index.json 並 commit
GitHub Pages
  └─ index.html 每分鐘讀 data/*.json，有新期別就重新對獎、更新提醒
```

## 設定

1. 開啟 **Settings → Pages**，Source 選 **Deploy from a branch**，Branch 選 `main` / `(root)`。
2. 開啟 **Settings → Actions → General → Workflow permissions**，選 **Read and write permissions**。
3. 到 **Actions → Update BINGO BINGO draws → Run workflow** 手動跑一次，確認能抓到資料。

補抓某幾天：Run workflow 時在 `dates` 填 `2026-10-20 2026-10-21`。

## 注意

- GitHub 排程最短 5 分鐘，尖峰時常延遲；所以網頁上的最新一期可能比台彩晚 5–15 分鐘。
- 公開 repo 若 60 天沒有任何活動，GitHub 會自動停用排程；本 workflow 每次有新開獎就會 commit，正常情況下不會被停用。
- 資料來源是台彩官網使用的 API（`https://api.taiwanlottery.com/TLCAPIWeB/Lottery/BingoResult`），格式可能隨官網改版變動。若 Actions 出現 `fetch failed`，可能是 API 改版或拒絕 GitHub 主機連線。
- 初始資料（2026-10-20～26）的每期號碼只保留超級獎號（第 20 顆）的開出位置，其餘 19 顆依大小排列，對獎結果不受影響。
