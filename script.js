// ─── Config ──────────────────────────────────────────────────────
const QUIZ_COUNT      = 50;
const TIMER_DURATION  = 70 * 60; // seconds

// ─── State ───────────────────────────────────────────────────────
let currentQuiz     = 0;
let participantName = '';
let participantNipp = '';
let quizPool        = [];
let userAnswers     = [];   // undefined = belum dijawab, -1 = dilewati, 0-3 = jawaban
let timeRemaining   = TIMER_DURATION;
let timerInterval   = null;

// ─── DOM Refs ─────────────────────────────────────────────────────
const loginSection         = document.getElementById('login-section');
const quizSection          = document.getElementById('quiz-section');
const resultSection        = document.getElementById('result-section');
const reviewSection        = document.getElementById('review-section');
const participantNameInput = document.getElementById('participant-name');
const participantNippInput = document.getElementById('participant-nipp');
const startBtn             = document.getElementById('start-btn');
const displayName          = document.getElementById('display-name');
const answerEls            = document.querySelectorAll('.answer');
const questionEl           = document.getElementById('question');
const a_text               = document.getElementById('a_text');
const b_text               = document.getElementById('b_text');
const c_text               = document.getElementById('c_text');
const d_text               = document.getElementById('d_text');
const submitBtn            = document.getElementById('submit');
const backBtn              = document.getElementById('back-btn');
const skipBtn              = document.getElementById('skip-btn');
const progressBar          = document.getElementById('progress-bar');
const progressText         = document.getElementById('progress-text');
const timerEl              = document.getElementById('timer');
const navGrid              = document.getElementById('nav-grid');
const statAnswered         = document.getElementById('stat-answered');
const statUnanswered       = document.getElementById('stat-unanswered');
const confirmModal         = document.getElementById('confirm-modal');
const modalCancel          = document.getElementById('modal-cancel');
const modalConfirm         = document.getElementById('modal-confirm');
const modalAnswered        = document.getElementById('modal-answered');
const modalSkipped         = document.getElementById('modal-skipped');
const modalTotal           = document.getElementById('modal-total');

// ─── Helpers ──────────────────────────────────────────────────────
function shuffleAndPick(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

function deselectAnswers() {
    answerEls.forEach(el => (el.checked = false));
}

function getSelected() {
    let answer;
    answerEls.forEach((el, idx) => { if (el.checked) answer = idx; });
    return answer;
}

function countAnswered() {
    return userAnswers.filter(a => a !== undefined && a !== -1).length;
}

function countSkipped() {
    return userAnswers.filter(a => a === -1).length;
}

// ─── Start ────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => {
    participantName = participantNameInput.value.trim();
    participantNipp = participantNippInput.value.trim();

    if (!participantName) {
        shakeInput(participantNameInput);
        return;
    }
    if (!participantNipp) {
        shakeInput(participantNippInput);
        return;
    }

    quizPool    = shuffleAndPick(questions, Math.min(QUIZ_COUNT, questions.length));
    userAnswers = new Array(quizPool.length).fill(undefined);
    currentQuiz = 0;

    displayName.innerText = `${participantName}`;
    loginSection.classList.add('hidden');
    quizSection.classList.remove('hidden');

    buildNavGrid();
    loadQuiz();
    startTimer();
});

function shakeInput(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.borderColor = 'var(--danger)';
    el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.25)';
    el.focus();
    setTimeout(() => {
        el.style.borderColor = '';
        el.style.boxShadow = '';
    }, 2000);
}

// ─── Build Nav Grid ────────────────────────────────────────────────
function buildNavGrid() {
    navGrid.innerHTML = '';
    quizPool.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.textContent = i + 1;
        btn.dataset.idx = i;
        btn.addEventListener('click', () => {
            // Save current answer before jumping
            userAnswers[currentQuiz] = getSelected();
            currentQuiz = i;
            loadQuiz();
        });
        navGrid.appendChild(btn);
    });
}

