/* Totally Gone Bananas runner — loaded by banana-runner.html.
   Kept as an external file because the site CSP blocks inline scripts. */
"use strict";
/* =====================================================================
   TOTALLY GONE BANANAS — "From Green to Gone"
   A tiny endless runner. Single file, vanilla JS + <canvas>.

   Layout of this file:
     1. CONFIG & HELPERS
     2. STORAGE (localStorage, safely wrapped)
     3. SOUND (Web Audio API retro effects)
     4. SPRITES  <- every drawn shape lives here (swap for images later)
     5. ENTITIES (Player, Obstacle, Collectible, Particle, FloatText, Banner)
     6. GAME (state machine, spawning, collisions, background, UI)
     7. BOOT (canvas sizing, input, main loop)
   ===================================================================== */


/* =====================================================================
   1. CONFIG & HELPERS
   ===================================================================== */
const W = 960, H = 540;          // logical resolution (16:9); scaled to fit screen
const GROUND_Y = 452;            // top of the cutting-board ground strip
const PLAYER_X = 180;

const CFG = {
  gravity: 2600,        // px/s²
  holdGravity: 1250,    // lighter gravity while jump is held & rising
  maxHold: 0.28,        // seconds the "hold for higher" effect lasts
  jumpV: 820,           // first jump velocity
  doubleJumpV: 760,     // second (air) jump velocity
  startSpeed: 380,      // px/s
  speedGain: 8,         // px/s added each second
  maxSpeed: 920,
  tooCoolTime: 5,       // seconds of invincibility
  hurtTime: 1.4,        // mercy blink after a hit
  pointsPerPx: 1 / 28,  // distance score
  pickupPoints: 10,
  smashPoints: 25,
  levelEvery: 1000,
};

// Ripeness stages: each hit moves one step to the right. Stage 4 = GONE.
const STAGES = [
  { name: 'GREEN',    body: '#9CCB3B', shade: '#6E9A22', light: '#CBE77D', stem: '#5E7E1E' },
  { name: 'YELLOW',   body: '#F3CF31', shade: '#E8B415', light: '#FFF2A8', stem: '#7A5A2A' },
  { name: 'FRECKLED', body: '#F7CB2E', shade: '#DBA313', light: '#FFE88A', stem: '#6B4423' },
  { name: 'SPOTTY',   body: '#D9A43A', shade: '#AE7A1C', light: '#EDC46A', stem: '#5A3818' },
  { name: 'GONE',     body: '#6B4423', shade: '#4A2E15', light: '#8A5A30', stem: '#3B2410' },
];

const COLORS = {
  cream: '#FBF9E6', yellow: '#FFD93B', gold: '#F5B700', goldDark: '#B9860A',
  brown: '#6B4423', ink: '#3B2A14', red: '#E84A5F', white: '#FFFFFF',
};
// Brand character palette (from the site's mascot art / Mascot.tsx)
const BRAND = { outline: '#462018', yellow: '#F3CF31' };
const CONFETTI = ['#FFD93B', '#F5B700', '#E84A5F', '#7EC8E3', '#9ED99B', '#F7A1C4', '#FFFFFF'];
const FONT = '"Arial Rounded MT Bold", "Varela Round", "Nunito", "Baloo 2", "Trebuchet MS", system-ui, sans-serif';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Rounded-rectangle path (works in browsers without ctx.roundRect). */
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Chunky outlined text used by all UI. */
function text(ctx, str, x, y, size, fill = COLORS.ink, opts = {}) {
  ctx.save();
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.baseline || 'middle';
  ctx.lineJoin = 'round';
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.strokeW || Math.max(3, size * 0.18);
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
  ctx.restore();
}


/* =====================================================================
   2. STORAGE — wrapped in try/catch so private mode / blocked storage
      never breaks the game.
   ===================================================================== */
const Store = {
  get(key, fallback) {
    try { const v = window.localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, String(value)); } catch (e) { /* ignore */ }
  },
};


/* =====================================================================
   3. SOUND — tiny retro synth built on the Web Audio API. No files.
      The AudioContext is created on the first user gesture (browser rule).
   ===================================================================== */
const Sound = {
  ctx: null, master: null, noiseBuf: null,
  muted: Store.get('tgb_muted', '0') === '1',
  volume: 0.45,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      // One second of white noise, reused for squishes and smashes.
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },

  setMuted(m) {
    this.muted = m;
    Store.set('tgb_muted', m ? '1' : '0');
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.02);
  },

  ok() { return this.ctx && !this.muted && this.ctx.state === 'running'; },

  /** Single oscillator blip with pitch slide and quick envelope. */
  tone(f0, f1, dur, type = 'square', vol = 0.2, delay = 0) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  },

  /** Filtered noise burst. */
  noise(dur, vol = 0.3, f0 = 2000, f1 = 300, delay = 0) {
    if (!this.ok() || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource(), flt = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    src.buffer = this.noiseBuf;
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(f0, t);
    flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.03);
  },

  jump(double) {           // springy "boing"
    if (double) { this.tone(420, 980, 0.16, 'sine', 0.28); this.tone(840, 1400, 0.1, 'triangle', 0.08, 0.02); }
    else { this.tone(220, 620, 0.18, 'sine', 0.3); this.tone(440, 900, 0.12, 'triangle', 0.06); }
  },
  pickup() {               // bright two-note chime
    this.tone(988, 988, 0.08, 'square', 0.1);
    this.tone(1319, 1319, 0.16, 'square', 0.1, 0.06);
  },
  hit() {                  // wet squish
    this.noise(0.25, 0.4, 1800, 120);
    this.tone(260, 70, 0.25, 'sawtooth', 0.18);
  },
  smash() {
    this.noise(0.18, 0.35, 4000, 400);
    this.tone(180, 90, 0.12, 'square', 0.12);
  },
  powerUp() {              // little fanfare
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.14, 'square', 0.12, i * 0.08));
    this.tone(1047, 1568, 0.35, 'triangle', 0.12, 0.34);
  },
  freeze() {               // icy sparkle, descending
    [1760, 1568, 1319, 1175, 1047].forEach((f, i) => this.tone(f, f * 1.01, 0.1, 'triangle', 0.12, i * 0.05));
  },
  levelUp() {
    [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.12, 'square', 0.1, i * 0.07));
  },
  gameOver() {
    [523, 466, 392, 311].forEach((f, i) => this.tone(f, f * 0.97, 0.22, 'triangle', 0.16, i * 0.16));
    this.noise(0.5, 0.15, 900, 80, 0.6);
  },
  click() { this.tone(660, 880, 0.05, 'square', 0.08); },
};


/* =====================================================================
   4. SPRITES
   ---------------------------------------------------------------------
   Every visual is drawn here and ONLY here. Each sprite has the same
   signature:   SPRITES.name(ctx, x, y, opts)
   and a documented anchor point. Game logic never draws shapes itself.

   To swap in real art (e.g. official mascot PNGs as data URLs), call:
       SPRITES.useImage('banana', 'data:image/png;base64,...',
                        { w: 60, h: 96, ax: 0.5, ay: 1 });
   (ax/ay = anchor as a fraction of the image; 0.5,1 = bottom-centre).
   The image replaces the drawn sprite; opts.sx/sy/scale/alpha/rot are
   still honoured, so squash-and-stretch keeps working.
   ===================================================================== */
// Official brand art, loaded from the site (same origin, so the site CSP allows it).
const ART = { throne: new Image(), runner: [] };
ART.throne.src = 'main-slider/main-banana-first.webp';
// Official running mascot, one image per ripeness stage (index = STAGES index).
// runner-green is the yellow art with only its yellow skin hue-shifted to green.
for (const n of ['green', 'yellow', 'freckled', 'spotty', 'gone']) {
  const img = new Image();
  img.src = `game/runner-${n}.webp`;
  ART.runner.push(img);
}
const artReady = img => !!(img && img.complete && img.naturalWidth);

