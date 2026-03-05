/**
 * LockdIN — History Page Logic (Premium Redesign)
 * Fetches session history, renders premium heatmap with labels/tooltips + session feed.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const navAvatar = document.getElementById('navAvatar');
    const heatmapGrid = document.getElementById('heatmapGrid');
    const heatmapMonthLabels = document.getElementById('heatmapMonthLabels');
    const heatmapTooltip = document.getElementById('heatmapTooltip');
    const sessionFeed = document.getElementById('sessionFeed');
    const sessionCount = document.getElementById('sessionCount');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const errorToast = document.getElementById('errorToast');

    // Stats elements
    const statTotalSessions = document.getElementById('statTotalSessions');
    const statTotalHours = document.getElementById('statTotalHours');
    const statActiveDays = document.getElementById('statActiveDays');
    const statBestDay = document.getElementById('statBestDay');

    let offset = 0;
    const LIMIT = 20;
    let allSessions = [];

    // Auth
    const session = await requireAuth();
    if (!session) return;
    const user = session.user;

    // Nav avatar
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl; img.alt = displayName; img.className = 'dash-user-avatar';
        img.onerror = () => img.remove();
        navAvatar.replaceWith(img);
    } else {
        navAvatar.textContent = displayName.charAt(0).toUpperCase();
    }

    loadingScreen.classList.add('hidden');

    // Load initial batch
    await loadSessions();

    // Load more
    loadMoreBtn.addEventListener('click', loadSessions);

    // ============================================
    //  LOAD SESSIONS
    // ============================================
    async function loadSessions() {
        try {
            loadMoreBtn.textContent = 'Loading...';
            loadMoreBtn.disabled = true;

            const sessions = await api.get(`/sessions/history?limit=${LIMIT}&offset=${offset}`);

            if (!sessions || sessions.length === 0) {
                loadMoreBtn.style.display = 'none';
                // Still render the empty heatmap and stats even with no sessions
                buildHeatmap([]);
                updateStats([]);
                if (offset === 0) return;
                return;
            }

            if (offset === 0) {
                sessionFeed.innerHTML = '';
            }

            allSessions = allSessions.concat(sessions);
            offset += sessions.length;
            sessionCount.textContent = `${allSessions.length} sessions`;

            sessions.forEach((s, i) => {
                const item = document.createElement('div');
                item.className = 'hist-session-item';
                item.style.animationDelay = `${i * 0.04}s`;

                const dateStr = formatDate(s.finished_at || s.started_at);
                const duration = formatDuration(s.total_seconds || 0);
                const worklog = s.work_log || 'No description';
                const score = s.ai_score;
                const summary = s.ai_summary || '';

                item.innerHTML = `
                    <span class="hist-session-date">${dateStr}</span>
                    <div class="hist-session-body">
                        <div class="hist-session-top">
                            <span class="hist-session-duration">${duration}</span>
                            ${score !== undefined && score !== null ? `<span class="hist-session-score-pip">${score}/100</span>` : ''}
                        </div>
                        <div class="hist-session-worklog">${escapeHtml(worklog)}</div>
                        ${summary ? `<div class="hist-session-summary">${escapeHtml(summary)}</div>` : ''}
                    </div>
                `;
                sessionFeed.appendChild(item);
            });

            // Show load more if full page returned
            if (sessions.length >= LIMIT) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.textContent = 'Load More';
                loadMoreBtn.disabled = false;
            } else {
                loadMoreBtn.style.display = 'none';
            }

            // Build heatmap + stats from all sessions
            buildHeatmap(allSessions);
            updateStats(allSessions);
        } catch (err) {
            showError(err.message || 'Failed to load sessions');
            loadMoreBtn.textContent = 'Load More';
            loadMoreBtn.disabled = false;
        }
    }

    // ============================================
    //  SUMMARY STATS
    // ============================================
    function updateStats(sessions) {
        if (!sessions.length) return;

        // Day map for active days + best day
        const dayMap = {};
        let totalSec = 0;

        sessions.forEach(s => {
            totalSec += s.total_seconds || 0;
            if (!s.finished_at) return;
            const dateKey = new Date(s.finished_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dayMap[dateKey] = (dayMap[dateKey] || 0) + (s.total_seconds || 0);
        });

        const activeDays = Object.keys(dayMap).length;
        const bestDayEntry = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];

        statTotalSessions.textContent = sessions.length;
        const hours = Math.round(totalSec / 3600);
        const mins = Math.round((totalSec % 3600) / 60);
        statTotalHours.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        statActiveDays.textContent = activeDays;
        statBestDay.textContent = bestDayEntry ? bestDayEntry[0] : '—';
    }

    // ============================================
    //  PREMIUM HEATMAP
    // ============================================
    function buildHeatmap(sessions) {
        // Build date → total_seconds map
        const dayMap = {};
        sessions.forEach(s => {
            if (!s.finished_at) return;
            const dateKey = new Date(s.finished_at).toISOString().split('T')[0];
            dayMap[dateKey] = (dayMap[dateKey] || 0) + (s.total_seconds || 0);
        });

        const values = Object.values(dayMap);
        const maxSec = Math.max(...values, 1);

        // Build 12 weeks going back from today
        const today = new Date();
        const todayKey = today.toISOString().split('T')[0];
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 83);

        // Align to Monday
        const dayOfWeek = startDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate.setDate(startDate.getDate() + mondayOffset);

        // ---- Render grid cells ----
        heatmapGrid.innerHTML = '';
        const current = new Date(startDate);
        const weeks = [];
        let currentWeek = [];

        while (current <= today || currentWeek.length > 0) {
            const dow = current.getDay();
            const adjustedDow = dow === 0 ? 6 : dow - 1; // Mon=0

            if (adjustedDow === 0 && currentWeek.length > 0) {
                weeks.push(currentWeek);
                currentWeek = [];
            }

            if (current > today) break;

            const dateKey = current.toISOString().split('T')[0];
            const sec = dayMap[dateKey] || 0;
            const level = sec === 0 ? 0
                : sec < maxSec * 0.25 ? 1
                    : sec < maxSec * 0.5 ? 2
                        : sec < maxSec * 0.75 ? 3
                            : 4;

            const cell = document.createElement('div');
            cell.className = `heatmap-cell level-${level}`;
            if (dateKey === todayKey) cell.classList.add('today');

            // Store data for tooltip
            cell.dataset.date = dateKey;
            cell.dataset.seconds = sec;

            // Tooltip events
            cell.addEventListener('mouseenter', showTooltip);
            cell.addEventListener('mouseleave', hideTooltip);

            heatmapGrid.appendChild(cell);

            currentWeek.push({
                date: new Date(current),
                dateKey
            });

            current.setDate(current.getDate() + 1);
        }
        if (currentWeek.length > 0) weeks.push(currentWeek);

        // ---- Render month labels ----
        renderMonthLabels(startDate, weeks.length);
    }

    function renderMonthLabels(startDate, totalWeeks) {
        heatmapMonthLabels.innerHTML = '';

        const cellSize = 14; // matches CSS grid-auto-columns
        const gap = 2;       // matches CSS gap
        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        let lastMonth = -1;
        const current = new Date(startDate);

        for (let w = 0; w < totalWeeks; w++) {
            const month = current.getMonth();
            if (month !== lastMonth) {
                const label = document.createElement('span');
                label.className = 'heatmap-month-label';
                label.textContent = MONTHS[month];
                label.style.left = `${w * (cellSize + gap)}px`;
                heatmapMonthLabels.appendChild(label);
                lastMonth = month;
            }
            current.setDate(current.getDate() + 7);
        }
    }

    // ---- Tooltip ----
    function showTooltip(e) {
        const cell = e.target;
        const dateKey = cell.dataset.date;
        const sec = parseInt(cell.dataset.seconds, 10);
        const dateStr = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
        const durStr = sec > 0 ? formatDuration(sec) : 'No activity';

        heatmapTooltip.innerHTML = `<strong>${durStr}</strong> on ${dateStr}`;
        heatmapTooltip.classList.add('visible');

        // Position above the cell
        const cardRect = cell.closest('.heatmap-card').getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();
        heatmapTooltip.style.left = `${cellRect.left - cardRect.left + cellRect.width / 2 - heatmapTooltip.offsetWidth / 2}px`;
        heatmapTooltip.style.top = `${cellRect.top - cardRect.top - heatmapTooltip.offsetHeight - 8}px`;
    }

    function hideTooltip() {
        heatmapTooltip.classList.remove('visible');
    }

    // ============================================
    //  UTILITIES
    // ============================================
    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) return 'Today';
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }

    function formatDuration(totalSec) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        if (m > 0) return `${m}m`;
        return `${totalSec}s`;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showError(msg) {
        errorToast.textContent = msg;
        errorToast.classList.add('visible');
        setTimeout(() => errorToast.classList.remove('visible'), 4000);
    }
});
