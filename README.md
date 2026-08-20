# 人身保險業務員資格測驗 -【外幣收付非投資型保險商品】線上模擬考試系統

> **線上體驗網址**：[https://zjh0511.github.io/Hao-FPT/](https://zjh0511.github.io/Hao-FPT/)  
> **GitHub 儲存庫**：[https://github.com/zjh0511/Hao-FPT](https://github.com/zjh0511/Hao-FPT)  
> **專案說明**：專為人身保險業務員考照打造之現代化、零延遲、純前端靜態模擬測驗系統。收錄官方 200 題完整題庫，支援 A/B/C/D 分卷精熟、全真隨機抽題、智慧錯題本與 AI 考照小助教。

---

## 🌟 系統特色與核心功能

1. **📑 循序固定試卷（A / B / C / D 卷）**：
   - **A 卷**（第 1 ~ 50 題）：基礎法規與外匯管理辦法
   - **B 卷**（第 51 ~ 100 題）：投資型規範與管理條例
   - **C 卷**（第 101 ~ 150 題）：資產配置與風險控管
   - **D 卷**（第 151 ~ 200 題）：準備金與綜合實務案例
2. **🎯 全真隨機模擬測驗**：
   - 每回由 200 題庫中隨機抽取 50 題（採用 Fisher-Yates 均勻洗牌演算法）。
   - 每題 2 分，滿分 100 分，70 分及格。
   - 60 分鐘精準倒數計時，倒數 5 分鐘進入紅色預警，時間截止自動交卷。
3. **📕 智慧錯題本專區 (Smart Error Notebook)**：
   - 自動收錄歷次模擬考中做錯與漏答的題目。
   - 支援「錯題專屬特訓」模式，掌握後可一鍵移出。
4. **🤖 AI 考照輔導小助教 (豪老師 ChatGPT 專屬 GPTs)**：
   - 詳解頁面支援「一鍵複製題目與 AI 提問 Prompt」，可直接貼給 ChatGPT / Claude / Gemini 獲取法規重點與速記技巧。
   - 內建專屬考照 GPTs：[開啟外幣考照小助教 (by 豪老師)](https://chatgpt.com/g/g-68300fd7a6ac8191a552b8cf30b27132-wai-bi-shou-fu-fei-tou-zi-xing-bao-xian-shang-pin-kao-zhao-fu-dao-xiao-zhu-jiao-by-hao-lao-shi)。
5. **🎧 線上課程 Podcast (豪老師 YouTube 影音特訓)**：
   - 內建 YouTube 播放清單與嵌入式播放器，通勤隨身聽、考前觀念大加強。
   - 官方播放清單：[YouTube 外幣考照線上課程 Podcast](https://www.youtube.com/playlist?list=PLmr7lEPLWvVZMNH8z4jpZGonzi5amylIQ)。
6. **🗺️ 答題進度地圖與鍵盤快捷鍵**：
   - 支援快捷鍵：`1~4` / `A~D` 選擇答案、`←/→` 切換題目、`F` 標記星號、`Space` 暫停。
   - 即時答題地圖網格（已答、未答、標記、當前題號）。
7. **📊 歷次練習紀錄 (LocalStorage)**：
   - 免費本地端離線儲存，完整記錄歷次測驗分數、耗時與逐題作答狀態。
   - 提供「檢視解析」重現歷史答題明細。
8. **🌓 雙色主題系統**：支援 Dark Mode（科技深藍）與 Light Mode（明亮灰白）一鍵無縫切換。

---

## 📁 專案檔案架構

```text
d:\Hao+App\FPT\
│
├── index.html                        # 主應用程式 SPA 單頁結構
├── index.css                         # 現代化雙色主題設計系統
├── app.js                            # 核心測驗引擎 (抽題/計時/評分/錯題本)
├── questions_data.js                 # 200 題 JavaScript 資料模組 (支援本地雙擊離線開啟)
├── foreign_currency_questions.json   # 200 題結構化 JSON 題庫 (含法規解析)
│
├── build_question_banks.py           # 題庫生成與驗證腳本
├── EXAM_PLATFORM_DEVELOPMENT_MANUAL.md # 考試平台完整開發與部署手冊
├── README.md                         # 本專案說明文件
├── .gitignore                        # Git 忽略檔案設定
│
└── 人身保險業務員資格測驗_外幣收付非投資型保險商品_彙整題庫200題.pdf # 原始官方題庫
```

---

## 🚀 本地執行與測試

本專案為純前端靜態架構，您可以透過以下任一種方式在本地開啟：

### 方式一：直接以瀏覽器開啟
直接雙擊 `index.html`，即可在任何瀏覽器中離線運行。

### 方式二：使用 Python 本地 HTTP 伺服器
```bash
cd /d/Hao+App/FPT
python -m http.server 8000
```
開啟瀏覽器前往：`http://localhost:8000`

---

## 🌐 GitHub Pages 免費發布教學 (100% 成功步驟)

### Step 1. 初始化 Git 並推送到 GitHub
請在本地終端機（PowerShell 或 Bash）執行：

```bash
# 1. 進入專案目錄
cd /d/Hao+App/FPT

# 2. 初始化 Git 倉庫
git init

# 3. 加入所有檔案並提交
git add .
git commit -m "feat: 外幣收付非投資型保險商品 200 題線上模擬考試系統"

# 4. 關聯至您的 GitHub 遠端倉庫 (請將 <YOUR_USERNAME> 與 <REPO_NAME> 換成您的倉庫)
git remote add origin https://github.com/<YOUR_USERNAME>/<REPO_NAME>.git

# 5. 推送至 main 分支
git branch -M main
git push -u origin main
```

### Step 2. 在 GitHub 開啟 GitHub Pages 免費託管
1. 開啟您的 GitHub 倉庫網頁。
2. 點選上方頁籤 **`Settings` (設定)**。
3. 在左側欄位點選 **`Pages`**。
4. 在 **Build and deployment** 區塊：
   - **Source** 選擇：`Deploy from a branch`
   - **Branch** 選擇：`main`，資料夾保持 `/ (root)`
5. 點選 **`Save`**。
6. 等候約 20~30 秒，重新整理頁面即可看到上方出現發布網址：  
   `https://<YOUR_USERNAME>.github.io/<REPO_NAME>/`

---

## 📜 題庫規範說明
- **資料來源**：中華民國人壽保險商業同業公會《外幣收付非投資型保險商品》專業科目彙整題庫。
- **題數**：共計 200 題單選題。
- **合格標準**：測驗 50 題，滿分 100 分，70 分（含）以上為及格。
