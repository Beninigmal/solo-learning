const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
    const isActive = navLinks.classList.toggle('active');
    navToggle.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isActive);
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

const navbar = document.querySelector('.navbar');
let ticking = false;

function updateNavbar() {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
    }
});

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    counters.forEach(counter => {
        if (counter.dataset.animated) return;
        counter.dataset.animated = 'true';
        const target = parseInt(counter.getAttribute('data-target'));
        const duration = 2000;
        const startTime = performance.now();

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            counter.textContent = Math.floor(eased * target);
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                counter.textContent = target;
            }
        }
        requestAnimationFrame(updateCounter);
    });
}

const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            if (entry.target.classList.contains('hero-stats')) {
                animateCounters();
            }
        }
    });
}, observerOptions);

document.querySelectorAll('.feature-card, .role-card, .artifact-card, .tech-card, .hero-stats').forEach(el => {
    observer.observe(el);
});

let parallaxTicking = false;
window.addEventListener('scroll', () => {
    if (!parallaxTicking) {
        requestAnimationFrame(() => {
            const scrolled = window.pageYOffset;
            document.querySelectorAll('.particle').forEach((particle, index) => {
                particle.style.transform = `translateY(${scrolled * (0.3 + index * 0.08)}px)`;
            });
            parallaxTicking = false;
        });
        parallaxTicking = true;
    }
});

const tagline = document.querySelector('.hero-tagline');
if (tagline) {
    const text = tagline.getAttribute('data-text') || tagline.textContent;
    tagline.textContent = '';
    tagline.classList.add('typewriter-cursor');
    let i = 0;
    function typeWriter() {
        if (i < text.length) {
            tagline.textContent += text.charAt(i);
            i++;
            setTimeout(typeWriter, 45);
        } else {
            tagline.classList.remove('typewriter-cursor');
        }
    }
    setTimeout(typeWriter, 800);
}

const hero = document.querySelector('.hero');
const heroGlow = document.querySelector('.hero-glow');
if (hero && heroGlow) {
    hero.addEventListener('mousemove', (e) => {
        const rect = hero.getBoundingClientRect();
        hero.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
        hero.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
}

const contactForm = document.querySelector('.contact-form');
const formStatus = document.querySelector('.form-status');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
        formStatus.textContent = '';
        formStatus.className = 'form-status';
        try {
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            });
            if (response.ok) {
                formStatus.textContent = 'Mensagem enviada com sucesso!';
                formStatus.classList.add('success');
                contactForm.reset();
            } else {
                throw new Error('Erro no envio');
            }
        } catch {
            formStatus.textContent = 'Erro ao enviar. Tente novamente.';
            formStatus.classList.add('error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

document.getElementById('footer-year').textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        Array.from(heroContent.children).forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 300 + index * 150);
        });
    }
});