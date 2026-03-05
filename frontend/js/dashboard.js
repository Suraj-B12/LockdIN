/**
 * LockdIN — Dashboard Logic
 * Timer controller, buddy display, streak/score fetch, leaderboard preview.
 * Requires: supabase-client.js, api.js
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ---- DOM References ----
    const loadingScreen = document.getElementById('loadingScreen');
    const greetingName = document.getElementById('greetingName');
    const greetingSub = document.getElementById('greetingSub');
    const navAvatar = document.getElementById('navAvatar');
    const signOutBtn = document.getElementById('signOutBtn');

    // Timer
    const timerDigits = document.getElementById('timerDigits');
    const timerStatus = document.getElementById('timerStatus');
    const timerControls = document.getElementById('timerControls');
    const timerStartBtn = document.getElementById('timerStartBtn');

    // Buddy
    const buddyAvatarImg = document.getElementById('buddyAvatarImg');
    const buddyEmojiFallback = document.getElementById('buddyEmojiFallback');
    const buddyMoodBadge = document.getElementById('buddyMoodBadge');
    const buddyNameEl = document.getElementById('buddyName');
    const buddyMoodText = document.getElementById('buddyMoodText');

    // Streak
    const streakNumber = document.getElementById('streakNumber');
    const streakSubtitle = document.getElementById('streakSubtitle');
    const streakChart = document.getElementById('streakChart');
    const longestStreak = document.getElementById('longestStreak');
    const totalSessions = document.getElementById('totalSessions');
    const totalHours = document.getElementById('totalHours');

    // Score
    const scoreNumber = document.getElementById('scoreNumber');
    const scoreSummary = document.getElementById('scoreSummary');

    // Sessions
    const sessionList = document.getElementById('sessionList');

    // Leaderboard
    const lbList = document.getElementById('lbList');

    // Modal
    const workLogModal = document.getElementById('workLogModal');
    const workLogInput = document.getElementById('workLogInput');
    const workLogSkip = document.getElementById('workLogSkip');
    const workLogSubmit = document.getElementById('workLogSubmit');

    // Toast
    const errorToast = document.getElementById('errorToast');

    // ---- State ----
    let activeSession = null;   // current session object from API
    let timerInterval = null;   // setInterval id
    let elapsedSeconds = 0;     // client-side elapsed counter
    let recentSessionsCache = []; // cached sessions for streak chart

    // Mood config — level 1-10 maps to file 01-10.png
    const MOOD_TABLE = [
        { level: 1, emoji: '😢', text: 'Devastated', file: '01.png' },
        { level: 2, emoji: '😟', text: 'Sad', file: '02.png' },
        { level: 3, emoji: '😔', text: 'Down', file: '03.png' },
        { level: 4, emoji: '😐', text: 'Neutral', file: '04.png' },
        { level: 5, emoji: '🙂', text: 'Okay', file: '05.png' },
        { level: 6, emoji: '😊', text: 'Content', file: '06.png' },
        { level: 7, emoji: '😄', text: 'Happy', file: '07.png' },
        { level: 8, emoji: '😁', text: 'Excited', file: '08.png' },
        { level: 9, emoji: '🤩', text: 'Thrilled', file: '09.png' },
        { level: 10, emoji: '🥳', text: 'Ecstatic', file: '10.png' },
    ];

    // ---- Auth Guard ----
    const session = await requireAuth();
    if (!session) return;
    const user = session.user;

    // ---- Populate user info ----
    const displayName = user.user_metadata?.full_name
        || user.user_metadata?.name
        || user.email?.split('@')[0]
        || 'User';
    const firstName = displayName.split(' ')[0];
    greetingName.textContent = firstName;
    setGreetingSub();

    // Avatar in nav
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = displayName;
        img.className = 'dash-user-avatar';
        img.onerror = () => img.remove();
        navAvatar.replaceWith(img);
    } else {
        navAvatar.textContent = displayName.charAt(0).toUpperCase();
    }

    // ---- Load all data in parallel ----
    loadingScreen.classList.add('hidden');

    await Promise.allSettled([
        loadActiveSession(),
        loadBuddy(),
        loadRecentSessions(),
        loadLeaderboardPreview(),
    ]);

    // ============================================
    //  GREETING HELPER
    // ============================================
    function setGreetingSub() {
        const hr = new Date().getHours();
        if (hr < 12) greetingSub.textContent = 'Good morning — let\'s make today count.';
        else if (hr < 17) greetingSub.textContent = 'Good afternoon — stay locked in.';
        else greetingSub.textContent = 'Good evening — one more session?';
    }

    // ============================================
    //  TIMER — Core Logic
    // ============================================
    async function loadActiveSession() {
        try {
            const data = await api.get('/sessions/active');
            if (data) {
                activeSession = data;
                elapsedSeconds = data.total_seconds || 0;

                if (data.status === 'active') {
                    // Calculate actual elapsed since started_at
                    const started = new Date(data.started_at);
                    const extra = Math.floor((Date.now() - started.getTime()) / 1000) - elapsedSeconds;
                    elapsedSeconds += Math.max(0, extra);
                    enterActiveState();
                } else if (data.status === 'paused') {
                    enterPausedState();
                }
            } else {
                enterIdleState();
            }
        } catch {
            enterIdleState();
        }
    }

    function enterIdleState() {
        activeSession = null;
        elapsedSeconds = 0;
        stopTicking();
        updateTimerDisplay();
        setTimerStatusBadge('idle', 'Ready');
        timerControls.innerHTML = `
            <button class="timer-btn timer-btn-primary" id="timerStartBtn" onclick="">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Start Focus
            </button>`;
        timerControls.querySelector('#timerStartBtn').addEventListener('click', startSession);
    }

    function enterActiveState() {
        setTimerStatusBadge('active', 'Focusing');
        startTicking();
        timerControls.innerHTML = `
            <button class="timer-btn timer-btn-secondary" id="timerPauseBtn">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                Pause
            </button>
            <button class="timer-btn timer-btn-danger" id="timerFinishBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                Finish
            </button>`;
        timerControls.querySelector('#timerPauseBtn').addEventListener('click', pauseSession);
        timerControls.querySelector('#timerFinishBtn').addEventListener('click', finishSession);
    }

    function enterPausedState() {
        stopTicking();
        updateTimerDisplay();
        setTimerStatusBadge('paused', 'Paused');
        timerControls.innerHTML = `
            <button class="timer-btn timer-btn-primary" id="timerResumeBtn">
                <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" width="16" height="16">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                Resume
            </button>
            <button class="timer-btn timer-btn-danger" id="timerFinishBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                </svg>
                Finish
            </button>`;
        timerControls.querySelector('#timerResumeBtn').addEventListener('click', resumeSession);
        timerControls.querySelector('#timerFinishBtn').addEventListener('click', finishSession);
    }

    // ---- Timer API Calls ----
    async function startSession() {
        try {
            disableControls();
            const data = await api.post('/sessions/start');
            activeSession = data;
            elapsedSeconds = 0;
            enterActiveState();
        } catch (err) {
            showError(err.message || 'Failed to start session');
            enterIdleState();
        }
    }

    async function pauseSession() {
        if (!activeSession) return;
        try {
            disableControls();
            const data = await api.put(`/sessions/${activeSession.id}/pause`);
            activeSession = data;
            elapsedSeconds = data.total_seconds || elapsedSeconds;
            enterPausedState();
        } catch (err) {
            showError(err.message || 'Failed to pause');
        }
    }

    async function resumeSession() {
        if (!activeSession) return;
        try {
            disableControls();
            const data = await api.put(`/sessions/${activeSession.id}/resume`);
            activeSession = data;
            enterActiveState();
        } catch (err) {
            showError(err.message || 'Failed to resume');
        }
    }

    async function finishSession() {
        if (!activeSession) return;
        stopTicking();
        // Show work log modal
        workLogModal.classList.add('visible');
        workLogInput.value = '';
        workLogInput.focus();
    }

    // ---- Work Log Modal Handlers ----
    workLogSubmit.addEventListener('click', () => submitWorkLog(workLogInput.value.trim() || 'No description provided.'));
    workLogSkip.addEventListener('click', () => submitWorkLog('No description provided.'));

    async function submitWorkLog(logText) {
        workLogModal.classList.remove('visible');
        if (!activeSession) return;
        try {
            disableControls();
            const data = await api.put(`/sessions/${activeSession.id}/finish`, {
                work_log: logText
            });
            // Show score briefly
            if (data.ai_score !== undefined) {
                updateScoreDisplay(data.ai_score, data.ai_summary || '');
            }
            activeSession = null;
            enterIdleState();
            // Refresh data
            loadRecentSessions();
            loadBuddy();
        } catch (err) {
            showError(err.message || 'Failed to finish session');
            enterActiveState();
        }
    }

    // ---- Timer Display ----
    function startTicking() {
        stopTicking();
        timerInterval = setInterval(() => {
            elapsedSeconds++;
            updateTimerDisplay();
        }, 1000);
    }

    function stopTicking() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function updateTimerDisplay() {
        const h = Math.floor(elapsedSeconds / 3600);
        const m = Math.floor((elapsedSeconds % 3600) / 60);
        const s = elapsedSeconds % 60;
        timerDigits.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function pad(n) { return String(n).padStart(2, '0'); }

    function setTimerStatusBadge(cls, text) {
        timerStatus.className = `timer-status ${cls}`;
        timerStatus.textContent = text;
    }

    function disableControls() {
        timerControls.querySelectorAll('button').forEach(b => b.disabled = true);
    }

    // ============================================
    //  BUDDY
    // ============================================
    async function loadBuddy() {
        try {
            const buddy = await api.get('/buddy/');
            if (!buddy) return;

            buddyNameEl.textContent = buddy.buddy_name || 'Buddy';

            // Determine avatar image path
            const avatarNum = extractAvatarNumber(buddy.buddy_type);
            const moodLevel = clamp(buddy.mood_level ?? 5, 1, 10);
            const moodInfo = getMoodInfo(moodLevel);

            if (avatarNum) {
                // User picked an avatar during onboarding — show image, hide emoji
                buddyAvatarImg.src = `Avatars/Avatar ${avatarNum}/${moodInfo.file}`;
                buddyAvatarImg.style.display = '';
                buddyEmojiFallback.style.display = 'none';
                buddyMoodBadge.style.display = '';
                buddyAvatarImg.onerror = () => {
                    // Image failed — revert to emoji fallback
                    buddyAvatarImg.style.display = 'none';
                    buddyEmojiFallback.style.display = '';
                    buddyEmojiFallback.textContent = moodInfo.emoji;
                    buddyMoodBadge.style.display = 'none';
                };
            } else {
                // Default buddy_type (e.g. 'cat') — update emoji content
                buddyEmojiFallback.textContent = moodInfo.emoji;
                buddyMoodBadge.style.display = 'none';
            }

            buddyMoodBadge.textContent = moodInfo.emoji;
            buddyMoodText.textContent = moodInfo.text;

            // Update streak data from buddy
            const streak = buddy.current_streak || 0;
            streakNumber.innerHTML = `${streak}<span class="streak-unit">days</span>`;
            longestStreak.textContent = buddy.longest_streak || 0;

            if (streak === 0) {
                streakSubtitle.textContent = 'Complete a session to start your streak!';
            } else if (streak === 1) {
                streakSubtitle.textContent = 'Day one — keep it going!';
            } else {
                streakSubtitle.textContent = `${streak} days strong 🔥`;
            }
        } catch {
            // Buddy not found — leave defaults
        }
    }

    function extractAvatarNumber(buddyType) {
        if (!buddyType) return null;
        const match = buddyType.match(/avatar_(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    function getMoodInfo(level) {
        const idx = clamp(level - 1, 0, MOOD_TABLE.length - 1);
        return MOOD_TABLE[idx];
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function buildStreakChart(sessions) {
        streakChart.innerHTML = '';
        const dayLabels = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
        const today = new Date();
        const todayDow = today.getDay(); // 0=Sun
        const todayIdx = todayDow === 0 ? 6 : todayDow - 1; // Mon=0

        // Build a map of day-of-week → total minutes from real sessions
        const dayMinutes = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

        if (sessions && sessions.length) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - todayIdx);
            weekStart.setHours(0, 0, 0, 0);

            sessions.forEach(s => {
                const d = new Date(s.finished_at || s.started_at);
                if (d >= weekStart) {
                    const dow = d.getDay();
                    const idx = dow === 0 ? 6 : dow - 1;
                    dayMinutes[idx] += Math.round((s.total_seconds || 0) / 60);
                }
            });
        }

        const maxMin = Math.max(...dayMinutes, 1);

        for (let i = 0; i < 7; i++) {
            const wrap = document.createElement('div');
            wrap.className = 'streak-bar-wrap';

            const bar = document.createElement('div');
            bar.className = 'streak-bar';

            // Height proportional to actual session minutes, min bar height 4px
            const height = dayMinutes[i] > 0 ? Math.max(8, (dayMinutes[i] / maxMin) * 70) : 4;
            bar.style.height = `${height}px`;
            if (dayMinutes[i] > 0) bar.classList.add('filled');
            if (i === todayIdx) bar.classList.add('today');

            const label = document.createElement('span');
            label.className = 'streak-day-label';
            if (i === todayIdx) label.classList.add('today');
            label.textContent = dayLabels[i];

            wrap.appendChild(bar);
            wrap.appendChild(label);
            streakChart.appendChild(wrap);
        }
    }

    // ============================================
    //  SCORE
    // ============================================
    function updateScoreDisplay(score, summary) {
        scoreNumber.textContent = score;

        // Color the score number based on value
        if (score >= 80) {
            scoreNumber.style.color = '#22c55e';
        } else if (score >= 50) {
            scoreNumber.style.color = 'var(--accent)';
        } else {
            scoreNumber.style.color = '#f59e0b';
        }

        scoreSummary.textContent = summary || `Score: ${score}/100`;
    }

    // ============================================
    //  RECENT SESSIONS
    // ============================================
    async function loadRecentSessions() {
        try {
            // Fetch up to 20 sessions so the streak chart has enough data for the week
            const sessions = await api.get('/sessions/history?limit=20');
            recentSessionsCache = sessions || [];

            // Build streak chart from real session data
            buildStreakChart(recentSessionsCache);

            if (!sessions || sessions.length === 0) return;

            let totalSec = 0;
            let count = sessions.length;

            sessionList.innerHTML = '';
            // Only show the 5 most recent in the list
            sessions.slice(0, 5).forEach(s => {
                totalSec += s.total_seconds || 0;
                const li = document.createElement('li');
                li.className = 'session-item';

                const dateStr = formatSessionDate(s.finished_at || s.started_at);
                const duration = formatDuration(s.total_seconds || 0);
                const worklog = s.work_log || '';
                const score = s.ai_score;

                li.innerHTML = `
                    <span class="session-date">${dateStr}</span>
                    <span class="session-duration">${duration}</span>
                    <span class="session-worklog">${escapeHtml(worklog)}</span>
                    ${score !== undefined && score !== null
                        ? `<span class="session-score-pip">${score}</span>`
                        : ''}
                `;
                sessionList.appendChild(li);
            });

            // Total across all fetched sessions
            sessions.forEach(s => { totalSec += s.total_seconds || 0; });

            // Update quick stats from session data
            totalSessions.textContent = count;
            totalHours.innerHTML = `${Math.round(totalSec / 3600)}<span class="qs-unit">h</span>`;

            // Set today's score from the most recent session
            const latest = sessions[0];
            if (latest.ai_score !== undefined && latest.ai_score !== null) {
                const isToday = new Date(latest.finished_at).toDateString() === new Date().toDateString();
                if (isToday) {
                    updateScoreDisplay(latest.ai_score, latest.ai_summary || '');
                }
            }
        } catch {
            // Leave empty state
            buildStreakChart([]);
        }
    }

    function formatSessionDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function formatDuration(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ============================================
    //  LEADERBOARD PREVIEW
    // ============================================
    async function loadLeaderboardPreview() {
        try {
            const data = await api.get('/leaderboard/daily');
            if (!data || !data.entries || data.entries.length === 0) return;

            lbList.innerHTML = '';
            const top3 = data.entries.slice(0, 3);
            const rankClasses = ['gold', 'silver', 'bronze'];

            top3.forEach((entry, i) => {
                const li = document.createElement('li');
                li.className = 'lb-item';
                if (entry.user_id === user.id) li.classList.add('is-you');

                const avatarSrc = entry.avatar_url || '';
                const avatarHtml = avatarSrc
                    ? `<img class="lb-avatar" src="${avatarSrc}" alt="">`
                    : `<div class="lb-avatar" style="background:var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;color:var(--accent)">${(entry.display_name || '?').charAt(0)}</div>`;

                li.innerHTML = `
                    <span class="lb-rank ${rankClasses[i] || ''}">${i + 1}</span>
                    ${avatarHtml}
                    <span class="lb-name">${escapeHtml(entry.display_name || 'Unknown')}</span>
                    <span class="lb-score-val">${entry.total_score}</span>
                `;
                lbList.appendChild(li);
            });
        } catch {
            // Leave empty state
        }
    }

    // ============================================
    //  SIGN OUT
    // ============================================
    signOutBtn.addEventListener('click', async () => {
        signOutBtn.disabled = true;
        signOutBtn.textContent = 'Signing out...';
        try {
            await api.post('/auth/logout').catch(() => { });
        } catch { /* ignore */ }
        await signOut();
    });

    onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = '/login.html';
        }
    });

    // ============================================
    //  UTILITIES
    // ============================================
    function showError(msg) {
        errorToast.textContent = msg;
        errorToast.classList.add('visible');
        setTimeout(() => errorToast.classList.remove('visible'), 4000);
    }
});