const SPRITES = {

  /* ---------- image override helper ---------- */
  useImage(name, src, { w, h, ax = 0.5, ay = 0.5 }) {
    const img = new Image();
    img.src = src;
    const fallback = this[name];
    this[name] = (ctx, x, y, o = {}) => {
      if (!img.complete || !img.naturalWidth) return fallback.call(this, ctx, x, y, o);
      ctx.save();
      ctx.translate(x, y);
      if (o.rot) ctx.rotate(o.rot);
      const s = o.scale || 1;
      ctx.scale((o.sx || 1) * s, (o.sy || 1) * s);
      if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
      ctx.drawImage(img, -w * ax, -h * ay, w, h);
      ctx.restore();
    };
  },

  /* ---------- shared bits ---------- */
  // Wraparound brand shades. anchor: centre. Unscaled ≈ 46w × 15h.
  sunglasses(ctx, x, y, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    const s = o.scale || 1; ctx.scale(s, s);
    ctx.fillStyle = '#1A1210';
    ctx.strokeStyle = BRAND.outline; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-23, -5); ctx.quadraticCurveTo(0, -9, 23, -5);
    ctx.lineTo(22, 2); ctx.quadraticCurveTo(16, 9, 7, 4);
    ctx.quadraticCurveTo(0, 1, -7, 4); ctx.quadraticCurveTo(-16, 9, -22, 2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // glints
    ctx.strokeStyle = o.gold ? 'rgba(255,215,90,0.95)' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-17, 1); ctx.lineTo(-12, -4);
    ctx.moveTo(10, 1); ctx.lineTo(15, -4);
    ctx.stroke();
    ctx.restore();
  },

  /** Rubber-hose limb in the brand's thick dark-brown line. */
  _limb(ctx, pts) {
    ctx.strokeStyle = BRAND.outline; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    else for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  },

  /** Puffy white cartoon glove. */
  _glove(ctx, x, y, gold) {
    ctx.fillStyle = gold ? '#FFF3C4' : '#FFFFFF';
    ctx.strokeStyle = BRAND.outline; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 4, y - 3, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  },

  /** Chunky white sneaker (toe points right). */
  _sneaker(ctx, x, y, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = BRAND.outline; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-6, -7); ctx.lineTo(3, -7); ctx.quadraticCurveTo(12, -5, 12, 0);
    ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = BRAND.outline; rr(ctx, -8, -1, 21, 4, 2); ctx.fill();      // sole
    ctx.fillStyle = '#7A3A22'; rr(ctx, -6, -6, 5, 5, 1.5); ctx.fill();        // heel patch
    ctx.restore();
  },

  star(ctx, x, y, r, points = 4, inner = 0.42, rot = 0) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const rad = i % 2 === 0 ? r : r * inner;
      const a = rot + (i * Math.PI) / points - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  },

  /* ---------- PLAYER: the Totally Gone Bananas mascot ----------
     Drawn to match the brand character: chunky upright banana, thick
     dark-brown outline, wraparound shades, big open grin, rubber-hose
     limbs, white gloves and white sneakers.
     anchor: bottom-centre (between the feet).
     opts: stage 0-4, pose 'run'|'jump'|'sit', frame 0-2, sx, sy, scale,
           alpha, glow (0-1), rot */
  banana(ctx, x, y, o = {}) {
    const img = ART.runner[clamp(o.stage || 0, 0, 4)];
    if ((o.pose || 'run') !== 'sit' && artReady(img)) return SPRITES._runnerArt(ctx, x, y, o, img);
    return SPRITES.bananaDrawn(ctx, x, y, o);
  },

  /** Draws the official running-mascot art. Same anchor/opts as banana(). */
  _runnerArt(ctx, x, y, o, img) {
    const h = 114, w = h * img.naturalWidth / img.naturalHeight;
    const f = (o.frame || 0) % 3;
    const jump = o.pose === 'jump';
    // Simple run cycle from one pose: bounce + lean. Jump leans back.
    const bob = jump ? 0 : [0, -5, -2][f];
    const lean = jump ? -0.14 : [0.04, -0.02, 0.01][f];
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    const s = o.scale || 1;
    ctx.scale((o.sx || 1) * s, (o.sy || 1) * s);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    if (o.glow) {
      const g = ctx.createRadialGradient(0, -58, 12, 0, -58, 80);
      g.addColorStop(0, `rgba(255,215,64,${0.7 * o.glow})`);
      g.addColorStop(1, 'rgba(255,215,64,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -58, 80, 0, Math.PI * 2); ctx.fill();
    }
    ctx.translate(0, bob);
    ctx.rotate(lean);
    ctx.drawImage(img, -w / 2, -h + 2, w, h);
    ctx.restore();
  },

  /** Hand-drawn fallback (used if the art can't load, and for the sitting pose). */
  bananaDrawn(ctx, x, y, o = {}) {
    const stage = clamp(o.stage || 0, 0, 4);
    const st = STAGES[stage];
    const pose = o.pose || 'run';
    const f = (o.frame || 0) % 3;
    const gold = !!o.glow;
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    const s = o.scale || 1;
    ctx.scale((o.sx || 1) * s, (o.sy || 1) * s);
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;

    // Golden "Too Cool" aura
    if (o.glow) {
      const g = ctx.createRadialGradient(2, -52, 10, 2, -52, 74);
      g.addColorStop(0, `rgba(255,215,64,${0.65 * o.glow})`);
      g.addColorStop(1, 'rgba(255,215,64,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(2, -52, 74, 0, Math.PI * 2); ctx.fill();
    }

    // Legs: hip -> knee(control) -> foot
    const hips = [[-7, -17], [7, -17]];
    let feet;
    if (pose === 'jump') feet = [[-13, -6, -0.3], [13, -10, 0.25]];
    else if (pose === 'sit') feet = [[16, -4, 0], [25, -9, -0.2]];
    else feet = [
      [[-15, 0, -0.15], [14, 0, 0]],
      [[-3, 0, 0], [5, -7, 0.2]],
      [[9, 0, 0], [-12, -4, -0.3]],
    ][f];
    for (let i = 0; i < 2; i++) {
      const [hx, hy] = hips[i], [fx, fy, fr] = feet[i];
      SPRITES._limb(ctx, [[hx, hy], [(hx + fx) / 2 + (pose === 'sit' ? 0 : 3), (hy + fy) / 2 + 1], [fx, fy - 3]]);
      SPRITES._sneaker(ctx, fx + 1, fy, fr);
    }

    // Back arm (behind the body)
    const swing = pose === 'run' ? [6, -1, -6][f] : 0;
    let backArm;
    if (pose === 'jump') backArm = [[-17, -50], [-28, -56], [-30, -70]];
    else if (pose === 'sit') backArm = [[-17, -56], [-30, -74], [-14, -92]];
    else backArm = [[-17, -48], [-26, -44], [-27, -34 + swing]];
    SPRITES._limb(ctx, backArm);
    SPRITES._glove(ctx, backArm[2][0], backArm[2][1], gold);

    // Stem
    ctx.lineJoin = 'round';
    ctx.fillStyle = st.stem; ctx.strokeStyle = BRAND.outline; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-7, -88); ctx.quadraticCurveTo(-8, -98, -4, -106);
    ctx.lineTo(4, -105); ctx.quadraticCurveTo(1, -97, 4, -89); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = BRAND.outline; rr(ctx, -5.5, -110, 10, 6, 2.5); ctx.fill();

    // Body
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(1, -15);
      ctx.bezierCurveTo(31, -24, 32, -80, -1, -92);
      ctx.bezierCurveTo(-26, -78, -28, -30, 1, -15);
      ctx.closePath();
    };
    body();
    ctx.fillStyle = st.body; ctx.fill();

    ctx.save();
    body(); ctx.clip();
    // soft shade on the back side
    ctx.fillStyle = st.shade; ctx.globalAlpha *= 0.5;
    ctx.beginPath(); ctx.ellipse(-22, -52, 10, 44, 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha /= 0.5;
    // highlight stripe (the brand art's white sheen)
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.globalAlpha *= 0.4;
    ctx.beginPath(); ctx.moveTo(-15, -36); ctx.quadraticCurveTo(-18, -62, -6, -82); ctx.stroke();
    ctx.globalAlpha /= 0.4;
    // ripeness spots (kept mostly off the face)
    if (stage >= 2) {
      ctx.fillStyle = 'rgba(92,46,20,0.85)';
      for (const [sx, sy, r] of [[-12, -30, 2], [-17, -50, 1.8], [-8, -82, 2], [4, -24, 1.8], [18, -28, 1.6],
        [-3, -86, 1.5], [12, -80, 1.6], [-15, -66, 1.8], [20, -76, 1.4], [-6, -27, 1.6], [24, -40, 1.5]]) {
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (stage >= 3) {
      ctx.fillStyle = stage >= 4 ? 'rgba(40,18,8,0.75)' : 'rgba(110,56,22,0.85)';
      for (const [sx, sy, rx, ry] of [[-12, -42, 5, 4], [8, -26, 4.5, 3.5], [-4, -82, 4, 3], [15, -82, 3.5, 3],
        [-17, -60, 3, 4], [-6, -22, 3, 2.5]]) {
        ctx.beginPath(); ctx.ellipse(sx, sy, rx, ry, 0.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();

    body();
    ctx.strokeStyle = BRAND.outline; ctx.lineWidth = 3.5; ctx.stroke();
    // bottom tip
    ctx.fillStyle = BRAND.outline;
    ctx.beginPath(); ctx.ellipse(1, -15, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();

    // Face: wraparound shades + big open grin with tongue
    SPRITES.sunglasses(ctx, 4, -65, { gold });
    const mouth = () => {
      ctx.beginPath();
      ctx.moveTo(-6, -52);
      ctx.quadraticCurveTo(8, -48, 21, -53);
      ctx.bezierCurveTo(19, -36, -2, -35, -6, -52);
      ctx.closePath();
    };
    mouth(); ctx.fillStyle = BRAND.outline; ctx.fill();
    ctx.save(); mouth(); ctx.clip();
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-8, -56, 32, 6.5);                 // teeth
    ctx.fillStyle = '#E8616E';
    ctx.beginPath(); ctx.ellipse(9, -40, 7, 5, 0, 0, Math.PI * 2); ctx.fill();  // tongue
    ctx.restore();
    mouth(); ctx.strokeStyle = BRAND.outline; ctx.lineWidth = 2.5; ctx.stroke();
    // smile creases
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -54); ctx.lineTo(-7, -50); ctx.moveTo(22, -56); ctx.lineTo(23, -51); ctx.stroke();

    // Front arm (in front of the body)
    let frontArm;
    if (pose === 'jump') frontArm = [[19, -48], [30, -56], [32, -70]];
    else if (pose === 'sit') frontArm = [[19, -44], [28, -38], [30, -28]];
    else frontArm = [[19, -46], [28, -42], [30, -32 - swing]];
    SPRITES._limb(ctx, frontArm);
    SPRITES._glove(ctx, frontArm[2][0], frontArm[2][1], gold);

    ctx.restore();
  },

  /* ---------- TITLE ART: the official mascot on his throne ----------
     anchor: bottom-centre. Uses the site's own illustration
     (/main-slider/main-banana-first.webp). If it can't load (e.g. the
     file is opened outside the site), the drawn throne + banana is used. */
  titleArt(ctx, x, y, o = {}) {
    const img = ART.throne;
    if (img.complete && img.naturalWidth) {
      const size = 330, bob = Math.sin((o.t || 0) * 1.5) * 2;
      ctx.drawImage(img, x - size / 2, y - size + 6 + bob, size, size);
      return;
    }
    SPRITES.throne(ctx, x, y, { scale: 1.15 });
    SPRITES.banana(ctx, x - 4, y - 70, { stage: 1, pose: 'sit', scale: 1.1, rot: -0.22 + Math.sin((o.t || 0) * 1.5) * 0.03 });
  },

  /* ---------- GAME OVER: banana bread loaf (wearing the shades) ----------
     anchor: bottom-centre. opts: scale, t (for steam) */
  bananaBread(ctx, x, y, o = {}) {
    const t = o.t || 0;
    ctx.save();
    ctx.translate(x, y);
    const s = o.scale || 1; ctx.scale(s, s);
    // plate shadow
    ctx.fillStyle = 'rgba(107,68,35,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 2, 118, 12, 0, 0, Math.PI * 2); ctx.fill();
    // loaf base
    ctx.fillStyle = '#9A5B26';
    ctx.beginPath();
    ctx.moveTo(-92, 0); ctx.lineTo(92, 0); ctx.lineTo(102, -56); ctx.lineTo(-102, -56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = -80; i <= 80; i += 32) { ctx.fillRect(i, -52, 3, 48); }
    // dome
    ctx.fillStyle = '#B8722F';
    ctx.beginPath(); ctx.ellipse(0, -56, 106, 50, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,0.25)';
    ctx.beginPath(); ctx.ellipse(-30, -80, 50, 16, -0.15, 0, Math.PI * 2); ctx.fill();
    // crack with crumb peeking through
    ctx.strokeStyle = '#6E3B14'; ctx.lineWidth = 9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-70, -84);
    ctx.bezierCurveTo(-30, -102, 10, -92, 30, -102); ctx.quadraticCurveTo(52, -110, 72, -92); ctx.stroke();
    ctx.strokeStyle = '#E8B26A'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-66, -85);
    ctx.bezierCurveTo(-30, -101, 10, -91, 30, -101); ctx.quadraticCurveTo(50, -108, 68, -93); ctx.stroke();
    // banana slices on top
    for (const [bx, by] of [[-46, -96], [0, -100], [46, -102]]) {
      ctx.fillStyle = '#F7E9B0'; ctx.strokeStyle = '#D6B460'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(bx, by, 14, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8A6A2A';
      for (let k = 0; k < 3; k++) {
        const a = k * 2.1;
        ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 4, by + Math.sin(a) * 2, 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    // happy face + the iconic shades
    SPRITES.sunglasses(ctx, 0, -50, { scale: 1.7 });
    ctx.strokeStyle = '#4A2A10'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-14, -26); ctx.quadraticCurveTo(2, -14, 18, -28); ctx.stroke();
    ctx.fillStyle = 'rgba(255,130,90,0.35)';
    ctx.beginPath(); ctx.ellipse(-34, -30, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(38, -30, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
    // steam
    ctx.strokeStyle = 'rgba(160,140,120,0.45)'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const sx = -40 + i * 40, ph = t * 2 + i * 1.7;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) {
        const yy = -118 - k * 5;
        const xx = sx + Math.sin(ph + k * 0.6) * 6;
        k === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
      }
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(ph);
      ctx.stroke();
    }
    ctx.restore();
  },

  /* ---------- Golden throne ----------
     anchor: bottom-centre. Unscaled ≈ 132w × 170h. opts: scale */
  throne(ctx, x, y, o = {}) {
    ctx.save();
    ctx.translate(x, y);
    const s = o.scale || 1; ctx.scale(s, s);
    const gold = ctx.createLinearGradient(-60, -170, 60, 0);
    gold.addColorStop(0, '#FFE27A'); gold.addColorStop(0.5, '#F5B700'); gold.addColorStop(1, '#D99A00');
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COLORS.goldDark; ctx.lineWidth = 3;
    // legs
    ctx.fillStyle = gold;
    rr(ctx, -52, -34, 14, 34, 4); ctx.fill(); ctx.stroke();
    rr(ctx, 38, -34, 14, 34, 4); ctx.fill(); ctx.stroke();
    // back with crown top
    ctx.beginPath();
    ctx.moveTo(-48, -56); ctx.lineTo(-48, -140); ctx.lineTo(-34, -164); ctx.lineTo(-18, -142);
    ctx.lineTo(0, -172); ctx.lineTo(18, -142); ctx.lineTo(34, -164); ctx.lineTo(48, -140); ctx.lineTo(48, -56);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // velvet panel
    ctx.fillStyle = '#C8233A'; rr(ctx, -36, -132, 72, 72, 14); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    rr(ctx, -31, -127, 62, 62, 11); ctx.stroke();
    // tiny banana emblem
    ctx.fillStyle = COLORS.yellow;
    ctx.beginPath(); ctx.moveTo(-14, -100); ctx.quadraticCurveTo(0, -80, 16, -104);
    ctx.quadraticCurveTo(0, -90, -14, -100); ctx.fill();
    // jewels
    for (const [jx, jy, c] of [[-34, -160, '#4FC3F7'], [0, -167, '#E84A5F'], [34, -160, '#81C784']]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(jx, jy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(jx - 1.5, jy - 1.5, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // seat + cushion
    ctx.strokeStyle = COLORS.goldDark; ctx.lineWidth = 3;
    ctx.fillStyle = gold; rr(ctx, -60, -48, 120, 18, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E03A4F'; rr(ctx, -54, -62, 108, 16, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; rr(ctx, -46, -60, 60, 4, 2); ctx.fill();
    // arm rests
    ctx.fillStyle = gold;
    rr(ctx, -70, -84, 18, 40, 6); ctx.fill(); ctx.stroke();
    rr(ctx, 52, -84, 18, 40, 6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-61, -86, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(61, -86, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  },

  /* ---------- POWER-UPS (anchor: centre) ---------- */
  throneIcon(ctx, x, y, o = {}) {
    const t = o.t || 0;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 4, x, y, 34);
    g.addColorStop(0, 'rgba(255,240,150,0.95)'); g.addColorStop(0.7, 'rgba(255,200,40,0.45)'); g.addColorStop(1, 'rgba(255,200,40,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(245,183,0,0.9)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.stroke();
    SPRITES.throne(ctx, x, y + 21, { scale: 0.25 });
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      SPRITES.star(ctx, x + Math.cos(a) * 29, y + Math.sin(a) * 29, 4.5, 4, 0.35); ctx.fill();
    }
    ctx.restore();
  },

  snowflake(ctx, x, y, o = {}) {
    const t = o.t || 0;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 4, x, y, 30);
    g.addColorStop(0, 'rgba(230,248,255,0.95)'); g.addColorStop(0.75, 'rgba(126,200,227,0.6)'); g.addColorStop(1, 'rgba(126,200,227,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3A9CC9'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.translate(x, y); ctx.rotate(t * 1.2);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -15);
      ctx.moveTo(0, -9); ctx.lineTo(-5, -13); ctx.moveTo(0, -9); ctx.lineTo(5, -13);
      ctx.stroke(); ctx.restore();
    }
    ctx.strokeStyle = '#3A9CC9'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  },

  /* ---------- COLLECTIBLES (anchor: centre, ~30px) ---------- */
  _pickupGlow(ctx, x, y) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.fill();
  },

  chip(ctx, x, y) {                                   // chocolate chip
    SPRITES._pickupGlow(ctx, x, y);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#4A2A14';
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.quadraticCurveTo(3, -4, 13, 5); ctx.quadraticCurveTo(15, 12, 0, 12);
    ctx.quadraticCurveTo(-15, 12, -13, 5); ctx.quadraticCurveTo(-3, -4, 0, -14); ctx.fill();
    ctx.fillStyle = '#7A4A2A';
    ctx.beginPath(); ctx.ellipse(-4, 2, 3, 6, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  peanutButter(ctx, x, y) {                           // PB jar
    SPRITES._pickupGlow(ctx, x, y);
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.5;
    ctx.fillStyle = '#C9873A'; rr(ctx, -12, -9, 24, 23, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E2483D'; rr(ctx, -13, -16, 26, 8, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#FFF6D6'; rr(ctx, -10, -3, 20, 11, 3); ctx.fill();
    text(ctx, 'PB', 0, 2.5, 9, '#8A4E16');
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(7, -7, 2.5, 18);
    ctx.restore();
  },

  syrup(ctx, x, y) {                                  // maple syrup bottle
    SPRITES._pickupGlow(ctx, x, y);
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#8A4210'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(10, -5, 5, -Math.PI / 2, Math.PI / 2); ctx.stroke();       // handle
    ctx.fillStyle = '#C9651B'; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 1.5;
    rr(ctx, -4, -17, 8, 9, 2); ctx.fill(); ctx.stroke();                                 // neck
    rr(ctx, -11, -10, 22, 25, 7); ctx.fill(); ctx.stroke();                              // body
    ctx.fillStyle = '#E2483D'; rr(ctx, -5, -21, 10, 5, 2); ctx.fill();                   // cap
    ctx.fillStyle = '#FFF6D6'; rr(ctx, -8, -4, 16, 12, 3); ctx.fill();
    ctx.fillStyle = '#D7263D'; SPRITES.star(ctx, 0, 2, 5, 5, 0.5); ctx.fill();          // maple leaf-ish
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-9, -7, 2.5, 18);
    ctx.restore();
  },

  honey(ctx, x, y) {                                  // honey drop
    SPRITES._pickupGlow(ctx, x, y);
    ctx.save(); ctx.translate(x, y);
    const g = ctx.createLinearGradient(-10, -14, 10, 16);
    g.addColorStop(0, '#FFD54F'); g.addColorStop(1, '#E59400');
    ctx.fillStyle = g; ctx.strokeStyle = '#B97300'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.bezierCurveTo(4, -8, 12, -1, 12, 5);
    ctx.arc(0, 5, 12, 0, Math.PI); ctx.bezierCurveTo(-12, -1, -4, -8, 0, -16);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(-4, 4, 2.5, 5, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  /* ---------- OBSTACLES ---------- */
  rollingPin(ctx, x, y, o = {}) {                    // anchor: bottom-centre, ~88×26
    const roll = o.roll || 0;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(80,50,20,0.18)';
    ctx.beginPath(); ctx.ellipse(0, 1, 40, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 2;
    ctx.fillStyle = '#B9844A';
    rr(ctx, -45, -19, 17, 12, 5); ctx.fill(); ctx.stroke();
    rr(ctx, 28, -19, 17, 12, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#E7BC80';
    rr(ctx, -31, -26, 62, 26, 11); ctx.fill();
    ctx.save(); rr(ctx, -31, -26, 62, 26, 11); ctx.clip();
    // grain bands rolling around the cylinder
    ctx.strokeStyle = '#C99456'; ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      const p = ((roll / (Math.PI * 2)) + k / 4) % 1;
      const yy = -26 + p * 26;
      const a = Math.sin(p * Math.PI);
      ctx.globalAlpha = 0.3 + a * 0.7;
      ctx.beginPath(); ctx.moveTo(-31, yy); ctx.bezierCurveTo(-10, yy - 3, 10, yy + 3, 31, yy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-28, -22, 56, 4);
    ctx.restore();
    ctx.strokeStyle = '#8A5A2A'; rr(ctx, -31, -26, 62, 26, 11); ctx.stroke();
    // speed lines
    ctx.strokeStyle = 'rgba(138,90,42,0.4)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(52 + i * 4, -20 + i * 7); ctx.lineTo(64 + i * 6, -20 + i * 7); ctx.stroke();
    }
    ctx.restore();
  },

  fruitFly(ctx, x, y, o = {}) {                       // anchor: centre, ~46×34
    const t = o.t || 0;
    const flap = Math.abs(Math.sin(t * 38));
    ctx.save(); ctx.translate(x, y);
    // wings
    ctx.fillStyle = 'rgba(225,242,255,0.8)'; ctx.strokeStyle = 'rgba(110,140,170,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(-1, -12, 9, Math.max(1, 13 * flap), -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(8, -11, 8, Math.max(1, 11 * flap), 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // legs
    ctx.strokeStyle = '#2A2A33'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-4 + i * 6, 8); ctx.lineTo(-7 + i * 6, 15 + Math.sin(t * 9 + i) * 1.5); ctx.stroke();
    }
    // abdomen
    ctx.fillStyle = '#4A3A3A';
    ctx.beginPath(); ctx.ellipse(6, 1, 14, 10, 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#C9A15A'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(2 + i * 6, 1, 9, -1.1, 1.1); ctx.stroke(); }
    // head
    ctx.fillStyle = '#2E2E3A';
    ctx.beginPath(); ctx.arc(-11, -1, 9, 0, Math.PI * 2); ctx.fill();
    // antennae
    ctx.strokeStyle = '#2E2E3A'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-14, -9); ctx.quadraticCurveTo(-18, -18, -22, -17); ctx.stroke();
    // big red eyes
    ctx.fillStyle = '#E53935';
    ctx.beginPath(); ctx.ellipse(-16, -4, 5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, -5, 4.5, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-17.5, -6, 1.6, 0, Math.PI * 2); ctx.arc(-9.5, -7, 1.4, 0, Math.PI * 2); ctx.fill();
    // hungry open mouth + drool
    ctx.fillStyle = '#7A1E1E';
    ctx.beginPath(); ctx.ellipse(-16, 5, 4, 3 + flap, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F48FB1';
    ctx.beginPath(); ctx.ellipse(-16, 6.5, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(150,210,255,0.85)';
    const d = (t * 1.5) % 1;
    ctx.beginPath(); ctx.ellipse(-14, 9 + d * 7, 1.5, 2 + d * 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  blender(ctx, x, y, o = {}) {                        // anchor: bottom-centre, ~60×102
    const t = o.t || 0;
    ctx.save(); ctx.translate(x + Math.sin(t * 70) * 1.2, y);
    ctx.lineJoin = 'round';
    // whirr lines
    ctx.strokeStyle = 'rgba(59,42,20,0.45)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 12 + i));
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(0, -60, 38 + i * 6, -0.5, 0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -60, 38 + i * 6, Math.PI - 0.5, Math.PI + 0.5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // base
    ctx.fillStyle = '#E84A5F'; ctx.strokeStyle = '#9E2A3A'; ctx.lineWidth = 2;
    rr(ctx, -27, -30, 54, 30, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -15, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9E2A3A'; ctx.beginPath(); ctx.moveTo(0, -15);
    ctx.lineTo(Math.cos(t * 3) * 5, -15 + Math.sin(t * 3) * 5); ctx.stroke();
    ctx.fillStyle = Math.sin(t * 20) > 0 ? '#9ED99B' : '#4CAF50';
    ctx.beginPath(); ctx.arc(16, -15, 3, 0, Math.PI * 2); ctx.fill();
    // jar
    const jar = () => { ctx.beginPath(); ctx.moveTo(-22, -30); ctx.lineTo(-28, -90); ctx.lineTo(28, -90); ctx.lineTo(22, -30); ctx.closePath(); };
    jar(); ctx.fillStyle = 'rgba(200,235,255,0.55)'; ctx.fill();
    ctx.save(); jar(); ctx.clip();
    ctx.fillStyle = '#FFE27A';                         // banana smoothie, sloshing
    ctx.beginPath(); ctx.moveTo(-30, -30);
    for (let xx = -30; xx <= 30; xx += 4) ctx.lineTo(xx, -64 + Math.sin(xx * 0.25 + t * 18) * 4);
    ctx.lineTo(30, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(245,183,0,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, -46, 10, t * 16, t * 16 + 2.5); ctx.stroke();
    ctx.restore();
    // blades blur
    ctx.fillStyle = 'rgba(140,140,155,0.9)';
    ctx.beginPath(); ctx.ellipse(0, -36, Math.max(2, 17 * Math.abs(Math.cos(t * 45))), 2.5, 0, 0, Math.PI * 2); ctx.fill();
    jar(); ctx.strokeStyle = '#7FA8C0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-20, -84, 4, 46);
    // handle
    ctx.strokeStyle = '#9EC3D8'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(25, -80); ctx.quadraticCurveTo(42, -72, 26, -46); ctx.stroke();
    // lid
    ctx.fillStyle = '#3B3B48';
    rr(ctx, -31, -98, 62, 10, 4); ctx.fill();
    rr(ctx, -8, -105, 16, 8, 3); ctx.fill();
    ctx.restore();
  },

  bowls(ctx, x, y, o = {}) {                          // anchor: bottom-centre; opts.n = 2-3
    const n = o.n || 2, t = o.t || 0;
    const cols = [['#7EC8E3', '#4A9CBF'], ['#F7A1C4', '#D06A97'], ['#9ED99B', '#5FAE5B'], ['#FFB86B', '#D9852E']];
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < n; i++) {
      const bw = 76 - i * 10, h = 24, by = -i * h;
      ctx.save();
      ctx.translate(Math.sin(t * 5 + i) * i * 1.2, 0);
      const [c, d] = cols[(i + (o.seed || 0)) % cols.length];
      ctx.fillStyle = c; ctx.strokeStyle = d; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-bw / 2, by);
      ctx.bezierCurveTo(-bw / 2, by - h * 1.25, bw / 2, by - h * 1.25, bw / 2, by);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      rr(ctx, -bw / 2 - 3, by - 5, bw + 6, 6, 3); ctx.fillStyle = d; ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.ellipse(-bw * 0.18, by - h * 0.62, bw * 0.16, 3, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  /* ---------- Finish-line banner (anchor: ground, centre) ---------- */
  finishBanner(ctx, x, y, o = {}) {
    const t = o.t || 0;
    ctx.save(); ctx.translate(x, y);
    // poles
    ctx.fillStyle = '#B9844A'; ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 2;
    rr(ctx, -84, -250, 10, 250, 4); ctx.fill(); ctx.stroke();
    rr(ctx, 74, -250, 10, 250, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath(); ctx.arc(-79, -254, 8, 0, Math.PI * 2); ctx.arc(79, -254, 8, 0, Math.PI * 2); ctx.fill();
    // checkered cloth with a gentle wave
    const cols = 12, rows = 2, cw = 148 / cols, chh = 15;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wy = Math.sin(t * 6 + c * 0.6) * 3;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#222' : '#fff';
        ctx.fillRect(-74 + c * cw, -244 + r * chh + wy, cw + 0.5, chh + 0.5);
      }
    }
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    ctx.strokeRect(-74, -244, 148, rows * chh);
    // sign
    ctx.fillStyle = COLORS.yellow; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3;
    rr(ctx, -62, -206, 124, 34, 12); ctx.fill(); ctx.stroke();
    text(ctx, `LEVEL ${o.level || 2}`, 0, -188, 20, COLORS.ink);
    // bunting
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = CONFETTI[i % CONFETTI.length];
      const bx = -66 + i * 22, by = -170 + Math.sin(i * 0.9) * 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 16, by); ctx.lineTo(bx + 8, by + 14); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  /* ---------- HUD banana icon (anchor: centre). opts.stage, opts.on ---------- */
  bananaIcon(ctx, x, y, o = {}) {
    const st = STAGES[o.stage || 0];
    ctx.save(); ctx.translate(x, y);
    const s = o.scale || 1; ctx.scale(s, s); ctx.rotate(-0.35);
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(-14, -4);
      ctx.quadraticCurveTo(0, 16, 15, -7);
      ctx.quadraticCurveTo(2, 4, -14, -4);
      ctx.closePath();
    };
    shape();
    ctx.fillStyle = o.on ? st.body : 'rgba(180,170,140,0.25)';
    ctx.fill();
    if (o.on && (o.stage || 0) >= 2) {
      ctx.save(); shape(); ctx.clip();
      ctx.fillStyle = 'rgba(92,56,22,0.8)';
      const big = (o.stage || 0) >= 3;
      for (const [sx, sy] of [[-6, 2], [2, 4], [8, 0], [-1, 6]]) {
        ctx.beginPath(); ctx.arc(sx, sy, big ? 2 : 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.strokeStyle = o.on ? COLORS.ink : 'rgba(120,110,80,0.45)';
    ctx.lineWidth = 2; shape(); ctx.stroke();
    ctx.fillStyle = o.on ? '#3B2410' : 'rgba(120,110,80,0.45)';
    ctx.beginPath(); ctx.arc(15, -7, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  /* ---------- BACKGROUND PIECES ---------- */
  bananaTree(ctx, x, y, o = {}) {                     // anchor: base of trunk
    const s = o.scale || 1, sway = Math.sin((o.t || 0) * 0.8 + x * 0.01) * 0.04;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.globalAlpha *= o.alpha ?? 0.6;
    ctx.strokeStyle = '#B9A06C'; ctx.lineCap = 'round';
    ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-6, -70, 6, -130); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(140,110,60,0.5)';
    for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-6, -i * 22); ctx.lineTo(6, -i * 22 - 3); ctx.stroke(); }
    ctx.translate(6, -130); ctx.rotate(sway);
    const leaf = (ang, len, wid, c) => {
      ctx.save(); ctx.rotate(ang);
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.5, -wid, len, wid * 0.4);
      ctx.quadraticCurveTo(len * 0.5, wid * 0.5, 0, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(80,120,40,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(len * 0.5, -wid * 0.25, len, wid * 0.4); ctx.stroke();
      ctx.restore();
    };
    leaf(-2.7, 80, 22, '#9DC46A'); leaf(-0.4, 80, 22, '#9DC46A');
    leaf(-2.1, 70, 18, '#B3D67E'); leaf(-1.0, 70, 18, '#B3D67E');
    leaf(-1.57, 60, 16, '#A6CD72');
    // banana bunch
    ctx.fillStyle = '#F5D04A';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.ellipse(-8 + i * 5, 18 + (i % 2) * 4, 4, 11, 0.3 - i * 0.15, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  },

  fruitBowl(ctx, x, y) {                              // anchor: bottom-centre (on counter)
    ctx.save(); ctx.translate(x, y);
    // fruit
    const fruit = [[-16, -26, 11, '#E84A5F'], [14, -25, 11, '#FFA53A'], [0, -32, 11, '#9ED99B'], [-4, -22, 10, '#FFB86B']];
    for (const [fx, fy, r, c] of fruit) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(fx, fy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(fx - 3, fy - 4, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = COLORS.yellow; ctx.strokeStyle = '#C9A030'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -40); ctx.quadraticCurveTo(10, -28, 30, -44); ctx.quadraticCurveTo(12, -34, -6, -40); ctx.fill(); ctx.stroke();
    // bowl
    ctx.fillStyle = '#7EC8E3';
    ctx.beginPath(); ctx.moveTo(-32, -20); ctx.quadraticCurveTo(-28, 0, 0, 0); ctx.quadraticCurveTo(28, 0, 32, -20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4A9CBF'; rr(ctx, -34, -22, 68, 5, 2.5); ctx.fill();
    ctx.restore();
  },

  utensilJar(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#B9844A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(-14, -62); ctx.stroke();
    ctx.fillStyle = '#B9844A'; ctx.beginPath(); ctx.ellipse(-15, -66, 6, 9, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#9AA0A8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(4, -30); ctx.lineTo(8, -64); ctx.stroke();
    ctx.strokeStyle = '#E84A5F'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(2, -58); ctx.stroke();
    ctx.fillStyle = '#E84A5F'; rr(ctx, -6, -66, 16, 10, 3); ctx.fill();
    ctx.fillStyle = '#F7A1C4'; rr(ctx, -15, -34, 30, 34, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(-10, -28, 4, 22);
    ctx.restore();
  },

  bananaBunch(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(-0.5 + i * 0.3);
      ctx.fillStyle = i % 2 ? '#FFD93B' : '#F7CB2E'; ctx.strokeStyle = '#C9A030'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.quadraticCurveTo(-26, -14, -30, -40);
      ctx.quadraticCurveTo(-14, -22, 4, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#6B4423'; ctx.beginPath(); ctx.arc(0, -6, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },

  kettle(ctx, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#9ED99B'; ctx.strokeStyle = '#5FAE5B'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-20, 0); ctx.quadraticCurveTo(-24, -34, 0, -36); ctx.quadraticCurveTo(24, -34, 20, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, -14); ctx.lineTo(32, -26); ctx.lineTo(30, -20); ctx.lineTo(19, -6); ctx.fill();
    ctx.strokeStyle = '#3B3B48'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, -36, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.fillStyle = '#3B3B48'; ctx.beginPath(); ctx.arc(0, -38, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  },
};


/* =====================================================================
   5. ENTITIES
   ===================================================================== */

/** The cool banana. Position (x, y) is the point between its feet. */
class Player {
  constructor() { this.reset(); }

  reset() {
    this.x = PLAYER_X; this.y = GROUND_Y;
    this.vy = 0; this.onGround = true; this.jumps = 0;
    this.holding = false; this.holdT = 0; this.jumpBuffer = 0;
    this.stage = 0;
    this.animT = 0; this.frame = 0;
    this.sx = 1; this.sy = 1;          // squash & stretch
    this.hurt = 0; this.tooCool = 0;
  }

  pressJump() { this.holding = true; this.jumpBuffer = 0.12; }
  releaseJump() { this.holding = false; }

  tryJump(game) {
    if (this.jumpBuffer <= 0) return;
    if (this.onGround) {
      this.vy = -CFG.jumpV; this.onGround = false; this.jumps = 1;
      this.sx = 0.78; this.sy = 1.25; this.holdT = 0;
      Sound.jump(false);
      game.burst(this.x, this.y, 6, { kind: 'dust', color: '#E8C99A', vy: -60, spread: 90, life: 0.4, size: 5 });
    } else if (this.jumps < 2) {
      this.vy = -CFG.doubleJumpV; this.jumps = 2;
      this.sx = 0.85; this.sy = 1.2; this.holdT = 0;
      Sound.jump(true);
      game.burst(this.x, this.y - 10, 8, { kind: 'spark', color: '#FFFFFF', spread: 160, life: 0.35, size: 5 });
    } else return;
    this.jumpBuffer = 0;
  }

  update(dt, game) {
    this.jumpBuffer -= dt;
    this.tryJump(game);

    // Variable jump height: lighter gravity while held (for a short time)
    const holdingUp = this.holding && this.vy < 0 && this.holdT < CFG.maxHold;
    if (!this.onGround) this.holdT += dt;
    this.vy += (holdingUp ? CFG.holdGravity : CFG.gravity) * dt;
    this.y += this.vy * dt;

    if (this.y >= GROUND_Y) {
      if (!this.onGround) {                 // landing squash
        const impact = clamp(this.vy / 1400, 0.15, 0.4);
        this.sx = 1 + impact; this.sy = 1 - impact;
        game.burst(this.x, GROUND_Y, 5, { kind: 'dust', color: '#E8C99A', vy: -40, spread: 120, life: 0.35, size: 4 });
      }
      this.y = GROUND_Y; this.vy = 0; this.onGround = true; this.jumps = 0;
    } else {
      this.onGround = false;
    }
    if (this.y < 70) { this.y = 70; if (this.vy < 0) this.vy = 0; }

    // ease squash/stretch back to normal
    const k = Math.min(1, dt * 11);
    this.sx += (1 - this.sx) * k; this.sy += (1 - this.sy) * k;
    if (!this.onGround) {           // gentle stretch while rising, squash while falling
      this.sy += clamp(-this.vy / 9000, -0.05, 0.08) * k; this.sx -= clamp(-this.vy / 9000, -0.05, 0.08) * k;
    }

    if (this.onGround) {
      this.animT += dt * 9 * (game.speed / CFG.startSpeed);
      this.frame = Math.floor(this.animT) % 3;
    }
    this.hurt = Math.max(0, this.hurt - dt);
    this.tooCool = Math.max(0, this.tooCool - dt);
  }

  /** Forgiving hitbox: noticeably smaller than the drawn banana. */
  hitbox() { return { x: this.x - 14, y: this.y - 94, w: 28, h: 74 }; }

  draw(ctx, time) {
    // ground shadow
    const hgt = clamp((GROUND_Y - this.y) / 250, 0, 1);
    ctx.fillStyle = `rgba(90,55,20,${0.22 * (1 - hgt * 0.6)})`;
    ctx.beginPath(); ctx.ellipse(this.x + 4, GROUND_Y + 3, 24 * (1 - hgt * 0.5), 5, 0, 0, Math.PI * 2); ctx.fill();

    let alpha = 1;
    if (this.hurt > 0 && this.stage < 4) alpha = Math.floor(this.hurt * 14) % 2 ? 0.35 : 1;
    const glow = this.tooCool > 0 ? 0.75 + 0.25 * Math.sin(time * 14) : 0;
    SPRITES.banana(ctx, this.x, this.y, {
      stage: this.stage, pose: this.onGround ? 'run' : 'jump', frame: this.frame,
      sx: this.sx, sy: this.sy, alpha, glow,
      rot: this.onGround ? 0 : clamp(this.vy / 4000, -0.12, 0.15),
    });
  }
}

/** Hazards. Ground types anchor bottom-centre; flies anchor at centre. */
class Obstacle {
  constructor(type, x, opts = {}) {
    this.type = type; this.x = x; this.t = rand(0, 10);
    this.smashed = false; this.hit = false;
    this.vx = 0; this.vy = 0; this.rot = 0; this.spin = 0; this.roll = 0;
    this.extraSpeed = 0;
    switch (type) {
      case 'rollingPin': this.y = GROUND_Y; this.extraSpeed = 70; break;
      case 'blender':    this.y = GROUND_Y; break;
      case 'bowls':      this.y = GROUND_Y; this.n = opts.n || 2; this.seed = randInt(0, 3); break;
      case 'fruitFly':
        this.baseY = opts.high ? GROUND_Y - 165 : GROUND_Y - 52;
        this.amp = opts.high ? 22 : 14;
        this.y = this.baseY; this.extraSpeed = 40; this.high = !!opts.high;
        break;
    }
  }

  get top() {   // approximate visual top (used to place reward arcs)
    switch (this.type) {
      case 'rollingPin': return this.y - 26;
      case 'blender': return this.y - 105;
      case 'bowls': return this.y - this.n * 24 - 6;
      default: return this.y - 20;
    }
  }

  hitbox() {
    const x = this.x, y = this.y;
    switch (this.type) {
      case 'rollingPin': return { x: x - 34, y: y - 22, w: 68, h: 20 };
      case 'blender':    return { x: x - 21, y: y - 92, w: 42, h: 88 };
      case 'bowls':      return { x: x - 30, y: y - this.n * 24 + 6, w: 60, h: this.n * 24 - 8 };
      case 'fruitFly':   return { x: x - 15, y: y - 10, w: 30, h: 20 };
    }
  }

  update(dt, speed) {
    this.t += dt;
    if (this.smashed) {                       // flung off-screen by Too Cool mode
      this.x += this.vx * dt; this.y += this.vy * dt;
      this.vy += 2200 * dt; this.rot += this.spin * dt;
      return;
    }
    const v = speed + this.extraSpeed;
    this.x -= v * dt;
    if (this.type === 'rollingPin') this.roll += (v * dt) / 13;
    if (this.type === 'fruitFly') this.y = this.baseY + Math.sin(this.t * 3.4) * this.amp;
  }

  get dead() { return this.x < -160 || this.y > H + 250 || this.x > W + 400; }

  draw(ctx) {
    ctx.save();
    if (this.smashed) {
      const cy = this.type === 'fruitFly' ? this.y : this.y - 30;
      ctx.translate(this.x, cy); ctx.rotate(this.rot); ctx.translate(-this.x, -cy);
    }
    const o = { t: this.t, roll: this.roll, n: this.n, seed: this.seed };
    SPRITES[this.type](ctx, this.x, this.y, o);
    ctx.restore();
  }
}

/** Points and power-ups. Anchored at centre. */
class Collectible {
  static FOODS = ['chip', 'peanutButter', 'syrup', 'honey'];

  constructor(kind, x, y) {
    this.kind = kind; this.x = x; this.y = y;
    this.t = rand(0, 6); this.taken = false;
    this.isPower = kind === 'throneIcon' || kind === 'snowflake';
    this.r = this.isPower ? 24 : 16;
  }
  update(dt, speed) { this.t += dt; this.x -= speed * dt; }
  get drawY() { return this.y + Math.sin(this.t * 4) * (this.isPower ? 6 : 3); }
  get dead() { return this.x < -60 || this.taken; }
  hits(box) {     // circle vs rect
    const cx = clamp(this.x, box.x, box.x + box.w), cy = clamp(this.drawY, box.y, box.y + box.h);
    const dx = this.x - cx, dy = this.drawY - cy;
    return dx * dx + dy * dy < this.r * this.r;
  }
  draw(ctx) { SPRITES[this.kind](ctx, this.x, this.drawY, { t: this.t }); }
}

/** Sparkles, confetti, dust and debris. */
class Particle {
  constructor(x, y, o = {}) {
    this.x = x; this.y = y;
    this.vx = o.vx ?? 0; this.vy = o.vy ?? 0;
    this.g = o.g ?? 0; this.drag = o.drag ?? 0;
    this.life = this.maxLife = o.life ?? 0.6;
    this.color = o.color || '#fff'; this.size = o.size || 4;
    this.kind = o.kind || 'spark';
    this.scroll = o.scroll ?? 1;              // how much it drifts with the world
    this.rot = rand(0, Math.PI * 2); this.vr = rand(-10, 10);
  }
  update(dt, speed) {
    this.life -= dt;
    this.vy += this.g * dt;
    const d = Math.max(0, 1 - this.drag * dt);
    this.vx *= d; this.vy *= d;
    this.x += (this.vx - speed * this.scroll) * dt; this.y += this.vy * dt;
    this.rot += this.vr * dt;
  }
  get dead() { return this.life <= 0 || this.y > H + 40; }
  draw(ctx) {
    const a = clamp(this.life / this.maxLife, 0, 1);
    ctx.save();
    ctx.fillStyle = this.color;
    switch (this.kind) {
      case 'confetti':
        ctx.globalAlpha = Math.min(1, a * 3);
        ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.scale(1, Math.abs(Math.cos(this.rot * 1.3)) + 0.15);
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
        break;
      case 'dust':
        ctx.globalAlpha = a * 0.8;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size * (1.5 - a * 0.5), 0, Math.PI * 2); ctx.fill();
        break;
      case 'chunk':
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        rr(ctx, -this.size / 2, -this.size / 2, this.size, this.size, this.size * 0.3); ctx.fill();
        break;
      default: // 'spark'
        ctx.globalAlpha = a;
        SPRITES.star(ctx, this.x, this.y, this.size * (0.5 + a * 0.7), 4, 0.38, this.rot * 0.3); ctx.fill();
    }
    ctx.restore();
  }
}

/** "+10" style popups that float upward and fade. */
class FloatText {
  constructor(x, y, str, color = COLORS.ink, size = 22) {
    this.x = x; this.y = y; this.str = str; this.color = color; this.size = size;
    this.life = this.maxLife = 0.9;
  }
  update(dt, speed) { this.life -= dt; this.y -= 60 * dt; this.x -= speed * 0.3 * dt; }
  get dead() { return this.life <= 0; }
  draw(ctx) {
    const a = clamp(this.life / this.maxLife, 0, 1);
    const pop = 1 + Math.max(0, (a - 0.8)) * 2.5;
    ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.6);
    text(ctx, this.str, this.x, this.y, this.size * pop, this.color, { stroke: '#fff', strokeW: 5 });
    ctx.restore();
  }
}

/** Checkered finish-line banner that scrolls past every 1,000 points. */
class Banner {
  constructor(x, level) { this.x = x; this.level = level; this.t = 0; this.passed = false; }
  update(dt, speed) { this.t += dt; this.x -= speed * dt; }
  get dead() { return this.x < -140; }
  draw(ctx) { SPRITES.finishBanner(ctx, this.x, GROUND_Y, { level: this.level, t: this.t }); }
}


/* =====================================================================
   6. GAME
   ===================================================================== */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.k = 1;                                   // logical->backing-store scale
    this.best = parseInt(Store.get('tgb_best', '0'), 10) || 0;
    this.state = 'title';                         // title | playing | paused | dying | gameover
    this.time = 0;
    this.bgDist = 0;                              // drives parallax (also on title screen)
    this.player = new Player();
    this.buttons = {
      pause: { x: W - 106, y: 92, w: 42, h: 42 },
      mute:  { x: W - 56,  y: 92, w: 42, h: 42 },
      again: { x: W / 2 - 120, y: 404, w: 240, h: 60 },
    };
    this.hover = null;
    this.resetRun();
  }

  /* ---------- run lifecycle ---------- */
  resetRun() {
    this.player.reset();
    this.obstacles = []; this.items = []; this.particles = []; this.texts = []; this.banners = [];
    this.score = 0; this.elapsed = 0; this.speed = CFG.startSpeed;
    this.level = 1; this.nextLevelAt = CFG.levelEvery;
    this.nextObstacle = 520;                      // px until next spawn
    this.powerTimer = rand(14, 20);               // seconds until a throne may appear
    this.snowTimer = rand(28, 40);
    this.shakeT = 0; this.shakeDur = 0.0001; this.shakeMag = 0;
    this.msg = null; this.newBest = false; this.dyingT = 0; this.goT = 0;
  }

  start() {
    this.resetRun();
    this.state = 'playing';
    Sound.click();
  }

  togglePause() {
    if (this.state === 'playing') { this.state = 'paused'; this.player.releaseJump(); }
    else if (this.state === 'paused') { this.state = 'playing'; }
  }

  toggleMute() { Sound.init(); Sound.setMuted(!Sound.muted); Sound.click(); }

  /* ---------- input ---------- */
  onPress() {
    Sound.init();
    switch (this.state) {
      case 'title': this.start(); break;
      case 'playing': this.player.pressJump(); break;
      case 'paused': this.togglePause(); break;
      case 'gameover': if (this.goT > 0.7) this.start(); break;
    }
  }
  onRelease() { this.player.releaseJump(); }

  /** Returns true if the pointer hit a UI button. */
  handleButtons(p) {
    const inside = b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    if (inside(this.buttons.mute)) { this.toggleMute(); return true; }
    if ((this.state === 'playing' || this.state === 'paused') && inside(this.buttons.pause)) {
      Sound.init(); this.togglePause(); return true;
    }
    if (this.state === 'gameover' && inside(this.buttons.again)) {
      if (this.goT > 0.3) this.start();
      return true;
    }
    return false;
  }

  /* ---------- effects ---------- */
  shake(mag, dur) { if (mag >= this.shakeMag * (this.shakeT / this.shakeDur)) { this.shakeMag = mag; this.shakeT = this.shakeDur = dur; } }

  burst(x, y, n, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.3, 1) * (o.spread ?? 150);
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0),
        g: o.g ?? 0, drag: o.drag ?? 2, life: (o.life ?? 0.6) * rand(0.7, 1.2),
        color: Array.isArray(o.color) ? pick(o.color) : o.color, size: (o.size ?? 4) * rand(0.7, 1.3),
        kind: o.kind, scroll: o.scroll,
      }));
    }
  }

  confetti(n = 110) {
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle(rand(0, W), rand(-60, -10), {
        vx: rand(-80, 80), vy: rand(60, 260), g: 260, drag: 0.6, life: rand(2, 3.2),
        color: pick(CONFETTI), size: rand(8, 13), kind: 'confetti', scroll: 0,
      }));
    }
    // plus two cannons from the bottom corners
    for (let i = 0; i < 40; i++) {
      const side = i % 2 ? 1 : -1;
      this.particles.push(new Particle(side < 0 ? 20 : W - 20, GROUND_Y, {
        vx: -side * rand(150, 420), vy: rand(-900, -500), g: 900, drag: 0.8, life: rand(1.6, 2.4),
        color: pick(CONFETTI), size: rand(8, 12), kind: 'confetti', scroll: 0,
      }));
    }
  }

  popMessage(title, sub, color = COLORS.ink, dur = 1.6) { this.msg = { title, sub, color, t: 0, dur }; }

  /* ---------- spawning ---------- */
  spawnObstacle() {
    const x = W + 90;
    const e = this.elapsed;
    // Unlock harder hazards over time
    const pool = ['rollingPin', 'rollingPin', 'bowls'];
    if (e > 8) pool.push('fruitFly', 'bowls');
    if (e > 16) pool.push('blender', 'fruitFly');
    if (e > 35) pool.push('blender');
    const type = pick(pool);
    const opts = {};
    if (type === 'bowls') opts.n = e > 25 && Math.random() < 0.5 ? 3 : 2;
    if (type === 'fruitFly') opts.high = Math.random() < 0.4;
    const ob = new Obstacle(type, x, opts);
    this.obstacles.push(ob);

    // Distance to the next obstacle grows with speed so jumps stay fair.
    const minGap = 330 + this.speed * 0.55;
    const gap = rand(minGap, minGap + 380);
    this.nextObstacle = gap;

    // Rewards: a powerup, an arc of goodies over the hazard, or a row in the gap.
    const midX = x + gap * 0.5;
    if (this.powerTimer <= 0) {
      this.items.push(new Collectible('throneIcon', midX, GROUND_Y - 150));
      this.powerTimer = rand(20, 30);
    } else if (this.snowTimer <= 0 && this.player.stage > 0) {
      this.items.push(new Collectible('snowflake', midX, GROUND_Y - 160));
      this.snowTimer = rand(30, 45);
    } else if (type === 'fruitFly' && ob.high) {
      this.row(x - 60, GROUND_Y - 32, 4);                 // stay low under the high fly
    } else if (type !== 'fruitFly' && Math.random() < 0.5) {
      const n = randInt(3, 5), top = ob.top - 50;
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : i / (n - 1);
        this.items.push(new Collectible(pick(Collectible.FOODS), x - 70 + u * 140, top - Math.sin(u * Math.PI) * 45));
      }
    } else if (Math.random() < 0.75) {
      this.row(midX - 60, GROUND_Y - (Math.random() < 0.5 ? 32 : 130), randInt(3, 4));
    }
  }

  row(x, y, n) {
    const kind = pick(Collectible.FOODS);
    for (let i = 0; i < n; i++) this.items.push(new Collectible(kind, x + i * 40, y));
  }

  /* ---------- gameplay events ---------- */
  takeHit(ob) {
    const p = this.player;
    ob.hit = true;
    p.stage++;
    p.hurt = CFG.hurtTime;
    p.sx = 1.35; p.sy = 0.7;
    this.shake(9, 0.35);
    Sound.hit();
    this.burst(p.x + 4, p.y - 40, 14, { kind: 'dust', color: ['#F7CB2E', '#D9A43A', '#FFF2A8'], spread: 260, g: 600, life: 0.6, size: 6 });
    if (p.stage >= 4) { this.die(); return; }
    this.popMessage('SQUISH!', `Now ${STAGES[p.stage].name.toLowerCase()}…`, '#C0392B', 1.2);
  }

  smash(ob) {
    ob.smashed = true;
    ob.vx = rand(350, 650); ob.vy = rand(-950, -650); ob.spin = rand(-14, 14);
    this.score += CFG.smashPoints;
    this.texts.push(new FloatText(ob.x, ob.top, `SMASH! +${CFG.smashPoints}`, COLORS.goldDark, 22));
    this.shake(5, 0.18);
    Sound.smash();
    this.burst(ob.x, ob.top + 20, 16, { kind: 'chunk', color: ['#F5B700', '#FFE27A', '#ffffff'], spread: 380, g: 900, life: 0.7, size: 7 });
  }

  collect(it) {
    it.taken = true;
    const p = this.player;
    if (it.kind === 'throneIcon') {
      p.tooCool = CFG.tooCoolTime;
      Sound.powerUp();
      this.popMessage('TOO COOL!', 'Smash everything for 5 seconds', COLORS.goldDark);
      this.burst(it.x, it.drawY, 26, { kind: 'spark', color: ['#FFD93B', '#F5B700', '#fff'], spread: 320, life: 0.8, size: 8 });
      this.shake(4, 0.2);
    } else if (it.kind === 'snowflake') {
      Sound.freeze();
      if (p.stage > 0) { p.stage--; this.popMessage('FREEZER FRESH!', `Back to ${STAGES[p.stage].name.toLowerCase()}`, '#2A86B5'); }
      else { this.score += 50; this.texts.push(new FloatText(it.x, it.drawY - 20, '+50', '#2A86B5')); }
      this.burst(it.x, it.drawY, 26, { kind: 'spark', color: ['#ffffff', '#BDE7F7', '#7EC8E3'], spread: 300, life: 0.9, size: 8 });
    } else {
      this.score += CFG.pickupPoints;
      Sound.pickup();
      this.texts.push(new FloatText(it.x, it.drawY - 18, `+${CFG.pickupPoints}`, '#C47A00'));
      this.burst(it.x, it.drawY, 9, { kind: 'spark', color: ['#FFD93B', '#ffffff', '#FFE27A'], spread: 170, life: 0.5, size: 6 });
    }
  }

  die() {
    this.state = 'dying';
    this.dyingT = 0;
    this.player.releaseJump();
    Sound.gameOver();
    this.shake(14, 0.6);
    const final = Math.floor(this.score);
    if (final > this.best) { this.best = final; this.newBest = true; Store.set('tgb_best', final); }
  }

  /* ---------- update ---------- */
  update(dt) {
    this.time += dt;
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.msg) { this.msg.t += dt; if (this.msg.t > this.msg.dur) this.msg = null; }

    if (this.state === 'title') { this.bgDist += 90 * dt; return; }
    if (this.state === 'paused') return;
    if (this.state === 'gameover') {
      this.goT += dt;
      this.updateEntities(dt, 0);
      return;
    }
    if (this.state === 'dying') {
      this.dyingT += dt;
      this.speed = Math.max(0, this.speed - this.speed * 4 * dt);
      this.bgDist += this.speed * dt;
      this.updateEntities(dt, this.speed);
      // Player gently settles to the ground while turning to mush
      const p = this.player;
      p.vy += CFG.gravity * dt; p.y = Math.min(GROUND_Y, p.y + p.vy * dt);
      if (p.y >= GROUND_Y) p.vy = 0;
      if (Math.random() < 0.5) this.burst(p.x + rand(-10, 15), p.y - rand(10, 80), 1, { kind: 'dust', color: 'rgba(107,68,35,0.6)', vy: -60, spread: 40, life: 0.6, size: 6, scroll: 0 });
      if (this.dyingT > 1.1) {
        this.state = 'gameover'; this.goT = 0;
        this.burst(p.x + 4, p.y - 40, 30, { kind: 'dust', color: ['#B8722F', '#9A5B26', '#F7E9B0'], spread: 300, life: 0.8, size: 9, scroll: 0 });
      }
      return;
    }

    // --- playing ---
    this.elapsed += dt;
    this.speed = Math.min(CFG.maxSpeed, CFG.startSpeed + CFG.speedGain * this.elapsed);
    const dist = this.speed * dt;
    this.bgDist += dist;
    this.score += dist * CFG.pointsPerPx;
    this.powerTimer -= dt; this.snowTimer -= dt;

    this.nextObstacle -= dist;
    if (this.nextObstacle <= 0) this.spawnObstacle();

    // Level-up banner every 1,000 points
    if (this.score >= this.nextLevelAt) {
      this.banners.push(new Banner(W + 120, Math.round(this.nextLevelAt / CFG.levelEvery) + 1));
      this.nextLevelAt += CFG.levelEvery;
    }

    const p = this.player;
    p.update(dt, this);
    this.updateEntities(dt, this.speed);

    // Trail sparkles in Too Cool mode
    if (p.tooCool > 0 && Math.random() < 0.6) {
      this.particles.push(new Particle(p.x + rand(-14, 10), p.y - rand(10, 80), {
        vx: rand(-40, 0), vy: rand(-40, 40), life: 0.5, color: pick(['#FFD93B', '#fff', '#F5B700']), size: 5, scroll: 0.6,
      }));
    }

    // Collisions
    const pb = p.hitbox();
    for (const ob of this.obstacles) {
      if (ob.smashed || ob.hit) continue;
      if (!overlap(pb, ob.hitbox())) continue;
      if (p.tooCool > 0) this.smash(ob);
      else if (p.hurt <= 0) { this.takeHit(ob); if (this.state !== 'playing') return; }
    }
    const grab = { x: pb.x - 6, y: pb.y - 6, w: pb.w + 12, h: pb.h + 12 };   // pickups are extra generous
    for (const it of this.items) if (!it.taken && it.hits(grab)) this.collect(it);

    // Banners: celebrate as the banana crosses the line
    for (const b of this.banners) {
      if (!b.passed && b.x <= p.x) {
        b.passed = true;
        this.level = b.level;
        Sound.levelUp();
        this.popMessage('LEVEL UP!', `Level ${b.level} — things are getting ripe!`, '#C47A00', 2);
        this.confetti();
      }
    }
  }

  updateEntities(dt, speed) {
    for (const list of [this.obstacles, this.items, this.particles, this.texts, this.banners]) {
      for (const e of list) e.update(dt, speed);
    }
    this.obstacles = this.obstacles.filter(e => !e.dead);
    this.items = this.items.filter(e => !e.dead);
    this.particles = this.particles.filter(e => !e.dead);
    this.texts = this.texts.filter(e => !e.dead);
    this.banners = this.banners.filter(e => !e.dead);
    if (this.particles.length > 600) this.particles.splice(0, this.particles.length - 600);
  }

  /* ---------- drawing ---------- */
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.k, 0, 0, this.k, 0, 0);
    ctx.save();
    if (this.shakeT > 0) {
      const m = this.shakeMag * (this.shakeT / this.shakeDur);
      ctx.translate(rand(-m, m), rand(-m, m));
    }
    this.drawBackground(ctx);

    if (this.state === 'title') {
      ctx.restore();
      this.drawTitle(ctx);
      return;
    }

    for (const b of this.banners) b.draw(ctx);
    for (const it of this.items) it.draw(ctx);
    for (const ob of this.obstacles) ob.draw(ctx);
    if (this.state !== 'gameover') this.player.draw(ctx, this.time);
    if (this.state === 'dying') {
      // melt to brown overlay
      const p = this.player;
      SPRITES.banana(ctx, p.x, p.y, { stage: 4, pose: 'run', sx: 1 + this.dyingT * 0.25, sy: 1 - this.dyingT * 0.3, alpha: clamp(this.dyingT * 1.4, 0, 1) });
    }
    for (const pt of this.particles) pt.draw(ctx);
    for (const t of this.texts) t.draw(ctx);
    ctx.restore();

    this.drawHUD(ctx);
    if (this.msg) this.drawMessage(ctx);
    if (this.state === 'paused') this.drawPause(ctx);
    if (this.state === 'gameover') this.drawGameOver(ctx);
  }

  drawBackground(ctx) {
    const d = this.bgDist;
    // Sky: warm cream with a soft sunny glow
    ctx.fillStyle = COLORS.cream; ctx.fillRect(-20, -20, W + 40, H + 40);
    const sun = ctx.createRadialGradient(560, 90, 10, 560, 90, 260);
    sun.addColorStop(0, 'rgba(255,225,110,0.55)'); sun.addColorStop(1, 'rgba(255,225,110,0)');
    ctx.fillStyle = sun; ctx.fillRect(0, 0, W, 380);
    ctx.save(); ctx.translate(560, 90); ctx.rotate(this.time * 0.15);
    ctx.fillStyle = 'rgba(255,217,59,0.35)';
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(-7, 52); ctx.lineTo(7, 52); ctx.lineTo(0, 82); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#FFE27A'; ctx.beginPath(); ctx.arc(560, 90, 42, 0, Math.PI * 2); ctx.fill();

    // fluffy clouds (very slow)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 330 - d * 0.05) % (W + 300) + W + 300) % (W + 300) - 150;
      const cy = 60 + hash(i) * 90;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.arc(cx + 24, cy - 10, 26, 0, Math.PI * 2);
      ctx.arc(cx + 52, cy, 20, 0, Math.PI * 2); ctx.rect(cx, cy, 52, 20); ctx.fill();
    }

    // Layer 1 (far): rolling hills + banana trees
    const hills = (off, base, amp, color, f) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 16; x += 16) {
        const wx = x + off;
        ctx.lineTo(x, base - amp * (0.6 * Math.sin(wx * f) + 0.4 * Math.sin(wx * f * 2.3 + 1.3)));
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    hills(d * 0.08, 330, 26, '#F1EDC4', 0.006);
    const farX = d * 0.18, tw = 210;
    for (let i = Math.floor(farX / tw) - 1; i <= Math.floor((farX + W) / tw) + 1; i++) {
      const x = i * tw - farX + hash(i) * 90;
      SPRITES.bananaTree(ctx, x, 372, { scale: 0.75 + hash(i + 3) * 0.45, t: this.time, alpha: 0.55 });
    }
    hills(d * 0.14, 360, 14, '#ECE6B4', 0.009);

    // Layer 2 (mid): kitchen counter with fruit bowls & friends
    const midX = d * 0.45, cw = 300;
    ctx.fillStyle = '#FFF1C2'; ctx.fillRect(0, 374, W, GROUND_Y - 374);           // cabinet face
    for (let i = Math.floor(midX / 150) - 1; i <= Math.floor((midX + W) / 150) + 1; i++) {
      const x = i * 150 - midX;
      ctx.fillStyle = '#FBE7A6'; ctx.strokeStyle = '#E8C873'; ctx.lineWidth = 2;
      rr(ctx, x + 10, 384, 130, 60, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#C9A04A'; ctx.beginPath(); ctx.arc(x + 75, 396, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#F6CF5A'; rr(ctx, -10, 362, W + 20, 14, 5); ctx.fill();        // countertop
    ctx.fillStyle = '#FFE27A'; ctx.fillRect(0, 362, W, 4);
    for (let i = Math.floor(midX / cw) - 1; i <= Math.floor((midX + W) / cw) + 1; i++) {
      const x = i * cw - midX + 40 + hash(i * 7) * 180;
      const kind = Math.floor(hash(i * 13 + 1) * 4);
      const fn = ['fruitBowl', 'utensilJar', 'bananaBunch', 'kettle'][kind];
      SPRITES[fn](ctx, x, 363);
    }
    ctx.fillStyle = 'rgba(120,80,30,0.12)'; ctx.fillRect(0, GROUND_Y - 8, W, 8);       // board shadow

    // Layer 3 (foreground): wooden cutting board ground strip
    const gx = d;
    ctx.fillStyle = '#DDA867'; ctx.fillRect(-20, GROUND_Y, W + 40, H - GROUND_Y + 20);
    ctx.fillStyle = '#ECC489'; ctx.fillRect(-20, GROUND_Y, W + 40, 9);
    ctx.fillStyle = '#B9834A'; ctx.fillRect(-20, GROUND_Y + 9, W + 40, 2);
    ctx.strokeStyle = 'rgba(160,100,40,0.5)'; ctx.lineWidth = 3;           // juice groove
    ctx.beginPath(); ctx.moveTo(-20, GROUND_Y + 22); ctx.lineTo(W + 20, GROUND_Y + 22); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,180,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-20, GROUND_Y + 25); ctx.lineTo(W + 20, GROUND_Y + 25); ctx.stroke();
    const tile = 220;
    for (let i = Math.floor(gx / tile) - 1; i <= Math.floor((gx + W) / tile) + 1; i++) {
      const x0 = i * tile - gx;
      ctx.strokeStyle = 'rgba(170,110,50,0.45)'; ctx.lineWidth = 2;
      for (let g = 0; g < 4; g++) {                                      // wood grain
        const y = GROUND_Y + 38 + g * 14 + hash(i * 5 + g) * 6;
        const len = 80 + hash(i * 3 + g) * 110, sx = x0 + hash(i * 11 + g) * 120;
        ctx.beginPath(); ctx.moveTo(sx, y); ctx.bezierCurveTo(sx + len * 0.3, y - 4, sx + len * 0.7, y + 4, sx + len, y); ctx.stroke();
      }
      if (hash(i * 17) > 0.45) {                                         // knot
        const kx = x0 + 40 + hash(i * 19) * 140, ky = GROUND_Y + 55 + hash(i * 23) * 20;
        ctx.strokeStyle = 'rgba(150,95,40,0.55)';
        ctx.beginPath(); ctx.ellipse(kx, ky, 12, 5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(kx, ky, 5, 2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,240,210,0.45)'; ctx.lineWidth = 1.5;   // knife nicks
      for (let n = 0; n < 2; n++) {
        const nx = x0 + hash(i * 29 + n) * tile, ny = GROUND_Y + 34 + hash(i * 31 + n) * 40;
        ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nx + 10, ny - 6); ctx.stroke();
      }
    }
  }

  drawPanel(ctx, x, y, w, h, r = 16) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    rr(ctx, x, y, w, h, r); ctx.fill();
    ctx.strokeStyle = '#F5C842'; ctx.lineWidth = 3; ctx.stroke();
  }

  drawButton(ctx, b, icon) {
    ctx.save();
    ctx.fillStyle = '#fff'; rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
    ctx.strokeStyle = '#F5C842'; ctx.lineWidth = 3; ctx.stroke();
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    ctx.fillStyle = COLORS.ink; ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (icon === 'pause') { rr(ctx, cx - 9, cy - 10, 6, 20, 2); ctx.fill(); rr(ctx, cx + 3, cy - 10, 6, 20, 2); ctx.fill(); }
    else if (icon === 'play') { ctx.beginPath(); ctx.moveTo(cx - 6, cy - 10); ctx.lineTo(cx + 10, cy); ctx.lineTo(cx - 6, cy + 10); ctx.closePath(); ctx.fill(); }
    else {
      ctx.beginPath(); ctx.moveTo(cx - 12, cy - 5); ctx.lineTo(cx - 6, cy - 5); ctx.lineTo(cx + 1, cy - 11);
      ctx.lineTo(cx + 1, cy + 11); ctx.lineTo(cx - 6, cy + 5); ctx.lineTo(cx - 12, cy + 5); ctx.closePath(); ctx.fill();
      if (icon === 'muted') {
        ctx.beginPath(); ctx.moveTo(cx + 5, cy - 6); ctx.lineTo(cx + 13, cy + 6); ctx.moveTo(cx + 13, cy - 6); ctx.lineTo(cx + 5, cy + 6); ctx.stroke();
      } else {
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx + 2, cy, 6, -0.9, 0.9); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + 2, cy, 11, -0.9, 0.9); ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawHUD(ctx) {
    const p = this.player;
    // Score (top-left)
    this.drawPanel(ctx, 14, 12, 214, 70);
    text(ctx, 'SCORE', 30, 30, 14, '#B08A2E', { align: 'left' });
    text(ctx, String(Math.floor(this.score)), 30, 58, 32, COLORS.ink, { align: 'left' });
    text(ctx, `BEST ${Math.max(this.best, Math.floor(this.score))}`, 214, 30, 13, '#B08A2E', { align: 'right' });
    text(ctx, `LV ${this.level}`, 214, 60, 18, '#C47A00', { align: 'right' });

    // Too Cool timer
    if (p.tooCool > 0) {
      const pct = p.tooCool / CFG.tooCoolTime;
      this.drawPanel(ctx, 14, 90, 214, 34, 12);
      text(ctx, 'TOO COOL', 28, 107, 14, COLORS.goldDark, { align: 'left' });
      ctx.fillStyle = '#FFF1C2'; rr(ctx, 112, 100, 104, 14, 7); ctx.fill();
      ctx.fillStyle = COLORS.gold; rr(ctx, 112, 100, Math.max(14, 104 * pct), 14, 7); ctx.fill();
    }

    // Ripeness meter (top-right): five bananas, green -> gone
    const mx = W - 262;
    this.drawPanel(ctx, mx, 12, 248, 72);
    for (let i = 0; i < 5; i++) {
      const on = i <= p.stage;
      const cur = i === p.stage;
      const bob = cur ? Math.sin(this.time * 6) * 2 : 0;
      const ix = mx + 30 + i * 47, iy = 38 + bob;
      if (cur) {
        ctx.fillStyle = i >= 3 ? 'rgba(232,74,95,0.18)' : 'rgba(255,217,59,0.35)';
        ctx.beginPath(); ctx.arc(ix, 38, 19, 0, Math.PI * 2); ctx.fill();
      }
      SPRITES.bananaIcon(ctx, ix, iy, { stage: i, on, scale: cur ? 1.15 : 0.95 });
    }
    const stName = STAGES[Math.min(p.stage, 4)].name;
    text(ctx, `RIPENESS: ${stName}`, mx + 124, 70, 13, p.stage >= 3 ? '#C0392B' : '#8A6A1E');

    // Buttons
    if (this.state === 'playing' || this.state === 'paused') this.drawButton(ctx, this.buttons.pause, this.state === 'paused' ? 'play' : 'pause');
    this.drawButton(ctx, this.buttons.mute, Sound.muted ? 'muted' : 'sound');
  }

  drawMessage(ctx) {
    const m = this.msg;
    const inT = clamp(m.t / 0.25, 0, 1);
    const outT = clamp((m.dur - m.t) / 0.3, 0, 1);
    const s = (1 - Math.pow(1 - inT, 3)) * (1 + Math.sin(inT * Math.PI) * 0.25);
    ctx.save();
    ctx.globalAlpha = outT;
    ctx.translate(W / 2, 200); ctx.scale(s, s); ctx.rotate(Math.sin(this.time * 5) * 0.03);
    text(ctx, m.title, 0, 0, 58, m.color === COLORS.ink ? COLORS.yellow : m.color, { stroke: '#fff', strokeW: 12 });
    if (m.sub) text(ctx, m.sub, 0, 46, 20, COLORS.ink, { stroke: '#fff', strokeW: 6 });
    ctx.restore();
  }

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(251,249,230,0.75)'; ctx.fillRect(0, 0, W, H);
    this.drawPanel(ctx, W / 2 - 200, 170, 400, 170, 26);
    text(ctx, 'Paused', W / 2, 225, 50, COLORS.ink, { stroke: COLORS.yellow, strokeW: 8 });
    text(ctx, 'Taking a cool break 😎', W / 2, 270, 18, '#8A6A1E');
    text(ctx, 'Press P / Esc or tap to resume', W / 2, 306, 17, COLORS.ink);
  }

  drawTitle(ctx) {
    const t = this.time;
    // Throne + lounging banana
    const tx = W / 2 + 185, ty = GROUND_Y;
    ctx.fillStyle = 'rgba(90,55,20,0.18)';
    ctx.beginPath(); ctx.ellipse(tx, ty + 3, 110, 9, 0, 0, Math.PI * 2); ctx.fill();
    SPRITES.titleArt(ctx, tx, ty + 2, { t });
    // twinkles around the throne
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const a = t * 0.8 + i * 1.26, r = 120 + Math.sin(t * 2 + i) * 10;
      const s = 4 + 3 * Math.abs(Math.sin(t * 3 + i));
      SPRITES.star(ctx, tx + Math.cos(a) * r, ty - 100 + Math.sin(a) * r * 0.6, s, 4, 0.35); ctx.fill();
    }

    // Title text (left side)
    const lx = 300;
    const bob = Math.sin(t * 2) * 4;
    ctx.save(); ctx.translate(lx, 92 + bob); ctx.rotate(-0.04);
    text(ctx, 'Totally Gone', 0, 0, 62, COLORS.yellow, { stroke: COLORS.ink, strokeW: 12 });
    text(ctx, 'Bananas', 0, 66, 78, COLORS.yellow, { stroke: COLORS.ink, strokeW: 14 });
    ctx.restore();
    // soft card behind the smaller text so it reads over the scenery
    ctx.fillStyle = 'rgba(255,253,240,0.82)'; rr(ctx, lx - 215, 260, 430, 108, 18); ctx.fill();
    ctx.save(); ctx.translate(lx, 228);
    ctx.fillStyle = '#9CCB3B'; rr(ctx, -150, -22, 300, 44, 22); ctx.fill();
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, 'From Green to Gone', 0, 1, 26, '#fff', { stroke: COLORS.ink, strokeW: 5 });
    ctx.restore();
    text(ctx, 'Recipes for every banana, from green to gone.', lx, 280, 16, '#8A6A1E');

    // Ripeness preview
    for (let i = 0; i < 5; i++) SPRITES.bananaIcon(ctx, lx - 96 + i * 48, 314, { stage: i, on: true, scale: 1.1 });
    text(ctx, 'Each bump ripens you. 4 bumps and you’re GONE!', lx, 348, 14, COLORS.ink);

    // Prompt on the cutting board
    const blink = 0.55 + 0.45 * Math.sin(t * 5);
    ctx.save(); ctx.globalAlpha = blink;
    text(ctx, 'Press Space or Tap to Start', W / 2, 496, 30, '#fff', { stroke: '#8A5A2A', strokeW: 8 });
    ctx.restore();
    text(ctx, 'Jump: Space / ↑ / Tap  •  Hold = higher  •  Double jump!  •  P = pause  •  M = mute', W / 2, 526, 13, '#6B4423');
    if (this.best > 0) text(ctx, `Best: ${this.best}`, 24, 28, 18, '#8A6A1E', { align: 'left' });
    this.drawButton(ctx, this.buttons.mute, Sound.muted ? 'muted' : 'sound');
  }

  drawGameOver(ctx) {
    const a = clamp(this.goT / 0.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(251,249,230,0.7)'; ctx.fillRect(0, 0, W, H);
    const py = 30 + (1 - a) * 40;
    ctx.translate(0, py - 30);
    this.drawPanel(ctx, W / 2 - 280, 30, 560, 474, 30);
    text(ctx, 'You went totally bananas!', W / 2, 82, 38, COLORS.yellow, { stroke: COLORS.ink, strokeW: 9 });
    text(ctx, 'Your banana went from green to gone… straight into the oven.', W / 2, 120, 15, '#8A6A1E');

    // loaf drops in with a bounce
    const d = clamp((this.goT - 0.2) / 0.6, 0, 1);
    const bounce = d < 1 ? (1 - Math.abs(Math.cos(d * Math.PI * 2.5)) * (1 - d)) : 1;
    ctx.save();
    ctx.translate(W / 2, 288);
    ctx.scale(0.4 + 0.6 * bounce, 0.4 + 0.6 * bounce + Math.sin(this.goT * 3) * 0.015);
    SPRITES.bananaBread(ctx, 0, 0, { t: this.goT, scale: 1 });
    ctx.restore();

    const final = Math.floor(this.score);
    text(ctx, `Score: ${final}`, W / 2 - 100, 330, 26, COLORS.ink);
    text(ctx, `Best: ${this.best}`, W / 2 + 100, 330, 26, COLORS.ink);
    if (this.newBest) {
      ctx.save(); ctx.translate(W / 2, 368); ctx.rotate(Math.sin(this.goT * 4) * 0.05);
      ctx.fillStyle = COLORS.red; rr(ctx, -80, -15, 160, 30, 15); ctx.fill();
      text(ctx, '★ NEW BEST! ★', 0, 1, 17, '#fff');
      ctx.restore();
    } else {
      text(ctx, `Level ${this.level} reached`, W / 2, 368, 17, '#8A6A1E');
    }

    // Play Again button
    const b = this.buttons.again;
    const hov = this.hover === 'again';
    const pulse = 1 + Math.sin(this.goT * 4) * 0.025;
    ctx.save();
    ctx.translate(b.x + b.w / 2, b.y + b.h / 2); ctx.scale(pulse * (hov ? 1.05 : 1), pulse * (hov ? 1.05 : 1));
    ctx.fillStyle = '#C9A030'; rr(ctx, -b.w / 2, -b.h / 2 + 5, b.w, b.h, 30); ctx.fill();
    ctx.fillStyle = COLORS.yellow; rr(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 30); ctx.fill();
    ctx.strokeStyle = COLORS.ink; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, 'Play Again', 0, 1, 28, COLORS.ink);
    ctx.restore();
    text(ctx, 'or press Space', W / 2, 486, 14, '#8A6A1E');
    ctx.restore();
  }
}


/* =====================================================================
   7. BOOT — responsive canvas, input wiring, delta-time main loop
   ===================================================================== */
const canvas = document.getElementById('game');
const game = new Game(canvas);

/** Fit the 16:9 canvas inside the window and render at device resolution. */
function resize() {
  const vv = window.visualViewport;
  const vw = vv ? vv.width : window.innerWidth;
  const vh = vv ? vv.height : window.innerHeight;
  const margin = (vw > 700 && vh > 420) ? 0.96 : 1;
  const scale = Math.min(vw / W, vh / H) * margin;
  const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  game.k = canvas.width / W;
}
window.addEventListener('resize', resize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
resize();

/** Convert a pointer event to logical (960×540) coordinates. */
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}

// Keyboard
const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);
window.addEventListener('keydown', e => {
  if (JUMP_KEYS.has(e.code)) {
    e.preventDefault();
    if (!e.repeat) game.onPress();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault(); Sound.init(); game.togglePause();
  } else if (e.code === 'KeyM') {
    game.toggleMute();
  } else if (e.code === 'Enter') {
    if (game.state === 'title' || game.state === 'gameover') game.onPress();
  }
});
window.addEventListener('keyup', e => { if (JUMP_KEYS.has(e.code)) game.onRelease(); });

// Pointer (mouse + touch + pen)
const activePointers = new Set();
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  Sound.init();
  if (game.handleButtons(toLogical(e))) return;
  activePointers.add(e.pointerId);
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  game.onPress();
});
const endPointer = e => {
  if (!activePointers.delete(e.pointerId)) return;
  if (activePointers.size === 0) game.onRelease();
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const p = toLogical(e), b = game.buttons.again;
  game.hover = (game.state === 'gameover' && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) ? 'again' : null;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });

// Auto-pause when the tab is hidden or loses focus
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') game.togglePause(); });
window.addEventListener('blur', () => { activePointers.clear(); game.onRelease(); if (game.state === 'playing') game.togglePause(); });

// Main loop: requestAnimationFrame + delta time (clamped so a hiccup can't teleport things)
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  game.update(dt);
  game.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