function updateNavGrid() {
    const btns = navGrid.querySelectorAll('.nav-btn');
    let answeredCount = 0;
    btns.forEach((btn, i) => {
        btn.className = 'nav-btn';
        if (i === currentQuiz) {
            btn.classList.add('current');
        } else if (userAnswers[i] !== undefined && userAnswers[i] !== -1) {
            btn.classList.add('answered');
            answeredCount++;
        } else if (i !== currentQuiz && userAnswers[i] === -1) {
            btn.classList.add('skipped');
        }
    });

    const ans = countAnswered();
    const rem = quizPool.length - ans - countSkipped();
    statAnswered.textContent  = `✓ ${ans} terjawab`;
    statUnanswered.textContent = `⚠ ${rem < 0 ? 0 : rem} belum`;
}

// ─── Load Quiz ────────────────────────────────────────────────────
function loadQuiz() {
    const data = quizPool[currentQuiz];

    // Animate question change
    questionEl.parentElement.style.animation = 'none';
    questionEl.parentElement.offsetHeight;
    questionEl.parentElement.style.animation = '';

    questionEl.innerText = `${currentQuiz + 1}. ${data.question}`;
    a_text.innerText = data.options[0];
    b_text.innerText = data.options[1];
    c_text.innerText = data.options[2];
    d_text.innerText = data.options[3];

    deselectAnswers();
    const saved = userAnswers[currentQuiz];
    if (saved !== undefined && saved !== -1) {
        answerEls[saved].checked = true;
    }

    const pct = ((currentQuiz + 1) / quizPool.length) * 100;
    progressBar.style.width = pct + '%';
    progressText.innerText  = `${currentQuiz + 1} / ${quizPool.length}`;

    const isLast = currentQuiz === quizPool.length - 1;
    backBtn.disabled    = currentQuiz === 0;
    submitBtn.textContent = isLast ? '🏁 Selesai' : 'Jawab →';
    submitBtn.className   = isLast ? 'btn-nav-next btn-finish' : 'btn-nav-next';

    updateNavGrid();
}

// ─── Submit / Next ────────────────────────────────────────────────
submitBtn.addEventListener('click', () => {
    const answer = getSelected();
    if (answer === undefined) {
        // highlight options briefly
        highlightNoAnswer();
        return;
    }
    userAnswers[currentQuiz] = answer;

    if (currentQuiz < quizPool.length - 1) {
        currentQuiz++;
        loadQuiz();
    } else {
        // Last question → show confirm modal
        openConfirmModal();
    }
});

function highlightNoAnswer() {
    const labels = document.querySelectorAll('ul li label');
    labels.forEach(lbl => {
        lbl.style.borderColor = 'rgba(239,68,68,0.5)';
        setTimeout(() => { lbl.style.borderColor = ''; }, 1000);
    });
}

// ─── Back ─────────────────────────────────────────────────────────
backBtn.addEventListener('click', () => {
    userAnswers[currentQuiz] = getSelected(); // save even if undefined
    if (currentQuiz > 0) {
        currentQuiz--;
        loadQuiz();
    }
});

// ─── Skip ─────────────────────────────────────────────────────────
skipBtn.addEventListener('click', () => {
    userAnswers[currentQuiz] = -1; // mark as skipped
    // Find next unanswered question
    let next = -1;
    for (let i = currentQuiz + 1; i < quizPool.length; i++) {
        if (userAnswers[i] === undefined || userAnswers[i] === -1) {
            next = i;
            break;
        }
    }
    if (next === -1) {
        // wrap around from start
        for (let i = 0; i < currentQuiz; i++) {
            if (userAnswers[i] === undefined || userAnswers[i] === -1) {
                next = i;
                break;
            }
        }
    }
    if (next === -1) {
        // All answered, go to last
        next = quizPool.length - 1;
    }
    currentQuiz = next;
    loadQuiz();
});

// ─── Confirm Modal ────────────────────────────────────────────────
function openConfirmModal() {
    const answered = countAnswered();
    const skipped  = countSkipped();
    modalAnswered.textContent = answered;
    modalSkipped.textContent  = skipped;
    modalTotal.textContent    = quizPool.length;
    confirmModal.classList.remove('hidden');
}

modalCancel.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
});

modalConfirm.addEventListener('click', () => {
    confirmModal.classList.add('hidden');
    showResult();
});

// Click outside modal box to cancel
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.classList.add('hidden');
    }
});

