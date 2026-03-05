/**
 * フリップエスケイプ 紹介ページ
 * 物理演算・星空・宇宙船・ジェットパック人間・フリックインタラクション
 * 全処理を1ファイルに集約
 */

// ============================================================
//  メンバーデータ（テキスト参照：後で差し替え）
// ============================================================
const CREW_DATA = [
    { name: '中野陽太', role: 'プログラマー', title: '生産ラインにパセリにのせる人', quote: '手触りを楽しんでください', work: 'ステージデータ読み込み、サウンドシステム、工場長の補助、モデル読み込み' },
    { name: '亀多彩日', role: 'プログラマー', title: '声無し清掃員', quote: '全クリしたら自慢しに来てね。', work: 'タイトル　ステージ床' },
    { name: '立山悠朔', role: 'プログラマー', title: '柴犬星人', quote: 'クリアできるかな', work: 'ステージセレクト' },
    { name: '飯島英菜', role: 'プログラマー', title: 'ゾンビ社員', quote: '最終ステージまで行けるかな(    ◜ω◝   )', work: 'エフェクトシステム、ガイド点、フェード、加速板' },
    { name: '諸橋優太', role: 'プログラマー', title: '（情報なし）', quote: '（情報なし）', work: '（情報なし）' },
    { name: '中井煌士郎', role: 'プランナー', title: '派遣社員', quote: 'むずいステージ、とても面白いステージ全て私の責任です', work: 'レベルデザイン' },
    { name: '熊 彩花', role: 'リードデザイナー', title: 'デザイナー', quote: '(・∀・)ノ', work: 'UI、スチル、キャラクター、床、障害物など テクスチャ （一部はモデリングも）' },
    { name: '野月飛佑', role: 'デザイナー', title: '平社員', quote: '全クリ目指してがんばって！', work: '3Dモデリング（キャラクター、ジェットパック、その他オブジェクト9種）、2Dテクスチャ（その他オブジェクト9種）、スキニング、リギング、モーション全般、エフェクト全般、宇宙ステーション組み立て、デザインまとめの共有、監修、アップロードされたデータの統合' },
    { name: '上手涼太郎', role: 'プログラマー', title: '社員', quote: '頑張りましょう', work: 'タイマー、一部UI' },
    { name: '山内陽', role: 'リードプログラマー', title: '工場長', quote: 'いい感じでしょ', work: '基盤　応用　その他すべて' },
    { name: '北畑羽琉', role: 'デザイナー', title: 'デザイナー', quote: '楽しんでくだせい', work: '障害物 加速版 テクスチャ（1部）' },
    { name: '河野託海', role: 'プランナー', title: 'リーダー', quote: '頑張ります！', work: '草案、企画、管理、レベルデザイン、いじられ' },
    { name: '西野遥音', role: 'ミュージック', title: '', quote: '', work: 'SE' },
    { name: '平松苑貴', role: 'ミュージック', title: '', quote: '', work: 'BGM' },
];

// ============================================================
//  定数
// ============================================================
const STAR_COUNT = 200;
const NEBULA_COUNT = 5;
const JETPACK_COUNT = 3;
const CARD_W = 140;
const CARD_H = 80;
const FRICTION = 0.995;     // 宇宙なので極めて低い摩擦
const BOUNCE_DAMPING = 0.8;
const FLICK_MULTIPLIER = 12;
const EXPLOSION_PARTICLES = 40;
const BLACKHOLE_RADIUS = 120;
const BLACKHOLE_STRENGTH = 0.8;

// ============================================================
//  グローバル状態
// ============================================================
let W, H;
let spaceCanvas, spaceCtx;
let fxCanvas, fxCtx;
let stars = [];
let nebulae = [];
let currentScreen = 'screen-landing';
let cards = [];           // CREW画面の物理カード
let jetpackGuys = [];     // ジェットパック人間
let spaceship = null;     // 宇宙船
let particles = [];       // 汎用パーティクル
let explosions = [];      // 爆発
let blackholes = [];      // ブラックホール
let dragState = null;     // ドラッグ中の状態
let longPressTimer = null;
let animFrameId = null;

