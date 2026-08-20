/**
 * 人身保險業務員資格測驗 - 專業科目：【外幣收付非投資型保險商品】
 * 核心測驗引擎 (Exam Platform Engine)
 */

const AppState = {
  allQuestions: [],
  currentExam: {
    mode: '',
    title: '',
    questions: [],
    timeMins: 60,
    passScore: 70,
    pointsPerQ: 2
  },
  currentIndex: 0,
  userAnswers: {},       // { [index]: 'A' | 'B' | 'C' | 'D' }
  flaggedQuestions: {},   // { [index]: true }
  timeRemainingSeconds: 3600,
  timeSpentSeconds: 0,
  timerInterval: null,
  isPaused: false,
  history: [],
  errorNotebook: [],     // Array of question IDs
  currentTheme: 'dark',
  reviewFilter: 'all',   // 'all' | 'wrong' | 'flagged'
  lastExamResults: null
};

class ExamEngine {
  constructor() {
    this.init();
  }

  async init() {
    this.initTheme();
    this.loadStorageData();
    await this.loadQuestions();
    this.bindEvents();
    this.updateDashboardStats();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('FPT_THEME') || 'dark';
    AppState.currentTheme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon();
  }

  toggleTheme() {
    AppState.currentTheme = AppState.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', AppState.currentTheme);
    localStorage.setItem('FPT_THEME', AppState.currentTheme);
    this.updateThemeIcon();
    this.showToast(`已切換至${AppState.currentTheme === 'dark' ? '深色' : '淺色'}主題`);
  }

  updateThemeIcon() {
    const iconBtn = document.getElementById('theme-toggle-btn');
    if (iconBtn) {
      iconBtn.innerHTML = AppState.currentTheme === 'dark' ? '☀️' : '🌙';
      iconBtn.title = AppState.currentTheme === 'dark' ? '切換淺色主題' : '切換深色主題';
    }
  }

  loadStorageData() {
    try {
      const historyData = localStorage.getItem('FPT_EXAM_HISTORY_V1');
      if (historyData) AppState.history = JSON.parse(historyData);
    } catch (e) {
      console.error('Failed to parse history data', e);
      AppState.history = [];
    }

    try {
      const errorData = localStorage.getItem('FPT_ERROR_NOTEBOOK_V1');
      if (errorData) AppState.errorNotebook = JSON.parse(errorData);
    } catch (e) {
      console.error('Failed to parse error notebook', e);
      AppState.errorNotebook = [];
    }
  }

  saveStorageData() {
    localStorage.setItem('FPT_EXAM_HISTORY_V1', JSON.stringify(AppState.history));
    localStorage.setItem('FPT_ERROR_NOTEBOOK_V1', JSON.stringify(AppState.errorNotebook));
  }

  async loadQuestions() {
    try {
      const res = await fetch('foreign_currency_questions.json');
      if (!res.ok) throw new Error('Fetch failed');
      AppState.allQuestions = await res.json();
      console.log(`Loaded ${AppState.allQuestions.length} questions.`);
    } catch (e) {
      console.warn('Direct fetch failed, falling back to embedded/local data if any', e);
      if (window.EMBEDDED_QUESTIONS && window.EMBEDDED_QUESTIONS.length > 0) {
        AppState.allQuestions = window.EMBEDDED_QUESTIONS;
      }
    }
  }

  updateDashboardStats() {
    const totalQEl = document.getElementById('stat-total-questions');
    const examCountEl = document.getElementById('stat-exam-count');
    const errorCountEl = document.getElementById('stat-error-count');
    const avgScoreEl = document.getElementById('stat-avg-score');

    if (totalQEl) totalQEl.innerText = AppState.allQuestions.length || 200;
    if (examCountEl) examCountEl.innerText = AppState.history.length;
    if (errorCountEl) errorCountEl.innerText = AppState.errorNotebook.length;

    if (avgScoreEl) {
      if (AppState.history.length === 0) {
        avgScoreEl.innerText = '--';
      } else {
        const total = AppState.history.reduce((acc, cur) => acc + (cur.score || 0), 0);
        const avg = Math.round(total / AppState.history.length);
        avgScoreEl.innerText = `${avg} 分`;
      }
    }

    const badgeErr = document.getElementById('badge-error-count');
    if (badgeErr) badgeErr.innerText = `${AppState.errorNotebook.length} 題收錄`;
  }

