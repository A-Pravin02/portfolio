document.addEventListener('DOMContentLoaded', () => {

    // ── 1. Custom Cursor ─────────────────────────────────────
    const cursor    = document.getElementById('cursor');
    const cursorDot = document.getElementById('cursor-dot');

    if (window.matchMedia('(pointer: fine)').matches && cursor) {
        let cx = 0, cy = 0;  // cursor ring (lerped)
        let mx = 0, my = 0;  // actual mouse

        document.addEventListener('mousemove', e => {
            mx = e.clientX; my = e.clientY;
            // dot snaps instantly
            cursorDot.style.left = mx + 'px';
            cursorDot.style.top  = my + 'px';
        });

        // Lerp cursor ring for smooth follow
        (function loop() {
            cx += (mx - cx) * 0.15;
            cy += (my - cy) * 0.15;
            cursor.style.left = cx + 'px';
            cursor.style.top  = cy + 'px';
            requestAnimationFrame(loop);
        })();

        // Hover state on interactive elements
        const hoverEls = document.querySelectorAll('a, button, [tabindex], .project-row, .domain-tag');
        hoverEls.forEach(el => {
            el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
            el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
        });

        document.addEventListener('mousedown', () => document.body.classList.add('cursor-active'));
        document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-active'));
    }


    // ── 2. Nav scroll state ──────────────────────────────────
    const nav = document.getElementById('main-nav');
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });


    // ── 3. Mobile menu ───────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');

    hamburger.addEventListener('click', () => {
        const open = mobileNav.classList.toggle('open');
        hamburger.classList.toggle('open');
        hamburger.setAttribute('aria-expanded', open);
    });

    document.querySelectorAll('.mobile-nav a').forEach(a => {
        a.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            hamburger.classList.remove('open');
        });
    });


    // ── 4. Smooth scroll ─────────────────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const id = link.getAttribute('href');
            if (id === '#') return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const offset = nav.offsetHeight + 16;
            window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
        });
    });


    // ── 5. Scroll reveal (.js-reveal) ────────────────────────
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.js-reveal').forEach(el => revealObserver.observe(el));


    // ── 6. Hero headline line reveal ─────────────────────────
    const headline = document.querySelector('.hero-headline');
    if (headline) {
        setTimeout(() => headline.classList.add('active'), 100);
    }


    // ── 7. Project row — image parallax on mouse ─────────────
    document.querySelectorAll('.project-row').forEach(row => {
        const img = row.querySelector('.proj-image img');
        if (!img) return;

        row.addEventListener('mousemove', e => {
            const rect = row.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 10;
            const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 10;
            img.style.transform = `scale(1.06) translate(${x * 0.4}px, ${y * 0.4}px)`;
        });

        row.addEventListener('mouseleave', () => {
            img.style.transform = '';
        });
    });


    // ── 8. Domain tags staggered reveal ──────────────────────
    const domainTags = document.querySelectorAll('.domain-tag');
    domainTags.forEach((tag, i) => {
        tag.style.transitionDelay = `${i * 0.05}s`;
        tag.style.opacity = '0';
        tag.style.transform = 'translateY(8px)';
        tag.style.transition = 'opacity 0.4s ease, transform 0.4s ease, border-color 0.2s, color 0.2s';

        setTimeout(() => {
            tag.style.opacity = '1';
            tag.style.transform = 'translateY(0)';
        }, 800 + i * 60);
    });


    // ── 9. Footer email marquee on hover ─────────────────────
    const footerEmail = document.querySelector('.footer-email');
    if (footerEmail) {
        footerEmail.addEventListener('mouseenter', () => {
            footerEmail.style.letterSpacing = '-0.02em';
        });
        footerEmail.addEventListener('mouseleave', () => {
            footerEmail.style.letterSpacing = '-0.04em';
        });
    }


    // ── 10. Experience items — subtle hover lift ──────────────
    document.querySelectorAll('.exp-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.paddingLeft = '1rem';
            item.style.transition = 'padding-left 0.3s cubic-bezier(0.23,1,0.32,1)';
        });
        item.addEventListener('mouseleave', () => {
            item.style.paddingLeft = '0';
        });
    });

});