// 宇宙船操縦用
let shipTargetX = null;
let shipTargetY = null;

// ============================================================
//  初期化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    spaceCanvas = document.getElementById('space-canvas');
    spaceCtx = spaceCanvas.getContext('2d');
    fxCanvas = document.getElementById('fx-canvas');
    fxCtx = fxCanvas.getContext('2d');

    resize();
    window.addEventListener('resize', resize);

    initStars();
    initNebulae();
    initSpaceship();
    initJetpackGuys();
    initCrewCards();
    bindScreenEvents();
    bindInteractionEvents();

    loop();
});

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    spaceCanvas.width = W;
    spaceCanvas.height = H;
    fxCanvas.width = W;
    fxCanvas.height = H;
}

// ============================================================
//  星空
// ============================================================
function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * W,
            y: Math.random() * H,
            size: Math.random() * 2 + 0.3,
            speed: Math.random() * 0.3 + 0.05,
            brightness: Math.random(),
            twinkleSpeed: Math.random() * 0.02 + 0.005,
            twinklePhase: Math.random() * Math.PI * 2,
        });
    }
}

function initNebulae() {
    nebulae = [];
    const colors = [
        'rgba(100, 0, 200, 0.04)',
        'rgba(0, 100, 200, 0.03)',
        'rgba(200, 0, 100, 0.03)',
        'rgba(0, 200, 150, 0.025)',
        'rgba(150, 100, 0, 0.02)',
    ];
    for (let i = 0; i < NEBULA_COUNT; i++) {
        nebulae.push({
            x: Math.random() * W,
            y: Math.random() * H,
            r: Math.random() * 200 + 100,
            color: colors[i % colors.length],
            drift: (Math.random() - 0.5) * 0.2,
        });
    }
}

function drawSpace(t) {
    spaceCtx.fillStyle = '#000008';
    spaceCtx.fillRect(0, 0, W, H);

    // 星雲
    for (const n of nebulae) {
        n.x += n.drift;
        if (n.x > W + n.r) n.x = -n.r;
        if (n.x < -n.r) n.x = W + n.r;
        const grad = spaceCtx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'transparent');
        spaceCtx.fillStyle = grad;
        spaceCtx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
    }

    // 星
    for (const s of stars) {
        s.twinklePhase += s.twinkleSpeed;
        const alpha = 0.3 + 0.7 * ((Math.sin(s.twinklePhase) + 1) / 2);
        s.y += s.speed;
        if (s.y > H + 5) {
            s.y = -5;
            s.x = Math.random() * W;
        }
        spaceCtx.beginPath();
        spaceCtx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        spaceCtx.fillStyle = `rgba(200, 220, 255, ${alpha * s.brightness})`;
        spaceCtx.fill();

        // 大きい星はグロウ
        if (s.size > 1.5) {
            spaceCtx.beginPath();
            spaceCtx.arc(s.x, s.y, s.size * 3, 0, Math.PI * 2);
            spaceCtx.fillStyle = `rgba(150, 200, 255, ${alpha * 0.08})`;
            spaceCtx.fill();
        }
    }
}

// ============================================================
//  宇宙船
// ============================================================
function initSpaceship() {
    spaceship = {
        x: W * 0.5,
        y: H * 0.3,
        vx: 0.5,
        vy: 0.3,
        angle: 0,
        size: 18,
        trail: [],
    };
}

