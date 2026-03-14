/**
 * LockdIN — Profile Page Logic
 * User info, buddy display with mood gallery, friends management, sign out.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const loadingScreen = document.getElementById('loadingScreen');
    const navAvatar = document.getElementById('navAvatar');
    const profAvatar = document.getElementById('profAvatar');
    const profName = document.getElementById('profName');
    const profEmail = document.getElementById('profEmail');
    const profInviteCode = document.getElementById('profInviteCode');
    const copyInviteBtn = document.getElementById('copyInviteBtn');
    const profBuddyImg = document.getElementById('profBuddyImg');
    const profBuddyEmojiFallback = document.getElementById('profBuddyEmojiFallback');
    const profBuddyMoodBadge = document.getElementById('profBuddyMoodBadge');
    const profBuddyName = document.getElementById('profBuddyName');
    const profBuddyMood = document.getElementById('profBuddyMood');
    const profBuddyStreak = document.getElementById('profBuddyStreak');
    const profMoodGallery = document.getElementById('profMoodGallery');
    const profFriendsList = document.getElementById('profFriendsList');
    const friendCount = document.getElementById('friendCount');
    const profPending = document.getElementById('profPending');
    const profPendingList = document.getElementById('profPendingList');
    const signOutBtn = document.getElementById('signOutBtn');
    const errorToast = document.getElementById('errorToast');

    // Mood config (same as dashboard)
    // Mood config — must stay identical to dashboard.js MOOD_TABLE
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
    const getMoodInfo = (level) => MOOD_TABLE[clamp(level, 1, 10) - 1];

    // Auth
    const session = await requireAuth();
    if (!session) return;
    const user = session.user;

    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const email = user.email || '';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

    // Nav avatar
    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl; img.alt = displayName; img.className = 'dash-user-avatar';
        img.onerror = () => img.remove();
        navAvatar.replaceWith(img);
    } else {
        navAvatar.textContent = displayName.charAt(0).toUpperCase();
    }

    // Profile user info
    profName.textContent = displayName;
    profEmail.textContent = email;
    if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = displayName;
        profAvatar.textContent = '';
        profAvatar.appendChild(img);
    } else {
        profAvatar.textContent = displayName.charAt(0).toUpperCase();
    }

    loadingScreen.classList.add('hidden');

    // Load data
    await Promise.allSettled([
        loadProfile(),
        loadBuddy(),
        loadFriends(),
        loadPendingRequests(),
    ]);

    // ---- Load profile (for invite code) ----
    async function loadProfile() {
        try {
            const profile = await api.get('/auth/me');
            if (profile && profile.invite_code) {
                profInviteCode.textContent = profile.invite_code;
            }
        } catch {
            // Non-critical
        }
    }

    // ---- Copy invite code ----
    copyInviteBtn.addEventListener('click', async () => {
        const code = profInviteCode.textContent;
        if (!code || code === '—') return;
        try {
            await navigator.clipboard.writeText(code);
            copyInviteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            setTimeout(() => {
                copyInviteBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
            }, 2000);
        } catch {
            showError('Failed to copy');
        }
    });

    // ---- Load buddy ----

    async function loadBuddy() {
        try {
            const buddy = await api.get('/buddy/');
            if (!buddy) return;

            profBuddyName.textContent = buddy.buddy_name || 'Buddy';
            const avatarNum = extractAvatarNumber(buddy.buddy_type);
            const moodLevel = clamp(buddy.mood_level ?? 5, 1, 10);
            const moodInfo = getMoodInfo(moodLevel);

            if (avatarNum) {
                const imgPath = `Avatars/Avatar ${avatarNum}/${moodInfo.file}`;
                profBuddyEmojiFallback.style.display = 'none';
                profBuddyMoodBadge.textContent = moodInfo.emoji;
                profBuddyMoodBadge.style.display = '';
                cropTransparent(imgPath).then(croppedSrc => {
                    profBuddyImg.src = croppedSrc;
                    profBuddyImg.style.display = '';
                }).catch(() => {
                    profBuddyImg.style.display = 'none';
                    profBuddyEmojiFallback.style.display = '';
                    profBuddyEmojiFallback.textContent = moodInfo.emoji;
                    profBuddyMoodBadge.style.display = 'none';
                });
            } else {
                profBuddyEmojiFallback.textContent = moodInfo.emoji;
                profBuddyEmojiFallback.style.display = '';
                profBuddyMoodBadge.style.display = 'none';
            }

            profBuddyMood.textContent = `${moodInfo.text} ${moodInfo.emoji}`;
            profBuddyStreak.textContent = `Streak: ${buddy.current_streak || 0} days`;

            // Build mood gallery
            buildMoodGallery(avatarNum, moodLevel);
        } catch {
            // Leave defaults
        }
    }

    function buildMoodGallery(avatarNum, currentMood) {
        profMoodGallery.innerHTML = '';
        if (!avatarNum) return;

        for (let m = 1; m <= 10; m++) {
            const file = String(m).padStart(2, '0') + '.png';
            const img = document.createElement('img');
            img.className = 'prof-mood-thumb';
            img.alt = MOOD_TABLE[m - 1]?.text || `Mood ${m}`;
            img.title = `Mood ${m}: ${MOOD_TABLE[m - 1]?.text || ''}`;
            if (m === currentMood) img.classList.add('active');
            profMoodGallery.appendChild(img);

            const src = `Avatars/Avatar ${avatarNum}/${file}`;
            cropTransparent(src).then(cropped => { img.src = cropped; }).catch(() => { img.src = src; });
        }
    }

    // ---- Load friends ----
    async function loadFriends() {
        try {
            const friends = await api.get('/friends/');
            if (!friends || friends.length === 0) return;

            friendCount.textContent = friends.length;
            profFriendsList.innerHTML = '';

            friends.forEach(f => {
                const div = document.createElement('div');
                div.className = 'prof-friend-item';

                const name = f.friend_name || 'Unknown';
                const avatar = f.friend_avatar;
                const avatarHtml = avatar
                    ? `<img class="prof-friend-avatar" src="${avatar}" alt="">`
                    : `<div class="prof-friend-avatar-ph">${name.charAt(0)}</div>`;

                div.innerHTML = `
                    ${avatarHtml}
                    <span class="prof-friend-name">${escapeHtml(name)}</span>
                    <button class="prof-friend-remove" data-id="${f.id}">Remove</button>
                `;
                profFriendsList.appendChild(div);
            });

            // Remove handlers
            profFriendsList.addEventListener('click', async (e) => {
                const btn = e.target.closest('.prof-friend-remove');
                if (!btn) return;
                const fid = btn.dataset.id;
                try {
                    await api.delete(`/friends/${fid}`);
                    btn.closest('.prof-friend-item').remove();
                    friendCount.textContent = profFriendsList.children.length;
                } catch (err) {
                    showError(err.message || 'Failed to remove');
                }
            });
        } catch {
            // Leave empty
        }
    }

    // ---- Load pending requests ----
    async function loadPendingRequests() {
        try {
            const pending = await api.get('/friends/pending');
            if (!pending || pending.length === 0) return;

            profPending.style.display = 'block';
            profPendingList.innerHTML = '';

            pending.forEach(p => {
                const div = document.createElement('div');
                div.className = 'prof-pending-item';
                const name = p.friend_name || 'Someone';

                div.innerHTML = `
                    <span class="prof-pending-name">${escapeHtml(name)} wants to be your friend</span>
                    <div class="prof-pending-actions">
                        <button class="prof-accept-btn" data-id="${p.id}">Accept</button>
                        <button class="prof-reject-btn" data-id="${p.id}">Reject</button>
                    </div>
                `;
                profPendingList.appendChild(div);
            });

            // Action handlers
            profPendingList.addEventListener('click', async (e) => {
                const accept = e.target.closest('.prof-accept-btn');
                const reject = e.target.closest('.prof-reject-btn');
                const btn = accept || reject;
                if (!btn) return;
                const fid = btn.dataset.id;
                const action = accept ? 'accepted' : 'reject';

                try {
                    await api.put(`/friends/${fid}`, { action });
                    btn.closest('.prof-pending-item').remove();
                    if (!profPendingList.children.length) profPending.style.display = 'none';
                    if (accept) loadFriends(); // refresh friends list
                } catch (err) {
                    showError(err.message || 'Failed');
                }
            });
        } catch {
            // No pending
        }
    }

    // ---- Sign out ----
    signOutBtn.addEventListener('click', async () => {
        signOutBtn.disabled = true;
        signOutBtn.textContent = 'Signing out...';
        try {
            await api.post('/auth/logout').catch(() => { });
        } catch { /* ignore */ }
        await signOut();
    });

    onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') window.location.href = '/login.html';
    });

    // ---- Utilities ----
    function extractAvatarNumber(buddyType) {
        if (!buddyType) return null;
        const match = buddyType.match(/avatar_(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

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
