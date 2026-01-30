// ========================================
// Mobile Navigation Toggle
// ========================================
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

// ========================================
// Terminal State Machine
// ========================================
const terminalOutput = document.getElementById('terminalOutput');
const terminalContainer = document.querySelector('.hero-terminal');
const heroCharacter = document.getElementById('heroCharacter');

const terminalLines = [
    { type: 'command', text: 'whoami' },
    { type: 'output', text: 'zerrius' },
    { type: 'command', text: 'skills --list' },
    { type: 'output', text: 'unity6, c#, java, python, content creation, terminal' },
    { type: 'command', text: 'status' },
    { type: 'output', text: 'shipping...' },
];

const poshLines = [
    '$ ls',
    'src  gradle  build.gradle  settings.gradle  README.md',
    '',
    '$ tree src/main -L 3',
    'java/com/zerrius/core/  resources/',
    '',
    '$ git status',
    'On branch main',
    'nothing to commit, working tree clean'
];

const typeSpeed = 50;          // ms per character
const linePause = 800;         // pause after each line
const commandPause = 400;      // pause before typing command (after $)
const loopDelay = 10000;       // pause before restarting
const hoverHoldMs = 2000;
const poshPauseMs = 350;

const terminalState = {
    taskId: 0,
    pendingSleeps: [],
    normalRunning: false,
    poshRunning: false,
    currentMode: 'normal',
    desiredMode: 'normal',
    isHoverRunning: false,
    pendingPoshToggle: false
};

function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createPrompt() {
    const span = document.createElement('span');
    span.className = 'terminal-prompt';
    span.textContent = '$';
    return span;
}

function createCursor() {
    const span = document.createElement('span');
    span.className = 'terminal-cursor';
    span.textContent = '_';
    return span;
}

function ensureCursor(line) {
    let cursor = line.querySelector('.terminal-cursor');
    if (!cursor) {
        cursor = createCursor();
        line.appendChild(cursor);
    }
    return cursor;
}

function removePendingSleep(id) {
    const index = terminalState.pendingSleeps.findIndex(item => item.id === id);
    if (index >= 0) terminalState.pendingSleeps.splice(index, 1);
}

function sleep(ms) {
    return new Promise(resolve => {
        const id = setTimeout(() => {
            removePendingSleep(id);
            resolve();
        }, ms);
        terminalState.pendingSleeps.push({ id, resolve });
    });
}

function clearPendingSleeps() {
    while (terminalState.pendingSleeps.length) {
        const { id, resolve } = terminalState.pendingSleeps.pop();
        clearTimeout(id);
        resolve();
    }
}

function nextTaskId() {
    terminalState.taskId += 1;
    return terminalState.taskId;
}

function isTaskActive(taskId) {
    return terminalState.taskId === taskId;
}

function stopAllPlayback() {
    terminalState.normalRunning = false;
    terminalState.poshRunning = false;
    nextTaskId();
    clearPendingSleeps();
    return terminalState.taskId;
}

function clearTerminal() {
    if (terminalOutput) terminalOutput.innerHTML = '';
}

function setPoshTheme(enabled) {
    if (terminalContainer) {
        terminalContainer.classList.toggle('terminal--posh', enabled);
    }
}

async function typeText(line, text, speed, taskId) {
    if (!terminalOutput || !line) return;
    if (prefersReducedMotion()) {
        line.appendChild(document.createTextNode(text));
        return;
    }

    const cursor = ensureCursor(line);
    cursor.textContent = '_';

    for (const char of text) {
        if (!isTaskActive(taskId)) return;
        cursor.textContent = char + '_';
        await sleep(speed);
        if (!isTaskActive(taskId)) return;
        cursor.textContent = '_';
        line.insertBefore(document.createTextNode(char), cursor);
    }
}

async function runNormalLoop(taskId) {
    const reduced = prefersReducedMotion();
    const commandDelay = reduced ? 0 : commandPause;
    const lineDelay = reduced ? 0 : linePause;
    const loopWait = reduced ? 0 : loopDelay;

    while (terminalState.normalRunning && isTaskActive(taskId)) {
        clearTerminal();

        for (const line of terminalLines) {
            if (!terminalState.normalRunning || !isTaskActive(taskId)) break;
            const p = document.createElement('p');
            terminalOutput.appendChild(p);

            if (line.type === 'command') {
                p.appendChild(createPrompt());
                p.appendChild(document.createTextNode(' '));
                if (!reduced) {
                    p.appendChild(createCursor());
                }

                await sleep(commandDelay);
                if (!terminalState.normalRunning || !isTaskActive(taskId)) break;

                if (reduced) {
                    p.appendChild(document.createTextNode(line.text));
                } else {
                    await typeText(p, line.text, typeSpeed, taskId);
                    const cursor = p.querySelector('.terminal-cursor');
                    if (cursor) cursor.remove();
                }
            } else {
                p.textContent = line.text;
            }

            await sleep(lineDelay);
        }

        if (!terminalState.normalRunning || !isTaskActive(taskId)) break;

        const finalLine = document.createElement('p');
        finalLine.appendChild(createPrompt());
        finalLine.appendChild(document.createTextNode(' '));
        finalLine.appendChild(createCursor());
        terminalOutput.appendChild(finalLine);

        await sleep(loopWait);
    }
}