function updateSpaceship() {
    const s = spaceship;
    if (!s) return;

    if (shipTargetX !== null) {
        // タッチ操縦モード
        const dx = shipTargetX - s.x;
        const dy = shipTargetY - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
            s.angle = Math.atan2(dy, dx);
            s.vx += Math.cos(s.angle) * 0.3;
            s.vy += Math.sin(s.angle) * 0.3;
        }
    } else {
        // 自律飛行
        s.angle += (Math.random() - 0.5) * 0.05;
        s.vx += Math.cos(s.angle) * 0.05;
        s.vy += Math.sin(s.angle) * 0.05;
    }

    const maxSpeed = 4;
    const speed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
    if (speed > maxSpeed) {
        s.vx = (s.vx / speed) * maxSpeed;
        s.vy = (s.vy / speed) * maxSpeed;
    }

    s.x += s.vx;
    s.y += s.vy;

    // 画面端ワープ
    if (s.x < -30) s.x = W + 30;
    if (s.x > W + 30) s.x = -30;
    if (s.y < -30) s.y = H + 30;
    if (s.y > H + 30) s.y = -30;

    // トレイル
    s.trail.push({ x: s.x, y: s.y, life: 1 });
    if (s.trail.length > 25) s.trail.shift();
}

function drawSpaceship(ctx) {
    const s = spaceship;
    if (!s) return;

    // エンジン炎トレイル
    for (let i = 0; i < s.trail.length; i++) {
        const t = s.trail[i];
        t.life -= 0.04;
        if (t.life <= 0) continue;
        const r = s.size * 0.6 * t.life;
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        const hue = 20 + (1 - t.life) * 30;
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${t.life * 0.5})`;
        ctx.fill();
    }

    // 宇宙船本体
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);

    // 船体
    ctx.beginPath();
    ctx.moveTo(s.size, 0);
    ctx.lineTo(-s.size * 0.7, -s.size * 0.5);
    ctx.lineTo(-s.size * 0.4, 0);
    ctx.lineTo(-s.size * 0.7, s.size * 0.5);
    ctx.closePath();
    ctx.fillStyle = '#d0e0ff';
    ctx.fill();
    ctx.strokeStyle = '#4af';
    ctx.lineWidth = 1;
    ctx.stroke();

    // コックピット
    ctx.beginPath();
    ctx.arc(s.size * 0.2, 0, s.size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0ff';
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    // エンジンの炎
    const flameLen = s.size * (0.6 + Math.random() * 0.4);
    ctx.beginPath();
    ctx.moveTo(-s.size * 0.4, -s.size * 0.2);
    ctx.lineTo(-s.size * 0.4 - flameLen, 0);
    ctx.lineTo(-s.size * 0.4, s.size * 0.2);
    ctx.closePath();
    const flameGrad = ctx.createLinearGradient(-s.size * 0.4, 0, -s.size * 0.4 - flameLen, 0);
    flameGrad.addColorStop(0, 'rgba(0, 200, 255, 0.9)');
    flameGrad.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
    flameGrad.addColorStop(1, 'rgba(255, 255, 0, 0)');
    ctx.fillStyle = flameGrad;
    ctx.fill();

    ctx.restore();
}

// ============================================================
//  ジェットパック人間
// ============================================================
function initJetpackGuys() {
    jetpackGuys = [];
    for (let i = 0; i < JETPACK_COUNT; i++) {
        jetpackGuys.push({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            angle: 0,
            size: 10,
            jetPhase: Math.random() * Math.PI * 2,
            turnTimer: 0,
            targetAngle: Math.random() * Math.PI * 2,
        });
    }
}

function updateJetpackGuys() {
    for (const g of jetpackGuys) {
        g.turnTimer--;
        if (g.turnTimer <= 0) {
            g.targetAngle = Math.random() * Math.PI * 2;
            g.turnTimer = 60 + Math.random() * 120;
        }

        // 画面中心方向への弱い引力（画面外に行かないように）
        const toCenterX = W / 2 - g.x;
        const toCenterY = H / 2 - g.y;
        const distCenter = Math.sqrt(toCenterX * toCenterX + toCenterY * toCenterY);
        if (distCenter > Math.min(W, H) * 0.4) {
            g.targetAngle = Math.atan2(toCenterY, toCenterX);
        }

        const angleDiff = ((g.targetAngle - g.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        g.angle += angleDiff * 0.03;

        g.vx += Math.cos(g.angle) * 0.08;
        g.vy += Math.sin(g.angle) * 0.08;

        const maxSpeed = 2.5;
        const speed = Math.sqrt(g.vx * g.vx + g.vy * g.vy);
        if (speed > maxSpeed) {
            g.vx = (g.vx / speed) * maxSpeed;
            g.vy = (g.vy / speed) * maxSpeed;
        }

        g.x += g.vx;
        g.y += g.vy;

        // 画面端バウンス
        if (g.x < 10 || g.x > W - 10) { g.vx *= -1; g.x = Math.max(10, Math.min(W - 10, g.x)); }
        if (g.y < 10 || g.y > H - 10) { g.vy *= -1; g.y = Math.max(10, Math.min(H - 10, g.y)); }

        g.jetPhase += 0.2;
    }
}

function drawJetpackGuys(ctx) {
    for (const g of jetpackGuys) {
        ctx.save();
        ctx.translate(g.x, g.y);

        const moveAngle = Math.atan2(g.vy, g.vx);

        // ジェットパック炎
        const flameLen = g.size * (1 + Math.sin(g.jetPhase) * 0.3);
        const flameX = -Math.cos(moveAngle) * g.size;
        const flameY = -Math.sin(moveAngle) * g.size + g.size * 0.5;

        for (let f = 0; f < 3; f++) {
            ctx.beginPath();
            const ox = (Math.random() - 0.5) * 4;
            const oy = (Math.random() - 0.5) * 4;
            ctx.arc(flameX + ox, flameY + oy, flameLen * (1 - f * 0.25), 0, Math.PI * 2);
            const alpha = (0.6 - f * 0.15);
            const hue = 30 + f * 20;
            ctx.fillStyle = `hsla(${hue}, 100%, 55%, ${alpha})`;
            ctx.fill();
        }

        // 人体（簡易スティックマン風）
        // 頭
        ctx.beginPath();
        ctx.arc(0, -g.size * 0.6, g.size * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#e0d0c0';
        ctx.fill();

        // 体
        ctx.beginPath();
        ctx.moveTo(0, -g.size * 0.25);
        ctx.lineTo(0, g.size * 0.4);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 腕
        ctx.beginPath();
        ctx.moveTo(-g.size * 0.4, 0);
        ctx.lineTo(g.size * 0.4, 0);
        ctx.stroke();

        // 脚
        ctx.beginPath();
        ctx.moveTo(0, g.size * 0.4);
        ctx.lineTo(-g.size * 0.3, g.size * 0.8);
        ctx.moveTo(0, g.size * 0.4);
        ctx.lineTo(g.size * 0.3, g.size * 0.8);
        ctx.stroke();

        // ジェットパック本体（背中）
        ctx.fillStyle = '#556';
        ctx.fillRect(-g.size * 0.25, -g.size * 0.1, g.size * 0.15, g.size * 0.5);

        // ヘルメットの反射
        ctx.beginPath();
        ctx.arc(-g.size * 0.1, -g.size * 0.75, g.size * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.fill();

        ctx.restore();
    }
}

// ============================================================
//  CREWカード（物理演算）
// ============================================================
function initCrewCards() {
    cards = [];
    const container = document.getElementById('crew-container');
    container.innerHTML = '';

    CREW_DATA.forEach((member, i) => {
        const el = document.createElement('div');
        el.className = 'crew-card';
        el.dataset.role = member.role;
        el.dataset.index = i;
        el.innerHTML = `
      <span class="card-role">${member.role}</span>
      <span class="card-name">${member.name}</span>
    `;
        container.appendChild(el);

        // 初期位置：グリッドベースで画面内に収める
        const cols = Math.floor(W / (CARD_W + 10)) || 1;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 10 + col * (CARD_W + 10) + (Math.random() - 0.5) * 8;
        const y = 90 + row * (CARD_H + 10) + (Math.random() - 0.5) * 8;

        cards.push({
            el,
            x,
            y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            w: CARD_W,
            h: CARD_H,
            memberIndex: i,
        });

        el.style.left = x + 'px';
        el.style.top = y + 'px';
    });
}

function updateCards() {
    if (currentScreen !== 'screen-crew') return;

    for (const c of cards) {
        // ブラックホールの影響
        for (const bh of blackholes) {
            const dx = bh.x - (c.x + c.w / 2);
            const dy = bh.y - (c.y + c.h / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < BLACKHOLE_RADIUS && dist > 5) {
                const force = BLACKHOLE_STRENGTH * (1 - dist / BLACKHOLE_RADIUS);
                c.vx += (dx / dist) * force;
                c.vy += (dy / dist) * force;
            }
        }

        c.vx *= FRICTION;
        c.vy *= FRICTION;
        c.x += c.vx;
        c.y += c.vy;

        // 画面端バウンス
        if (c.x < 0) { c.x = 0; c.vx *= -BOUNCE_DAMPING; }
        if (c.x > W - c.w) { c.x = W - c.w; c.vx *= -BOUNCE_DAMPING; }
        if (c.y < 80) { c.y = 80; c.vy *= -BOUNCE_DAMPING; }
        if (c.y > H - c.h - 10) { c.y = H - c.h - 10; c.vy *= -BOUNCE_DAMPING; }

        // カード同士の衝突
        for (const other of cards) {
            if (other === c) continue;
            if (rectOverlap(c, other)) {
                resolveRectCollision(c, other);
            }
        }

        // 宇宙船との衝突
        if (spaceship) {
            const cx = c.x + c.w / 2;
            const cy = c.y + c.h / 2;
            const dx = cx - spaceship.x;
            const dy = cy - spaceship.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < spaceship.size + 40) {
                c.vx += (dx / dist) * 3;
                c.vy += (dy / dist) * 3;
                // カード衝突パーティクル
                spawnMiniExplosion(spaceship.x, spaceship.y, 8);
            }
        }

        c.el.style.transform = `translate(${c.x}px, ${c.y}px)`;
        c.el.style.left = '0';
        c.el.style.top = '0';
    }
}

function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y;
}

function resolveRectCollision(a, b) {
    const acx = a.x + a.w / 2;
    const acy = a.y + a.h / 2;
    const bcx = b.x + b.w / 2;
    const bcy = b.y + b.h / 2;
    const dx = acx - bcx;
    const dy = acy - bcy;
    const overlapX = (a.w + b.w) / 2 - Math.abs(dx);
    const overlapY = (a.h + b.h) / 2 - Math.abs(dy);

    if (overlapX < overlapY) {
        const sign = dx > 0 ? 1 : -1;
        a.x += overlapX * 0.5 * sign;
        b.x -= overlapX * 0.5 * sign;
        const relVel = a.vx - b.vx;
        a.vx -= relVel * 0.5;
        b.vx += relVel * 0.5;
    } else {
        const sign = dy > 0 ? 1 : -1;
        a.y += overlapY * 0.5 * sign;
        b.y -= overlapY * 0.5 * sign;
        const relVel = a.vy - b.vy;
        a.vy -= relVel * 0.5;
        b.vy += relVel * 0.5;
    }
}

// ============================================================
//  パーティクルエフェクト
// ============================================================
function spawnExplosion(x, y) {
    for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
        const angle = (Math.PI * 2 / EXPLOSION_PARTICLES) * i + Math.random() * 0.3;
        const speed = 2 + Math.random() * 6;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.015 + Math.random() * 0.01,
            size: 2 + Math.random() * 3,
            hue: Math.random() * 60 + 160, // シアン-ブルー
        });
    }

    // 衝撃波でカードを弾く
    if (currentScreen === 'screen-crew') {
        for (const c of cards) {
            const dx = (c.x + c.w / 2) - x;
            const dy = (c.y + c.h / 2) - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 250 && dist > 1) {
                const force = (250 - dist) / 250 * 8;
                c.vx += (dx / dist) * force;
                c.vy += (dy / dist) * force;
            }
        }
    }
}

function spawnMiniExplosion(x, y, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.03 + Math.random() * 0.02,
            size: 1 + Math.random() * 2,
            hue: Math.random() * 40 + 10,
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= p.decay;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles(ctx) {
    for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${p.life})`;
        ctx.fill();
    }
}