// ─── Timer ────────────────────────────────────────────────────────
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeRemaining = TIMER_DURATION;
    renderTimer();

    timerInterval = setInterval(() => {
        timeRemaining--;
        renderTimer();
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            confirmModal.classList.add('hidden');
            showResult(true);
        }
    }, 1000);
}

function renderTimer() {
    const m = Math.floor(timeRemaining / 60);
    const s = timeRemaining % 60;
    timerEl.innerText = `⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if (timeRemaining <= 300) {
        timerEl.classList.add('timer-warning');
    } else {
        timerEl.classList.remove('timer-warning');
    }
}

// ─── Show Result ──────────────────────────────────────────────────
function showResult(timeUp = false) {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }

    quizSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    let correct = 0;
    let wrong   = 0;
    let skipped = 0;

    quizPool.forEach((q, i) => {
        if (userAnswers[i] === q.answer)           correct++;
        else if (userAnswers[i] === undefined || userAnswers[i] === -1) skipped++;
        else                                       wrong++;
    });

    const finalScore = Math.round((correct / quizPool.length) * 100);
    const circumference = 2 * Math.PI * 54; // r=54
    const dashOffset = circumference - (finalScore / 100) * circumference;

    let trophy, grade, gradeColor, gradeBg;
    if      (finalScore >= 90) { trophy = '🏆'; grade = 'Sangat Baik';        gradeColor = '#34d399'; gradeBg = 'rgba(16,185,129,0.15)'; }
    else if (finalScore >= 75) { trophy = '👍'; grade = 'Baik';               gradeColor = '#60a5fa'; gradeBg = 'rgba(37,99,235,0.15)'; }
    else if (finalScore >= 60) { trophy = '📝'; grade = 'Cukup';              gradeColor = '#fbbf24'; gradeBg = 'rgba(217,119,6,0.15)'; }
    else                       { trophy = '💪'; grade = 'Perlu Belajar Lagi'; gradeColor = '#f87171'; gradeBg = 'rgba(220,38,38,0.15)'; }

    const timeUpNotice = timeUp
        ? `<p style="color:var(--danger);font-size:0.85rem;margin-bottom:0.8rem;">⏰ Waktu habis – jawaban dikumpulkan otomatis</p>`
        : '';

    resultSection.innerHTML = `
        <div class="result-content">
            ${timeUpNotice}
            <div class="result-trophy">${trophy}</div>
            <h2>Kuis Selesai!</h2>
            <p class="result-name">${participantName}</p>
            <p class="nipp-display">🪪 NIPP: ${participantNipp}</p>

            <div class="score-ring">
                <svg width="150" height="150" viewBox="0 0 150 150">
                    <circle class="score-circle-bg" cx="75" cy="75" r="54"/>
                    <circle class="score-circle-fg" cx="75" cy="75" r="54"
                        stroke="${gradeColor}"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${circumference}"
                        id="score-arc"/>
                </svg>
                <div class="score-number" id="score-number">0</div>
                <div class="score-label">NILAI</div>
            </div>

            <div class="result-grade" style="background:${gradeBg};color:${gradeColor}">${grade}</div>

            <div class="result-stats-row">
                <div class="result-stat">
                    <span class="result-stat-num" style="color:var(--success)">${correct}</span>
                    <span class="result-stat-lbl">✅ Benar</span>
                </div>
                <div class="result-stat">
                    <span class="result-stat-num" style="color:var(--danger)">${wrong}</span>
                    <span class="result-stat-lbl">❌ Salah</span>
                </div>
                <div class="result-stat">
                    <span class="result-stat-num" style="color:var(--warning)">${skipped}</span>
                    <span class="result-stat-lbl">⚠️ Lewati</span>
                </div>
                <div class="result-stat">
                    <span class="result-stat-num" style="color:var(--primary-light)">${quizPool.length}</span>
                    <span class="result-stat-lbl">📋 Total</span>
                </div>
            </div>

            <div class="result-btn-group">
                <button class="btn-outline" onclick="location.reload()">🔄 Mulai Baru</button>
                <button class="btn-filled" onclick="showReview()">📋 Review Jawaban</button>
            </div>
        </div>
    `;

    // Animate score number & ring
    animateScore(finalScore, circumference, dashOffset);
}

function animateScore(target, circumference, dashOffset) {
    const arc = document.getElementById('score-arc');
    const numEl = document.getElementById('score-number');
    if (!arc || !numEl) return;

    // Trigger ring animation
    requestAnimationFrame(() => {
        arc.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
        arc.style.strokeDashoffset = dashOffset;
    });

    // Count-up number
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        numEl.textContent = Math.round(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ─── Review ───────────────────────────────────────────────────────
let reviewFilter = 'all';

function showReview() {
    resultSection.classList.add('hidden');
    reviewSection.classList.remove('hidden');
    renderReview();
}

function renderReview() {
    const labels = ['A', 'B', 'C', 'D'];

    let html = `
        <div class="review-header">
            <h2>📋 Review Jawaban</h2>
            <p class="result-name">${participantName}</p>
            <p class="nipp-display">🪪 NIPP: ${participantNipp}</p>
        </div>
        <div class="review-filter">
            <button class="filter-btn ${reviewFilter === 'all'     ? 'active' : ''}" onclick="setFilter('all')">Semua</button>
            <button class="filter-btn ${reviewFilter === 'correct' ? 'active' : ''}" onclick="setFilter('correct')">✅ Benar</button>
            <button class="filter-btn ${reviewFilter === 'wrong'   ? 'active' : ''}" onclick="setFilter('wrong')">❌ Salah</button>
            <button class="filter-btn ${reviewFilter === 'skipped' ? 'active' : ''}" onclick="setFilter('skipped')">⚠️ Dilewati</button>
        </div>
        <div class="review-list">
    `;

    quizPool.forEach((q, i) => {
        const ans       = userAnswers[i];
        const isCorrect = ans === q.answer;
        const isSkipped = ans === undefined || ans === -1;
        const statusClass = isSkipped ? 'skipped' : isCorrect ? 'correct' : 'wrong';
        const statusIcon  = isSkipped ? '⚠️' : isCorrect ? '✅' : '❌';

        // Filter
        if (reviewFilter === 'correct' && !isCorrect) return;
        if (reviewFilter === 'wrong'   && (isCorrect || isSkipped)) return;
        if (reviewFilter === 'skipped' && !isSkipped) return;

        html += `
            <div class="review-item ${statusClass}">
                <div class="review-question">
                    <span class="review-num">${i + 1}</span>
                    <span class="review-status">${statusIcon}</span>
                    <p>${q.question}</p>
                </div>
                <div class="review-options">
        `;

        q.options.forEach((opt, j) => {
            let optClass = '';
            let mark = '';
            if (j === q.answer) { optClass = 'opt-correct'; mark = '✓ Kunci Jawaban'; }
            else if (j === ans && !isCorrect && !isSkipped) { optClass = 'opt-wrong'; mark = '✗ Jawaban Anda'; }

            html += `
                <div class="review-opt ${optClass}">
                    <strong>${labels[j]}.</strong> ${opt}
                    ${mark ? `<span class="opt-mark">${mark}</span>` : ''}
                </div>
            `;
        });

        if (isSkipped) {
            html += `<div class="review-skipped">⚠️ Soal ini tidak dijawab / dilewati</div>`;
        }

        html += `</div></div>`;
    });

    html += `</div>
        <div class="review-actions">
            <button class="btn-back-result" onclick="showResultBack()">← Kembali ke Hasil</button>
            <button class="btn-restart" onclick="location.reload()">🔄 Mulai Baru</button>
        </div>
    `;

    reviewSection.innerHTML = html;
}

function setFilter(f) {
    reviewFilter = f;
    renderReview();
}

function showResultBack() {
    reviewSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
}

// ─── Keyboard shortcuts ───────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (!quizSection.classList.contains('hidden')) {
        if (e.key === '1' || e.key === 'a') answerEls[0].checked = true;
        if (e.key === '2' || e.key === 'b') answerEls[1].checked = true;
        if (e.key === '3' || e.key === 'c') answerEls[2].checked = true;
        if (e.key === '4' || e.key === 'd') answerEls[3].checked = true;
        if (e.key === 'ArrowRight' || e.key === 'Enter') submitBtn.click();
        if (e.key === 'ArrowLeft')  backBtn.disabled ? null : backBtn.click();
    }
    if (e.key === 'Escape' && !confirmModal.classList.contains('hidden')) {
        confirmModal.classList.add('hidden');
    }
});
