/**
 * Onboarding Flow Logic
 * Three-step flow: Terms & Conditions → Choose Buddy → Name Buddy
 * Requires: supabase-client.js, api.js loaded first.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ---- DOM References ----
    const loadingScreen = document.getElementById('loadingScreen');
    const stepTerms = document.getElementById('stepTerms');
    const stepBuddy = document.getElementById('stepBuddy');
    const stepNaming = document.getElementById('stepNaming');
    const acceptTermsBtn = document.getElementById('acceptTermsBtn');
    const avatarGrid = document.getElementById('avatarGrid');
    const buddyContinueBtn = document.getElementById('buddyContinueBtn');
    const namingAvatarPreview = document.getElementById('namingAvatarPreview');
    const buddyNameInput = document.getElementById('buddyNameInput');
    const charCount = document.getElementById('charCount');
    const confirmNameBtn = document.getElementById('confirmNameBtn');
    const errorToast = document.getElementById('errorToast');

    // ---- State ----
    const TOTAL_AVATARS = 15;
    const DEFAULT_MOOD_IMG = '07.png'; // 7th mood image as default preview
    let selectedAvatarIndex = null; // 1-based avatar index

    // ---- Auth Guard ----
    const session = await requireAuth();
    if (!session) return;

    // ---- Check if onboarding already completed ----
    try {
        const buddy = await api.get('/buddy/');
        // If buddy has been customized (not defaults), skip to dashboard
        if (buddy && (buddy.buddy_type !== 'cat' || buddy.buddy_name !== 'Buddy')) {
            window.location.href = '/dashboard.html';
            return;
        }
    } catch (err) {
        // 404 means no buddy yet (shouldn't happen with DB trigger, but handle it)
        if (err.message && !err.message.includes('404')) {
            console.warn('Could not check buddy status:', err.message);
        }
    }

    // ---- Initialize ----
    buildAvatarGrid();
    hideLoading();
    showStep(stepTerms);

    // ============================================
    //  STEP 1: Terms & Conditions
    // ============================================
    acceptTermsBtn.addEventListener('click', () => {
        transitionStep(stepTerms, stepBuddy);
    });

    // ============================================
    //  STEP 2: Choose Your Buddy
    // ============================================
    function buildAvatarGrid() {
        avatarGrid.innerHTML = '';

        for (let i = 1; i <= TOTAL_AVATARS; i++) {
            const item = document.createElement('div');
            item.className = 'avatar-item';
            item.dataset.index = i;

            item.innerHTML = `
                <div class="check-badge">
                    <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <div class="avatar-ring">
                    <img
                        class="avatar-img"
                        src="Avatars/Avatar ${i}/${DEFAULT_MOOD_IMG}"
                        alt="Buddy ${i}"
                        loading="lazy"
                    >
                </div>
                <span class="avatar-label">Buddy ${i}</span>
            `;

            item.addEventListener('click', () => selectAvatar(i, item));
            avatarGrid.appendChild(item);
        }
    }

    function selectAvatar(index, itemEl) {
        // Deselect previous
        const prev = avatarGrid.querySelector('.avatar-item.selected');
        if (prev) prev.classList.remove('selected');

        // Select new
        itemEl.classList.add('selected');
        selectedAvatarIndex = index;

        // Show continue button
        buddyContinueBtn.classList.add('visible');
    }

    buddyContinueBtn.addEventListener('click', () => {
        if (!selectedAvatarIndex) return;
        // Set the preview image in the naming step
        namingAvatarPreview.src = `Avatars/Avatar ${selectedAvatarIndex}/${DEFAULT_MOOD_IMG}`;
        transitionStep(stepBuddy, stepNaming);

        // Focus the input after transition
        setTimeout(() => {
            buddyNameInput.focus();
        }, 600);
    });

    // ============================================
    //  STEP 3: Name Your Buddy
    // ============================================
    buddyNameInput.addEventListener('input', () => {
        const len = buddyNameInput.value.trim().length;
        const raw = buddyNameInput.value.length;
        charCount.textContent = `${raw} / 30`;

        // Update char count color
        charCount.classList.remove('warn', 'full');
        if (raw >= 30) {
            charCount.classList.add('full');
        } else if (raw >= 25) {
            charCount.classList.add('warn');
        }

        // Enable/disable confirm button
        confirmNameBtn.disabled = len === 0;
    });

    // Allow Enter key to confirm
    buddyNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !confirmNameBtn.disabled) {
            confirmNameBtn.click();
        }
    });

    confirmNameBtn.addEventListener('click', async () => {
        const name = buddyNameInput.value.trim();
        if (!name || !selectedAvatarIndex) return;

        confirmNameBtn.disabled = true;
        confirmNameBtn.textContent = 'Saving...';

        try {
            // Save buddy choice to backend
            await api.put('/buddy/', {
                buddy_type: `avatar_${selectedAvatarIndex}`,
                buddy_name: name
            });

            // Success — redirect to dashboard
            window.location.href = '/dashboard.html';
        } catch (err) {
            console.error('Failed to save buddy:', err);
            showError('Something went wrong. Please try again.');
            confirmNameBtn.disabled = false;
            confirmNameBtn.textContent = 'Lock It In';
        }
    });

    // ============================================
    //  UTILITIES
    // ============================================
    function hideLoading() {
        loadingScreen.classList.add('hidden');
    }

    function showStep(step) {
        step.classList.add('active');
    }

    function transitionStep(current, next) {
        current.classList.remove('active');
        current.classList.add('exit-up');

        // Small delay for the exit animation, then bring in the next step
        setTimeout(() => {
            next.classList.add('active');
        }, 250);
    }

    function showError(message) {
        errorToast.textContent = message;
        errorToast.classList.add('visible');
        setTimeout(() => {
            errorToast.classList.remove('visible');
        }, 4000);
    }
});