  bindEvents() {
    // 快捷鍵監聽
    window.addEventListener('keydown', (e) => {
      // 僅在測驗進行中且沒有開啟彈窗時觸發
      const examView = document.getElementById('view-exam');
      if (!examView || !examView.classList.contains('active')) return;
      if (document.querySelector('.modal-backdrop.active')) return;

      const key = e.key.toUpperCase();
      if (['1', 'A'].includes(key)) {
        e.preventDefault();
        this.selectOption('A');
      } else if (['2', 'B'].includes(key)) {
        e.preventDefault();
        this.selectOption('B');
      } else if (['3', 'C'].includes(key)) {
        e.preventDefault();
        this.selectOption('C');
      } else if (['4', 'D'].includes(key)) {
        e.preventDefault();
        this.selectOption('D');
      } else if (e.key === 'ArrowLeft' || key === 'J') {
        e.preventDefault();
        this.prevQuestion();
      } else if (e.key === 'ArrowRight' || key === 'K') {
        e.preventDefault();
        this.nextQuestion();
      } else if (key === 'F' || key === 'M') {
        e.preventDefault();
        this.toggleFlag();
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.togglePause();
      }
    });
  }

  switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(viewId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // 洗牌演算法
  shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  startExam(mode) {
    if (AppState.allQuestions.length === 0) {
      alert('題庫載入中，請稍候重試！');
      return;
    }

    let questions = [];
    let title = '';
    let timeMins = 60;
    let pointsPerQ = 2;
    let passScore = 70;

    switch (mode) {
      case 'random_50':
        title = '【外幣收付】全真模擬測驗（隨機50題）';
        questions = this.shuffleArray(AppState.allQuestions).slice(0, 50);
        timeMins = 60;
        pointsPerQ = 2;
        passScore = 70;
        break;

      case 'paper_A':
        title = '【外幣收付】循序練習 - A 卷 (第 1 ~ 50 題)';
        questions = AppState.allQuestions.slice(0, 50);
        timeMins = 60;
        pointsPerQ = 2;
        passScore = 70;
        break;

      case 'paper_B':
        title = '【外幣收付】循序練習 - B 卷 (第 51 ~ 100 題)';
        questions = AppState.allQuestions.slice(50, 100);
        timeMins = 60;
        pointsPerQ = 2;
        passScore = 70;
        break;

      case 'paper_C':
        title = '【外幣收付】循序練習 - C 卷 (第 101 ~ 150 題)';
        questions = AppState.allQuestions.slice(100, 150);
        timeMins = 60;
        pointsPerQ = 2;
        passScore = 70;
        break;

      case 'paper_D':
        title = '【外幣收付】循序練習 - D 卷 (第 151 ~ 200 題)';
        questions = AppState.allQuestions.slice(150, 200);
        timeMins = 60;
        pointsPerQ = 2;
        passScore = 70;
        break;

      case 'all_200':
        title = '【外幣收付】考前 200 題全真大衝刺';
        questions = [...AppState.allQuestions];
        timeMins = 120;
        pointsPerQ = 0.5;
        passScore = 70;
        break;

      case 'error_book':
        if (AppState.errorNotebook.length === 0) {
          this.showToast('目前錯題本中尚無紀錄，快去測驗練習吧！');
          return;
        }
        title = `【錯題本】專屬強化特訓 (${AppState.errorNotebook.length}題)`;
        const errorIds = new Set(AppState.errorNotebook);
        questions = AppState.allQuestions.filter(q => errorIds.has(q.id));
        timeMins = Math.max(15, Math.ceil(questions.length * 1.2));
        pointsPerQ = parseFloat((100 / questions.length).toFixed(1));
        passScore = 70;
        break;

      default:
        return;
    }

    // 初始化狀態
    AppState.currentExam = {
      mode,
      title,
      questions,
      timeMins,
      passScore,
      pointsPerQ
    };
    AppState.currentIndex = 0;
    AppState.userAnswers = {};
    AppState.flaggedQuestions = {};
    AppState.timeRemainingSeconds = timeMins * 60;
    AppState.timeSpentSeconds = 0;
    AppState.isPaused = false;

    // 更新 UI
    document.getElementById('exam-title-display').innerText = title;
    this.renderPalette();
    this.renderQuestion();
    this.startTimer();
    this.switchView('view-exam');
  }

  renderQuestion() {
    const q = AppState.currentExam.questions[AppState.currentIndex];
    if (!q) return;

    // 題號與分類
    document.getElementById('q-current-index').innerText = `第 ${AppState.currentIndex + 1} / ${AppState.currentExam.questions.length} 題`;
    document.getElementById('q-original-id').innerText = `題庫原題號：#${q.id}`;

    // 題目文字
    document.getElementById('q-text-content').innerText = q.question;

    // 標記星號狀態
    const flagBtn = document.getElementById('btn-flag-q');
    if (AppState.flaggedQuestions[AppState.currentIndex]) {
      flagBtn.classList.add('active');
      flagBtn.innerHTML = '★ 已標記';
    } else {
      flagBtn.classList.remove('active');
      flagBtn.innerHTML = '☆ 標記此題 (F)';
    }

    // 選項列表
    const optContainer = document.getElementById('options-container');
    optContainer.innerHTML = '';

    const optionLetters = ['A', 'B', 'C', 'D'];
    q.options.forEach((optText, idx) => {
      const letter = optionLetters[idx];
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      if (AppState.userAnswers[AppState.currentIndex] === letter) {
        btn.classList.add('selected');
      }

      btn.onclick = () => this.selectOption(letter);

      btn.innerHTML = `
        <div class="option-key">${letter}</div>
        <div class="option-content">${optText}</div>
      `;
      optContainer.appendChild(btn);
    });

    // 上一題 / 下一題按鈕狀態
    document.getElementById('btn-prev-q').disabled = (AppState.currentIndex === 0);
    const nextBtn = document.getElementById('btn-next-q');
    if (AppState.currentIndex === AppState.currentExam.questions.length - 1) {
      nextBtn.innerText = '最後一題';
    } else {
      nextBtn.innerText = '下一題 ➡ (→)';
    }

    this.updatePaletteActiveItem();
  }

  selectOption(letter) {
    if (AppState.isPaused) return;

    AppState.userAnswers[AppState.currentIndex] = letter;
    this.renderQuestion();
    this.updatePaletteItem(AppState.currentIndex);
  }

  toggleFlag() {
    if (AppState.flaggedQuestions[AppState.currentIndex]) {
      delete AppState.flaggedQuestions[AppState.currentIndex];
    } else {
      AppState.flaggedQuestions[AppState.currentIndex] = true;
    }
    this.renderQuestion();
    this.updatePaletteItem(AppState.currentIndex);
  }

  prevQuestion() {
    if (AppState.currentIndex > 0) {
      AppState.currentIndex--;
      this.renderQuestion();
    }
  }

  nextQuestion() {
    if (AppState.currentIndex < AppState.currentExam.questions.length - 1) {
      AppState.currentIndex++;
      this.renderQuestion();
    }
  }

  jumpToQuestion(index) {
    if (index >= 0 && index < AppState.currentExam.questions.length) {
      AppState.currentIndex = index;
      this.renderQuestion();
    }
  }

  renderPalette() {
    const grid = document.getElementById('palette-grid');
    grid.innerHTML = '';

    AppState.currentExam.questions.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.id = `palette-item-${idx}`;
      btn.innerText = idx + 1;
      btn.onclick = () => this.jumpToQuestion(idx);
      grid.appendChild(btn);
    });

