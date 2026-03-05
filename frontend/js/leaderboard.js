/**
 * LockdIN — Leaderboard Page Logic
 * Fetches leaderboard by period, renders ranked entries, add friend.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const navAvatar = document.getElementById('navAvatar');
    const lbTabs = document.getElementById('lbTabs');
    const yourRankCard = document.getElementById('yourRankCard');
    const yourRankNumber = document.getElementById('yourRankNumber');
    const yourRankScore = document.getElementById('yourRankScore');
    const lbRankings = document.getElementById('lbRankings');
    const lbEmpty = document.getElementById('lbEmpty');
    const inviteCodeInput = document.getElementById('inviteCodeInput');
    const addFriendBtn = document.getElementById('addFriendBtn');
    const addFriendStatus = document.getElementById('addFriendStatus');
    const errorToast = document.getElementById('errorToast');

    let currentPeriod = 'daily';

    // Auth guard
    const session = await requireAuth();
    if (!session) return;
    const user = session.user;

    // Nav avatar
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
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

    loadingScreen.classList.add('hidden');

    // Load initial leaderboard
    await loadLeaderboard('daily');

    // Tab click handlers
    lbTabs.addEventListener('click', async (e) => {
        const tab = e.target.closest('.lb-tab');
        if (!tab || tab.classList.contains('active')) return;

        lbTabs.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPeriod = tab.dataset.period;
        await loadLeaderboard(currentPeriod);
    });

    // Add friend
    addFriendBtn.addEventListener('click', async () => {
        const value = inviteCodeInput.value.trim();
        if (!value) return;

        addFriendBtn.disabled = true;
        addFriendStatus.textContent = '';
        addFriendStatus.className = 'add-friend-status';

        try {
            const isEmail = value.includes('@');
            const body = isEmail ? { email: value } : { invite_code: value };
            await api.post('/friends/request', body);
            addFriendStatus.textContent = 'Friend request sent!';
            addFriendStatus.classList.add('success');
            inviteCodeInput.value = '';
        } catch (err) {
            addFriendStatus.textContent = err.message || 'Failed to send request';
            addFriendStatus.classList.add('error');
        } finally {
            addFriendBtn.disabled = false;
        }
    });

    inviteCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addFriendBtn.click();
    });

    // ---- Load leaderboard ----
    async function loadLeaderboard(period) {
        try {
            const data = await api.get(`/leaderboard/${period}`);

            if (!data || !data.entries || data.entries.length === 0) {
                lbRankings.innerHTML = '';
                lbRankings.appendChild(lbEmpty.cloneNode(true));
                yourRankCard.style.display = 'none';
                return;
            }

            // Your rank card
            if (data.your_rank) {
                yourRankCard.style.display = 'flex';
                yourRankNumber.textContent = `#${data.your_rank}`;
                const yourEntry = data.entries.find(e => e.user_id === user.id);
                yourRankScore.textContent = yourEntry ? `${yourEntry.total_score} pts` : '';
            } else {
                yourRankCard.style.display = 'none';
            }

            // Render entries
            lbRankings.innerHTML = '';
            const rankClasses = ['gold', 'silver', 'bronze'];

            data.entries.forEach((entry, i) => {
                const div = document.createElement('div');
                div.className = 'lb-entry';
                if (entry.user_id === user.id) div.classList.add('is-you');
                div.style.animationDelay = `${i * 0.05}s`;

                const avatarHtml = entry.avatar_url
                    ? `<img class="lb-entry-avatar" src="${entry.avatar_url}" alt="">`
                    : `<div class="lb-entry-avatar-ph">${(entry.display_name || '?').charAt(0)}</div>`;

                const duration = formatDuration(entry.total_seconds || 0);

                div.innerHTML = `
                    <span class="lb-entry-rank ${rankClasses[i] || ''}">${entry.rank || i + 1}</span>
                    ${avatarHtml}
                    <div class="lb-entry-info">
                        <div class="lb-entry-name">${escapeHtml(entry.display_name || 'Unknown')}${entry.user_id === user.id ? ' (You)' : ''}</div>
                        <div class="lb-entry-time">${duration} focused</div>
                    </div>
                    <span class="lb-entry-score">${entry.total_score}</span>
                `;
                lbRankings.appendChild(div);
            });
        } catch (err) {
            showError(err.message || 'Failed to load leaderboard');
        }
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

    function showError(msg) {
        errorToast.textContent = msg;
        errorToast.classList.add('visible');
        setTimeout(() => errorToast.classList.remove('visible'), 4000);
    }
});