function startNormalLoop() {
    if (!terminalOutput) return;
    const taskId = stopAllPlayback();
    terminalState.currentMode = 'normal';
    terminalState.desiredMode = 'normal';
    terminalState.normalRunning = true;
    setPoshTheme(false);
    runNormalLoop(taskId);
}

async function runPoshSequence(taskId) {
    const reduced = prefersReducedMotion();
    const loopWait = reduced ? 0 : loopDelay;

    while (terminalState.poshRunning && isTaskActive(taskId)) {
        clearTerminal();

        for (const line of poshLines) {
            if (!terminalState.poshRunning || !isTaskActive(taskId)) return;
            const p = document.createElement('p');
            terminalOutput.appendChild(p);

            if (line.length === 0) {
                await sleep(reduced ? 0 : poshPauseMs);
                continue;
            }

            if (reduced) {
                p.textContent = line;
            } else {
                p.appendChild(createCursor());
                await typeText(p, line, typeSpeed, taskId);
                const cursor = p.querySelector('.terminal-cursor');
                if (cursor) cursor.remove();
            }

            await sleep(reduced ? 0 : poshPauseMs);
        }

        if (!terminalState.poshRunning || !isTaskActive(taskId)) return;
        await sleep(loopWait);
    }
}

function startPoshSequence() {
    if (!terminalOutput) return;
    const taskId = stopAllPlayback();
    terminalState.currentMode = 'posh';
    terminalState.desiredMode = 'posh';
    terminalState.poshRunning = true;
    setPoshTheme(true);
    runPoshSequence(taskId);
}

async function runHoverMessage() {
    if (terminalState.isHoverRunning || !terminalOutput) return;
    terminalState.isHoverRunning = true;
    const previousMode = terminalState.desiredMode;
    const taskId = stopAllPlayback();

    clearTerminal();

    const p = document.createElement('p');
    terminalOutput.appendChild(p);
    if (!prefersReducedMotion()) {
        p.appendChild(createCursor());
    }
    await typeText(p, 'Hey!! Watch where you point that thing..', typeSpeed, taskId);
    const cursor = p.querySelector('.terminal-cursor');
    if (cursor) cursor.remove();

    await sleep(hoverHoldMs);
    if (!isTaskActive(taskId)) return;

    terminalState.isHoverRunning = false;

    if (terminalState.pendingPoshToggle) {
        terminalState.pendingPoshToggle = false;
        if (terminalState.desiredMode === 'posh') {
            startPoshSequence();
        } else {
            startNormalLoop();
        }
        return;
    }

    if (previousMode === 'posh') {
        startPoshSequence();
    } else {
        startNormalLoop();
    }
}

if (heroCharacter) {
    heroCharacter.addEventListener('mouseenter', () => {
        runHoverMessage();
    });

    heroCharacter.addEventListener('click', () => {
        const nextMode = terminalState.desiredMode === 'normal' ? 'posh' : 'normal';
        terminalState.desiredMode = nextMode;
        setPoshTheme(nextMode === 'posh');

        if (terminalState.isHoverRunning) {
            terminalState.pendingPoshToggle = true;
            return;
        }

        if (nextMode === 'posh') {
            startPoshSequence();
        } else {
            startNormalLoop();
        }
    });
}

// ========================================
// Scroll Reveal with IntersectionObserver
// ========================================
function initScrollReveal() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        // If reduced motion is preferred, make all elements visible immediately
        document.querySelectorAll('.reveal').forEach(el => {
            el.classList.add('visible');
        });
        return;
    }

    const revealElements = document.querySelectorAll('.reveal');

    if (revealElements.length === 0) return;

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Stop observing once revealed
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
}