    this.updatePaletteSummary();
  }

  updatePaletteItem(idx) {
    const btn = document.getElementById(`palette-item-${idx}`);
    if (!btn) return;

    btn.className = 'palette-btn';
    if (AppState.userAnswers[idx]) {
      btn.classList.add('answered');
    }
    if (AppState.flaggedQuestions[idx]) {
      btn.classList.add('flagged');
    }
    if (AppState.currentIndex === idx) {
      btn.classList.add('current');
    }

    this.updatePaletteSummary();
  }

  updatePaletteActiveItem() {
    document.querySelectorAll('.palette-btn').forEach((btn, idx) => {
      if (idx === AppState.currentIndex) {
        btn.classList.add('current');
      } else {
        btn.classList.remove('current');
      }
    });
  }

  updatePaletteSummary() {
    const answeredCount = Object.keys(AppState.userAnswers).length;
    const totalCount = AppState.currentExam.questions.length;
    const flaggedCount = Object.keys(AppState.flaggedQuestions).length;

    const summaryEl = document.getElementById('palette-summary-text');
    if (summaryEl) {
      summaryEl.innerHTML = `已答 <b>${answeredCount}</b> / ${totalCount} 題 (標記 ${flaggedCount})`;
    }
  }

  startTimer() {
    this.stopTimer();
    const timerTextEl = document.getElementById('timer-countdown-text');
    const timerBadgeEl = document.getElementById('exam-timer-badge');

    const updateDisplay = () => {
      const mins = Math.floor(AppState.timeRemainingSeconds / 60);
      const secs = AppState.timeRemainingSeconds % 60;
      timerTextEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      if (AppState.timeRemainingSeconds <= 300) {
        timerBadgeEl.className = 'timer-badge danger';
      } else if (AppState.timeRemainingSeconds <= AppState.currentExam.timeMins * 30) {
        timerBadgeEl.className = 'timer-badge warning';
      } else {
        timerBadgeEl.className = 'timer-badge';
      }
    };

    updateDisplay();

    AppState.timerInterval = setInterval(() => {
      if (AppState.isPaused) return;

      AppState.timeRemainingSeconds--;
      AppState.timeSpentSeconds++;
      updateDisplay();

      if (AppState.timeRemainingSeconds <= 0) {
        this.stopTimer();
        alert('⏰ 測驗時間結束！系統為您自動繳卷。');
        this.submitExam(true);
      }
    }, 1000);
  }

  stopTimer() {
    if (AppState.timerInterval) {
      clearInterval(AppState.timerInterval);
      AppState.timerInterval = null;
    }
  }

  togglePause() {
    AppState.isPaused = !AppState.isPaused;
    const pauseBtn = document.getElementById('btn-pause-exam');
    if (AppState.isPaused) {
      pauseBtn.innerHTML = '▶ 繼續作答';
      this.showToast('測驗已暫停計時');
    } else {
      pauseBtn.innerHTML = '⏸ 暫停';
      this.showToast('測驗繼續進行');
    }
  }

  confirmSubmit() {
    const answeredCount = Object.keys(AppState.userAnswers).length;
    const totalCount = AppState.currentExam.questions.length;
    const unAns = totalCount - answeredCount;

    let msg = `您已作答 ${answeredCount} 題，尚有 ${unAns} 題未作答。\n確定要現在交卷結算成績嗎？`;
    if (unAns === 0) {
      msg = `您已全部作答完畢！確定交卷結算成績嗎？`;
    }

    if (confirm(msg)) {
      this.submitExam(false);
    }
  }

  submitExam(isAuto = false) {
    this.stopTimer();

    const exam = AppState.currentExam;
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;
    const detailedResults = [];
    const newWrongQuestionIds = [];

    exam.questions.forEach((q, idx) => {
      const userPick = AppState.userAnswers[idx] || null;
      const isCorrect = (userPick === q.answer);

      if (!userPick) {
        unansweredCount++;
        newWrongQuestionIds.push(q.id);
      } else if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
        newWrongQuestionIds.push(q.id);
      }

      detailedResults.push({
        index: idx,
        id: q.id,
        question: q.question,
        options: q.options,
        userPick,
        answer: q.answer,
        isCorrect,
        isFlagged: !!AppState.flaggedQuestions[idx],
        explanation: q.explanation
      });
    });

    let totalScore = 0;
    if (exam.mode === 'all_200') {
      totalScore = Math.round(correctCount * 0.5);
    } else {
      totalScore = Math.min(100, Math.round(correctCount * exam.pointsPerQ));
    }

    const passed = (totalScore >= exam.passScore);

    // 儲存至錯題本 (去重)
    if (newWrongQuestionIds.length > 0) {
      const set = new Set([...AppState.errorNotebook, ...newWrongQuestionIds]);
      AppState.errorNotebook = Array.from(set);
    }

    // 儲存至考試歷史紀錄
    const record = {
      id: 'REC_' + Date.now(),
      dateStr: new Date().toLocaleString('zh-TW', { hour12: false }),
      examTitle: exam.title,
      mode: exam.mode,
      score: totalScore,
      passed,
      correctCount,
      wrongCount,
      unansweredCount,
      totalQuestions: exam.questions.length,
      timeSpentSeconds: AppState.timeSpentSeconds,
      detailedResults
    };

    AppState.history.unshift(record);
    this.saveStorageData();
    this.updateDashboardStats();

    AppState.lastExamResults = record;
    this.renderResultView(record);
    this.switchView('view-result');

    if (passed) {
      this.triggerConfetti();
    }
  }

  renderResultView(record) {
    const statusBadge = document.getElementById('res-status-badge');
    const scoreVal = document.getElementById('res-score-value');
    const subtitle = document.getElementById('res-subtitle');

    if (record.passed) {
      statusBadge.className = 'result-status-badge pass';
      statusBadge.innerHTML = '🎉 測驗及格 (PASSED)';
      scoreVal.className = 'score-display pass';
    } else {
      statusBadge.className = 'result-status-badge fail';
      statusBadge.innerHTML = '⚠️ 未達及格標準 (FAILED)';
      scoreVal.className = 'score-display fail';
    }

    scoreVal.innerText = `${record.score} 分`;
    subtitle.innerText = `${record.examTitle} (及格標準：70 分)`;

    document.getElementById('res-stat-correct').innerText = record.correctCount;
    document.getElementById('res-stat-wrong').innerText = record.wrongCount;
    document.getElementById('res-stat-unans').innerText = record.unansweredCount;

    const mins = Math.floor(record.timeSpentSeconds / 60);
    const secs = record.timeSpentSeconds % 60;
    document.getElementById('res-stat-time').innerText = `${mins} 分 ${secs} 秒`;

    // 預設篩選「全部題目」
    this.setReviewFilter('all');
  }

  setReviewFilter(filter) {
    AppState.reviewFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.renderReviewList();
  }

  renderReviewList() {
    const listContainer = document.getElementById('review-cards-list');
    listContainer.innerHTML = '';

    if (!AppState.lastExamResults) return;

    let items = AppState.lastExamResults.detailedResults;

    if (AppState.reviewFilter === 'wrong') {
      items = items.filter(it => !it.isCorrect);
    } else if (AppState.reviewFilter === 'flagged') {
      items = items.filter(it => it.isFlagged);
    }

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding: 2.5rem; color: var(--text-muted);">
          ✨ 此篩選條件下沒有任何題目！
        </div>
      `;
      return;
    }

    const letters = ['A', 'B', 'C', 'D'];

    items.forEach(it => {
      const card = document.createElement('div');
      card.className = `review-card ${it.isCorrect ? 'is-correct' : 'is-wrong'}`;

      const badgeHtml = it.isCorrect
        ? `<span class="review-badge correct">✔ 答對</span>`
        : `<span class="review-badge wrong">✘ 答錯 (${it.userPick ? '選 ' + it.userPick : '未作答'})</span>`;

      let optionsHtml = '';
      it.options.forEach((optText, optIdx) => {
        const lettr = letters[optIdx];
        let extraClass = '';
        let iconMarker = '';

        if (lettr === it.answer) {
          extraClass = 'is-target-ans';
          iconMarker = '✔ (正解) ';
        } else if (lettr === it.userPick && !it.isCorrect) {
          extraClass = 'is-user-pick';
          iconMarker = '✘ (您的選擇) ';
        }

        optionsHtml += `
          <div class="review-opt-item ${extraClass}">
            <b>(${lettr})</b> ${iconMarker}${optText}
          </div>
        `;
      });

      card.innerHTML = `
        <div class="review-header">
          <div style="font-weight:700; font-size:1.05rem; color:var(--text-primary);">
            第 ${it.index + 1} 題 <span style="font-size:0.8rem; color:var(--text-muted); font-weight:normal;">(題庫 #${it.id})</span>
            ${it.isFlagged ? ' <span style="color:var(--color-warning);">★ 標記題</span>' : ''}
          </div>
          ${badgeHtml}
        </div>

        <div style="font-size:1.08rem; font-weight:600; line-height:1.6; color:var(--text-primary);">
          ${it.question}
        </div>

        <div class="review-options">
          ${optionsHtml}
        </div>

        <div class="explanation-box">
          <div class="explanation-header">💡 法規解析說明：</div>
          <div>${it.explanation || '本題依據保險相關法規與外幣收付管理辦法訂定。'}</div>
        </div>

        <button class="review-ai-btn" onclick="app.copyAIPrompt(${it.id})">
          🤖 複製題目向 AI 考照小助教請教
        </button>
      `;

      listContainer.appendChild(card);
    });
  }

  copyAIPrompt(questionId) {
    const q = AppState.allQuestions.find(item => item.id === questionId);
    if (!q) return;

    const letters = ['A', 'B', 'C', 'D'];
    const optsStr = q.options.map((opt, i) => `(${letters[i]}) ${opt}`).join('\n');

    const promptText = `你好！我正在準備「外幣收付非投資型保險商品」人身保險業務員資格測驗。請針對以下題目進行詳細觀念解說、法規依據與關鍵字記憶技巧：

【題目】
${q.question}

【選項】
${optsStr}

【正確答案】
(${q.answer})

【官方解析】
${q.explanation}

請以淺顯易懂、條理清晰的方式為我說明：
1. 為什麼正確答案是 (${q.answer})？
2. 相關重要法規條文與關鍵數據重點。
3. 考試時的防呆與速記技巧。`;

    navigator.clipboard.writeText(promptText).then(() => {
      this.showToast('📋 已複製題目與 AI 提問 Prompt！可直接貼給 ChatGPT / Claude / Gemini 詢問。');
    }).catch(() => {
      this.showToast('複製失敗，請手動選取文字。');
    });
  }

  triggerConfetti() {
    try {
      const count = 120;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.style.position = 'fixed';
        el.style.width = Math.random() * 8 + 6 + 'px';
        el.style.height = Math.random() * 8 + 6 + 'px';
        el.style.backgroundColor = `hsl(${Math.random() * 360}, 90%, 60%)`;
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-20px';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'none';
        el.style.transition = `transform ${Math.random() * 2 + 1.5}s ease-out, opacity 2s ease-out`;

        document.body.appendChild(el);

        setTimeout(() => {
          el.style.transform = `translate(${Math.random() * 200 - 100}px, ${window.innerHeight + 50}px) rotate(${Math.random() * 720}deg)`;
          el.style.opacity = '0';
        }, 30);

        setTimeout(() => el.remove(), 3500);
      }
    } catch (e) {
      console.log('Confetti effect failed', e);
    }
  }

  showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>📌</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  // Modals 控制
  showHistoryModal() {
    const list = document.getElementById('history-records-list');
    list.innerHTML = '';

    if (AppState.history.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">尚無任何測驗紀錄</div>`;
    } else {
      AppState.history.forEach((rec, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center;';
        div.innerHTML = `
          <div>
            <div style="font-weight:700; color:var(--text-primary);">${rec.examTitle}</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">${rec.dateStr} · 耗時 ${Math.floor(rec.timeSpentSeconds/60)}分${rec.timeSpentSeconds%60}秒</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.3rem; font-weight:800; color:${rec.passed ? 'var(--color-success)' : 'var(--color-danger)'};">${rec.score} 分</div>
            <button class="btn-action btn-secondary" style="padding:0.25rem 0.6rem; font-size:0.75rem; margin-top:0.3rem;" onclick="app.viewPastResult(${idx})">檢視解析</button>
          </div>
        `;
        list.appendChild(div);
      });
    }

    document.getElementById('modal-history').classList.add('active');
  }

  viewPastResult(index) {
    const record = AppState.history[index];
    if (!record) return;
    this.closeModals();
    AppState.lastExamResults = record;
    this.renderResultView(record);
    this.switchView('view-result');
  }

  clearHistory() {
    if (confirm('確定要清空所有歷次考試紀錄嗎？此動作無法復原。')) {
      AppState.history = [];
      this.saveStorageData();
      this.updateDashboardStats();
      this.showHistoryModal();
      this.showToast('已清空所有歷史紀錄');
    }
  }

  showErrorBookModal() {
    const list = document.getElementById('error-book-list');
    list.innerHTML = '';

    if (AppState.errorNotebook.length === 0) {
      list.innerHTML = `<div style="text-align:center; padding:2.5rem; color:var(--text-muted);">✨ 太棒了！錯題本目前空空如也，代表您全部掌握！</div>`;
    } else {
      const errorIds = new Set(AppState.errorNotebook);
      const errorQuestions = AppState.allQuestions.filter(q => errorIds.has(q.id));

      errorQuestions.forEach(q => {
        const div = document.createElement('div');
        div.style.cssText = 'background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1rem; margin-bottom:0.8rem;';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span style="font-weight:700; color:var(--accent-primary);">題庫 #${q.id}</span>
            <button style="background:transparent; border:none; color:var(--color-danger); cursor:pointer; font-size:0.8rem;" onclick="app.removeFromErrorBook(${q.id})">✕ 移出錯題本</button>
          </div>
          <div style="font-size:0.95rem; font-weight:600; margin-bottom:0.4rem;">${q.question}</div>
          <div style="font-size:0.85rem; color:var(--color-success); font-weight:600;">正解：(${q.answer}) ${q.options['ABCD'.indexOf(q.answer)]}</div>
        `;
        list.appendChild(div);
      });
    }

    document.getElementById('modal-error-book').classList.add('active');
  }

  removeFromErrorBook(qId) {
    AppState.errorNotebook = AppState.errorNotebook.filter(id => id !== qId);
    this.saveStorageData();
    this.updateDashboardStats();
    this.showErrorBookModal();
    this.showToast(`已自錯題本移出 題號 #${qId}`);
  }

  clearErrorBook() {
    if (confirm('確定要清空整本錯題本嗎？')) {
      AppState.errorNotebook = [];
      this.saveStorageData();
      this.updateDashboardStats();
      this.showErrorBookModal();
      this.showToast('已清空錯題本');
    }
  }

  showPdfModal() {
    const modal = document.getElementById('modal-pdf');
    if (modal) modal.classList.add('active');
  }

  showAiModal() {
    const modal = document.getElementById('modal-ai');
    if (modal) modal.classList.add('active');
  }

  showCourseModal() {
    const modal = document.getElementById('modal-course');
    if (modal) modal.classList.add('active');
  }

  closeModals() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.classList.remove('active'));
  }
}

// 建立全域實例與容錯輔助
let app;
const initApp = () => {
  if (!app) {
    app = new ExamEngine();
  }
};

// 支援全域直調以防舊快取影響
window.showCourseModal = () => document.getElementById('modal-course')?.classList.add('active');
window.showPdfModal = () => document.getElementById('modal-pdf')?.classList.add('active');
window.showAiModal = () => document.getElementById('modal-ai')?.classList.add('active');
window.showHistoryModal = () => app?.showHistoryModal();
window.showErrorBookModal = () => app?.showErrorBookModal();
window.closeModals = () => document.querySelectorAll('.modal-backdrop').forEach(el => el.classList.remove('active'));

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
