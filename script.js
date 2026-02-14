/* ===========================
   LockdIN — Landing Page Interactions
=========================== */

document.addEventListener('DOMContentLoaded', () => {

    // ---------- NAVBAR SCROLL EFFECT ----------
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    const handleNavScroll = () => {
        const currentScroll = window.scrollY;
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    };

    window.addEventListener('scroll', handleNavScroll, { passive: true });

    // ---------- MOBILE MENU TOGGLE ----------
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('open');
            // Also toggle nav-actions for mobile
            const navActions = document.querySelector('.nav-actions');
            if (navActions) navActions.classList.toggle('active');
        });
    }

    // ---------- SMOOTH SCROLL FOR NAV LINKS ----------
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#') return;
            e.preventDefault();
            const target = document.querySelector(targetId);
            if (target) {
                // Close mobile menu if open
                navLinks.classList.remove('active');
                const navActions = document.querySelector('.nav-actions');
                if (navActions) navActions.classList.remove('active');
                hamburger.classList.remove('open');

                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ---------- SCROLL-TRIGGERED REVEAL ----------
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    // Add staggered delays to step cards and feature cards
    document.querySelectorAll('.steps-grid .reveal').forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.1}s`;
    });

    document.querySelectorAll('.features-grid .feature-card').forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.08}s`;
    });

    document.querySelectorAll('.science-grid .science-card').forEach((el, i) => {
        el.style.transitionDelay = `${i * 0.1}s`;
    });

    // ---------- HERO TIMER ANIMATION ----------
    const heroTimer = document.getElementById('heroTimer');
    if (heroTimer) {
        let seconds = 9257; // Start at 02:34:17

        const formatTime = (totalSeconds) => {
            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const s = totalSeconds % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        };

        setInterval(() => {
            seconds++;
            heroTimer.textContent = formatTime(seconds);
        }, 1000);
    }

    // ---------- SECTION HEADER REVEAL ----------
    const sectionHeaders = document.querySelectorAll('.section-header');
    const headerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                headerObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    sectionHeaders.forEach(header => {
        header.style.opacity = '0';
        header.style.transform = 'translateY(30px)';
        header.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        headerObserver.observe(header);
    });

    // ---------- BUDDY MOOD CYCLING ANIMATION ----------
    const buddyCards = document.querySelectorAll('.buddy-card');
    if (buddyCards.length > 0) {
        let currentMood = 2; // Start highlighting the happy one
        const cycleInterval = 3000;

        setInterval(() => {
            buddyCards.forEach(card => {
                card.classList.remove('active-mood');
                const frame = card.querySelector('.buddy-avatar-frame');
                if (frame) frame.classList.remove('glow');
            });

            currentMood = (currentMood + 1) % buddyCards.length;
            buddyCards[currentMood].classList.add('active-mood');
            const frame = buddyCards[currentMood].querySelector('.buddy-avatar-frame');
            if (frame) frame.classList.add('glow');
        }, cycleInterval);
    }

    // ---------- STREAK DAY ANIMATION ----------
    const streakDays = document.querySelectorAll('.streak-day');
    const streakObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                streakDays.forEach((day, i) => {
                    setTimeout(() => {
                        day.style.transform = 'scale(1)';
                        day.style.opacity = '1';
                    }, i * 100);
                });
                streakObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    streakDays.forEach(day => {
        day.style.transform = 'scale(0.8)';
        day.style.opacity = '0';
        day.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    });

    const streakContainer = document.querySelector('.streak-demo');
    if (streakContainer) {
        streakObserver.observe(streakContainer);
    }

    // ---------- PARALLAX ON HERO ORBS ----------
    const orbs = document.querySelectorAll('.hero-bg-orbs .orb');
    
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 2;
        const y = (e.clientY / window.innerHeight - 0.5) * 2;

        orbs.forEach((orb, i) => {
            const speed = (i + 1) * 8;
            orb.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    }, { passive: true });

    // ---------- DASHBOARD MOCKUP TILT EFFECT ----------
    const mockup = document.querySelector('.dashboard-mockup');
    const heroVisual = document.querySelector('.hero-visual');

    if (mockup && heroVisual) {
        heroVisual.addEventListener('mousemove', (e) => {
            const rect = heroVisual.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;

            mockup.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
        });

        heroVisual.addEventListener('mouseleave', () => {
            mockup.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
            mockup.style.transition = 'transform 0.5s ease-out';
        });

        heroVisual.addEventListener('mouseenter', () => {
            mockup.style.transition = 'transform 0.1s ease-out';
        });
    }

    // ---------- CTA BUTTON RIPPLE EFFECT ----------
    document.querySelectorAll('.btn-primary, .btn-xl').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('btn-ripple');
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });

    // ---------- TYPED EFFECT FOR HERO BADGE ---------- 
    // Subtle status rotation in the badge
    const badge = document.querySelector('.hero-badge');
    if (badge) {
        const texts = [
            'Built for students who refuse to waste time',
            'Your accountability starts here',
            'Track, compete, and grow together'
        ];
        let textIndex = 0;

        setInterval(() => {
            textIndex = (textIndex + 1) % texts.length;
            badge.style.opacity = '0';
            badge.style.transform = 'translateY(-5px)';
            
            setTimeout(() => {
                // Keep the pulse dot, change only text
                const dot = badge.querySelector('.pulse-dot');
                badge.textContent = '';
                badge.appendChild(dot);
                badge.appendChild(document.createTextNode(' ' + texts[textIndex]));
                badge.style.opacity = '1';
                badge.style.transform = 'translateY(0)';
            }, 300);
        }, 4000);

        badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    }
});