// ============================================================
//  ブラックホール
// ============================================================
function updateBlackholes(t) {
    for (let i = blackholes.length - 1; i >= 0; i--) {
        const bh = blackholes[i];
        bh.life -= 0.005;
        if (bh.life <= 0) {
            blackholes.splice(i, 1);
        }
    }
}

function drawBlackholes(ctx, t) {
    for (const bh of blackholes) {
        const r = BLACKHOLE_RADIUS * bh.life;

        // ブラックホールの歪みエフェクト
        const grad = ctx.createRadialGradient(bh.x, bh.y, 0, bh.x, bh.y, r);
        grad.addColorStop(0, `rgba(0, 0, 0, ${bh.life})`);
        grad.addColorStop(0.3, `rgba(20, 0, 40, ${bh.life * 0.7})`);
        grad.addColorStop(0.7, `rgba(80, 0, 160, ${bh.life * 0.3})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bh.x, bh.y, r, 0, Math.PI * 2);
        ctx.fill();

        // 降着円盤
        ctx.save();
        ctx.translate(bh.x, bh.y);
        ctx.rotate(t * 0.002);
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.8, r * 0.2, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(280, 100%, 60%, ${bh.life * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}

// ============================================================
//  画面遷移
// ============================================================
function transitionTo(targetId) {
    if (targetId === currentScreen) return;

    const currentEl = document.getElementById(currentScreen);
    const targetEl = document.getElementById(targetId);

    currentEl.classList.remove('active');
    currentEl.classList.add('warp-out');

    setTimeout(() => {
        currentEl.classList.remove('warp-out');
        currentEl.style.opacity = '0';
        currentEl.style.pointerEvents = 'none';

        targetEl.classList.add('warp-in');
        targetEl.style.opacity = '1';
        targetEl.style.pointerEvents = 'auto';

        setTimeout(() => {
            targetEl.classList.remove('warp-in');
            targetEl.classList.add('active');
        }, 800);

        currentScreen = targetId;

        // CREW画面に入ったらカード位置リセット
        if (targetId === 'screen-crew') {
            resetCardPositions();
        }
    }, 700);
}

function resetCardPositions() {
    const cols = Math.floor(W / (CARD_W + 10)) || 1;
    cards.forEach((c, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        c.x = 10 + col * (CARD_W + 10) + (Math.random() - 0.5) * 8;
        c.y = 90 + row * (CARD_H + 10) + (Math.random() - 0.5) * 8;
        c.vx = (Math.random() - 0.5) * 2;
        c.vy = (Math.random() - 0.5) * 2;
    });
}

// ============================================================
//  イベントバインド
// ============================================================
function bindScreenEvents() {
    // 画面1: タップでランディング→選択
    const landing = document.getElementById('screen-landing');
    landing.addEventListener('touchstart', (e) => {
        e.preventDefault();
        transitionTo('screen-select');
    });
    landing.addEventListener('click', () => {
        transitionTo('screen-select');
    });

    // 画面2: 惑星タップで各セクションへ
    document.querySelectorAll('.planet').forEach(planet => {
        planet.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = planet.dataset.target;
            transitionTo(target);
        });
        planet.addEventListener('click', (e) => {
            e.stopPropagation();
            const target = planet.dataset.target;
            transitionTo(target);
        });
    });

    // 戻るボタン
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            transitionTo(btn.dataset.target);
        });
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            transitionTo(btn.dataset.target);
        });
    });

    // モーダル閉じる
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
}

function bindInteractionEvents() {
    const crewContainer = document.getElementById('crew-container');

    // --- タッチイベント（カードフリック + 長押しブラックホール） ---
    crewContainer.addEventListener('touchstart', onTouchStart, { passive: false });
    crewContainer.addEventListener('touchmove', onTouchMove, { passive: false });
    crewContainer.addEventListener('touchend', onTouchEnd, { passive: false });

    // --- マウスイベント（デスクトップ対応） ---
    crewContainer.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // --- タップ爆発（空白部分） ---
    document.addEventListener('touchstart', (e) => {
        if (currentScreen !== 'screen-crew' && currentScreen !== 'screen-select') return;
        const target = e.target;
        if (target.closest('.crew-card') || target.closest('.planet') || target.closest('.back-btn') || target.closest('.modal-content')) return;

        const touch = e.touches[0];

        longPressTimer = setTimeout(() => {
            blackholes.push({ x: touch.clientX, y: touch.clientY, life: 1 });
            longPressTimer = null;
        }, 600);
    });

    document.addEventListener('touchend', (e) => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            if (currentScreen === 'screen-crew') {
                const touch = e.changedTouches[0];
                if (!e.target.closest('.crew-card') && !e.target.closest('.back-btn')) {
                    spawnExplosion(touch.clientX, touch.clientY);
                }
            }
            longPressTimer = null;
        }
    });

    // マウスクリック爆発
    document.addEventListener('click', (e) => {
        if (currentScreen !== 'screen-crew') return;
        if (e.target.closest('.crew-card') || e.target.closest('.back-btn') || e.target.closest('.modal-content') || e.target.closest('.modal-backdrop')) return;
        spawnExplosion(e.clientX, e.clientY);
    });

    // 選択画面のタップ爆発
    const selectScreen = document.getElementById('screen-select');
    selectScreen.addEventListener('touchstart', (e) => {
        if (e.target.closest('.planet')) return;
        const touch = e.touches[0];
        setTimeout(() => {
            spawnMiniExplosion(touch.clientX, touch.clientY, 15);
        }, 100);
    });

    // 宇宙船をタッチ位置に向かわせる
    document.addEventListener('touchstart', (e) => {
        if (e.target.closest('.crew-card') || e.target.closest('a') || e.target.closest('button')) return;
        const touch = e.touches[0];
        shipTargetX = touch.clientX;
        shipTargetY = touch.clientY;
    });

    document.addEventListener('touchmove', (e) => {
        if (shipTargetX !== null) {
            const touch = e.touches[0];
            shipTargetX = touch.clientX;
            shipTargetY = touch.clientY;
        }
    });

    document.addEventListener('touchend', () => {
        shipTargetX = null;
        shipTargetY = null;
    });
}

// ============================================================
//  カードドラッグ＆フリック
// ============================================================
function onTouchStart(e) {
    const touch = e.touches[0];
    const target = touch.target.closest('.crew-card');
    if (!target) return;
    e.preventDefault();

    const idx = parseInt(target.dataset.index);
    const card = cards[idx];
    if (!card) return;

    dragState = {
        card,
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        startTime: Date.now(),
        offsetX: touch.clientX - card.x,
        offsetY: touch.clientY - card.y,
        moved: false,
    };

    card.vx = 0;
    card.vy = 0;
}

function onTouchMove(e) {
    if (!dragState) return;
    e.preventDefault();

    const touch = e.touches[0];
    dragState.card.x = touch.clientX - dragState.offsetX;
    dragState.card.y = touch.clientY - dragState.offsetY;
    dragState.lastX = touch.clientX;
    dragState.lastY = touch.clientY;

    if (Math.abs(touch.clientX - dragState.startX) > 5 ||
        Math.abs(touch.clientY - dragState.startY) > 5) {
        dragState.moved = true;
    }
}

function onTouchEnd(e) {
    if (!dragState) return;

    const touch = e.changedTouches[0];
    const dt = (Date.now() - dragState.startTime) / 1000;

    if (!dragState.moved && dt < 0.3) {
        // タップ → モーダル表示
        openModal(dragState.card.memberIndex);
    } else if (dragState.moved) {
        // フリック
        const dx = touch.clientX - dragState.startX;
        const dy = touch.clientY - dragState.startY;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        const factor = Math.min(speed / 500, 1) * FLICK_MULTIPLIER;
        dragState.card.vx = (dx / dt) * factor / 60;
        dragState.card.vy = (dy / dt) * factor / 60;
    }

    dragState = null;
}

// ============================================================
//  マウスドラッグ＆クリック対応
// ============================================================
let mouseDragState = null;

function onMouseDown(e) {
    const target = e.target.closest('.crew-card');
    if (!target) return;
    e.preventDefault();

    const idx = parseInt(target.dataset.index);
    const card = cards[idx];
    if (!card) return;

    mouseDragState = {
        card,
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        offsetX: e.clientX - card.x,
        offsetY: e.clientY - card.y,
        moved: false,
    };

    card.vx = 0;
    card.vy = 0;
}

function onMouseMove(e) {
    if (!mouseDragState) return;
    e.preventDefault();

    mouseDragState.card.x = e.clientX - mouseDragState.offsetX;
    mouseDragState.card.y = e.clientY - mouseDragState.offsetY;

    if (Math.abs(e.clientX - mouseDragState.startX) > 5 ||
        Math.abs(e.clientY - mouseDragState.startY) > 5) {
        mouseDragState.moved = true;
    }
}

function onMouseUp(e) {
    if (!mouseDragState) return;

    const dt = (Date.now() - mouseDragState.startTime) / 1000;

    if (!mouseDragState.moved && dt < 0.3) {
        // クリック → モーダル表示
        openModal(mouseDragState.card.memberIndex);
    } else if (mouseDragState.moved) {
        // フリック
        const dx = e.clientX - mouseDragState.startX;
        const dy = e.clientY - mouseDragState.startY;
        const speed = Math.sqrt(dx * dx + dy * dy) / dt;
        const factor = Math.min(speed / 500, 1) * FLICK_MULTIPLIER;
        mouseDragState.card.vx = (dx / dt) * factor / 60;
        mouseDragState.card.vy = (dy / dt) * factor / 60;
    }

    mouseDragState = null;
}

// ============================================================
//  モーダル
// ============================================================
function openModal(memberIndex) {
    const member = CREW_DATA[memberIndex];
    if (!member) return;

    document.getElementById('modal-role').textContent = member.role;
    document.getElementById('modal-name').textContent = member.name;
    document.getElementById('modal-title-text').textContent = member.title;
    document.getElementById('modal-quote').textContent = `"${member.quote}"`;
    document.getElementById('modal-work').textContent = member.work;

    // ロール別カラー
    const modal = document.querySelector('.modal-content');
    const roleColors = {
        'プログラマー': '#0ff',
        'デザイナー': '#f0f',
        'プランナー': '#fc0',
        'ミュージック': '#0f6',
    };
    const color = roleColors[member.role] || '#0ff';
    document.getElementById('modal-role').style.color = color;
    document.getElementById('modal-role').style.textShadow = `0 0 10px ${color}`;
    modal.style.borderColor = `${color}33`;
    modal.style.boxShadow = `0 0 30px ${color}22, 0 0 60px ${color}11`;

    document.getElementById('member-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('member-modal').classList.add('hidden');
}

// ============================================================
//  メインループ
// ============================================================
function loop(t) {
    animFrameId = requestAnimationFrame(loop);

    // 背景
    drawSpace(t);

    // FXキャンバスクリア
    fxCtx.clearRect(0, 0, W, H);

    // 更新
    updateSpaceship();
    updateJetpackGuys();
    updateCards();
    updateParticles();
    updateBlackholes(t);

    // 描画（FXキャンバス上）
    drawSpaceship(fxCtx);
    drawJetpackGuys(fxCtx);
    drawParticles(fxCtx);
    drawBlackholes(fxCtx, t || 0);
}