// ========================================
// Add reveal classes to elements
// ========================================
function addRevealClasses() {
    // Section headings
    document.querySelectorAll('section h2').forEach(el => {
        el.classList.add('reveal');
    });

    // Project cards
    document.querySelectorAll('.project-card').forEach(el => {
        el.classList.add('reveal');
    });

    // Log entries
    document.querySelectorAll('.log-entry').forEach(el => {
        el.classList.add('reveal');
    });

    // Skill categories
    document.querySelectorAll('.skill-category').forEach(el => {
        el.classList.add('reveal');
    });

    // About content
    document.querySelectorAll('.about-content').forEach(el => {
        el.classList.add('reveal');
    });

    // Contact content
    document.querySelectorAll('.contact-content').forEach(el => {
        el.classList.add('reveal');
    });
}

// ========================================
// Parallax Background Effect
// ========================================
function initParallax() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const layerGrid = document.querySelector('.site-bg .layer-grid');
    const layerGlow = document.querySelector('.site-bg .layer-glow');
    const layerDots = document.querySelector('.site-bg .layer-dots');

    if (!layerGrid && !layerGlow && !layerDots) return;

    // Parallax multipliers (subtle movement)
    const gridSpeed = 0.05;
    const glowSpeed = 0.08;
    const dotsSpeed = 0.03;

    let ticking = false;

    function updateParallax() {
        const scrollY = window.scrollY;

        if (layerGrid) {
            layerGrid.style.transform = `translateY(${scrollY * gridSpeed}px)`;
        }

        if (layerGlow) {
            layerGlow.style.transform = `translateY(${scrollY * glowSpeed}px)`;
        }

        if (layerDots) {
            layerDots.style.transform = `translateY(${scrollY * dotsSpeed}px)`;
        }

        ticking = false;
    }

    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Initial position
    updateParallax();
}

// ========================================
// About Section Cursor Trail (particles)
// ========================================
function initAboutTrail() {
    const card = document.querySelector('.aboutGlassCard');
    if (!card) return;

    const canvas = card.querySelector('.about-trail');
    if (!canvas) return;

    if (prefersReducedMotion()) {
        canvas.style.display = 'none';
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (!accent) accent = '#00b4ff';

    const particles = [];
    let running = false;
    let lastTime = 0;
    let isActive = false;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let lastPoint = null;

    const minDistance = 2.5;

    function resizeCanvas() {
        const rect = card.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(card);
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function addParticle(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.04 + Math.random() * 0.06;
        const size = 2.2 + Math.random() * 1.4;
        const life = 800 + Math.random() * 500;
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.02,
            size,
            life,
            maxLife: life
        });

        if (particles.length > 220) {
            particles.splice(0, particles.length - 220);
        }
    }

    function spawnTrail(x, y) {
        addParticle(x + (Math.random() * 8 - 4), y + (Math.random() * 8 - 4));
        addParticle(x + (Math.random() * 8 - 4), y + (Math.random() * 8 - 4));
        addParticle(x + (Math.random() * 8 - 4), y + (Math.random() * 8 - 4));
    }

    function tick(now) {
        const dt = now - lastTime;
        lastTime = now;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = accent;

        for (let i = particles.length - 1; i >= 0; i -= 1) {
            const p = particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            const alpha = (p.life / p.maxLife) * 0.55;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1;

        if (particles.length) {
            requestAnimationFrame(tick);
        } else {
            running = false;
        }
    }

    function ensureRunning() {
        if (running) return;
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(tick);
    }

    card.addEventListener('pointerenter', () => {
        isActive = true;
    });

    card.addEventListener('pointerleave', () => {
        isActive = false;
    });

    card.addEventListener('pointermove', (event) => {
        if (!isActive || event.pointerType === 'touch') return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (lastPoint) {
            const dx = x - lastPoint.x;
            const dy = y - lastPoint.y;
            if (Math.hypot(dx, dy) < minDistance) return;
        }
        lastPoint = { x, y };
        spawnTrail(x, y);
        ensureRunning();
    });
}

// ========================================
// Initialize on DOM Ready
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    // Ensure NORMAL mode is active on first load
    terminalState.currentMode = 'normal';
    terminalState.desiredMode = 'normal';
    terminalState.isHoverRunning = false;
    terminalState.pendingPoshToggle = false;
    startNormalLoop();
    addRevealClasses();
    initScrollReveal();
    initParallax();
    initAboutTrail();
});

function setHeaderHeight() {
    const header = document.querySelector('header');
    if (!header) return;
    document.documentElement.style.setProperty('--headerHeight', `${header.offsetHeight}px`);
    document.documentElement.style.setProperty('--heroOffset', '20px');
}

window.addEventListener('load', setHeaderHeight);
window.addEventListener('resize', setHeaderHeight);
