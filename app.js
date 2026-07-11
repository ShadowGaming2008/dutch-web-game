import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion,
    collection, addDoc, query, orderBy, limit, getDocs, deleteField, serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getDatabase, ref, set, onDisconnect, onValue, remove, serverTimestamp as rtdbServerTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDTIz9LcVxLwJ4l5keMeSSAoCh2oTSWg9E",
  authDomain: "dutch-card-game-60d1c.firebaseapp.com",
  projectId: "dutch-card-game-60d1c",
  storageBucket: "dutch-card-game-60d1c.firebasestorage.app",
  messagingSenderId: "91699670709",
  appId: "1:91699670709:web:230f57e39f8f55128398fc",
  measurementId: "G-40FS16HJCN",
  // Realtime Database URL — used for presence/disconnect detection.
  databaseURL: "https://dutch-card-game-60d1c-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const rtdb = getDatabase(app);

// ==========================================
// Toast System
// ==========================================
function showToast(message, type = 'info', duration = NOTIFY_MS) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const configs = {
        info:    { bg: 'bg-slate-800 border-slate-600',   text: 'text-slate-100', icon: 'ℹ️' },
        success: { bg: 'bg-emerald-900 border-emerald-600', text: 'text-emerald-100', icon: '✅' },
        error:   { bg: 'bg-rose-900 border-rose-600',     text: 'text-rose-100',    icon: '❌' },
        warning: { bg: 'bg-amber-900 border-amber-600',   text: 'text-amber-100',   icon: '⚠️' },
        ability: { bg: 'bg-indigo-900 border-indigo-500', text: 'text-indigo-100',  icon: '⚡' },
    };
    const c = configs[type] || configs.info;
    toast.className = `toast-enter flex items-center gap-3 px-5 py-3.5 rounded-xl border-2 shadow-2xl text-[15px] leading-snug font-semibold ${c.bg} ${c.text}`;
    toast.innerHTML = `<span class="text-lg flex-shrink-0">${c.icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'all 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 320);
    }, duration);
}

// ==========================================
// Ability Flash — big dramatic announcement
// ==========================================
function flashAbility(icon, title, desc, colorClass = 'bg-slate-950 border-indigo-500') {
    const overlay = document.getElementById('abilityFlash');
    const content = document.getElementById('abilityFlashContent');
    const iconEl = document.getElementById('abilityFlashIcon');
    const titleEl = document.getElementById('abilityFlashTitle');
    const descEl = document.getElementById('abilityFlashDesc');

    iconEl.textContent = icon;
    titleEl.textContent = title;
    descEl.textContent = desc;
    content.className = `text-center space-y-2 p-8 rounded-3xl border-2 shadow-2xl transition-all duration-300 ${colorClass}`;

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => {
        content.style.opacity = '1';
        content.style.transform = 'scale(1)';
    });

    setTimeout(() => {
        content.style.opacity = '0';
        content.style.transform = 'scale(0.9)';
        setTimeout(() => {
            overlay.classList.add('hidden');
            content.style.opacity = '0';
            content.style.transform = 'scale(0.9)';
        }, 300);
    }, NOTIFY_MS);
}

// ==========================================
// Confirm modals
// ==========================================
function showConfirm(message, subtext = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
                <p class="text-white font-bold text-lg leading-snug">${message}</p>
                ${subtext ? `<p class="text-slate-400 text-sm">${subtext}</p>` : ''}
                <div class="flex gap-3 pt-2">
                    <button class="cancel-btn flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition">Cancel</button>
                    <button class="confirm-btn flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition">Confirm</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.confirm-btn').onclick = () => { overlay.remove(); resolve(true); };
        overlay.querySelector('.cancel-btn').onclick = () => { overlay.remove(); resolve(false); };
        overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
}

function showChoiceModal(message, subtext, confirmLabel, confirmClass = 'bg-rose-600 hover:bg-rose-500') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
                <p class="text-white font-bold text-lg leading-snug">${message}</p>
                ${subtext ? `<p class="text-slate-400 text-sm leading-relaxed">${subtext}</p>` : ''}
                <div class="flex gap-3 pt-2">
                    <button class="cancel-btn flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition">No thanks</button>
                    <button class="confirm-btn flex-1 py-3 ${confirmClass} text-white font-bold rounded-xl transition">${confirmLabel}</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.confirm-btn').onclick = () => { overlay.remove(); resolve(true); };
        overlay.querySelector('.cancel-btn').onclick = () => { overlay.remove(); resolve(false); };
        overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } };
    });
}

// ==========================================
// State
// ==========================================
let localPlayerId = Math.random().toString(36).substring(2, 9);
let guestPlayerId = localPlayerId; // preserved so we can fall back if the user signs out mid-session
let roomCode = "";
let gameState = {};
let revealed = {};
let highlightMap = {};      // key `${pid}-${idx}` -> timestamp until which a glow highlight shows (no card value, just "something happened here")
let initialPeekIdxsRemaining = []; // fixed set of card indices (bottom two) the player must peek at before play
let roundSeenKey = null;
let lastAbilityType = null; // track to avoid re-flashing
let lastHighlightEventId = null;
let lastMoveAnimEventId = null; // dedup guard for card-move animation playback, same pattern as lastShownEventId/lastHighlightEventId

// Account / auth state
let currentUser = null;        // Firebase Auth user object, or null if signed out / guest
let currentProfile = null;     // users/{uid} Firestore doc data, or null
let profileUnsub = null;       // live listener on users/{uid}, so a nickname/avatar
                                // change made on the Game Hub home page (or any other
                                // game sharing this doc) reflects here instantly too.
let statsWrittenForRound = null; // roundSeenKey already written to stats, to avoid double-counting on re-render
// True once the first onAuthStateChanged callback has fired, i.e. once we
// actually know whether the visitor is signed in or not. Firebase's session
// restore is asynchronous, so there's a brief window right after page load
// where currentUser/localPlayerId haven't been reconciled with the real
// signed-in account yet. Creating or joining a room during that window would
// permanently lock the game to a throwaway guest ID (rooms never re-link an
// identity mid-game), silently breaking stats tracking and presence writes
// for the rest of that session. Gating room creation/joining on this flag
// closes that race.
let authReady = false;

// ==========================================
// Vote-to-kick configuration
// ==========================================
const VOTE_KICK_DURATION_MS = 30000;   // how long a vote stays open before it auto-fails
const VOTE_KICK_THRESHOLD_RATIO = 0.5; // > 50% of eligible voters must vote yes (strict majority)
const MIN_PLAYERS_TO_REMAIN = 2;       // can't kick if it would drop the room below this
let voteKickTimerInterval = null;      // client-side ticking interval for the live countdown display
let voteKickModalShownForId = null;    // which gameState.voteKick "session" (by startedAt) we've already rendered a modal for, so we don't recreate it every snapshot tick
let lastResolvedVoteKickAt = null;     // dedupes the public toast/log line for a just-finished vote

// ==========================================

// ==========================================
// Accounts — Google Sign-In, profile doc, stats, history
// ==========================================
// Guest play keeps working exactly as before: if nobody signs in, localPlayerId
// stays a random per-session string and none of this code path executes.
// Signing in swaps localPlayerId to the Google uid (only while NOT already
// seated in a room, so we never pull the rug out from under an active game)
// and loads/creates a matching profile doc that the rest of the app can read.

function defaultStats() {
    return { gamesPlayed: 0, gamesWon: 0, totalScore: 0, bestScore: null, totalRounds: 0, xp: 0 };
}

// ==========================================
// XP / Level system
// ==========================================
const LEVEL_NAMES = [
    '', // 0 unused
    'Fresh Dealer', 'Card Shuffler', 'Apprentice', 'Novice Player', 'Keen Eye',
    'Street Gambler', 'Sharp Mind', 'Table Regular', 'Calculated Risk', 'Steady Hand',
    'Dutch Initiate', 'Bluff Artist', 'Memory Keeper', 'Clever Counter', 'Hand Reader',
    'Dutch Veteran', 'Odds Maker', 'Card Hawk', 'Sharp Shooter', 'Mind Bender',
    'Dutch Expert', 'Ghost Hand', 'Cold Blood', 'Stack Watcher', 'Ace Hunter',
    'Dutch Master', 'Phantom Player', 'The Calculator', 'Iron Memory', 'Table Ghost',
    'Elite Dealer', 'Shadow Trader', 'Dutch Sage', 'The Deceiver', 'Card Whisperer',
    'Dutch Legend', 'Grand Tactician', 'The Manipulator', 'Void Walker', 'Time Lord',
    'Dutch Grandmaster', 'The Omniscient', 'Dutch God', 'The Untouchable', 'Card Sovereign',
];

// ==========================================
// Card Skins — unlocked by level, equipped per-player
// ==========================================
// id must match the `.skin-<id>` CSS class added to .card-back in dutch.html.
// 'classic' is always unlocked (level 1) and needs no CSS override.
const CARD_SKINS = [
    { id: 'classic',  name: 'Classic Indigo', level: 1,  glyph: '✦', swatch: 'linear-gradient(135deg,#1e1b4b,#312e81,#0f0f23)' },
    { id: 'emerald',  name: 'Emerald Felt',   level: 4,  glyph: '♣', swatch: 'linear-gradient(135deg,#022c22,#065f46,#021712)' },
    { id: 'azure',    name: 'Azure Frost',    level: 7,  glyph: '❄', swatch: 'linear-gradient(135deg,#0c1d3d,#1d4ed8,#0a1530)' },
    { id: 'crimson',  name: 'Crimson Edge',   level: 10, glyph: '♦', swatch: 'linear-gradient(135deg,#450a0a,#7f1d1d,#1c0a0a)' },
    { id: 'jade',     name: 'Jade Table',     level: 14, glyph: '♠', swatch: 'linear-gradient(135deg,#042f2e,#115e59,#021716)' },
    { id: 'violet',   name: 'Violet Dusk',    level: 18, glyph: '✪', swatch: 'linear-gradient(135deg,#2e1065,#6d28d9,#1a0a38)' },
    { id: 'rosegold', name: 'Rose Gold',      level: 22, glyph: '✦', swatch: 'linear-gradient(135deg,#4c1d2e,#9f4a63,#2a0f18)' },
    { id: 'onyx',     name: 'Onyx Black',     level: 27, glyph: '◆', swatch: 'linear-gradient(135deg,#18181b,#09090b,#000000)' },
    { id: 'inferno',  name: 'Inferno',        level: 32, glyph: '🔥', swatch: 'linear-gradient(135deg,#431407,#c2410c,#1f0a02)' },
    { id: 'gold',     name: 'Royal Gold',     level: 38, glyph: '♛', swatch: 'linear-gradient(135deg,#451a03,#92400e,#1c0a02)' },
    { id: 'cosmic',   name: 'Cosmic Drift',   level: 45, glyph: '✨', swatch: 'linear-gradient(135deg,#1e0a3c,#581c87,#0c4a6e,#06141f)' },
];

function getSkinById(id) {
    return CARD_SKINS.find(s => s.id === id) || CARD_SKINS[0];
}

function isSkinUnlocked(skin, xp) {
    return getLevelFromXP(xp || 0) >= skin.level;
}

// The skin a given player has equipped, falling back to classic. Used wherever
// a face-down card is rendered so opponents see your chosen card back too.
function skinClassFor(player) {
    const id = player?.cardSkin || 'classic';
    return id === 'classic' ? '' : `skin-${id}`;
}

function renderSkinsModal() {
    const grid = document.getElementById('skinsGrid');
    const xp = currentProfile?.stats?.xp || 0;
    const equipped = currentProfile?.equippedSkin || 'classic';
    if (!currentUser) {
        grid.innerHTML = `<div class="col-span-3 text-center text-sm text-slate-400 py-6">Sign in to unlock and equip card skins as you level up.</div>`;
        return;
    }
    grid.innerHTML = CARD_SKINS.map(skin => {
        const unlocked = isSkinUnlocked(skin, xp);
        const isEquipped = equipped === skin.id;
        return `
        <button data-skin="${skin.id}" class="skin-option-btn text-left rounded-xl border-2 p-2 transition ${isEquipped ? 'border-amber-500 bg-amber-500/10' : unlocked ? 'border-slate-700 hover:border-slate-500 bg-slate-950' : 'border-slate-800 bg-slate-950/60 opacity-60 cursor-not-allowed'}" ${unlocked ? '' : 'disabled'}>
            <div class="skin-swatch" data-glyph="${skin.glyph}" style="background:${skin.swatch};border:2px solid rgba(255,255,255,0.15)">
                ${unlocked ? '' : '<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.55);font-size:1.1rem">🔒</span>'}
            </div>
            <div class="mt-1.5 text-[11px] font-bold text-slate-100 truncate">${skin.name}</div>
            <div class="text-[10px] ${unlocked ? 'text-emerald-400' : 'text-slate-500'}">${unlocked ? (isEquipped ? 'Equipped' : 'Unlocked') : `Level ${skin.level}`}</div>
        </button>`;
    }).join('');

    grid.querySelectorAll('.skin-option-btn').forEach(btn => {
        if (btn.disabled) return;
        btn.addEventListener('click', () => equipSkin(btn.dataset.skin));
    });
}

async function equipSkin(skinId) {
    if (!currentUser || !currentProfile) return;
    const xp = currentProfile.stats?.xp || 0;
    const skin = getSkinById(skinId);
    if (!isSkinUnlocked(skin, xp)) return;

    currentProfile.equippedSkin = skinId;
    await updateDoc(doc(db, "users", currentUser.uid), { equippedSkin: skinId });
    showToast(`🎴 Equipped "${skin.name}"!`, 'success', 2500);
    renderSkinsModal();

    // If currently seated in an active room, update the live game doc too so
    // other players see the new card back immediately (not just next game).
    if (roomCode && gameState.players && gameState.players[localPlayerId]) {
        try {
            await updateDoc(doc(db, "rooms", roomCode), { [`players.${localPlayerId}.cardSkin`]: skinId });
        } catch (err) { /* room may no longer exist — non-fatal */ }
    }
}

document.getElementById('openSkinsBtn').addEventListener('click', () => {
    document.getElementById('accountDropdown').classList.add('hidden');
    renderSkinsModal();
    document.getElementById('skinsModal').classList.remove('hidden');
});
document.getElementById('closeSkinsBtn').addEventListener('click', () => {
    document.getElementById('skinsModal').classList.add('hidden');
});
document.getElementById('skinsModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('skinsModal')) document.getElementById('skinsModal').classList.add('hidden');
});

function xpForLevel(level) {
    // XP needed to reach this level from level 1
    if (level <= 1) return 0;
    // Grows: 200 * level^1.5 per level, cumulative
    let total = 0;
    for (let i = 2; i <= level; i++) {
        total += Math.floor(200 * Math.pow(i, 1.5));
    }
    return total;
}

function getLevelFromXP(xp) {
    let level = 1;
    while (level < 50 && xp >= xpForLevel(level + 1)) level++;
    return level;
}

function xpForCurrentLevel(xp) {
    const level = getLevelFromXP(xp);
    return xp - xpForLevel(level);
}

function xpToNextLevel(xp) {
    const level = getLevelFromXP(xp);
    if (level >= 50) return 0;
    return xpForLevel(level + 1) - xpForLevel(level);
}

function calcXPGained(won, myScore, playerCount) {
    let xp = 50; // base for completing a round
    if (won) xp += 100;
    // Score bonus: lower score = more XP (up to 80 bonus for score 0)
    const scoreBonus = Math.max(0, 80 - myScore * 2);
    xp += scoreBonus;
    // More players = bigger game, slight bonus
    xp += (playerCount - 2) * 10;
    return Math.round(xp);
}

// Preset emoji avatars a signed-in user can pick instead of their Google
// photo. Deliberately a mixed, casual set rather than any single theme.
const AVATAR_PRESETS = ['🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵', '🦉', '🐯', '🐧', '🦄', '🃏', '🎲', '👑', '🔥', '⭐', '🌙'];

// Renders either a custom emoji avatar or a Google photo into a container
// element (a plain div, not an <img> — emoji can't be an img src). Falls
// back cleanly to a "?" if neither is available yet.
function renderAvatarInto(elId, photoURL, avatarEmoji) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (avatarEmoji) {
        el.innerHTML = '';
        el.textContent = avatarEmoji;
        el.style.backgroundImage = '';
    } else if (photoURL) {
        el.textContent = '';
        el.style.backgroundImage = `url('${photoURL}')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
    } else {
        el.textContent = '?';
        el.style.backgroundImage = '';
    }
}

async function loadOrCreateProfile(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        currentProfile = snap.data();
        // Keep Google-sourced fields fresh in case they changed (new photo, etc).
        const freshFields = { displayName: user.displayName || "", email: user.email || "", photoURL: user.photoURL || "" };
        const needsUpdate = Object.entries(freshFields).some(([k, v]) => currentProfile[k] !== v);
        if (needsUpdate) {
            await updateDoc(ref, freshFields);
            currentProfile = { ...currentProfile, ...freshFields };
        }
    } else {
        currentProfile = {
            displayName: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || "",
            username: user.displayName || (user.email ? user.email.split('@')[0] : "Player"),
            avatarEmoji: null, // null = use Google photo; set to an emoji string to override
            equippedSkin: 'classic',
            stats: defaultStats(),
            // Token economy — see TOKEN GATE section below. New accounts
            // start with 3 free hosts. bypassTokens is Console-only (never
            // settable from the client — see Firestore rules).
            tokens: 3,
            bypassTokens: false,
            lastAdGrant: null
        };
        await setDoc(ref, currentProfile);
    }
    if (!currentProfile.stats) currentProfile.stats = defaultStats();
    if (currentProfile.stats.xp === undefined) currentProfile.stats.xp = 0;
    if (currentProfile.avatarEmoji === undefined) currentProfile.avatarEmoji = null;
    if (!currentProfile.equippedSkin) currentProfile.equippedSkin = 'classic';
    // Backfill for pre-existing accounts created before the token gate
    // shipped. This is a LOCAL default only (does not write to Firestore) —
    // profiles missing `tokens` entirely are legacy docs; the rules treat
    // a missing tokens field as blocking (get('bypassTokens', false) and
    // direct `tokens` reads both fail closed), so surface 0 here rather
    // than silently granting free hosts. An admin should backfill these
    // docs via Console if this matters for existing users.
    if (currentProfile.tokens === undefined) currentProfile.tokens = 0;
    if (currentProfile.bypassTokens === undefined) currentProfile.bypassTokens = false;
    if (currentProfile.lastAdGrant === undefined) currentProfile.lastAdGrant = null;

    // Live-sync from here on: if the nickname/avatar changes on the Game Hub
    // home page (or any other game sharing this users/{uid} doc) while this
    // tab is open, pick it up immediately rather than waiting for next sign-in.
    if (profileUnsub) { profileUnsub(); profileUnsub = null; }
    profileUnsub = onSnapshot(ref, (s) => {
        if (!s.exists()) return;
        const data = s.data();
        currentProfile = data;
        if (!currentProfile.stats) currentProfile.stats = defaultStats();
        if (currentProfile.stats.xp === undefined) currentProfile.stats.xp = 0;
        if (currentProfile.avatarEmoji === undefined) currentProfile.avatarEmoji = null;
        if (!currentProfile.equippedSkin) currentProfile.equippedSkin = 'classic';
        if (currentProfile.tokens === undefined) currentProfile.tokens = 0;
        if (currentProfile.bypassTokens === undefined) currentProfile.bypassTokens = false;
        if (currentProfile.lastAdGrant === undefined) currentProfile.lastAdGrant = null;
        // Only repaint chrome that reflects identity — avoid touching anything
        // mid-game-render (cards, board) since this can fire during a round.
        if (currentUser) { applySignedInUI(); renderTokenBalanceUI(); }
    });
}

function applySignedInUI() {
    const name = currentProfile?.username || currentUser.displayName || "Player";
    const photo = currentUser.photoURL || "";
    const avatarEmoji = currentProfile?.avatarEmoji || null;

    document.getElementById("headerSignInBtn").classList.add("hidden");
    const accountBtn = document.getElementById("headerAccountBtn");
    accountBtn.classList.remove("hidden");
    renderAvatarInto("headerAvatar", photo, avatarEmoji);
    document.getElementById("headerAccountName").textContent = name;

    renderAvatarInto("dropdownAvatar", photo, avatarEmoji);
    document.getElementById("dropdownName").textContent = name;
    document.getElementById("dropdownEmail").textContent = currentUser.email || "";

    document.getElementById("landingSignInBtn").classList.add("hidden");
    document.getElementById("landingEmailSignInBtn").classList.add("hidden");
    const chip = document.getElementById("landingSignedInChip");
    chip.classList.remove("hidden");
    renderAvatarInto("landingAvatar", photo, avatarEmoji);
    document.getElementById("landingSignedInName").textContent = name;

    // Pre-fill the username field with the saved custom username, so it's
    // used as-is for room create/join, same as a guest's typed name.
    const usernameInput = document.getElementById("usernameInput");
    if (!usernameInput.dataset.userEdited) {
        usernameInput.value = currentProfile?.username || currentUser.displayName || "";
    }

    renderTokenBalanceUI();
}

function applySignedOutUI() {
    document.getElementById("headerSignInBtn").classList.remove("hidden");
    document.getElementById("headerAccountBtn").classList.add("hidden");
    document.getElementById("accountDropdown").classList.add("hidden");
    document.getElementById("landingSignInBtn").classList.remove("hidden");
    document.getElementById("landingEmailSignInBtn").classList.remove("hidden");
    document.getElementById("landingSignedInChip").classList.add("hidden");
    delete document.getElementById("usernameInput").dataset.userEdited;
    document.getElementById("tokenBalanceDisplay")?.classList.add("hidden");
    document.getElementById("watchAdBtn")?.classList.add("hidden");
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Don't swap identity out from under an active room — only take effect
        // if we're still on the landing screen (i.e. haven't created/joined yet).
        const inActiveRoom = !!roomCode;
        currentUser = user;
        await loadOrCreateProfile(user);
        if (!inActiveRoom) {
            localPlayerId = user.uid;
        }
        applySignedInUI();
    } else {
        if (profileUnsub) { profileUnsub(); profileUnsub = null; }
        currentUser = null;
        currentProfile = null;
        if (!roomCode) localPlayerId = guestPlayerId;
        applySignedOutUI();
    }

    if (!authReady) {
        authReady = true;
        const createBtn = document.getElementById("createRoomBtn");
        const joinBtn = document.getElementById("joinRoomBtn");
        if (createBtn) createBtn.disabled = false;
        if (joinBtn) joinBtn.disabled = false;
    }
});

async function handleSignIn() {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (err) {
        if (err && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
            showToast("Sign-in failed — please try again.", 'error');
        }
    }
}

document.getElementById("headerSignInBtn").addEventListener("click", openEmailAuthModal);
document.getElementById("landingSignInBtn").addEventListener("click", handleSignIn);

// ==========================================
// Email / Password Auth (alternative to Google,
// for accounts that can't use Google sign-in)
// ==========================================
let emailAuthMode = 'signin'; // 'signin' | 'signup'

function openEmailAuthModal() {
    emailAuthMode = 'signin';
    updateEmailAuthModeUI();
    document.getElementById("emailAuthEmailInput").value = "";
    document.getElementById("emailAuthPasswordInput").value = "";
    hideEmailAuthError();
    document.getElementById("emailAuthModal").classList.remove("hidden");
}

function closeEmailAuthModal() {
    document.getElementById("emailAuthModal").classList.add("hidden");
}

function updateEmailAuthModeUI() {
    const isSignUp = emailAuthMode === 'signup';
    document.getElementById("emailAuthTitle").textContent = isSignUp ? "Create Account" : "Sign In";
    document.getElementById("emailAuthSubmitBtn").textContent = isSignUp ? "Sign Up" : "Sign In";
    document.getElementById("emailAuthPasswordInput").autocomplete = isSignUp ? "new-password" : "current-password";
    document.getElementById("emailAuthToggleModeBtn").innerHTML = isSignUp
        ? 'Already have an account? <span class="underline">Sign in</span>'
        : 'Need an account? <span class="underline">Sign up</span>';
    document.getElementById("emailAuthForgotBtn").classList.toggle("hidden", isSignUp);
}

function showEmailAuthError(message) {
    const el = document.getElementById("emailAuthError");
    el.textContent = message;
    el.classList.remove("hidden");
}

function hideEmailAuthError() {
    document.getElementById("emailAuthError").classList.add("hidden");
}

// Maps Firebase Auth error codes to short, friendly messages — the raw
// "Firebase: Error (auth/xxx)" strings aren't something to show a player.
function friendlyAuthErrorMessage(err, mode) {
    const code = err && err.code;
    switch (code) {
        case 'auth/invalid-email': return "That email address doesn't look right.";
        case 'auth/missing-password': return "Please enter a password.";
        case 'auth/weak-password': return "Password should be at least 6 characters.";
        case 'auth/email-already-in-use': return "An account already exists with that email — try signing in instead.";
        case 'auth/invalid-credential':
        case 'auth/wrong-password': return "Incorrect email or password.";
        case 'auth/user-not-found': return "No account found with that email — try signing up instead.";
        case 'auth/too-many-requests': return "Too many attempts — please wait a bit and try again.";
        case 'auth/network-request-failed': return "Network error — check your connection and try again.";
        default: return mode === 'signup' ? "Couldn't create account — please try again." : "Couldn't sign in — please try again.";
    }
}

document.getElementById("landingEmailSignInBtn").addEventListener("click", openEmailAuthModal);
document.getElementById("closeEmailAuthBtn").addEventListener("click", closeEmailAuthModal);
document.getElementById("emailAuthModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("emailAuthModal")) closeEmailAuthModal();
});

// Google option lives inside the same unified modal now (header trigger
// opens this modal directly), so a successful Google sign-in here should
// also close the modal, same as a successful email sign-in does.
document.getElementById("modalGoogleSignInBtn").addEventListener("click", async () => {
    await handleSignIn();
    if (auth.currentUser) closeEmailAuthModal();
});

document.getElementById("emailAuthToggleModeBtn").addEventListener("click", () => {
    emailAuthMode = emailAuthMode === 'signin' ? 'signup' : 'signin';
    hideEmailAuthError();
    updateEmailAuthModeUI();
});

document.getElementById("emailAuthSubmitBtn").addEventListener("click", async () => {
    const email = document.getElementById("emailAuthEmailInput").value.trim();
    const password = document.getElementById("emailAuthPasswordInput").value;
    hideEmailAuthError();

    if (!email || !password) {
        showEmailAuthError("Please enter both an email and a password.");
        return;
    }

    const submitBtn = document.getElementById("emailAuthSubmitBtn");
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = emailAuthMode === 'signup' ? "Signing up..." : "Signing in...";

    try {
        if (emailAuthMode === 'signup') {
            await createUserWithEmailAndPassword(auth, email, password);
        } else {
            await signInWithEmailAndPassword(auth, email, password);
        }
        closeEmailAuthModal();
    } catch (err) {
        showEmailAuthError(friendlyAuthErrorMessage(err, emailAuthMode));
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
    }
});

document.getElementById("emailAuthPasswordInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("emailAuthSubmitBtn").click();
});

document.getElementById("emailAuthForgotBtn").addEventListener("click", async () => {
    const email = document.getElementById("emailAuthEmailInput").value.trim();
    hideEmailAuthError();
    if (!email) {
        showEmailAuthError("Enter your email above first, then click \"Forgot password?\".");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Password reset email sent — check your inbox.", 'success');
    } catch (err) {
        showEmailAuthError(friendlyAuthErrorMessage(err, 'signin'));
    }
});

document.getElementById("headerSignOutBtn").addEventListener("click", async () => {
    document.getElementById("accountDropdown").classList.add("hidden");
    await signOut(auth);
    showToast("Signed out. Your stats are saved for next time.", 'info');
});

document.getElementById("headerAccountBtn").addEventListener("click", () => {
    document.getElementById("accountDropdown").classList.toggle("hidden");
});
document.addEventListener("click", (e) => {
    const dropdown = document.getElementById("accountDropdown");
    if (dropdown.classList.contains("hidden")) return;
    const clickedAccountBtn = e.target.closest("#headerAccountBtn");
    if (!dropdown.contains(e.target) && !clickedAccountBtn) {
        dropdown.classList.add("hidden");
    }
});

// Save a custom username back to the profile whenever it's changed (blurred),
// separate from the Google display name. Marked dataset.userEdited so we don't
// clobber what they typed on a later profile re-render.
const usernameInputEl = document.getElementById("usernameInput");
usernameInputEl.addEventListener("input", () => { usernameInputEl.dataset.userEdited = "true"; });
usernameInputEl.addEventListener("blur", async () => {
    if (!currentUser) return;
    const newUsername = usernameInputEl.value.trim();
    if (!newUsername || newUsername === currentProfile?.username) return;
    currentProfile.username = newUsername;
    await updateDoc(doc(db, "users", currentUser.uid), { username: newUsername });
    const hint = document.getElementById("usernameSaveHint");
    hint.classList.remove("hidden");
    setTimeout(() => hint.classList.add("hidden"), 2000);
});

// ==========================================
// My Stats modal
// ==========================================
document.getElementById("openMyStatsBtn").addEventListener("click", async () => {
    document.getElementById("accountDropdown").classList.add("hidden");
    await renderStatsModal();
    document.getElementById("statsModal").classList.remove("hidden");
});
document.getElementById("closeStatsBtn").addEventListener("click", () => {
    document.getElementById("statsModal").classList.add("hidden");
});

async function renderStatsModal() {
    const stats = currentProfile?.stats || defaultStats();
    const avgScore = stats.gamesPlayed > 0 ? (stats.totalScore / stats.gamesPlayed).toFixed(1) : "—";
    const summaryGrid = document.getElementById("statsSummaryGrid");
    summaryGrid.innerHTML = `
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center">
            <div class="text-2xl font-black text-white">${stats.gamesPlayed}</div>
            <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Games Played</div>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center">
            <div class="text-2xl font-black text-amber-400">${stats.gamesWon}</div>
            <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Games Won</div>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center">
            <div class="text-2xl font-black text-white">${avgScore}</div>
            <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Avg Score</div>
        </div>
        <div class="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-center">
            <div class="text-2xl font-black text-emerald-400">${stats.bestScore ?? "—"}</div>
            <div class="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">Best Score</div>
        </div>
    `;

    const historyList = document.getElementById("statsHistoryList");
    if (historyList) {
        historyList.innerHTML = '';
    }
    // Render level & XP card
    const levelCard = document.getElementById("statsLevelCard");
    if (levelCard) {
        const xp = stats.xp || 0;
        const level = getLevelFromXP(xp);
        const levelName = LEVEL_NAMES[level] || 'Legend';
        const curLevelXP = xpForCurrentLevel(xp);
        const nextXP = xpToNextLevel(xp);
        const progressPct = level >= 50 ? 100 : Math.round((curLevelXP / nextXP) * 100);
        const tierColor = level >= 41 ? '#f59e0b' : level >= 31 ? '#a78bfa' : level >= 21 ? '#38bdf8' : level >= 11 ? '#34d399' : '#94a3b8';
        const tierBg = level >= 41 ? 'rgba(245,158,11,0.12)' : level >= 31 ? 'rgba(167,139,250,0.12)' : level >= 21 ? 'rgba(56,189,248,0.12)' : level >= 11 ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.08)';
        levelCard.innerHTML = `
            <div class="flex items-center gap-3">
                <div style="width:52px;height:52px;border-radius:12px;background:${tierBg};border:2px solid ${tierColor};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                    <div style="font-size:18px;font-weight:900;color:${tierColor};font-family:'Playfair Display',serif;line-height:1">${level}</div>
                    <div style="font-size:8px;color:${tierColor};opacity:0.7;font-weight:700;letter-spacing:0.05em;text-transform:uppercase">LVL</div>
                </div>
                <div style="flex:1;min-width:0">
                    <div style="color:#f1f5f9;font-weight:700;font-size:14px;margin-bottom:1px">${levelName}</div>
                    <div style="color:#64748b;font-size:11px;margin-bottom:6px">${xp.toLocaleString()} XP total</div>
                    <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:6px;overflow:hidden">
                        <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,${tierColor},${tierColor}cc);border-radius:4px;transition:width 0.5s ease"></div>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-top:3px">
                        <div style="font-size:10px;color:#475569">${level >= 50 ? 'Max Level!' : `${curLevelXP.toLocaleString()} / ${nextXP.toLocaleString()} XP`}</div>
                        ${level < 50 ? `<div style="font-size:10px;color:#475569">Next: ${LEVEL_NAMES[level+1] || ''}</div>` : ''}
                    </div>
                </div>
            </div>
            <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
                <div>
                    <div style="font-size:11px;font-weight:700;color:#fbbf24">+50 XP</div>
                    <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-top:1px">Per Round</div>
                </div>
                <div>
                    <div style="font-size:11px;font-weight:700;color:#34d399">+100 XP</div>
                    <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-top:1px">Win Bonus</div>
                </div>
                <div>
                    <div style="font-size:11px;font-weight:700;color:#38bdf8">+80 XP</div>
                    <div style="font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-top:1px">Low Score</div>
                </div>
            </div>
        `;
    }
}

// ==========================================
// Edit Profile modal — username + emoji avatar picker
// ==========================================
let pendingAvatarChoice = undefined; // undefined = unchanged this session, null = cleared to Google photo, string = chosen emoji

document.getElementById("openEditProfileBtn").addEventListener("click", () => {
    document.getElementById("accountDropdown").classList.add("hidden");
    openEditProfileModal();
});
document.getElementById("closeEditProfileBtn").addEventListener("click", () => {
    document.getElementById("editProfileModal").classList.add("hidden");
});

function openEditProfileModal() {
    pendingAvatarChoice = undefined;
    document.getElementById("editProfileUsernameInput").value = currentProfile?.username || currentUser.displayName || "";
    renderAvatarPickerGrid();
    document.getElementById("editProfileModal").classList.remove("hidden");
}

function renderAvatarPickerGrid() {
    const grid = document.getElementById("avatarPickerGrid");
    const currentChoice = pendingAvatarChoice !== undefined ? pendingAvatarChoice : (currentProfile?.avatarEmoji || null);
    grid.innerHTML = AVATAR_PRESETS.map(emoji => {
        const selected = emoji === currentChoice;
        return `<button type="button" data-emoji="${emoji}" class="avatar-pick-btn w-10 h-10 rounded-xl flex items-center justify-center text-xl transition border-2 ${selected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-600'}">${emoji}</button>`;
    }).join('');
    grid.querySelectorAll(".avatar-pick-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            pendingAvatarChoice = btn.dataset.emoji;
            renderAvatarPickerGrid();
        });
    });
}

document.getElementById("clearAvatarBtn").addEventListener("click", () => {
    pendingAvatarChoice = null;
    renderAvatarPickerGrid();
});

document.getElementById("saveEditProfileBtn").addEventListener("click", async () => {
    if (!currentUser) return;
    const newUsername = document.getElementById("editProfileUsernameInput").value.trim() || currentProfile?.username || "Player";
    const newAvatarEmoji = pendingAvatarChoice !== undefined ? pendingAvatarChoice : (currentProfile?.avatarEmoji || null);

    currentProfile.username = newUsername;
    currentProfile.avatarEmoji = newAvatarEmoji;
    await updateDoc(doc(db, "users", currentUser.uid), { username: newUsername, avatarEmoji: newAvatarEmoji });

    // Keep the public leaderboard entry in sync too — otherwise a name/avatar
    // change here wouldn't show up on the leaderboard until the next time
    // this user finishes a round (see recordRoundResultForCurrentUser).
    // Uses merge so it's safe even if this user has no leaderboard doc yet
    // (e.g. they've never finished a round) — stats/updatedAt then just stay
    // whatever they already were, or are simply absent until a round completes.
    try {
        const lbRef = doc(db, "leaderboard", currentUser.uid);
        await setDoc(lbRef, {
            displayName: newUsername,
            avatarEmoji: newAvatarEmoji,
            photoURL: currentProfile.photoURL || null
        }, { merge: true });
    } catch (lbErr) {
        console.warn("Could not sync leaderboard entry:", lbErr);
    }

    // Keep the landing-page username field in sync with this edit, same as
    // the existing inline-edit flow does, so create/join room still uses it.
    const usernameInput = document.getElementById("usernameInput");
    usernameInput.value = newUsername;
    usernameInput.dataset.userEdited = "true";

    applySignedInUI();

    const hint = document.getElementById("editProfileSavedHint");
    hint.classList.remove("hidden");
    setTimeout(() => {
        hint.classList.add("hidden");
        document.getElementById("editProfileModal").classList.add("hidden");
    }, 900);
});

// Called once per finished round (see the ROUND_END hook in advanceTurn).
// Each signed-in client only ever writes ITS OWN profile/history — never
// another player's — so there's no cross-player write contention and no
// need for permissive security rules beyond "users can write their own doc".
async function recordRoundResultForCurrentUser(roundKey) {
    if (!currentUser || !gameState.players) return;
    // If this user signed in AFTER already joining the room as a guest, their
    // seated localPlayerId is still the old guest string (we never swap it
    // mid-room — see onAuthStateChanged). In that case there's no reliable
    // link between this Google account and a specific seat, so skip writing
    // stats rather than guessing.
    if (currentUser.uid !== localPlayerId) return;
    if (statsWrittenForRound === roundKey) return; // already recorded this round
    statsWrittenForRound = roundKey;

    const me = gameState.players[localPlayerId];
    if (!me) return;
    const myScore = me.lastHandScore ?? 0;
    const allScores = Object.values(gameState.players).map(p => p.lastHandScore ?? 0);
    const lowestScore = Math.min(...allScores);
    const won = myScore === lowestScore; // ties: everyone at the lowest score counts as a win, nobody is shortchanged
    const placement = [...allScores].sort((a, b) => a - b).indexOf(myScore) + 1;

    const ref = doc(db, "users", currentUser.uid);
    const stats = currentProfile.stats || defaultStats();
    const playerCount = Object.keys(gameState.players).length;
    const xpGained = calcXPGained(won, myScore, playerCount);
    const oldXP = stats.xp || 0;
    const newXP = oldXP + xpGained;
    const oldLevel = getLevelFromXP(oldXP);
    const newLevel = getLevelFromXP(newXP);
    const updatedStats = {
        gamesPlayed: stats.gamesPlayed + 1,
        gamesWon: stats.gamesWon + (won ? 1 : 0),
        totalScore: stats.totalScore + myScore,
        bestScore: stats.bestScore === null ? myScore : Math.min(stats.bestScore, myScore),
        totalRounds: stats.totalRounds + 1,
        xp: newXP
    };
    currentProfile.stats = updatedStats;
    await updateDoc(ref, { stats: updatedStats });

    // Show XP gained toast (and level-up if applicable)
    setTimeout(() => {
        if (newLevel > oldLevel) {
            showToast(`🎉 Level Up! You're now Level ${newLevel} — ${LEVEL_NAMES[newLevel] || 'Legend'}!`, 'success', 6000);
        } else {
            showToast(`⭐ +${xpGained} XP earned!`, 'info', 3500);
        }
    }, 1500);

    // Also write a public leaderboard entry at /leaderboard/{uid}
    // This collection is readable by all, unlike /users which is private.
    try {
        const lbRef = doc(db, "leaderboard", currentUser.uid);
        await setDoc(lbRef, {
            displayName: currentProfile.username || currentProfile.displayName || "Player",
            avatarEmoji: currentProfile.avatarEmoji || null,
            photoURL: currentProfile.photoURL || null,
            stats: updatedStats,
            updatedAt: new Date()
        });
    } catch (lbErr) {
        console.warn("Could not write leaderboard entry:", lbErr);
    }

    await addDoc(collection(db, "users", currentUser.uid, "gameHistory"), {
        roomCode,
        date: new Date(),
        placement,
        score: myScore,
        playerCount: Object.keys(gameState.players).length,
        players: Object.values(gameState.players).map(p => p.name)
    });
}

function showKingSwapChoiceModal(firstPid, firstIdx, secondPid, secondIdx, secondCard) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
                <p class="text-white font-bold text-lg leading-snug">👑 Both cards peeked!</p>
                <p class="text-slate-400 text-sm leading-relaxed">
                    You saw ${describeSlot(firstPid, firstIdx)} and ${describeSlot(secondPid, secondIdx)}
                    (${secondCard.name}${secondCard.isJoker ? '' : secondCard.suit}).
                    What would you like to do?
                </p>
                <div class="flex flex-col gap-2 pt-1">
                    <button class="swap-peeked-btn w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-sm">
                        🔄 Swap those two peeked cards
                    </button>
                    <button class="pick-any-btn w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition text-sm">
                        🎯 Pick any two cards to swap instead
                    </button>
                    <button class="keep-btn w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition text-sm">
                        Keep everything as is
                    </button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('.swap-peeked-btn').onclick = () => { overlay.remove(); resolve('swap_peeked'); };
        overlay.querySelector('.pick-any-btn').onclick  = () => { overlay.remove(); resolve('pick_any'); };
        overlay.querySelector('.keep-btn').onclick      = () => { overlay.remove(); resolve('keep'); };
        overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve('keep'); } };
    });
}

// ==========================================
// Global Leaderboard
// ==========================================
async function openLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const content = document.getElementById('leaderboardContent');
    modal.classList.remove('hidden');
    content.innerHTML = '<p class="text-slate-400 text-center py-8">Loading...</p>';

    try {
        const q = query(
            collection(db, 'leaderboard'),
            orderBy('stats.gamesWon', 'desc'),
            limit(50)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
            content.innerHTML = '<p class="text-slate-400 text-center py-8">No players yet — be the first to sign in and play!</p>';
            return;
        }

        const rows = snap.docs.map((d, i) => {
            const data = d.data();
            const stats = data.stats || { gamesPlayed: 0, gamesWon: 0, bestScore: null };
            const winRate = stats.gamesPlayed > 0
                ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
                : 0;
            const name = data.displayName || data.username || 'Player';
            const emoji = data.avatarEmoji || null;
            const photo = data.photoURL || '';
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            let avatarHtml;
            if (emoji) {
                avatarHtml = `<div style="width:36px;height:36px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${emoji}</div>`;
            } else if (photo) {
                avatarHtml = `<div style="width:36px;height:36px;border-radius:50%;background:#334155;flex-shrink:0;background-image:url('${photo}');background-size:cover;background-position:center"></div>`;
            } else {
                avatarHtml = `<div style="width:36px;height:36px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:bold;flex-shrink:0">?</div>`;
            }

            const isMe = currentUser && d.id === currentUser.uid;
            const rowStyle = isMe
                ? 'background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.4);'
                : 'background:rgba(15,23,42,0.6);border:1px solid rgba(255,255,255,0.05);';
            const playerXP = stats.xp || 0;
            const playerLevel = getLevelFromXP(playerXP);

            return `
                <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;${rowStyle}">
                    <div style="color:#64748b;font-weight:700;font-size:13px;width:28px;text-align:center;flex-shrink:0">${medal}</div>
                    ${avatarHtml}
                    <div style="flex:1;min-width:0">
                        <div style="color:#f1f5f9;font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                            ${name}${isMe ? ' <span style="color:#818cf8;font-size:11px">(you)</span>' : ''}
                        </div>
                        <div style="color:#64748b;font-size:11px">${stats.gamesPlayed} games · ${winRate}% win rate</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0">
                        <div style="color:#fbbf24;font-weight:700;font-size:13px">${stats.gamesWon} wins</div>
                        <div style="color:#64748b;font-size:11px">Lv. ${playerLevel}</div>
                    </div>
                </div>`;
        });

        content.innerHTML = rows.join('');
    } catch (err) {
        console.error('Leaderboard fetch error:', err);
        const isPermErr = err?.code === 'permission-denied' || String(err?.message).includes('Missing or insufficient permissions');
        const errMsg = isPermErr
            ? "No leaderboard data yet — play a complete round and your score will appear here automatically."
            : "Could not load leaderboard. Check your internet connection and try again.";
        content.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:32px 16px;line-height:1.6;font-size:13px">' + errMsg + '</p>';
    }
}

// Standard duration (ms) for toasts and the matching on-card highlight/reveal,
// so a notification and the card it's talking about stay visible together
// long enough to actually read. King ability gets extra time since it's two steps.
// Adjustable from Settings — persisted so it carries across sessions. Both
// `let` (not `const`) so every call site that reads them at call-time (all
// the `duration = NOTIFY_MS` default params and direct references) picks up
// a change immediately without needing a page reload.
const NOTIFY_MS_MIN = 1500;
const NOTIFY_MS_MAX = 10000;
const NOTIFY_MS_DEFAULT = 4500;
const KING_NOTIFY_RATIO = 6000 / 4500; // keep King's "extra time" proportional to the base duration
let NOTIFY_MS = clampNotifyMs(parseInt(localStorage.getItem('dutch_notifyMs') ?? String(NOTIFY_MS_DEFAULT), 10));
let KING_NOTIFY_MS = Math.round(NOTIFY_MS * KING_NOTIFY_RATIO);

function clampNotifyMs(ms) {
    if (!Number.isFinite(ms)) return NOTIFY_MS_DEFAULT;
    return Math.min(NOTIFY_MS_MAX, Math.max(NOTIFY_MS_MIN, ms));
}

function setNotifyDuration(ms) {
    NOTIFY_MS = clampNotifyMs(ms);
    KING_NOTIFY_MS = Math.round(NOTIFY_MS * KING_NOTIFY_RATIO);
    localStorage.setItem('dutch_notifyMs', String(NOTIFY_MS));
}

// ============================================================
// AUDIO ENGINE — Web Audio API, no external files needed
// ============================================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let _audioCtx = null;
function getAudioCtx() {
    if (!_audioCtx) _audioCtx = new AudioCtx();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    return _audioCtx;
}

// Persisted settings — music ON by default
const _audioPrefs = {
    musicVol: parseFloat(localStorage.getItem('dutch_musicVol') ?? '0.5'),
    sfxVol:   parseFloat(localStorage.getItem('dutch_sfxVol')   ?? '0.8'),
    musicOn:  localStorage.getItem('dutch_musicOn') !== 'false',
    sfxOn:    localStorage.getItem('dutch_sfxOn')   !== 'false',
};
function _savePrefs() {
    localStorage.setItem('dutch_musicVol', _audioPrefs.musicVol);
    localStorage.setItem('dutch_sfxVol',   _audioPrefs.sfxVol);
    localStorage.setItem('dutch_musicOn',  _audioPrefs.musicOn);
    localStorage.setItem('dutch_sfxOn',    _audioPrefs.sfxOn);
}

// ── Music (MP3) ───────────────────────────────────────────────
const _bgAudio = new Audio('dutch-background-music.wav');
_bgAudio.loop   = true;
_bgAudio.volume = _audioPrefs.musicVol * 0.5;

let _musicRunning = false;

function startMusic() {
    if (_musicRunning) return;
    _musicRunning = true;
    _bgAudio.volume = _audioPrefs.musicOn ? _audioPrefs.musicVol * 0.5 : 0;
    _bgAudio.play().catch(() => { _musicRunning = false; });
}

function stopMusic() {
    _musicRunning = false;
    _bgAudio.pause();
    _bgAudio.currentTime = 0;
}

function setMusicVolume(v) {
    _audioPrefs.musicVol = v;
    _savePrefs();
    _bgAudio.volume = _audioPrefs.musicOn ? v * 0.5 : 0;
}

function setMusicEnabled(on) {
    _audioPrefs.musicOn = on;
    _savePrefs();
    if (on) {
        _bgAudio.volume = _audioPrefs.musicVol * 0.5;
        startMusic();
    } else {
        _bgAudio.pause();
        _musicRunning = false;
    }
}

// ── Start music on first user gesture ────────────────────────
// Browsers block audio until the user interacts with the page.
// We wait for the very first click, key press, or touch and start then.
let _musicStarted = false;
function _tryStartMusic() {
    if (_musicStarted) return;
    _musicStarted = true;
    if (_audioPrefs.musicOn) startMusic();
}
['click', 'keydown', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, _tryStartMusic, { once: false, passive: true })
);

// ── Global button-click SFX ───────────────────────────────────
// Covers every button on the page via delegation — home screen and in-game.
// Handlers that play their own specific sound set e._sfxHandled = true.
document.addEventListener('click', (e) => {
    const target = e.target.closest('button, [role="button"], .btn, .action-btn, .card-tile');
    if (!target) return;
    if (e._sfxHandled) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    playSfx('buttonClick');
}, true);

// ── Sound Effects ─────────────────────────────────────────────
function playSfx(type) {
    if (!_audioPrefs.sfxOn) return;
    const ctx = getAudioCtx();
    const vol = _audioPrefs.sfxVol;
    const t = ctx.currentTime;

    const mk = (freq, type_, dur, vol_) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = type_;
        osc.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(vol_ * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + dur);
    };

    const noise = (dur, vol_) => {
        const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        const g   = ctx.createGain();
        const filt = ctx.createBiquadFilter();
        src.buffer = buf;
        filt.type = 'bandpass'; filt.frequency.value = 1200; filt.Q.value = 0.5;
        g.gain.setValueAtTime(vol_ * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filt); filt.connect(g); g.connect(ctx.destination);
        src.start(t); src.stop(t + dur);
    };

    switch (type) {
        case 'cardDraw':
            noise(0.12, 0.4);
            mk(800, 'sine', 0.08, 0.15);
            break;
        case 'cardPlace':
            noise(0.08, 0.5);
            mk(220, 'sine', 0.12, 0.2);
            break;
        case 'cardSnap':
            noise(0.05, 0.8);
            mk(600, 'square', 0.05, 0.3);
            break;
        case 'ability':
            [523, 659, 784, 1047].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0, t + i * 0.07);
                g.gain.linearRampToValueAtTime(0.25 * vol, t + i * 0.07 + 0.04);
                g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.25);
                o.connect(g); g.connect(ctx.destination);
                o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.3);
            });
            break;
        case 'dutch':
            [392, 523, 659, 784].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle'; o.frequency.value = f;
                g.gain.setValueAtTime(0, t + i * 0.1);
                g.gain.linearRampToValueAtTime(0.35 * vol, t + i * 0.1 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.1 + 0.4);
                o.connect(g); g.connect(ctx.destination);
                o.start(t + i * 0.1); o.stop(t + i * 0.1 + 0.5);
            });
            break;
        case 'buttonClick':
            mk(1200, 'sine', 0.06, 0.25);
            break;
        case 'kick':
            mk(120, 'sine', 0.2, 0.4);
            noise(0.1, 0.3);
            break;
        case 'peek':
            mk(880, 'sine', 0.3, 0.3);
            mk(1320, 'sine', 0.2, 0.15);
            break;
        case 'roundStart':
            [523, 659].forEach((f, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'sine'; o.frequency.value = f;
                g.gain.setValueAtTime(0.3 * vol, t + i * 0.15);
                g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.15 + 0.6);
                o.connect(g); g.connect(ctx.destination);
                o.start(t + i * 0.15); o.stop(t + i * 0.15 + 0.7);
            });
            break;
        case 'error':
            mk(150, 'sawtooth', 0.2, 0.3);
            break;
    }
}

// ── Settings UI wiring ────────────────────────────────────────
document.getElementById('settingsBtn').addEventListener('click', (e) => {
    e._sfxHandled = true;
    playSfx('buttonClick');
    document.getElementById('musicVolSlider').value = Math.round(_audioPrefs.musicVol * 100);
    document.getElementById('sfxVolSlider').value   = Math.round(_audioPrefs.sfxVol   * 100);
    document.getElementById('musicVolLabel').textContent = Math.round(_audioPrefs.musicVol * 100) + '%';
    document.getElementById('sfxVolLabel').textContent   = Math.round(_audioPrefs.sfxVol   * 100) + '%';
    document.getElementById('musicToggleBtn').textContent = _audioPrefs.musicOn ? 'On' : 'Off';
    document.getElementById('sfxToggleBtn').textContent   = _audioPrefs.sfxOn   ? 'On' : 'Off';
    document.getElementById('notifyDurationSlider').value = NOTIFY_MS;
    document.getElementById('notifyDurationLabel').textContent = (NOTIFY_MS / 1000).toFixed(1) + 's';
    document.getElementById('settingsModal').classList.remove('hidden');
});
document.getElementById('settingsCloseBtn').addEventListener('click', (e) => {
    e._sfxHandled = true;
    playSfx('buttonClick');
    document.getElementById('settingsModal').classList.add('hidden');
});
document.getElementById('settingsModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('settingsModal').classList.add('hidden');
});
document.getElementById('musicVolSlider').addEventListener('input', e => {
    const v = e.target.value / 100;
    document.getElementById('musicVolLabel').textContent = e.target.value + '%';
    setMusicVolume(v);
});
document.getElementById('sfxVolSlider').addEventListener('input', e => {
    const v = e.target.value / 100;
    document.getElementById('sfxVolLabel').textContent = e.target.value + '%';
    _audioPrefs.sfxVol = v; _savePrefs();
});
document.getElementById('notifyDurationSlider').addEventListener('input', e => {
    setNotifyDuration(parseInt(e.target.value, 10));
    document.getElementById('notifyDurationLabel').textContent = (NOTIFY_MS / 1000).toFixed(1) + 's';
});
document.getElementById('musicToggleBtn').addEventListener('click', (e) => {
    e._sfxHandled = true;
    const nowOn = !_audioPrefs.musicOn;
    setMusicEnabled(nowOn);
    document.getElementById('musicToggleBtn').textContent = nowOn ? 'On' : 'Off';
    playSfx('buttonClick');
});
document.getElementById('sfxToggleBtn').addEventListener('click', (e) => {
    e._sfxHandled = true;
    _audioPrefs.sfxOn = !_audioPrefs.sfxOn;
    _savePrefs();
    document.getElementById('sfxToggleBtn').textContent = _audioPrefs.sfxOn ? 'On' : 'Off';
    if (_audioPrefs.sfxOn) playSfx('buttonClick');
});

// ── End of Audio Engine ───────────────────────────────────────

function highlightSlots(slots, ms = NOTIFY_MS) {
    const until = Date.now() + ms;
    (slots || []).forEach(({ pid, idx }) => { highlightMap[`${pid}-${idx}`] = until; });
    renderGameBoard();
    setTimeout(() => renderGameBoard(), ms + 50);
}

function isHighlighted(pid, idx) {
    const until = highlightMap[`${pid}-${idx}`];
    return !!until && Date.now() < until;
}

const isBlack = (suit) => suit === '♠' || suit === '♣';
const isRed = (suit) => suit === '♥' || suit === '♦';

const isSpecial = (card) => {
    if (!card) return null;
    if (card.name === '7' || card.name === '8') return '78';
    if (card.name === '9' || card.name === '10') return '910';
    if ((card.name === 'J' || card.name === 'Q') && isBlack(card.suit)) return 'jq';
    if (card.name === 'K' && isBlack(card.suit)) return 'k';
    return null;
};

// "their own card #2" / "Bob's card #3" — used for King-ability messaging,
// where either slot involved could belong to the local player or to any
// number of different opponents.
function describeSlot(pid, idx) {
    const who = pid === localPlayerId ? 'their own' : `${gameState.players[pid]?.name || 'a player'}'s`;
    return `${who} card #${idx + 1}`;
}

// Before ever entering AWAIT_ABILITY, verify the ability actually has at
// least one legal way to be resolved given the CURRENT state of every
// player's hand. This matters because a board slot with no card in it is
// never clickable — handleCardInteraction() returns early on an empty slot
// before any ability-resolution code ever runs. That means the various
// "gracefully skip, no legal target" checks that live inside
// resolveAbilityClick() only ever get a chance to run AFTER at least one
// valid (non-empty) click already happened; they can never fire as the
// very first move if EVERY legal target is already empty (e.g. every one
// of your opponents already got all their cards snapped away, or your own
// hand is completely empty when a 7/8 is drawn). Without this pre-check,
// that situation left the turn stuck in AWAIT_ABILITY forever with no
// clickable card anywhere able to resolve or skip it — the only way out
// was the host's force-unstick button. Checking here, before we ever
// commit to AWAIT_ABILITY, catches every one of those cases up front.
function abilityHasLegalTarget(abilityType) {
    const myCards = gameState.players[localPlayerId]?.cards || [];
    const iHaveCard = myCards.some(Boolean);
    const opponentIds = Object.keys(gameState.players).filter(pid => pid !== localPlayerId);
    const anyOpponentHasCard = opponentIds.some(pid => (gameState.players[pid]?.cards || []).some(Boolean));
    switch (abilityType) {
        case '78':
            // Needs one of YOUR OWN cards to peek at.
            return iHaveCard;
        case '910':
            // Needs an OPPONENT's card to spy on.
            return anyOpponentHasCard;
        case 'jq':
            // Needs one of your own cards AND an opponent's card to swap with.
            return iHaveCard && anyOpponentHasCard;
        case 'k': {
            // Needs at least two cards total, somewhere, in the whole game
            // (the "both peeked cards belong to the same lone player" case
            // is already handled gracefully mid-ability, ending after one peek).
            const totalCards = Object.values(gameState.players)
                .reduce((sum, p) => sum + (p.cards || []).filter(Boolean).length, 0);
            return totalCards >= 2;
        }
        default:
            return true;
    }
}

// Fisher-Yates — unbiased shuffle, used for randomizing seating/turn order.
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const createDeck = () => {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = [
        { n: 'A', v: 1 }, { n: '2', v: 2 }, { n: '3', v: 3 }, { n: '4', v: 4 },
        { n: '5', v: 5 }, { n: '6', v: 6 }, { n: '7', v: 7 }, { n: '8', v: 8 },
        { n: '9', v: 9 }, { n: '10', v: 10 }, { n: 'J', v: 10 }, { n: 'Q', v: 10 }, { n: 'K', v: 10 }
    ];
    let deck = [];
    suits.forEach(suit => {
        values.forEach(val => {
            let actualValue = val.v;
            if (val.n === 'K' && isRed(suit)) actualValue = -2;
            deck.push({ id: Math.random().toString(36).substring(2, 7), suit, name: val.n, score: actualValue, isRed: isRed(suit) });
        });
    });
    deck.push({ id: Math.random().toString(36).substring(2, 7), suit: '🃏', name: 'Joker', score: 0, isRed: false, isJoker: true });
    deck.push({ id: Math.random().toString(36).substring(2, 7), suit: '🃏', name: 'Joker', score: 0, isRed: false, isJoker: true });
    return deck.sort(() => Math.random() - 0.5);
};

// ==========================================
// Card rendering helpers
// ==========================================
function cardColorClass(card) {
    if (card.isJoker) return 'card-joker';
    return card.isRed ? 'card-red' : 'card-black';
}

function renderFaceCard(card, extraClass = '') {
    const cc = cardColorClass(card);
    const rank = card.isJoker ? '🃏' : card.name;
    const suit = card.isJoker ? '' : card.suit;
    return `
        <div class="playing-card ${extraClass} w-full h-full flex flex-col items-center justify-center relative">
            <div class="corner-tl ${cc}">
                <div class="rank">${rank}</div>
                ${suit ? `<div class="suit-sm">${suit}</div>` : ''}
            </div>
            <div class="center-suit ${cc}">
                <span class="suit-center">${card.isJoker ? '🃏' : suit}</span>
            </div>
            <div class="corner-br ${cc}">
                <div class="rank">${rank}</div>
                ${suit ? `<div class="suit-sm">${suit}</div>` : ''}
            </div>
            <div class="text-center">
                <div class="text-xl ${cc}">${card.isJoker ? '🃏' : suit}</div>
            </div>
        </div>`;
}

function renderCardBack(extraClass = '') {
    return `<div class="card-back ${extraClass} w-full h-full"></div>`;
}

// ==========================================
// Ability panel management
// ==========================================
const ABILITY_CONFIG = {
    '78': {
        icon: '👁️',
        title: 'Peek — Your Card',
        color: 'border-amber-500',
        flashColor: 'bg-slate-950 border-amber-500',
        steps: ['Click one of YOUR cards to peek at it.'],
    },
    '910': {
        icon: '🔍',
        title: "Spy — Opponent's Card",
        color: 'border-indigo-500',
        flashColor: 'bg-slate-950 border-indigo-500',
        steps: ["Click an OPPONENT'S card to peek at it."],
    },
    'jq': {
        icon: '🔀',
        title: 'Blind Swap',
        color: 'border-purple-500',
        flashColor: 'bg-slate-950 border-purple-500',
        steps: ['Pick one of YOUR cards to swap.', "Now pick an OPPONENT'S card to swap with."],
    },
    'k': {
        icon: '👑',
        title: 'Black King — Spy & Swap',
        color: 'border-slate-400',
        flashColor: 'bg-slate-950 border-slate-300',
        steps: [
            "Pick ANY card to peek at — yours or an opponent's.",
            "Pick a second card (any player, but not two of your own) to peek at, then decide.",
            "Pick any card as the first card to swap.",
            "Pick any card as the second card to swap with.",
        ],
    },
};

function showAbilityPanel(abilityType, step = 1) {
    const cfg = ABILITY_CONFIG[abilityType];
    if (!cfg) return;
    const panel = document.getElementById('abilityPanel');
    panel.classList.remove('hidden');
    panel.className = `ability-panel bg-slate-950 border-2 ${cfg.color} rounded-2xl p-4 shadow-2xl`;
    document.getElementById('abilityIcon').textContent = cfg.icon;
    document.getElementById('abilityTitle').textContent = cfg.title;
    document.getElementById('abilityDesc').textContent = cfg.steps[step - 1] || cfg.steps[0];

    // Step dots. Only two dot elements exist in the DOM, but the King
    // ability has 4 steps (peek two cards, then optionally swap two cards).
    // Map step -> dot by PHASE rather than by literal step number, so the
    // indicator always shows progress instead of going dark on steps 3/4
    // (which would otherwise look like the ability had frozen/stalled).
    const dot1 = document.getElementById('abilityStepDot1');
    const dot2 = document.getElementById('abilityStepDot2');
    if (cfg.steps.length > 1) {
        dot2.classList.remove('hidden');
        const onFirstPhase = step <= Math.ceil(cfg.steps.length / 2);
        dot1.className = `w-2 h-2 rounded-full ${onFirstPhase ? 'bg-indigo-400' : 'bg-slate-600'}`;
        dot2.className = `w-2 h-2 rounded-full ${!onFirstPhase ? 'bg-indigo-400' : 'bg-slate-600'}`;
    } else {
        dot2.classList.add('hidden');
        dot1.className = 'w-2 h-2 rounded-full bg-indigo-400';
    }
}

function hideAbilityPanel() {
    document.getElementById('abilityPanel').classList.add('hidden');
}

// ==========================================
// Screens
// ==========================================
const landingScreen = document.getElementById("screen-landing");
const lobbyScreen = document.getElementById("screen-lobby");
const gameScreen = document.getElementById("screen-game");
const roundEndScreen = document.getElementById("screen-roundend");

// ==========================================
// Token Gate — hosting a room costs 1 token
// ==========================================
// Scope: this module ONLY gates room-HOSTING in Dutch (createRoomBtn below)
// and Monopoly (hostNewTable, see monopoly.html — duplicated there since
// app.js is Dutch-only, not a shared module; see the comment at the top of
// monopoly.html's script block). Joining a room stays free, and nothing
// here is ever invoked from chat.html or the in-room party chat — party
// chat (sendChatMessage/subscribeChatForRoom below) has zero token
// involvement by design.
//
// Guests (not signed in) have no Firestore profile, so they aren't token-
// gated at all — hosting stays free for guest play, same as before this
// feature. Only signed-in accounts draw from/spend the tokens field.
const AD_COOLDOWN_MS = 60000; // mirrors the Firestore rule's 55s floor with a little headroom

function renderTokenBalanceUI() {
    const el = document.getElementById('tokenBalanceDisplay');
    const adBtn = document.getElementById('watchAdBtn');
    if (!el) return; // element may not exist yet during early load
    if (!currentUser || !currentProfile) {
        el.classList.add('hidden');
        adBtn?.classList.add('hidden');
        return;
    }
    el.classList.remove('hidden');
    if (currentProfile.bypassTokens) {
        el.innerHTML = `<span title="Unlimited hosting">♾️ Unlimited</span>`;
        adBtn?.classList.add('hidden'); // bypass accounts never need to earn tokens
    } else {
        el.innerHTML = `🎟️ <span id="tokenBalanceCount">${currentProfile.tokens ?? 0}</span>`;
        adBtn?.classList.remove('hidden');
    }
}

// Attempts to spend 1 token for hosting. Returns true if the spend
// succeeded (or the user has bypass/is a guest), false if blocked.
// Uses runTransaction so the read-then-write is atomic against concurrent
// spends from the same account in another tab; the actual anti-cheat
// enforcement is the Firestore rule (see firestore.rules), which
// independently re-validates the balance server-side regardless of what
// this function does.
async function trySpendHostToken() {
    if (!currentUser) return true; // guests: ungated, unchanged from before
    if (currentProfile?.bypassTokens) return true;

    const ref = doc(db, "users", currentUser.uid);
    try {
        await runTransaction(db, async (tx) => {
            const snap = await tx.get(ref);
            const data = snap.data() || {};
            if (data.bypassTokens) return; // re-check inside the transaction too
            const tokens = data.tokens ?? 0;
            if (tokens <= 0) throw new Error("no-tokens");
            tx.update(ref, { tokens: tokens - 1 });
        });
        return true;
    } catch (err) {
        if (err?.message === "no-tokens") return false;
        console.warn("Token spend failed:", err);
        showToast("Couldn't verify your token balance — try again.", 'error');
        return false;
    }
}

async function watchAdForToken() {
    if (!currentUser) { showToast("Sign in to earn tokens by watching an ad.", 'info'); return; }
    if (currentProfile?.bypassTokens) { showToast("Your account has unlimited hosting already.", 'info'); return; }

    const last = currentProfile?.lastAdGrant;
    const lastMs = last?.toMillis ? last.toMillis() : (last ? new Date(last).getTime() : 0);
    if (lastMs && Date.now() - lastMs < AD_COOLDOWN_MS) {
        const waitSec = Math.ceil((AD_COOLDOWN_MS - (Date.now() - lastMs)) / 1000);
        showToast(`You can watch another ad in ${waitSec}s.`, 'warning');
        return;
    }

    // ── Ad SDK integration point ──────────────────────────────────────
    // Isolated on purpose so a real rewarded-ad SDK (e.g. Google AdSense
    // H5 rewarded units) can be dropped in later without touching the
    // token-grant logic below. Swap this block for the SDK's "show
    // rewarded ad" call, and invoke onAdRewardEarned() from its completion
    // callback instead of calling it directly.
    showToast("Loading ad…", 'info', 1200);
    setTimeout(() => { onAdRewardEarned(); }, 1200); // simulated ad completion
}

async function onAdRewardEarned() {
    if (!currentUser) return;
    const ref = doc(db, "users", currentUser.uid);
    try {
        await updateDoc(ref, { tokens: (currentProfile?.tokens ?? 0) + 1, lastAdGrant: serverTimestamp() });
        showToast("+1 token earned!", 'success');
    } catch (err) {
        // Most likely cause: the Firestore rule's cooldown rejected this
        // write (e.g. a replayed/duplicate callback fired faster than the
        // cooldown allows). This is expected and not a bug — see the
        // cooldown-abuse note in firestore.rules.
        console.warn("Ad token grant failed:", err);
        showToast("Couldn't grant your token — please try again shortly.", 'error');
    }
}

document.getElementById('watchAdBtn')?.addEventListener('click', watchAdForToken);

// ==========================================
// Lobby / Room setup
// ==========================================
document.getElementById("createRoomBtn").addEventListener("click", async () => {
    if (!authReady) { showToast("Still checking your sign-in status — one moment…", 'info'); return; }

    if (currentUser && !currentProfile?.bypassTokens && (currentProfile?.tokens ?? 0) <= 0) {
        showChoiceModal(
            "You're out of tokens to host a party.",
            "Watch a short ad to earn +1 token, then try hosting again.",
            "🎬 Watch ad for +1 token",
            'bg-violet-600 hover:bg-violet-500'
        ).then((wantsAd) => { if (wantsAd) watchAdForToken(); });
        return;
    }

    const spent = await trySpendHostToken();
    if (!spent) {
        showToast("Out of tokens — watch an ad to earn one.", 'warning');
        return;
    }

    const name = document.getElementById("usernameInput").value.trim() || "Player";
    roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    gameState = {
        code: roomCode, status: "LOBBY", hostId: localPlayerId,
        turnOrder: [localPlayerId], currentTurnIdx: 0, roundNumber: 0,
        players: { [localPlayerId]: { name, ready: false, cards: [], score: 0, cardSkin: currentProfile?.equippedSkin || 'classic', avatarEmoji: currentProfile?.avatarEmoji || null, photoURL: currentProfile?.photoURL || null } },
        deck: createDeck(), discard: [], dutchCalledBy: null, finalTurnsLeft: null,
        turnPhase: 'AWAIT_DRAW', drawnCard: null, ability: null, pendingGive: null
    };
    await setDoc(doc(db, "rooms", roomCode), gameState);
    setupRoomSubscription(roomCode);
    registerPresence(roomCode, localPlayerId);
    startPresenceWatch(roomCode);
});

document.getElementById("joinRoomBtn").addEventListener("click", async () => {
    if (!authReady) { showToast("Still checking your sign-in status — one moment…", 'info'); return; }
    const name = document.getElementById("usernameInput").value.trim() || "Player";
    const enteredCode = document.getElementById("roomCodeInput").value.trim().toUpperCase();
    if (!enteredCode) { showToast("Enter a valid room code.", 'warning'); return; }
    roomCode = enteredCode;
    const roomRef = doc(db, "rooms", roomCode);
    // Fetch current state to enforce 6-player max
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
        const data = snap.data();
        const playerCount = Object.keys(data.players || {}).length;
        if (playerCount >= 6 && !data.players[localPlayerId]) {
            showToast("This room is full (max 6 players).", 'error'); return;
        }
        if (data.status !== 'LOBBY') {
            showToast("This game has already started.", 'error'); return;
        }
    }
    await updateDoc(roomRef, {
        [`players.${localPlayerId}`]: { name, ready: false, cards: [], score: 0, cardSkin: currentProfile?.equippedSkin || 'classic', avatarEmoji: currentProfile?.avatarEmoji || null, photoURL: currentProfile?.photoURL || null },
        turnOrder: arrayUnion(localPlayerId)
    });
    setupRoomSubscription(roomCode);
    registerPresence(roomCode, localPlayerId);
    startPresenceWatch(roomCode);
});

// ==========================================
// Presence / disconnect detection
// ==========================================
// Firestore has no way to know a client is "still there" — there's no
// built-in disconnect signal. Realtime Database does, via onDisconnect():
// the RTDB *server* removes a node the instant a client's connection drops,
// for ANY reason (closed tab, browser crash, lost wifi, navigating away) —
// not just a graceful page unload, which is the part client-side-only code
// (beforeunload, etc.) can't reliably cover.
//
// Each seated player writes a presence node at
//   presence/{roomCode}/{playerId}
// the moment they join a room, and registers onDisconnect() to delete that
// same node when their connection drops. Every client also subscribes to
// the full presence list for the room; if a player who's still listed in
// the Firestore room doc has no matching presence node, someone calls the
// existing applyKick()/lobbyKickPlayer() removal logic for them. This is
// safe to fire from multiple clients at once — both are no-ops if the
// player's already gone.
let presenceUnsub = null;
let presenceWatchTimer = null;

function registerPresence(code, pid) {
    const presenceRef = ref(rtdb, `presence/${code}/${pid}`);
    set(presenceRef, { joinedAt: rtdbServerTimestamp() });
    onDisconnect(presenceRef).remove();
}

function clearPresence(code, pid) {
    if (!code || !pid) return;
    remove(ref(rtdb, `presence/${code}/${pid}`)).catch(() => {});
}

// Watches who's actually still connected to this room and removes anyone
// from the live game who's dropped off. Only meaningfully acts once the
// game has started or players are seated — harmless to run continuously.
function startPresenceWatch(code) {
    stopPresenceWatch();
    const presenceListRef = ref(rtdb, `presence/${code}`);
    presenceUnsub = onValue(presenceListRef, (snap) => {
        const present = snap.val() || {};
        // Debounce slightly: RTDB presence can lag a beat behind a fresh
        // join (the local onDisconnect registration happening just after
        // this listener first fires), so don't act on the very first tick
        // for players who joined moments ago — give it a couple seconds.
        clearTimeout(presenceWatchTimer);
        presenceWatchTimer = setTimeout(() => {
            if (!gameState.players) return;
            Object.keys(gameState.players).forEach(pid => {
                if (present[pid]) return; // still connected, fine
                if (pid === localPlayerId) return; // never remove ourselves based on our own (possibly stale) view
                if (gameState.status === 'LOBBY') {
                    const newTurnOrder = (gameState.turnOrder || []).filter(p => p !== pid);
                    const lobbyUpdates = {
                        [`players.${pid}`]: deleteField(),
                        turnOrder: newTurnOrder
                    };
                    // Transfer host to the next remaining player if the host disconnected,
                    // otherwise the "Start Game" button stays permanently locked for everyone.
                    if (gameState.hostId === pid && newTurnOrder.length > 0) {
                        lobbyUpdates.hostId = newTurnOrder[0];
                    }
                    updateDoc(doc(db, 'rooms', code), lobbyUpdates).catch(() => {});
                } else if (gameState.status === 'PLAYING') {
                    applyKick(pid);
                }
            });
        }, 3000);
    });
}

function stopPresenceWatch() {
    if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; }
    clearTimeout(presenceWatchTimer);
}

// Best-effort fast path on top of onDisconnect: clear our own presence node
// immediately when we click Home or the tab/page is actually closing, so
// other players see us leave right away instead of waiting on RTDB's
// connection-timeout detection (which is fast, but not instant).
// onDisconnect() above remains the real guarantee for crashes/lost network/
// anything that skips these events entirely.
const backHomeLink = document.getElementById('backHomeLink');
if (backHomeLink) {
    backHomeLink.addEventListener('click', () => {
        if (roomCode && localPlayerId) clearPresence(roomCode, localPlayerId);
    });
}
window.addEventListener('pagehide', () => {
    if (roomCode && localPlayerId) clearPresence(roomCode, localPlayerId);
});

function setupRoomSubscription(code) {
    onSnapshot(doc(db, "rooms", code), (docSnap) => {
        if (!docSnap.exists()) return;
        const newState = docSnap.data();

        // Detect lobby kick: we were in players, now we're not, and status is still LOBBY
        const wasInRoom = gameState.players && gameState.players[localPlayerId];
        const nowKicked = newState.status === 'LOBBY' && newState.players && !newState.players[localPlayerId];
        if (wasInRoom && nowKicked) {
            gameState = {};
            roomCode = "";
            onChatRoomLeft();
            lobbyScreen.classList.add("hidden");
            gameScreen.classList.add("hidden");
            roundEndScreen.classList.add("hidden");
            landingScreen.classList.remove("hidden");
            showToast("You were removed from the lobby by the host.", 'warning', 5000);
            return;
        }

        gameState = newState;
        renderState();
    });
    // Start the party chat for this room
    onChatRoomJoined(code);
}

async function pushState(partial) {
    await updateDoc(doc(db, "rooms", roomCode), partial);
}

// ==========================================
// Public event log — lets every player see that *something* happened
// (a swap, a peek, an ability, a snap) WITHOUT revealing any card identity.
// Each event has a unique id; clients track the last id they've shown so
// they don't re-toast on every snapshot, and the player who acted already
// got their own specific toast, so this is shown to everyone else only.
// ==========================================
let lastShownEventId = null;

function makeEvent(message, targetPid = null, targetMessage = null, highlights = [], moves = []) {
    return {
        id: Math.random().toString(36).substring(2, 10),
        message,
        targetMessage,
        actorId: localPlayerId,
        targetId: targetPid,
        highlights,
        moves
    };
}

function maybeShowPublicEvent() {
    const evt = gameState.lastEvent;
    if (!evt || evt.id === lastShownEventId) return;
    lastShownEventId = evt.id;
    // The player who performed the action already saw their own specific toast —
    // don't double-toast them with the generic public version.
    if (evt.actorId === localPlayerId) return;
    const isTarget = evt.targetId === localPlayerId;
    showToast((isTarget && evt.targetMessage) ? evt.targetMessage : evt.message, 'info', NOTIFY_MS);
}

// Every event also carries a list of board slots that just changed or were
// looked at. We show a glow on those slots for every client (including the
// actor) WITHOUT revealing any card value — that's exactly the "I can see
// something happened here" feedback you get sitting at a real table.
function maybeApplyEventHighlights() {
    const evt = gameState.lastEvent;
    if (!evt || evt.id === lastHighlightEventId) return;
    lastHighlightEventId = evt.id;
    // Events that carry moves (the drawn-card swap, J/Q swap, King swaps) now
    // get the FLIP card-move animation instead of a glow — showing both would
    // be redundant. Peeks, snaps, and the post-snap give-away never carry
    // moves, so they're untouched and still get their glow exactly as before.
    if (evt.moves && evt.moves.length) return;
    if (evt.highlights && evt.highlights.length) {
        highlightSlots(evt.highlights, NOTIFY_MS);
    }
}
// ==========================================
// Activity Log — visible to all players,
// records what happened without card values
// ==========================================
let logEntries = [];       // { id, msg, type, time }
let lastLogEventId = null;
let logCollapsed = true;
let logUnreadCount = 0;

function classifyEventType(msg) {
    if (!msg) return 'default';
    const m = msg.toLowerCase();
    if (m.includes('snap')) return 'snap';
    if (m.includes('dutch')) return 'dutch';
    if (m.includes('swap')) return 'swap';
    if (m.includes('ability') || m.includes('peek') || m.includes('spy') || m.includes('king') || m.includes('7/8') || m.includes('9/10')) return 'ability';
    return 'default';
}

function appendToActivityLog(message, type) {
    const now = new Date();
    const t = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = { id: Math.random().toString(36).slice(2), msg: message, type, time: t };
    logEntries.push(entry);
    if (logEntries.length > 80) logEntries = logEntries.slice(-80);

    const container = document.getElementById('log-entries');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'log-entry log-' + type;
    div.innerHTML = '<div class="log-time">' + t + '</div><div class="log-msg">' + message + '</div>';
    container.appendChild(div);
    // auto-scroll to bottom if open
    if (!logCollapsed) container.scrollTop = container.scrollHeight;

    // badge
    if (logCollapsed) {
        logUnreadCount++;
        const badge = document.getElementById('log-badge');
        if (badge) { badge.textContent = logUnreadCount > 9 ? '9+' : logUnreadCount; badge.classList.add('has-new'); }
    }
}

function maybeLogPublicEvent() {
    const evt = gameState.lastEvent;
    if (!evt || evt.id === lastLogEventId) return;
    lastLogEventId = evt.id;
    const type = classifyEventType(evt.message);
    appendToActivityLog(evt.message, type);
}

// Toggle log open/close
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('log-toggle');
    const panel = document.getElementById('activity-log-panel');
    const chevron = document.getElementById('log-chevron');
    const badge = document.getElementById('log-badge');
    const entries = document.getElementById('log-entries');
    if (toggle && panel) {
        toggle.addEventListener('click', () => {
            logCollapsed = !logCollapsed;
            panel.classList.toggle('log-collapsed', logCollapsed);
            if (chevron) chevron.style.transform = logCollapsed ? '' : 'rotate(180deg)';
            if (!logCollapsed) {
                logUnreadCount = 0;
                if (badge) badge.classList.remove('has-new');
                if (entries) setTimeout(() => { entries.scrollTop = entries.scrollHeight; }, 50);
            }
        });
    }
});

// ==========================================
// Card-move animation (FLIP technique)
// ==========================================
// renderGameBoard() fully wipes and rebuilds every player zone's DOM on
// every snapshot. That means we can't animate a card sliding from A to B
// by just transitioning styles on a persistent element — by the time we'd
// want to animate, the old element is already gone and a new one sits in
// its final position. Instead: capture the source element's on-screen
// rect BEFORE the rebuild runs, let the rebuild happen exactly as it does
// today, then animate a cloned "ghost" element from the old coordinates to
// the destination element's real (post-rebuild) coordinates. This is
// purely a presentation layer — it never touches game state.
const CARD_MOVE_MS = 420; // flight time for the ghost card, separate from NOTIFY_MS (4500ms toast duration)

// Resolves a move endpoint reference to its current DOM element.
// 'hand' slots are identified by the stable data-pid/data-cidx attributes
// every card already renders with; 'discard'/'deck' are the two fixed,
// never-rebuilt pile elements.
function resolveMoveEl(ref) {
    if (!ref) return null;
    if (ref.type === 'hand') return document.querySelector(`[data-pid="${ref.pid}"][data-cidx="${ref.idx}"]`);
    if (ref.type === 'discard') return document.getElementById('discardPile');
    if (ref.type === 'deck') return document.getElementById('drawDeck');
    return null;
}

// Flies a cloned "ghost" card from fromRect to toEl's current position.
// The ghost is always a plain card-back-styled block — it never shows a
// rank or suit, since a card mid-flight must not leak hidden information
// to opponents who aren't allowed to see it.
function animateCardMove(fromRect, toEl) {
    if (!fromRect || !toEl) return; // capture failed or destination missing — fall through silently, no crash
    const toRect = toEl.getBoundingClientRect();
    if (toRect.width === 0) return; // destination not visible/rendered — skip

    const ghost = document.createElement('div');
    ghost.className = 'card-move-ghost';
    ghost.style.position = 'fixed';
    ghost.style.left = fromRect.left + 'px';
    ghost.style.top = fromRect.top + 'px';
    ghost.style.width = fromRect.width + 'px';
    ghost.style.height = fromRect.height + 'px';
    ghost.style.zIndex = '999';
    ghost.style.pointerEvents = 'none';
    document.body.appendChild(ghost);

    requestAnimationFrame(() => {
        ghost.style.transition = `transform ${CARD_MOVE_MS}ms cubic-bezier(0.4,0,0.2,1), opacity ${CARD_MOVE_MS}ms ease`;
        const dx = toRect.left - fromRect.left, dy = toRect.top - fromRect.top;
        ghost.style.transform = `translate(${dx}px,${dy}px) scale(${toRect.width / fromRect.width})`;
    });
    setTimeout(() => ghost.remove(), CARD_MOVE_MS + 50);
}

// Reads gameState.lastEvent and, if it's a new event carrying moves, captures
// each move's source element's current on-screen rect right now — before
// renderGameBoard() wipes and rebuilds the DOM. Returns the list of
// {toRef, fromRect} pairs to resolve and play back AFTER the rebuild, or
// null if there's nothing new to animate. Crossing-pair swaps (J/Q/K) share
// one gameState write with two moves; both halves get captured here before
// either is applied, so when played back they correctly cross each other.
function maybeCaptureMoveAnimSources() {
    const evt = gameState.lastEvent;
    if (!evt || evt.id === lastMoveAnimEventId) return null;
    lastMoveAnimEventId = evt.id; // safe to overwrite immediately — each event is keyed by its own unique id,
                                   // so overlapping fast actions just start independent capture/play cycles
    if (!evt.moves || !evt.moves.length) return null;
    return evt.moves.map(m => ({
        toRef: m.to,
        fromRect: resolveMoveEl(m.from)?.getBoundingClientRect() || null
    }));
}


// ==========================================
// Global UI Rendering Router
// ==========================================
function renderState() {
    // Capture must happen before ANYTHING else runs, including the existing
    // maybeShowPublicEvent()/maybeApplyEventHighlights() calls below — those
    // don't touch the DOM layout, but renderGameBoard() (called further down,
    // inside the PLAYING branch) does, and capture has to happen before that
    // rebuild wipes out the source elements' current positions.
    const pendingMoveAnims = maybeCaptureMoveAnimSources();
    maybeShowPublicEvent();
    maybeApplyEventHighlights();
    maybeLogPublicEvent();
    landingScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    roundEndScreen.classList.add("hidden");

    if (gameState.status === "LOBBY") {
        lobbyScreen.classList.remove("hidden");
        closeVoteKickModal();
        renderLobby();
    } else if (gameState.status === "PLAYING") {
        gameScreen.classList.remove("hidden");
        const key = `${roomCode}-${gameState.roundNumber}`;
        if (roundSeenKey !== key) {
            roundSeenKey = key;
            const handSize = gameState.players[localPlayerId]?.cards?.length || 4;
            // Only the bottom two cards (last two indices) may be peeked at, in order — no choice.
            initialPeekIdxsRemaining = [handSize - 2, handSize - 1];
            revealed = {};
            highlightMap = {};
            lastAbilityType = null;
            lastShownEventId = gameState.lastEvent?.id || null;
            lastHighlightEventId = gameState.lastEvent?.id || null;
            lastMoveAnimEventId = gameState.lastEvent?.id || null;
            playSfx('roundStart');
        }
        renderGameBoard();
        renderVoteKickModal();
        // Let renderGameBoard() run exactly as it does today, completely
        // unmodified — THEN resolve each destination and play the flight.
        // This ordering (capture before rebuild, play after) is the trick
        // that makes animating across a full-DOM-rebuild pattern work at all.
        if (pendingMoveAnims) {
            pendingMoveAnims.forEach(({ toRef, fromRect }) => {
                animateCardMove(fromRect, resolveMoveEl(toRef));
            });
        }
    } else if (gameState.status === "ROUND_END") {
        roundEndScreen.classList.remove("hidden");
        closeVoteKickModal();
        renderRoundEnd();
        // Each signed-in client records its OWN result for this finished round.
        // Keyed the same way as roundSeenKey so it can never double-count if
        // this snapshot handler fires again for the same round.
        const roundKey = `${roomCode}-${gameState.roundNumber}`;
        recordRoundResultForCurrentUser(roundKey);
    }
}

function renderLobby() {
    document.getElementById("lobbyCodeDisplay").innerText = gameState.code;
    const playerList = document.getElementById("lobbyPlayerList");
    playerList.innerHTML = "";
    const isHost = gameState.hostId === localPlayerId;
    Object.keys(gameState.players).forEach(pid => {
        const p = gameState.players[pid];
        const canKick = isHost && pid !== localPlayerId;
        playerList.innerHTML += `
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center gap-2">
                <span class="font-semibold text-sm text-white flex items-center gap-1.5 min-w-0 truncate">
                    ${pid === gameState.hostId ? '<span class="text-amber-400">👑</span>' : ''}
                    ${p.name}
                </span>
                <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-xs px-2.5 py-1 rounded-lg font-bold ${p.ready ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}">${p.ready ? '✓ Ready' : 'Not Ready'}</span>
                    ${canKick ? `<button class="lobby-kick-btn text-xs px-2.5 py-1 rounded-lg font-bold bg-rose-900/60 hover:bg-rose-700/80 text-rose-400 hover:text-rose-200 border border-rose-700/40 transition" data-pid="${pid}">Kick</button>` : ''}
                </div>
            </div>`;
    });
    // Wire up lobby kick buttons
    playerList.querySelectorAll('.lobby-kick-btn').forEach(btn => {
        btn.addEventListener('click', () => lobbyKickPlayer(btn.dataset.pid));
    });
    const startBtn = document.getElementById("startMatchBtn");
    if (gameState.hostId === localPlayerId) {
        startBtn.classList.remove("hidden");
        const allReady = Object.values(gameState.players).every(p => p.ready);
        const enoughPlayers = Object.keys(gameState.players).length >= 2;
        startBtn.disabled = !(allReady && enoughPlayers);
    } else {
        startBtn.classList.add("hidden");
    }

    const readyBtn = document.getElementById("readyBtn");
    const myReady = gameState.players[localPlayerId]?.ready;
    readyBtn.textContent = myReady ? '✓ Ready!' : '✓ Ready Up';
    readyBtn.className = myReady
        ? 'flex-1 py-3 bg-emerald-700 text-white font-bold rounded-xl cursor-pointer border border-emerald-500/50'
        : 'flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer';
}

// ==========================================
// Lobby kick — host-only, instant removal (no vote needed in the lobby)
// ==========================================
async function lobbyKickPlayer(targetPid) {
    if (gameState.hostId !== localPlayerId) return;
    if (gameState.status !== 'LOBBY') return;
    if (!gameState.players[targetPid]) return;
    const targetName = gameState.players[targetPid]?.name || 'that player';
    const confirmed = await showConfirm(
        `Kick ${targetName} from the lobby?`,
        'They will be removed and can rejoin with the room code.'
    );
    if (!confirmed) return;
    const newTurnOrder = (gameState.turnOrder || []).filter(pid => pid !== targetPid);
    await updateDoc(doc(db, 'rooms', roomCode), {
        [`players.${targetPid}`]: deleteField(),
        turnOrder: newTurnOrder
    });
    showToast(`${targetName} was removed from the lobby.`, 'info');
    playSfx('kick');
}

document.getElementById("readyBtn").addEventListener("click", async () => {
    const isReady = gameState.players[localPlayerId].ready;
    await pushState({ [`players.${localPlayerId}.ready`]: !isReady });
});

// ==========================================
// Dealing / starting a round
// ==========================================
async function dealNewRound() {
    let freshDeck = createDeck();
    let updatedPlayers = { ...gameState.players };
    Object.keys(updatedPlayers).forEach(pid => {
        // Each round stands alone — clear last round's score along with
        // dealing fresh cards, so nothing stale lingers until this round ends.
        updatedPlayers[pid] = { ...updatedPlayers[pid], cards: [freshDeck.pop(), freshDeck.pop(), freshDeck.pop(), freshDeck.pop()], ready: false, score: 0, lastHandScore: null };
    });

    // Randomize the turn order once, at the start of a fresh game from the
    // lobby — so the party leader (or whoever joined first) doesn't always
    // take the first turn. dealNewRound() is also called by "Start Next
    // Round" to continue an already-running game (status is ROUND_END at
    // that point, not LOBBY); in that case we deliberately keep the SAME
    // turnOrder the game already picked, so seating stays stable for the
    // whole game rather than reshuffling every round. Only actually
    // starting a brand-new game (from LOBBY) shuffles again.
    const isFreshGame = gameState.status === 'LOBBY' || !gameState.turnOrder || gameState.turnOrder.length === 0;
    const turnOrder = isFreshGame ? shuffleArray(Object.keys(updatedPlayers)) : gameState.turnOrder;

    await pushState({
        status: "PLAYING", deck: freshDeck, discard: [],
        players: updatedPlayers, roundNumber: (gameState.roundNumber || 0) + 1,
        turnOrder, currentTurnIdx: 0, turnPhase: 'AWAIT_DRAW', drawnCard: null,
        ability: null, dutchCalledBy: null, finalTurnsLeft: null, pendingGive: null
    });
}

document.getElementById("startMatchBtn").addEventListener("click", dealNewRound);
document.getElementById("nextRoundBtn").addEventListener("click", dealNewRound);

// ==========================================
// End Game — host-only, offered alongside "Start Next Round" on the
// round-end screen. Returns everyone to the lobby for this same room
// (same code, same seated players) rather than dissolving the room or
// sending people back to the landing screen. Each round's score is
// standalone (see dealNewRound/advanceTurn), so there's no running
// scoreboard to preserve or wipe here — the last round's score just sits
// until dealNewRound resets it for whatever game starts next in this room.
// Nothing here touches per-account Firestore stats (users/{uid}.stats) —
// those are already finalized at the moment a round ends (see
// recordRoundResultForCurrentUser, hooked into the ROUND_END render branch),
// so ending the game afterward has nothing left to record or undo.
// ==========================================
async function endGame() {
    const updatedPlayers = { ...gameState.players };
    Object.keys(updatedPlayers).forEach(pid => {
        updatedPlayers[pid] = { ...updatedPlayers[pid], ready: false, cards: [] };
    });
    await pushState({
        status: "LOBBY",
        players: updatedPlayers,
        turnOrder: gameState.turnOrder || Object.keys(updatedPlayers), currentTurnIdx: 0,
        deck: [], discard: [], drawnCard: null, ability: null,
        dutchCalledBy: null, finalTurnsLeft: null, pendingGive: null,
        voteKick: deleteField()
    });
}

document.getElementById("endGameBtn").addEventListener("click", async () => {
    if (gameState.hostId !== localPlayerId) return;
    const confirmed = await showChoiceModal(
        '🏁 End the game?',
        "Everyone will be sent back to the lobby. Your room's current standings are kept — you can start a fresh game from the lobby whenever you're ready.",
        'End Game',
        'bg-slate-700 hover:bg-slate-600'
    );
    if (!confirmed) return;
    await endGame();
});

// ==========================================
// Game board rendering
// ==========================================
function activePid() {
    return gameState.turnOrder[gameState.currentTurnIdx];
}

function setInstruction(text) {
    document.getElementById("actionInstruction").innerText = text;
}

// ==========================================
// Host safety valve — force-end a stuck turn
// ==========================================
// Covers softlocks that the targeted fixes above can't fully rule out (odd
// timing windows, a King free-pick step where the only remaining slot
// vanished mid-ability, etc). Only ever visible to the room host, and only
// once the SAME stuck-looking state (same phase/ability/give-away) has sat
// unchanged for a while — so it can't be used to just rush other players
// through ordinary ability turns.
let stuckStateSignature = null;
let stuckStateSince = null;
const STUCK_REVEAL_MS = 20000; // 20s of no progress before the host gets the option

function updateForceUnstickButton() {
    const btn = document.getElementById('forceUnstickBtn');
    if (!btn) return;
    const isHost = gameState.hostId === localPlayerId;
    const looksStuck = gameState.status === 'PLAYING' && (
        gameState.turnPhase === 'AWAIT_ABILITY' ||
        !!gameState.pendingGive
    );
    if (!isHost || !looksStuck) {
        btn.classList.add('hidden');
        stuckStateSignature = null;
        stuckStateSince = null;
        return;
    }
    const signature = JSON.stringify({
        idx: gameState.currentTurnIdx, round: gameState.roundNumber,
        phase: gameState.turnPhase, ability: gameState.ability, give: gameState.pendingGive
    });
    if (signature !== stuckStateSignature) {
        // State actually changed (or this is the first time we've seen it) —
        // restart the countdown and hide the button in the meantime.
        stuckStateSignature = signature;
        stuckStateSince = Date.now();
        btn.classList.add('hidden');
        setTimeout(() => {
            if (stuckStateSignature === signature) {
                document.getElementById('forceUnstickBtn')?.classList.remove('hidden');
            }
        }, STUCK_REVEAL_MS);
        return;
    }
    if (Date.now() - stuckStateSince >= STUCK_REVEAL_MS) {
        btn.classList.remove('hidden');
    }
}

document.getElementById('forceUnstickBtn')?.addEventListener('click', async () => {
    if (gameState.hostId !== localPlayerId) return;
    const ok = confirm("Force-end the current turn? Only do this if the game looks genuinely stuck (an ability or card give-away that can't be completed).");
    if (!ok) return;
    const hostName = gameState.players[localPlayerId]?.name || 'The host';
    await advanceTurn({
        ability: null,
        pendingGive: null,
        drawnCard: null,
        lastEvent: makeEvent(`${hostName} (host) force-ended a stuck turn.`)
    });
    showToast("Turn force-ended.", 'info', NOTIFY_MS);
});

function renderGameBoard() {
    updateForceUnstickButton();
    const activeTurnPlayerId = activePid();
    const isMyTurn = activeTurnPlayerId === localPlayerId;
    const turnBanner = document.getElementById("gameTurnBanner");

    if (isMyTurn) {
        turnBanner.textContent = "⭐ YOUR TURN ⭐";
        turnBanner.className = "my-turn-banner text-slate-950 p-3 rounded-xl font-black text-center text-base shadow-lg shadow-amber-500/20";
    } else {
        const opposingName = gameState.players[activeTurnPlayerId]?.name || "Opponent";
        turnBanner.textContent = `⏳ Waiting for ${opposingName}...`;
        turnBanner.className = "bg-slate-800 text-slate-400 p-3 rounded-xl font-semibold text-center text-sm border border-slate-700";
    }

    // Discard pile
    const discPile = document.getElementById("discardPile");
    if (gameState.discard && gameState.discard.length > 0) {
        const topCard = gameState.discard[gameState.discard.length - 1];
        const cc = cardColorClass(topCard);
        const suit = topCard.isJoker ? '🃏' : topCard.suit;
        const rank = topCard.isJoker ? '🃏' : topCard.name;
        discPile.className = 'stack-top w-full h-full cursor-pointer hover:scale-105 transition playing-card flex flex-col items-center justify-center';
        discPile.innerHTML = `
            <div class="corner-tl ${cc}">
                <div class="rank" style="font-family:'Playfair Display',serif;font-weight:900;font-size:1rem">${rank}</div>
                ${suit && !topCard.isJoker ? `<div style="font-size:0.65rem">${suit}</div>` : ''}
            </div>
            <div class="text-center">
                <div class="text-2xl ${cc}">${suit}</div>
            </div>
            <div class="corner-br ${cc}">
                <div class="rank" style="font-family:'Playfair Display',serif;font-weight:900;font-size:1rem">${rank}</div>
                ${suit && !topCard.isJoker ? `<div style="font-size:0.65rem">${suit}</div>` : ''}
            </div>`;
    } else {
        discPile.className = 'stack-top w-full h-full flex flex-col items-center justify-center rounded-[10px] border-2 border-slate-700 bg-slate-900 cursor-pointer hover:border-slate-600 transition';
        discPile.innerHTML = `<span class="text-xs text-slate-600 font-bold">EMPTY</span>`;
    }

    // Draw deck — show drawn card if we have one and it's our turn
    const drawDeckEl = document.getElementById("drawDeck");
    const drawnCardArea = document.getElementById("drawnCardArea");
    const discardDrawnBtn = document.getElementById("discardDrawnBtn");
    const discardDrawnNABtn = document.getElementById("discardDrawnNoAbilityBtn");

    if (isMyTurn && gameState.turnPhase === 'AWAIT_DECISION' && gameState.drawnCard) {
        const c = gameState.drawnCard.card;
        const cc = cardColorClass(c);
        const suit = c.isJoker ? '🃏' : c.suit;
        const rank = c.isJoker ? '🃏' : c.name;
        const abilityType = isSpecial(c);
        const hasAbility = !!abilityType && gameState.drawnCard.source === 'deck';

        drawnCardArea.classList.add('visible');

        const drawnDisplay = document.getElementById('drawnCardDisplay');
        drawnDisplay.innerHTML = `
            <div class="drawn-card-display playing-card w-[76px] h-[108px] flex flex-col items-center justify-center cursor-default" style="cursor:default !important">
                <div class="corner-tl ${cc}">
                    <div class="rank" style="font-family:'Playfair Display',serif;font-weight:900;font-size:1rem">${rank}</div>
                    ${suit && !c.isJoker ? `<div style="font-size:0.65rem">${suit}</div>` : ''}
                </div>
                <div class="text-center">
                    <div class="text-2xl ${cc}">${suit}</div>
                </div>
                <div class="corner-br ${cc}">
                    <div class="rank" style="font-family:'Playfair Display',serif;font-weight:900;font-size:1rem">${rank}</div>
                    ${suit && !c.isJoker ? `<div style="font-size:0.65rem">${suit}</div>` : ''}
                </div>
            </div>`;

        if (hasAbility) {
            discardDrawnBtn.classList.remove('hidden');
            discardDrawnBtn.textContent = `⚡ Discard & Use ${ABILITY_CONFIG[abilityType]?.icon || ''} Power`;
            discardDrawnNABtn.classList.remove('hidden');
        } else if (gameState.drawnCard.source === 'deck') {
            discardDrawnBtn.classList.add('hidden');
            discardDrawnNABtn.classList.remove('hidden');
            discardDrawnNABtn.textContent = 'Discard (no special power)';
        } else {
            discardDrawnBtn.classList.add('hidden');
            discardDrawnNABtn.classList.add('hidden');
        }

        // Reset draw deck to normal
        drawDeckEl.querySelector('.deck-top').innerHTML = `<span class="text-2xl opacity-40">✦</span><span class="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Draw</span>`;
    } else {
        drawnCardArea.classList.remove('visible');
        discardDrawnBtn.classList.add('hidden');
        discardDrawnNABtn.classList.add('hidden');
        drawDeckEl.querySelector('.deck-top').innerHTML = `<span class="text-2xl opacity-40">✦</span><span class="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Draw</span>`;
    }

    const dutchBtn = document.getElementById("callDutchBtn");
    // A player can call Dutch as long as they have at least 1 card.
    // If they have 0 cards they must draw from the deck instead.
    const myCardsForDutch = gameState.players[localPlayerId]?.cards || [];
    const hasNoCards = myCardsForDutch.every(c => c === null || c === undefined);
    dutchBtn.disabled = !(isMyTurn && gameState.turnPhase === 'AWAIT_DRAW' && !gameState.dutchCalledBy && !hasNoCards);
    dutchBtn.title = hasNoCards ? "You have no cards — draw a card from the deck first." : "";

    // Vote-kick button: available to anyone, any time mid-game (not gated to
    // your own turn, unlike Dutch), as long as no vote is already running
    // and there are enough players left that a kick wouldn't break the game.
    const voteKickBtn = document.getElementById("vote-kick-btn");
    const voteInProgress = gameState.voteKick && !gameState.voteKick.resolved;
    const enoughToKick = Object.keys(gameState.players).length > MIN_PLAYERS_TO_REMAIN;
    voteKickBtn.disabled = voteInProgress || !enoughToKick;
    voteKickBtn.title = voteInProgress
        ? "A kick vote is already in progress"
        : !enoughToKick
            ? `Need more than ${MIN_PLAYERS_TO_REMAIN} players to start a kick vote`
            : "Vote to kick a player";

    // Ability panel
    const activeAbility = gameState.turnPhase === 'AWAIT_ABILITY' && gameState.ability;
    const isAbilityPhase = isMyTurn && activeAbility;
    if (isAbilityPhase) {
        const a = gameState.ability;
        showAbilityPanel(a.type, a.step || 1);

        // Flash ability announcement if just activated
        const abilityKey = `${a.type}-${gameState.roundNumber}`;
        if (lastAbilityType !== abilityKey) {
            lastAbilityType = abilityKey;
            const cfg = ABILITY_CONFIG[a.type];
            if (cfg) flashAbility(cfg.icon, cfg.title, cfg.steps[0], cfg.flashColor);
        }
    } else if (activeAbility) {
        // Not my turn, but someone else is resolving an ability — let me know without revealing card values.
        hideAbilityPanel();
        const actingName = gameState.players[activeTurnPlayerId]?.name || 'A player';
        const abilityKey = `${gameState.ability.type}-${gameState.roundNumber}-opp`;
        if (lastAbilityType !== abilityKey) {
            lastAbilityType = abilityKey;
            const cfg = ABILITY_CONFIG[gameState.ability.type];
            if (cfg) flashAbility(cfg.icon, `${actingName} is using an ability`, `${cfg.title} — wait while they resolve it.`, cfg.flashColor);
        }
    } else {
        hideAbilityPanel();
    }

    // Instruction text
    const topCard = gameState.discard?.[gameState.discard.length - 1];
    const canSnap = topCard && gameState.status === 'PLAYING' && !gameState.pendingGive;

    if (gameState.pendingGive && gameState.pendingGive.fromPid === localPlayerId) {
        setInstruction(`Choose one of YOUR cards to give to ${gameState.players[gameState.pendingGive.toPid]?.name || 'them'}.`);
    } else if (initialPeekIdxsRemaining.length > 0) {
        setInstruction(`Memorise your bottom cards — click card #${initialPeekIdxsRemaining[0] + 1} to peek at it.`);
    } else if (isMyTurn && gameState.turnPhase === 'AWAIT_DRAW') {
        setInstruction("Your turn — draw from the deck, take the top discard, or call Dutch!");
    } else if (isMyTurn && gameState.turnPhase === 'AWAIT_DECISION') {
        setInstruction(gameState.drawnCard?.source === 'deck'
            ? "Click one of your hand cards to swap it in, or discard this card."
            : "Click one of your hand cards to swap it with the card you picked up.");
    } else if (isAbilityPhase) {
        setInstruction(abilityInstructionText());
    } else {
        setInstruction("Watch the discard pile — if you remember a matching card anywhere on the board, click it to snap!");
    }

    // Render player areas — perimeter layout
    const zoneTop = document.getElementById("zone-top");
    const zoneLeft = document.getElementById("zone-left");
    const zoneRight = document.getElementById("zone-right");
    const heroContainer = document.getElementById("heroContainer");
    zoneTop.innerHTML = "";
    zoneLeft.innerHTML = "";
    zoneRight.innerHTML = "";
    heroContainer.innerHTML = "";

    // Use turnOrder (a real array field, so its order is stable across
    // Firestore writes/reads) rather than Object.keys(gameState.players) —
    // plain-object key order from a Firestore map field isn't guaranteed to
    // stay consistent across snapshots, which was causing opponents to
    // visually swap seats on screen even though turn order itself hadn't changed.
    const seatOrder = (gameState.turnOrder && gameState.turnOrder.length)
        ? gameState.turnOrder
        : Object.keys(gameState.players);
    const opponents = seatOrder.filter(pid => pid !== localPlayerId && gameState.players[pid]);
    const n = opponents.length;
    // Layout rules (n = number of opponents, hero is always on the bottom):
    // 1 opp  → top(1)
    // 2 opps → left(1), right(1)
    // 3 opps → left(1), top(1), right(1)
    // 4 opps → left(1), top(2), right(1)
    // 5 opps → left(1), top(3), right(1)
    // Left and right always hold exactly 1 each (once n >= 2); every
    // remaining opponent beyond that goes to the top row.

    // Assign positions
    let topPids = [], leftPids = [], rightPids = [];

    if (n === 1) {
        topPids = [opponents[0]];
    } else {
        leftPids = [opponents[0]];
        rightPids = [opponents[1]];
        topPids = opponents.slice(2);
    }

    leftPids.forEach(pid => {
        const el = createPlayerBoardElement(gameState.players[pid], pid, false, topCard, canSnap, 'side');
        zoneLeft.appendChild(el);
    });
    rightPids.forEach(pid => {
        const el = createPlayerBoardElement(gameState.players[pid], pid, false, topCard, canSnap, 'side');
        zoneRight.appendChild(el);
    });
    topPids.forEach(pid => {
        const el = createPlayerBoardElement(gameState.players[pid], pid, false, topCard, canSnap, 'top');
        zoneTop.appendChild(el);
    });

    // No-op: extra-bottom row removed — every opponent now lives in the
    // left/top/right zones. Clean up any leftover element from a
    // previous render/version.
    const extraZone = document.getElementById('zone-extra-bottom');
    if (extraZone) extraZone.remove();

    const heroObj = gameState.players[localPlayerId];
    if (heroObj) {
        heroContainer.appendChild(createPlayerBoardElement(heroObj, localPlayerId, true, topCard, canSnap, 'hero'));
    }
}

function abilityInstructionText() {
    const a = gameState.ability;
    if (!a) return "";
    const cfg = ABILITY_CONFIG[a.type];
    if (cfg) return cfg.steps[(a.step || 1) - 1] || cfg.steps[0];
    return "";
}

function isRevealed(pid, idx) {
    const r = revealed[`${pid}-${idx}`];
    if (!r) return null;
    if (Date.now() > r.until) return null;
    return r.card;
}

function reveal(pid, idx, card, ms = NOTIFY_MS) {
    revealed[`${pid}-${idx}`] = { card, until: Date.now() + ms };
    renderGameBoard();
    setTimeout(() => { renderGameBoard(); }, ms + 50);
}

// A player's card grid is fully rebuilt from scratch (root.innerHTML = ...)
// on every re-render — which happens on almost every game event, not just
// this player's own actions. That used to reset anyone's hand-scroll
// position back to the top constantly, since the scrollable wrapper div is
// a brand-new DOM node each time and starts at scrollTop 0. This map
// remembers the last scroll position per player (kept fresh by a 'scroll'
// listener on whichever wrapper currently exists) so it can be restored
// onto the freshly-built wrapper immediately after each rebuild.
const savedScrollTops = {};

function createPlayerBoardElement(player, pid, isHero, topCard, canSnap, zone = 'top') {
    const root = document.createElement("div");
    const isMyTurn = activePid() === localPlayerId;
    const isPendingGiveFrom = gameState.pendingGive?.fromPid === localPlayerId;
    const isPendingGiveTo = gameState.pendingGive?.toPid === pid;
    const isAbilityPhase = isMyTurn && gameState.turnPhase === 'AWAIT_ABILITY' && gameState.ability;
    const isActiveTurn = activePid() === pid;
    const isSide = zone === 'side';

    root.className = isHero ? "hero-zone" : "opp-zone";
    if (!isHero && isActiveTurn) root.classList.add("active-turn");
    if (isSide) root.classList.add("side-zone");

    // Card sizes per zone
    const cardW = isHero ? 76 : isSide ? 52 : 58;
    const cardH = isHero ? 108 : isSide ? 73 : 82;
    const gap   = isHero ? 6 : 4;
    // Side zone: 2-col still fits 2×52=104+4=108px wide; top zone: 2×58=116+4=120px
    const cols  = 2;

    // Scroll only needed when more than 4 cards
    const cardCount = player.cards.filter(Boolean).length + player.cards.filter(c => c === null).length;
    const needsScroll = player.cards.length > 4;
    // Max heights: side zones are constrained by viewport middle row
    const scrollMaxH = isHero ? 150 : isSide ? 200 : 160;

    const cardsHTML = player.cards.map((card, idx) => {
        const seen = isRevealed(pid, idx);

        let abilityClass = '';
        if (isAbilityPhase && gameState.ability) {
            const a = gameState.ability;
            if (a.type === '78' && pid === localPlayerId) abilityClass = 'ability-own-target';
            if (a.type === '910' && pid !== localPlayerId) abilityClass = 'ability-opp-target';
            if (a.type === 'jq') {
                if (a.step === 1 && pid === localPlayerId) abilityClass = 'ability-own-target';
                if (a.step === 2 && pid !== localPlayerId) abilityClass = 'ability-opp-target';
                if (a.step === 2 && pid === localPlayerId && a.ownIdx === idx) abilityClass = 'ability-selected';
            }
            if (a.type === 'k') {
                if (a.step === 1) {
                    // Any card is a valid first pick — colour by whose board
                    // it's on so it's clear both yours and opponents' cards
                    // are equally clickable, not just opponents'.
                    abilityClass = pid === localPlayerId ? 'ability-own-target' : 'ability-opp-target';
                } else if (a.step === 2 && a.first) {
                    const isFirstSlot = a.first.pid === pid && a.first.idx === idx;
                    const bothWouldBeOwn = a.first.pid === localPlayerId && pid === localPlayerId;
                    if (isFirstSlot) abilityClass = 'ability-selected';
                    else if (!bothWouldBeOwn) abilityClass = pid === localPlayerId ? 'ability-own-target' : 'ability-opp-target';
                } else if (a.step === 3) {
                    // Free-pick step 3: all cards are valid targets
                    abilityClass = pid === localPlayerId ? 'ability-own-target' : 'ability-opp-target';
                } else if (a.step === 4 && a.swapFirst) {
                    const isSwapFirstSlot = a.swapFirst.pid === pid && a.swapFirst.idx === idx;
                    if (isSwapFirstSlot) abilityClass = 'ability-selected';
                    else abilityClass = pid === localPlayerId ? 'ability-own-target' : 'ability-opp-target';
                }
            }
        }
        if (isPendingGiveFrom && pid === localPlayerId) abilityClass = 'ability-own-target';

        const hl = isHighlighted(pid, idx) ? 'highlight-glow' : '';
        const extraCardClass = `${abilityClass} ${hl}`.trim();

        if (!card) {
            return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card ${hl}" style="cursor:default;width:${cardW}px;height:${cardH}px;border-radius:8px;border:2px dashed rgba(100,116,139,0.5);display:flex;align-items:center;justify-content:center">
                <div class="card-slot-number" style="position:static;background:none;border:none;box-shadow:none;color:#475569">#${idx+1}</div>
            </div>`;
        }
        if (seen) {
            const cc = cardColorClass(seen);
            const suit = seen.isJoker ? '🃏' : seen.suit;
            const rank = seen.isJoker ? '🃏' : seen.name;
            return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card playing-card card-revealing ${extraCardClass}" style="width:${cardW}px;height:${cardH}px">
                <div class="card-slot-number">#${idx+1}</div>
                <div class="corner-tl ${cc}"><div class="rank">${rank}</div>${suit && !seen.isJoker ? `<div class="suit-sm">${suit}</div>` : ''}</div>
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.07;font-size:2rem" class="${cc}">${suit}</div>
                <div class="text-center"><div class="text-xl ${cc}">${suit}</div></div>
                <div class="corner-br ${cc}"><div class="rank">${rank}</div>${suit && !seen.isJoker ? `<div class="suit-sm">${suit}</div>` : ''}</div>
            </div>`;
        }
        return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card card-back ${skinClassFor(player)} ${extraCardClass}" style="width:${cardW}px;height:${cardH}px">
            <div class="card-slot-number">#${idx+1}</div>
        </div>`;
    }).join('');

    const gridStyle = `display:grid;grid-template-columns:repeat(${cols},${cardW}px);gap:${gap}px;width:fit-content;margin:0 auto;`;
    const scrollStyle = needsScroll ? `max-height:${scrollMaxH}px;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#334155 transparent;` : '';

    root.innerHTML = `
        <div class="player-meta">
            <div class="player-name-row">
                ${isActiveTurn ? '<div class="turn-dot"></div>' : ''}
                <span style="font-size:${isSide?10:12}px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${isSide?70:90}px">${player.name}</span>
                ${isHero ? '<span class="status-badge" style="background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.25)">You</span>' : ''}
                ${gameState.dutchCalledBy === pid ? '<span class="status-badge" style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.25);animation:dot-pulse 1s infinite">Dutch!</span>' : ''}
                ${isPendingGiveTo ? '<span class="status-badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.25)">Receiving</span>' : ''}
            </div>
            <span class="score-chip">Pts: <span>${player.score || 0}</span></span>
        </div>
        <div style="${scrollStyle}" ${needsScroll ? `data-scroll-pid="${pid}"` : ''}>
            <div style="${gridStyle}">${cardsHTML}</div>
        </div>
    `;

    root.querySelectorAll('.game-card').forEach(el => {
        el.addEventListener('click', () => handleCardInteraction(el.dataset.pid, parseInt(el.dataset.cidx)));
    });

    // Restore this player's remembered scroll position on the freshly-built
    // wrapper, and keep the memory updated as they scroll it further.
    if (needsScroll) {
        const scrollEl = root.querySelector(`[data-scroll-pid="${pid}"]`);
        if (scrollEl) {
            if (savedScrollTops[pid] != null) scrollEl.scrollTop = savedScrollTops[pid];
            scrollEl.addEventListener('scroll', () => { savedScrollTops[pid] = scrollEl.scrollTop; });
        }
    }

    return root;
}

// ==========================================
// Draw / Discard pile interactions
// ==========================================

// When the draw deck runs out, the discard pile (minus its top card, which
// must stay face-up and in play) is shuffled and becomes the new deck.
// Returns { card, deck, discard } on success, or null if there's truly
// nowhere left to draw from (deck empty AND discard has 0-1 cards).
function reshuffleDiscardIntoDeckIfNeeded(deck, discard, { silent = false } = {}) {
    if (deck.length > 0) return { deck, discard };
    if (!discard || discard.length <= 1) return null; // nothing to reshuffle (need to keep the top card)
    const topCard = discard[discard.length - 1];
    const rest = discard.slice(0, -1);
    const reshuffled = rest.sort(() => Math.random() - 0.5);
    // Not shown when called from inside attemptSnap's transaction — that
    // callback can be retried by the SDK on contention, which would fire
    // this toast more than once for what the player experiences as a
    // single click.
    if (!silent) showToast("🔄 Deck empty — reshuffled the discard pile!", 'info', NOTIFY_MS);
    return { deck: reshuffled, discard: [topCard] };
}

// Draws one card from the deck, reshuffling the discard pile in first if the
// deck is empty. Used both for a normal turn draw and for snap penalty cards.
// Returns { card, deck, discard } or null if there are no cards anywhere.
async function drawCardReplenishingIfNeeded() {
    let deck = [...(gameState.deck || [])];
    let discard = [...(gameState.discard || [])];
    const replenished = reshuffleDiscardIntoDeckIfNeeded(deck, discard);
    if (!replenished) {
        showToast("No cards left to draw — deck and discard are both empty!", 'warning');
        return null;
    }
    deck = replenished.deck;
    discard = replenished.discard;
    const card = deck.pop();
    return { card, deck, discard };
}

document.getElementById("drawDeck").addEventListener("click", async () => {
    if (gameState.status !== 'PLAYING') return;
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DRAW') return;
    if (initialPeekIdxsRemaining.length > 0) { showToast("Finish memorising your bottom cards first!", 'warning'); return; }

    const drawn = await drawCardReplenishingIfNeeded();
    if (!drawn) return;
    playSfx('cardDraw');
    await pushState({ deck: drawn.deck, discard: drawn.discard, drawnCard: { card: drawn.card, source: 'deck' }, turnPhase: 'AWAIT_DECISION' });
});

document.getElementById("discardPile").addEventListener("click", async () => {
    if (gameState.status !== 'PLAYING') return;
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DRAW') return;
    if (initialPeekIdxsRemaining.length > 0) { showToast("Finish memorising your bottom cards first!", 'warning'); return; }
    if (!gameState.discard || gameState.discard.length === 0) { showToast("The discard pile is empty!", 'warning'); return; }

    const freshDiscard = [...gameState.discard];
    const card = freshDiscard.pop();
    playSfx('cardDraw');
    await pushState({ discard: freshDiscard, drawnCard: { card, source: 'discard' }, turnPhase: 'AWAIT_DECISION' });
});

// Discard with ability
document.getElementById("discardDrawnBtn").addEventListener("click", async () => {
    if (activePid() !== localPlayerId) return;
    playSfx('ability');
    if (gameState.turnPhase !== 'AWAIT_DECISION' || !gameState.drawnCard || gameState.drawnCard.source !== 'deck') return;
    const card = gameState.drawnCard.card;
    const newDiscard = [...gameState.discard, card];
    const abilityType = isSpecial(card);
    const myName = gameState.players[localPlayerId]?.name || 'A player';
    const discardMoveEvent = makeEvent(`${myName} discarded their drawn card.`, null, null, [], [
        { from: { type: 'deck' }, to: { type: 'discard' } }
    ]);
    if (abilityType && !abilityHasLegalTarget(abilityType)) {
        // No legal card anywhere to resolve this ability against — skip it
        // gracefully right now rather than entering AWAIT_ABILITY with no
        // clickable card able to ever get us back out of it.
        showToast("No legal target for that ability — it's skipped.", 'info', NOTIFY_MS);
        await advanceTurn({
            discard: newDiscard, drawnCard: null,
            lastEvent: makeEvent(`${myName}'s ${ABILITY_CONFIG[abilityType]?.title || 'ability'} was skipped — no legal target was available.`)
        });
    } else if (abilityType) {
        await pushState({
            discard: newDiscard, drawnCard: null,
            turnPhase: 'AWAIT_ABILITY',
            ability: { type: abilityType, step: 1, ownIdx: null, oppPid: null, oppIdx: null, first: null, second: null },
            lastEvent: discardMoveEvent
        });
    } else {
        await advanceTurn({ discard: newDiscard, drawnCard: null, lastEvent: discardMoveEvent });
    }
});

// Discard without ability (or non-special card discard)
document.getElementById("discardDrawnNoAbilityBtn").addEventListener("click", async () => {
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DECISION' || !gameState.drawnCard || gameState.drawnCard.source !== 'deck') return;
    const card = gameState.drawnCard.card;
    const newDiscard = [...gameState.discard, card];
    const myName = gameState.players[localPlayerId]?.name || 'A player';
    await advanceTurn({
        discard: newDiscard, drawnCard: null,
        lastEvent: makeEvent(`${myName} discarded their drawn card.`, null, null, [], [
            { from: { type: 'deck' }, to: { type: 'discard' } }
        ])
    });
});

// ==========================================
// Call Dutch
// ==========================================
document.getElementById("callDutchBtn").addEventListener("click", async () => {
    if (activePid() !== localPlayerId) return;
    playSfx('dutch');
    if (gameState.turnPhase !== 'AWAIT_DRAW' || gameState.dutchCalledBy) return;
    const myCards = gameState.players[localPlayerId]?.cards || [];
    if (myCards.every(c => c === null || c === undefined)) {
        showToast("You have no cards — draw a card from the deck first!", 'warning', NOTIFY_MS);
        return;
    }
    const confirmed = await showChoiceModal(
        '🗣️ Call "Dutch!"?',
        'Every other player gets one final turn, then scores are revealed. Make sure your hand is low!',
        'Call it!',
        'bg-rose-600 hover:bg-rose-500'
    );
    if (!confirmed) return;
    await advanceTurn({ dutchCalledBy: localPlayerId, finalTurnsLeft: Object.keys(gameState.players).length - 1 });
});

// ==========================================
// Vote-to-Kick
// ==========================================
// Data shape, stored at gameState.voteKick:
//   {
//     targetPid, initiatorPid, startedAt, deadline,
//     votes: { [voterPid]: 'yes' | 'no' },   // never includes targetPid
//     threshold,                              // yes-votes needed, frozen at creation time
//     eligibleVoterCount,                     // frozen at creation time, for an accurate live tally display
//     resolved: bool                          // true once the host has applied the outcome — guards against double-resolution
//   }
//
// The initiator's own vote is pre-filled as 'yes' so they never have to
// re-vote on a request they just made, but it's a normal vote entry like
// anyone else's — they CAN change it in the modal like everyone else, it's
// just pre-set rather than locked.
//
// Resolution (applying the kick, or closing out a failed vote) is done by
// the host's client only, mirroring how round-end advancement already
// works in this codebase (host-gated via gameState.hostId) — this avoids two
// different players' browsers both trying to apply the outcome at once.

document.getElementById("vote-kick-btn").addEventListener("click", () => {
    if (gameState.status !== 'PLAYING') {
        showToast("Vote-kick is only available during an active game.", 'warning');
        return;
    }
    if (gameState.voteKick && !gameState.voteKick.resolved) {
        showToast("A kick vote is already in progress.", 'warning');
        return;
    }
    const eligibleTargets = Object.keys(gameState.players).filter(pid => pid !== localPlayerId);
    if (eligibleTargets.length === 0) {
        showToast("There's nobody else to vote to kick.", 'warning');
        return;
    }
    if (Object.keys(gameState.players).length <= MIN_PLAYERS_TO_REMAIN) {
        showToast(`Can't kick — the game needs at least ${MIN_PLAYERS_TO_REMAIN} players.`, 'warning');
        return;
    }
    openTargetPickerModal();
});

function openTargetPickerModal() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4';
    const targets = Object.keys(gameState.players).filter(pid => pid !== localPlayerId);
    overlay.innerHTML = `
        <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <p class="text-white font-bold text-lg leading-snug">🚫 Vote to Kick</p>
            <p class="text-slate-400 text-sm leading-relaxed">Choose who you'd like to put to a vote. Everyone else will get ${Math.round(VOTE_KICK_DURATION_MS / 1000)}s to vote.</p>
            <div id="vk-target-list" class="space-y-2"></div>
            <div class="flex gap-3 pt-2">
                <button class="vk-cancel-btn flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition">Cancel</button>
                <button class="vk-submit-btn flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition opacity-40 cursor-not-allowed" disabled>Submit</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    let selectedPid = null;
    const list = overlay.querySelector('#vk-target-list');
    const submitBtn = overlay.querySelector('.vk-submit-btn');
    targets.forEach(pid => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'vk-target-row w-full text-left px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-xl text-slate-200 font-semibold transition hover:border-slate-600';
        row.textContent = gameState.players[pid]?.name || 'Unknown player';
        row.addEventListener('click', () => {
            selectedPid = pid;
            list.querySelectorAll('.vk-target-row').forEach(r => {
                r.className = 'vk-target-row w-full text-left px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-xl text-slate-200 font-semibold transition hover:border-slate-600';
            });
            row.className = 'vk-target-row w-full text-left px-4 py-3 bg-rose-500/10 border-2 border-rose-500 rounded-xl text-white font-semibold transition';
            submitBtn.disabled = false;
            submitBtn.className = 'vk-submit-btn flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition';
        });
        list.appendChild(row);
    });

    overlay.querySelector('.vk-cancel-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    submitBtn.addEventListener('click', async () => {
        if (!selectedPid) return;
        overlay.remove();
        await startVoteKick(selectedPid);
    });
}

async function startVoteKick(targetPid) {
    const eligibleVoterCount = Object.keys(gameState.players).length - 1; // everyone except the target
    const threshold = Math.floor(eligibleVoterCount * VOTE_KICK_THRESHOLD_RATIO) + 1; // strict majority
    const now = Date.now();
    const voteKick = {
        targetPid,
        initiatorPid: localPlayerId,
        startedAt: now,
        deadline: now + VOTE_KICK_DURATION_MS,
        votes: { [localPlayerId]: 'yes' }, // initiator auto-counted as yes, but can still change it below
        threshold,
        eligibleVoterCount,
        resolved: false
    };
    await pushState({
        voteKick,
        lastEvent: makeEvent(`${gameState.players[localPlayerId]?.name || 'A player'} started a vote to kick ${gameState.players[targetPid]?.name || 'a player'}.`)
    });
}

async function castVoteKickBallot(choice) {
    if (!gameState.voteKick || gameState.voteKick.resolved) return;
    if (localPlayerId === gameState.voteKick.targetPid) return; // the target doesn't get a vote
    await pushState({ [`voteKick.votes.${localPlayerId}`]: choice });
}

// Renders (or re-renders) the live vote modal for everyone — including the
// initiator, per the spec, so the whole room watches the same tally update
// in real time. Re-render happens every time gameState changes (driven from
// the main render loop below), NOT on a separate timer, so the tally is
// always exactly what's in Firestore; only the countdown digits tick locally.
function renderVoteKickModal() {
    const vk = gameState.voteKick;
    if (!vk || vk.resolved) {
        closeVoteKickModal();
        return;
    }

    let overlay = document.getElementById('vote-kick-modal-overlay');
    const isNewSession = voteKickModalShownForId !== vk.startedAt;
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'vote-kick-modal-overlay';
        overlay.className = 'fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4';
        document.body.appendChild(overlay);
    }
    if (isNewSession) {
        voteKickModalShownForId = vk.startedAt;
    }

    const targetName = gameState.players[vk.targetPid]?.name || 'this player';
    const initiatorName = gameState.players[vk.initiatorPid]?.name || 'A player';
    const isTarget = localPlayerId === vk.targetPid;
    const myVote = vk.votes?.[localPlayerId] || null;
    const yesCount = Object.values(vk.votes || {}).filter(v => v === 'yes').length;
    const noCount = Object.values(vk.votes || {}).filter(v => v === 'no').length;
    const votedNames = Object.entries(vk.votes || {}).map(([pid, v]) =>
        `<span class="${v === 'yes' ? 'text-emerald-400' : 'text-rose-400'}">${gameState.players[pid]?.name || '?'} (${v})</span>`
    ).join(', ');
    const secondsLeft = Math.max(0, Math.ceil((vk.deadline - Date.now()) / 1000));

    overlay.innerHTML = `
        <div class="bg-slate-900 border border-rose-700/50 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <p class="text-white font-bold text-lg leading-snug">🚫 Vote: Kick ${targetName}?</p>
            <p class="text-slate-400 text-sm leading-relaxed">Started by ${initiatorName}. Needs ${vk.threshold} of ${vk.eligibleVoterCount} eligible votes to pass.</p>

            <div class="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <div class="flex gap-4 text-sm font-bold">
                    <span class="text-emerald-400">✓ ${yesCount}</span>
                    <span class="text-rose-400">✗ ${noCount}</span>
                </div>
                <div class="text-amber-400 font-mono font-bold text-sm" id="vk-countdown">${secondsLeft}s</div>
            </div>

            <p class="text-[11px] text-slate-500 leading-relaxed">${votedNames || 'No votes yet.'}</p>

            ${isTarget
                ? `<p class="text-center text-sm text-slate-300 font-semibold py-2">You're the one being voted on — sit tight.</p>`
                : `<div class="flex gap-3">
                        <button class="vk-vote-no flex-1 py-3 rounded-xl font-bold transition ${myVote === 'no' ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}">✗ No</button>
                        <button class="vk-vote-yes flex-1 py-3 rounded-xl font-bold transition ${myVote === 'yes' ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}">✓ Yes</button>
                   </div>
                   <p class="text-center text-[11px] text-slate-500">${myVote ? `You voted ${myVote}. You can change your vote until the timer runs out.` : 'Cast your vote.'}</p>`
            }
        </div>`;

    if (!isTarget) {
        overlay.querySelector('.vk-vote-yes').addEventListener('click', () => castVoteKickBallot('yes'));
        overlay.querySelector('.vk-vote-no').addEventListener('click', () => castVoteKickBallot('no'));
    }

    // Local countdown ticking, AND (for the host only) a periodic check for
    // whether the vote should resolve on a timeout. We can't rely solely on
    // resolution-via-render (triggered from Firestore snapshots) because if
    // nobody does anything else in the game while a vote is open, the host's
    // client might never re-render purely because time passed — this interval
    // guarantees the deadline still gets checked even in total silence.
    // The actual deadline comparison always uses the synced `deadline`
    // timestamp from Firestore, never local elapsed time, so clock drift
    // between browsers can't cause an unfair early/late resolution.
    if (voteKickTimerInterval) clearInterval(voteKickTimerInterval);
    voteKickTimerInterval = setInterval(() => {
        const el = document.getElementById('vk-countdown');
        if (!gameState.voteKick || gameState.voteKick.resolved) { clearInterval(voteKickTimerInterval); return; }
        const left = Math.max(0, Math.ceil((gameState.voteKick.deadline - Date.now()) / 1000));
        if (el) el.textContent = `${left}s`;
        if (gameState.hostId === localPlayerId) {
            maybeResolveVoteKick();
        }
    }, 500);

    // Also check immediately on render (covers the majority-already-reached
    // case without waiting for the next 500ms tick).
    if (gameState.hostId === localPlayerId) {
        maybeResolveVoteKick();
    }
}

function closeVoteKickModal() {
    const overlay = document.getElementById('vote-kick-modal-overlay');
    if (overlay) overlay.remove();
    if (voteKickTimerInterval) { clearInterval(voteKickTimerInterval); voteKickTimerInterval = null; }
    voteKickModalShownForId = null;
}

// Host-only: checks whether the current vote should resolve right now
// (majority already reached, or time's up) and applies the outcome exactly
// once. Safe to call on every render — `resolved` flag prevents re-firing.
async function maybeResolveVoteKick() {
    const vk = gameState.voteKick;
    if (!vk || vk.resolved) return;
    const yesCount = Object.values(vk.votes || {}).filter(v => v === 'yes').length;
    const timeUp = Date.now() >= vk.deadline;
    const majorityReached = yesCount >= vk.threshold;
    if (!majorityReached && !timeUp) return;

    // Mark the vote resolved FIRST, in its own write, before doing any of the
    // actual kick work below. This closes a real race: applyKick's own write
    // and this function's write are two separate pushState calls, and the
    // local gameState snapshot doesn't update synchronously — so if this
    // function got called again (e.g. the next 500ms interval tick) before
    // the snapshot listener caught up, it would see `target` still present
    // and try to kick them a second time, double-reshuffling the deck and
    // corrupting turn order. Setting `resolved: true` up front means any
    // re-entrant call hits the guard above and bails immediately, even
    // before the snapshot round-trips.
    gameState.voteKick = { ...vk, resolved: true }; // optimistic local update, ahead of the snapshot
    await pushState({ [`voteKick.resolved`]: true });

    // Capture the target's name BEFORE applyKick removes them from gameState,
    // so the event message below is correct regardless of exactly when the
    // local onSnapshot listener happens to pick up the removal.
    const targetName = gameState.players[vk.targetPid]?.name || 'a player';

    if (majorityReached) {
        await applyKick(vk.targetPid);
        await pushState({
            lastEvent: makeEvent(`The vote passed — ${targetName} was removed from the game.`)
        });
    } else {
        await pushState({
            lastEvent: makeEvent(`The vote to kick ${targetName} did not pass.`)
        });
    }
    // Clear it fully a moment later so the next vote-kick attempt starts clean.
    setTimeout(() => { pushState({ voteKick: deleteField() }).catch(() => {}); }, 1500);
}

// Removes a player from the game: deletes their players entry, folds their
// hand cards back into the deck+discard (shuffled, keeping the current top
// discard card in play — same rule as the existing deck-empty reshuffle),
// removes them from turnOrder, and fixes up currentTurnIdx so the correct
// player remains/becomes active.
async function applyKick(targetPid) {
    const target = gameState.players[targetPid];
    if (!target) return; // already gone somehow — nothing to do

    // Fold the kicked player's hand into deck + discard (minus discard's
    // current top card, which must stay face-up and in play), then shuffle.
    const handCards = (target.cards || []).filter(Boolean);
    const discard = [...(gameState.discard || [])];
    const topDiscard = discard.length > 0 ? discard.pop() : null; // keep this one out of the reshuffle
    const combined = [...(gameState.deck || []), ...discard, ...handCards];
    const reshuffledDeck = combined.sort(() => Math.random() - 0.5);
    const newDiscard = topDiscard ? [topDiscard] : [];

    // Recompute turn order + active player BEFORE removing anything, using
    // the active player's id (not their old numeric index) so we can find
    // them again correctly in the shortened array.
    const oldTurnOrder = gameState.turnOrder || [];
    const activePlayerId = oldTurnOrder[gameState.currentTurnIdx];
    const newTurnOrder = oldTurnOrder.filter(pid => pid !== targetPid);

    let newCurrentTurnIdx;
    if (activePlayerId === targetPid) {
        // The kicked player WAS active. The next player in the original
        // order takes over "now" — find the kicked player's old position
        // and the player that was right after them; that player's new
        // index is where currentTurnIdx should land.
        const oldIdx = oldTurnOrder.indexOf(targetPid);
        const nextPlayerId = oldTurnOrder[(oldIdx + 1) % oldTurnOrder.length];
        newCurrentTurnIdx = newTurnOrder.indexOf(nextPlayerId);
    } else {
        // Active player is untouched by the removal — just find their new
        // position in the shortened array (shifts left if the kicked player
        // was earlier in turn order, otherwise unchanged).
        newCurrentTurnIdx = newTurnOrder.indexOf(activePlayerId);
    }
    if (newCurrentTurnIdx < 0) newCurrentTurnIdx = 0; // defensive fallback, shouldn't happen

    // If a Dutch call is in progress and finalTurnsLeft was counting down
    // based on the original player count, shrinking turnOrder by one means
    // one fewer "lap" remains to complete it.
    const updates = {
        [`players.${targetPid}`]: deleteField(),
        deck: reshuffledDeck,
        discard: newDiscard,
        turnOrder: newTurnOrder,
        currentTurnIdx: newCurrentTurnIdx,
        turnPhase: 'AWAIT_DRAW',
        drawnCard: null,
        ability: null
    };
    let triggersRoundEnd = false;
    if (gameState.dutchCalledBy && gameState.dutchCalledBy !== targetPid && typeof gameState.finalTurnsLeft === 'number') {
        updates.finalTurnsLeft = Math.max(0, gameState.finalTurnsLeft - 1);
        // IMPORTANT: removing a player can itself be the action that completes
        // Dutch's final lap (e.g. the last remaining player owed a turn is the
        // one who gets kicked). advanceTurn() always checks for this and ends
        // the round right then — this code path bypassed that check entirely,
        // leaving finalTurnsLeft stuck at 0 with status still 'PLAYING' and
        // the round never scored until someone happened to take another
        // (unearned) turn. Mirror advanceTurn's round-end branch here too.
        if (updates.finalTurnsLeft <= 0) triggersRoundEnd = true;
    }
    if (gameState.dutchCalledBy === targetPid) {
        // The Dutch-caller themselves got kicked — there's no one left who
        // "called" it, so the cleanest behavior is to cancel the call rather
        // than score a round around a player who no longer exists.
        updates.dutchCalledBy = deleteField();
        updates.finalTurnsLeft = deleteField();
        showToast("The Dutch caller was removed — the call has been cancelled.", 'info');
    }

    if (gameState.hostId === targetPid) {
        // The host was the one kicked — hand host duties to whoever's first
        // in the new turn order, so round-end advancement (which is
        // host-gated) doesn't get permanently stuck with no host left.
        updates.hostId = newTurnOrder[0];
    }

    // 1v1 case: kicking this player leaves only one person in the room —
    // there's nobody left to play against, so end immediately and return
    // everyone to the lobby rather than leaving the last player stuck in
    // a dead game with no way out except closing the tab.
    if (newTurnOrder.length < 2 && gameState.status === 'PLAYING') {
        const targetName = target.name || 'A player';
        await pushState({
            ...updates,
            status: 'LOBBY',
            turnPhase: 'AWAIT_DRAW',
            drawnCard: null, ability: null, snapLock: deleteField(),
            dutchCalledBy: null, finalTurnsLeft: null,
            lastEvent: makeEvent(`${targetName} left — not enough players to continue.`)
        });
        showToast(`${targetName} left — not enough players. Returning to lobby.`, 'warning', 5000);
        return;
    }
    if (triggersRoundEnd) {
        // Score off the post-kick player set (the kicked player's entry is
        // already gone from `gameState.players` here via deleteField — but
        // deleteField() only takes effect once Firestore applies the write,
        // so build the scored snapshot from the players that remain instead).
        const remainingPlayers = { ...gameState.players };
        delete remainingPlayers[targetPid];
        Object.keys(remainingPlayers).forEach(pid => {
            const handScore = (remainingPlayers[pid].cards || []).reduce((sum, c) => sum + (c ? (c.score || 0) : 0), 0);
            remainingPlayers[pid] = {
                ...remainingPlayers[pid],
                // Each round stands alone — this round's score, not a running
                // sum across every round played in this room.
                score: handScore,
                lastHandScore: handScore
            };
        });
        delete updates[`players.${targetPid}`];
        updates.players = remainingPlayers;
        updates.status = 'ROUND_END';
    }

    await pushState(updates);
    showToast(`${target.name || 'A player'} was kicked from the game.`, 'warning', 4000);
}

// ==========================================
// Turn advancement / round end
// ==========================================
async function advanceTurn(extraFields = {}) {
    const nextIdx = (gameState.currentTurnIdx + 1) % gameState.turnOrder.length;
    let finalTurnsLeft = extraFields.finalTurnsLeft !== undefined ? extraFields.finalTurnsLeft : gameState.finalTurnsLeft;
    const dutchCalledBy = extraFields.dutchCalledBy !== undefined ? extraFields.dutchCalledBy : gameState.dutchCalledBy;
    if (dutchCalledBy && extraFields.finalTurnsLeft === undefined) {
        finalTurnsLeft = (finalTurnsLeft || 0) - 1;
    }
    const payload = {
        ...extraFields, currentTurnIdx: nextIdx,
        turnPhase: 'AWAIT_DRAW', ability: null,
        finalTurnsLeft: finalTurnsLeft ?? null
    };
    if (dutchCalledBy && finalTurnsLeft !== null && finalTurnsLeft <= 0) {
        // IMPORTANT: the action that just ended the round (a card swap, a
        // blind J/Q/K swap, etc.) hands us its hand changes as dotted
        // Firestore field paths in extraFields, e.g. "players.{pid}.cards".
        // Those paths are meant for updateDoc to merge directly — but here
        // we're about to overwrite the WHOLE `players` map in this same
        // write, built from the local (pre-write) gameState snapshot. If we
        // don't fold those pending card changes in first, they're silently
        // discarded: the round-end score gets computed off stale hands, and
        // since our literal `players` object is written in the same update
        // as those dotted paths, ours wins and the swap visually never
        // lands either. So: apply every "players.{pid}.cards" (or any
        // players.{pid}.<field>) entry from extraFields onto a deep-cloned
        // copy of gameState.players before scoring, then strip those raw
        // dotted keys out of the payload since they're now baked into the
        // `players` object we're writing instead.
        const updatedPlayers = JSON.parse(JSON.stringify(gameState.players));
        const playerFieldPattern = /^players\.([^.]+)\.(.+)$/;
        Object.keys(extraFields).forEach(key => {
            const match = key.match(playerFieldPattern);
            if (!match) return;
            const [, fieldPid, fieldName] = match;
            if (!updatedPlayers[fieldPid]) return;
            updatedPlayers[fieldPid][fieldName] = extraFields[key];
            delete payload[key]; // now superseded by the `players` object below
        });

        Object.keys(updatedPlayers).forEach(pid => {
            const handScore = (updatedPlayers[pid].cards || []).reduce((sum, c) => sum + (c ? (c.score || 0) : 0), 0);
            updatedPlayers[pid] = {
                ...updatedPlayers[pid],
                // Each round stands alone — this round's score, not a running
                // sum across every round played in this room.
                score: handScore,
                lastHandScore: handScore
            };
        });
        await pushState({ ...payload, status: 'ROUND_END', players: updatedPlayers });
        return;
    }
    await pushState(payload);
}

// ==========================================
// Round end screen
// ==========================================
function renderRoundEnd() {
    document.getElementById("roundEndSubtitle").innerText = gameState.dutchCalledBy
        ? `${gameState.players[gameState.dutchCalledBy]?.name || 'A player'} called Dutch!`
        : "Round complete.";
    const scoresEl = document.getElementById("roundEndScores");
    // Each round stands alone — rank purely by this round's score (lowest
    // wins), not a running total carried over from earlier rounds.
    const sorted = Object.entries(gameState.players).sort((a, b) => (a[1].score || 0) - (b[1].score || 0));
    scoresEl.innerHTML = sorted.map(([pid, p], i) => `
        <div class="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span class="font-semibold text-white flex items-center gap-2">
                ${i === 0 ? '<span class="text-amber-400">🏆</span>' : `<span class="text-slate-500 font-mono text-sm">${i + 1}.</span>`}
                ${p.name}
                ${pid === localPlayerId ? '<span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded">You</span>' : ''}
            </span>
            <span class="text-sm text-slate-400">
                Score: <span class="text-amber-400 font-mono font-bold">${p.score ?? p.lastHandScore ?? 0}</span>
            </span>
        </div>`).join('');
    const nextBtn = document.getElementById("nextRoundBtn");
    const endGameBtn = document.getElementById("endGameBtn");
    const waitMsg = document.getElementById("nextRoundWaitMsg");
    if (gameState.hostId === localPlayerId) {
        nextBtn.classList.remove("hidden");
        endGameBtn.classList.remove("hidden");
        waitMsg.classList.add("hidden");
    } else {
        nextBtn.classList.add("hidden");
        endGameBtn.classList.add("hidden");
        waitMsg.classList.remove("hidden");
    }
}

// ==========================================
// Card click interaction
// ==========================================
async function handleCardInteraction(pid, idx) {
    if (gameState.status !== 'PLAYING') return;

    // 1. Resolving a "give a card away" after snapping an opponent's card
    if (gameState.pendingGive && gameState.pendingGive.fromPid === localPlayerId) {
        if (pid !== localPlayerId) return;
        const giverCards = [...gameState.players[localPlayerId].cards];
        const givenCard = giverCards[idx];
        if (!givenCard) return; // can't give away an already-empty slot
        giverCards[idx] = null; // leave the giver's slot empty in place, don't shift other cards
        const toPid = gameState.pendingGive.toPid;
        const toIdx = gameState.pendingGive.toIdx;
        const receiverCards = [...gameState.players[toPid].cards];
        receiverCards[toIdx] = givenCard; // drop straight into the slot that was just snapped
        await pushState({
            [`players.${localPlayerId}.cards`]: giverCards,
            [`players.${toPid}.cards`]: receiverCards,
            pendingGive: null
        });
        showToast(`Card given to ${gameState.players[toPid]?.name || 'them'}.`, 'info', NOTIFY_MS);
        highlightSlots([{ pid: localPlayerId, idx }, { pid: toPid, idx: toIdx }], NOTIFY_MS);
        await pushState({ lastEvent: makeEvent(`${gameState.players[localPlayerId]?.name || 'A player'} handed a card to ${gameState.players[toPid]?.name || 'someone'}.`, toPid, null, [{ pid: localPlayerId, idx }, { pid: toPid, idx: toIdx }]) });
        return;
    }

    const isMyTurn = activePid() === localPlayerId;

    // Guard: an empty slot (card already snapped away earlier this round)
    // can't be peeked at or swapped-with during an ability, nor snapped
    // again. It's fine during the initial peek (exempt, see below) and it's
    // fine as a target when swapping in a freshly-drawn card (case 3) —
    // dropping a drawn card into a gap is exactly how you'd refill it.
    const clickedCard = gameState.players[pid]?.cards?.[idx];
    const isInitialPeekClick = initialPeekIdxsRemaining.length > 0 && pid === localPlayerId;
    const isDrawnCardSwapClick = isMyTurn && gameState.turnPhase === 'AWAIT_DECISION' && pid === localPlayerId;
    if (!isInitialPeekClick && !isDrawnCardSwapClick && !clickedCard) {
        if (isMyTurn && gameState.turnPhase === 'AWAIT_ABILITY') {
            showToast("That slot is empty — pick a card that's actually there.", 'warning', NOTIFY_MS);
        }
        return;
    }

    // 2. Resolving an active special ability
    if (isMyTurn && gameState.turnPhase === 'AWAIT_ABILITY' && gameState.ability) {
        await resolveAbilityClick(pid, idx);
        return;
    }

    // 3. Deciding what to do with a drawn card (swap it into my hand)
    if (isMyTurn && gameState.turnPhase === 'AWAIT_DECISION' && pid === localPlayerId) {
        const myCards = [...gameState.players[localPlayerId].cards];
        const oldCard = myCards[idx];
        myCards[idx] = gameState.drawnCard.card;
        // If that slot was already empty (e.g. snapped away earlier this round),
        // there's nothing to discard — just fill the gap, nothing goes to the pile.
        const newDiscard = oldCard ? [...gameState.discard, oldCard] : gameState.discard;
        showToast("Card swapped!", 'success', NOTIFY_MS);
        playSfx('cardPlace');
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        const moves = [{ from: { type: gameState.drawnCard.source }, to: { type: 'hand', pid: localPlayerId, idx } }];
        if (oldCard) moves.push({ from: { type: 'hand', pid: localPlayerId, idx }, to: { type: 'discard' } });
        await advanceTurn({
            [`players.${localPlayerId}.cards`]: myCards, discard: newDiscard, drawnCard: null,
            lastEvent: makeEvent(`${myName} swapped their card #${idx + 1}.`, null, null, [{ pid: localPlayerId, idx }], moves)
        });
        return;
    }

    // 4. Initial peek phase — only the bottom two cards may be peeked, one at a time, in order
    if (initialPeekIdxsRemaining.length > 0 && pid === localPlayerId) {
        const nextRequiredIdx = initialPeekIdxsRemaining[0];
        if (idx !== nextRequiredIdx) {
            showToast(`Memorise your bottom cards first — click card #${nextRequiredIdx + 1}.`, 'warning', NOTIFY_MS);
            return;
        }
        const card = gameState.players[localPlayerId].cards[idx];
        initialPeekIdxsRemaining = initialPeekIdxsRemaining.slice(1);
        reveal(pid, idx, card, NOTIFY_MS);
        playSfx('peek');
        showToast(`Peeked at card #${idx + 1} — memorise it! ${initialPeekIdxsRemaining.length > 0 ? `${initialPeekIdxsRemaining.length} more to go.` : 'All set — play begins now.'}`, 'info', NOTIFY_MS);
        return;
    }

    // 5. Snap attempt
    if (isMyTurn && (gameState.turnPhase === 'AWAIT_DECISION' || gameState.turnPhase === 'AWAIT_ABILITY')) {
        return;
    }
    await attemptSnap(pid, idx);
}

async function resolveAbilityClick(pid, idx) {
    const a = gameState.ability;

    if (a.type === '78') {
        if (pid !== localPlayerId) { showToast("Pick one of YOUR OWN cards to peek at.", 'warning', NOTIFY_MS); return; }
        const card = gameState.players[pid].cards[idx];
        if (!card) { showToast("That slot is empty — pick a card that's still in your hand.", 'warning', NOTIFY_MS); return; }
        reveal(pid, idx, card, NOTIFY_MS);
        showToast(`👁️ You peeked at your card #${idx + 1} — it's ${card.name}${card.isJoker ? '' : card.suit}!`, 'ability', NOTIFY_MS);
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        await advanceTurn({ ability: null, lastEvent: makeEvent(`${myName} used the 7/8 ability to look at their own card #${idx + 1}.`, null, null, [{ pid, idx }]) });
        return;
    }

    if (a.type === '910') {
        if (pid === localPlayerId) { showToast("Pick an OPPONENT'S card to spy on.", 'warning', NOTIFY_MS); return; }
        const targetCards = gameState.players[pid]?.cards || [];
        const hasAnyCard = targetCards.some(Boolean);
        if (!hasAnyCard) {
            // Target has no cards left (all snapped) — ability can't be used on them.
            // Don't softlock; just skip and end the turn gracefully.
            showToast(`${gameState.players[pid]?.name || 'That player'} has no cards left — ability skipped.`, 'info', NOTIFY_MS);
            const myName = gameState.players[localPlayerId]?.name || 'A player';
            await advanceTurn({ ability: null, lastEvent: makeEvent(`${myName}'s 9/10 ability was skipped — target had no cards.`) });
            return;
        }
        const card = targetCards[idx];
        if (!card) { showToast("That slot is empty — pick a card that's still in their hand.", 'warning', NOTIFY_MS); return; }
        reveal(pid, idx, card, NOTIFY_MS);
        showToast(`🔍 Spied on ${gameState.players[pid]?.name}'s card #${idx + 1} — it's ${card.name}${card.isJoker ? '' : card.suit}!`, 'ability', NOTIFY_MS);
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        const targetName = gameState.players[pid]?.name || 'an opponent';
        await advanceTurn({
            ability: null,
            lastEvent: makeEvent(
                `${myName} used the 9/10 ability to look at ${targetName}'s card #${idx + 1}.`,
                pid,
                `${myName} used the 9/10 ability to look at YOUR card #${idx + 1}.`,
                [{ pid, idx }]
            )
        });
        return;
    }

    if (a.type === 'jq') {
        if (a.step === 1) {
            if (pid !== localPlayerId) { showToast("First, pick one of YOUR OWN cards to swap.", 'warning', NOTIFY_MS); return; }
            // Softlock guard: this ability needs an opponent's card as the second
            // half of the swap. If every opponent's hand is completely empty
            // (e.g. their cards all got snapped away earlier this round, or a
            // concurrent snap emptied the last one), there's nothing to swap
            // with and step 2 could never be completed. Skip the ability
            // gracefully instead of leaving the turn stuck forever.
            const anyOpponentHasCard = Object.keys(gameState.players).some(
                otherPid => otherPid !== localPlayerId && (gameState.players[otherPid].cards || []).some(Boolean)
            );
            if (!anyOpponentHasCard) {
                const myName = gameState.players[localPlayerId]?.name || 'A player';
                showToast("No opponent has a card left to swap with — ability skipped.", 'info', NOTIFY_MS);
                await advanceTurn({ ability: null, lastEvent: makeEvent(`${myName}'s J/Q ability was skipped — no opponent had a card left.`) });
                return;
            }
            showToast("✓ Your card selected. Now pick an opponent's card to swap with.", 'ability', NOTIFY_MS);
            await pushState({ ability: { ...a, step: 2, ownIdx: idx } });
        } else {
            if (pid === localPlayerId) { showToast("Now pick an OPPONENT'S card to swap with.", 'warning', NOTIFY_MS); return; }
            const myCards = [...gameState.players[localPlayerId].cards];
            const oppCards = [...gameState.players[pid].cards];
            const tmp = myCards[a.ownIdx];
            myCards[a.ownIdx] = oppCards[idx];
            oppCards[idx] = tmp;
            showToast(`🔀 Swapped with ${gameState.players[pid]?.name}'s card #${idx + 1}!`, 'success', NOTIFY_MS);
            const myName = gameState.players[localPlayerId]?.name || 'A player';
            const targetName = gameState.players[pid]?.name || 'an opponent';
            await advanceTurn({
                [`players.${localPlayerId}.cards`]: myCards,
                [`players.${pid}.cards`]: oppCards,
                ability: null,
                lastEvent: makeEvent(
                    `${myName} blind-swapped their card #${a.ownIdx + 1} with ${targetName}'s card #${idx + 1}.`,
                    pid,
                    `${myName} blind-swapped their card #${a.ownIdx + 1} with YOUR card #${idx + 1}.`,
                    [{ pid: localPlayerId, idx: a.ownIdx }, { pid, idx }],
                    [
                        { from: { type: 'hand', pid: localPlayerId, idx: a.ownIdx }, to: { type: 'hand', pid, idx } },
                        { from: { type: 'hand', pid, idx }, to: { type: 'hand', pid: localPlayerId, idx: a.ownIdx } }
                    ]
                )
            });
        }
        return;
    }

    if (a.type === 'k') {
        if (a.step === 1) {
            // First card: ANY card, yours or any opponent's.
            const card = gameState.players[pid].cards[idx];
            if (!card) { showToast("That slot is empty — pick a card that's still in play.", 'warning', NOTIFY_MS); return; }

            // Softlock guard: if this first pick was one of the acting player's
            // own cards, the second pick can only legally be an opponent's card
            // (you can't peek at two of your own). If every opponent's hand is
            // completely empty at this point, there is no legal second card and
            // step 2 could never be completed — skip the ability instead of
            // leaving the turn stuck.
            if (pid === localPlayerId) {
                const anyOpponentHasCard = Object.keys(gameState.players).some(
                    otherPid => otherPid !== localPlayerId && (gameState.players[otherPid].cards || []).some(Boolean)
                );
                if (!anyOpponentHasCard) {
                    reveal(pid, idx, card, KING_NOTIFY_MS);
                    const myName = gameState.players[localPlayerId]?.name || 'A player';
                    showToast("No opponent has a card left to peek at — ability ends after one peek.", 'info', NOTIFY_MS);
                    await advanceTurn({ ability: null, lastEvent: makeEvent(`${myName} used the Black King ability to peek at one card — no opponent had a second card available.`, null, null, [{ pid, idx }]) });
                    return;
                }
            } else {
                // Symmetric softlock guard for the other case: the first pick was
                // an OPPONENT's card, so any other card in the game is a legal
                // second pick (yours or any opponent's). But if this was the only
                // card left anywhere on the board (e.g. concurrent snaps emptied
                // everything else in the moment between drawing the King and
                // clicking it), there's no legal second card either — skip the
                // same way instead of leaving the turn stuck.
                const anyOtherCardExists = Object.entries(gameState.players).some(([otherPid, p]) =>
                    (p.cards || []).some((c, i) => Boolean(c) && !(otherPid === pid && i === idx))
                );
                if (!anyOtherCardExists) {
                    reveal(pid, idx, card, KING_NOTIFY_MS);
                    const myName = gameState.players[localPlayerId]?.name || 'A player';
                    showToast("No other card left to peek at — ability ends after one peek.", 'info', NOTIFY_MS);
                    await advanceTurn({ ability: null, lastEvent: makeEvent(`${myName} used the Black King ability to peek at one card — no second card was available.`, null, null, [{ pid, idx }]) });
                    return;
                }
            }

            reveal(pid, idx, card, KING_NOTIFY_MS);
            showToast(`👑 First card — ${describeSlot(pid, idx)} is ${card.name}${card.isJoker ? '' : card.suit}. Now pick a second card to peek at.`, 'ability', KING_NOTIFY_MS);
            await pushState({ ability: { ...a, step: 2, first: { pid, idx } } });
            return;
        }

        if (a.step === 2) {
            // Second card: any card EXCEPT the one already picked, not two of your own.
            if (a.first && a.first.pid === pid && a.first.idx === idx) {
                showToast("That's the card you already picked — choose a different one.", 'warning', NOTIFY_MS);
                return;
            }
            if (a.first && a.first.pid === localPlayerId && pid === localPlayerId) {
                showToast("You can't peek at two of your own cards — pick an opponent's card.", 'warning', NOTIFY_MS);
                return;
            }

            const firstPid = a.first.pid;
            const firstIdx = a.first.idx;
            const card = gameState.players[pid].cards[idx];
            if (!card) { showToast("That slot is empty — pick a card that's still in play.", 'warning', NOTIFY_MS); return; }
            reveal(pid, idx, card, KING_NOTIFY_MS);
            const secondPid = pid;
            const secondIdx = idx;

            setTimeout(async () => {
                const choice = await showKingSwapChoiceModal(firstPid, firstIdx, secondPid, secondIdx, card);
                const myName = gameState.players[localPlayerId]?.name || 'A player';

                if (choice === 'swap_peeked') {
                    // Swap the two peeked cards directly
                    const firstCards = [...gameState.players[firstPid].cards];
                    const secondCards = firstPid === secondPid ? firstCards : [...gameState.players[secondPid].cards];
                    const tmp = firstCards[firstIdx];
                    firstCards[firstIdx] = secondCards[secondIdx];
                    secondCards[secondIdx] = tmp;
                    const updates = { [`players.${firstPid}.cards`]: firstCards };
                    if (firstPid !== secondPid) updates[`players.${secondPid}.cards`] = secondCards;
                    const involvesMe = firstPid === localPlayerId || secondPid === localPlayerId;
                    const otherPid = firstPid === localPlayerId ? secondPid : (secondPid === localPlayerId ? firstPid : null);
                    showToast(`🔄 Swapped ${describeSlot(firstPid, firstIdx)} with ${describeSlot(secondPid, secondIdx)}!`, 'success', NOTIFY_MS);
                    const publicMsg = `${myName} used the Black King ability and swapped ${describeSlot(firstPid, firstIdx)} with ${describeSlot(secondPid, secondIdx)}.`;
                    let targetMsg = null;
                    if (involvesMe && otherPid) {
                        const myIdx = firstPid === localPlayerId ? firstIdx : secondIdx;
                        const otherIdx = firstPid === otherPid ? firstIdx : secondIdx;
                        targetMsg = `${myName} used the Black King ability and swapped YOUR card #${otherIdx + 1} with their own card #${myIdx + 1}.`;
                    }
                    await advanceTurn({
                        ...updates,
                        ability: null,
                        lastEvent: makeEvent(
                            publicMsg, otherPid, targetMsg,
                            [{ pid: firstPid, idx: firstIdx }, { pid: secondPid, idx: secondIdx }],
                            [
                                { from: { type: 'hand', pid: firstPid, idx: firstIdx }, to: { type: 'hand', pid: secondPid, idx: secondIdx } },
                                { from: { type: 'hand', pid: secondPid, idx: secondIdx }, to: { type: 'hand', pid: firstPid, idx: firstIdx } }
                            ]
                        )
                    });

                } else if (choice === 'pick_any') {
                    // Enter free-pick mode — step 3: player clicks any first card to swap
                    showToast("👑 Now pick any card as the first card to swap.", 'ability', NOTIFY_MS);
                    await pushState({
                        ability: {
                            ...a,
                            step: 3,
                            peekFirst: { pid: firstPid, idx: firstIdx },
                            peekSecond: { pid: secondPid, idx: secondIdx },
                            swapFirst: null
                        }
                    });

                } else {
                    // Keep everything
                    const otherPid = firstPid === localPlayerId ? secondPid : (secondPid === localPlayerId ? firstPid : null);
                    showToast("Kept everything as is.", 'info', NOTIFY_MS);
                    await advanceTurn({
                        ability: null,
                        lastEvent: makeEvent(
                            `${myName} used the Black King ability to peek at two cards, then kept everything as is.`,
                            otherPid,
                            otherPid ? `${myName} used the Black King ability to peek at your card and another, then kept everything as is.` : null,
                            [{ pid: firstPid, idx: firstIdx }, { pid: secondPid, idx: secondIdx }]
                        )
                    });
                }
            }, 150);
            return;
        }

        if (a.step === 3) {
            // Free-pick mode: player selects the first card they want to swap (any card on the board)
            showToast(`✓ Selected ${describeSlot(pid, idx)}. Now pick the second card to swap it with.`, 'ability', NOTIFY_MS);
            await pushState({ ability: { ...a, step: 4, swapFirst: { pid, idx } } });
            return;
        }

        if (a.step === 4) {
            // Free-pick mode: second card — must not be the exact same slot as the first
            if (a.swapFirst && a.swapFirst.pid === pid && a.swapFirst.idx === idx) {
                showToast("That's the same card — pick a different one.", 'warning', NOTIFY_MS);
                return;
            }
            const sfPid = a.swapFirst.pid;
            const sfIdx = a.swapFirst.idx;
            const firstCards = [...gameState.players[sfPid].cards];
            const secondCards = sfPid === pid ? firstCards : [...gameState.players[pid].cards];
            const tmp = firstCards[sfIdx];
            firstCards[sfIdx] = secondCards[idx];
            secondCards[idx] = tmp;
            const updates = { [`players.${sfPid}.cards`]: firstCards };
            if (sfPid !== pid) updates[`players.${pid}.cards`] = secondCards;
            const myName = gameState.players[localPlayerId]?.name || 'A player';
            const involvesMe = sfPid === localPlayerId || pid === localPlayerId;
            const otherPid = sfPid === localPlayerId ? pid : (pid === localPlayerId ? sfPid : null);
            showToast(`🔄 Swapped ${describeSlot(sfPid, sfIdx)} with ${describeSlot(pid, idx)}!`, 'success', NOTIFY_MS);
            const publicMsg = `${myName} used the Black King ability and swapped ${describeSlot(sfPid, sfIdx)} with ${describeSlot(pid, idx)}.`;
            let targetMsg = null;
            if (involvesMe && otherPid) {
                const myIdx = sfPid === localPlayerId ? sfIdx : idx;
                const opIdx = sfPid === otherPid ? sfIdx : idx;
                targetMsg = `${myName} used the Black King ability and swapped YOUR card #${opIdx + 1} with their card #${myIdx + 1}.`;
            }
            await advanceTurn({
                ...updates,
                ability: null,
                lastEvent: makeEvent(
                    publicMsg, otherPid, targetMsg,
                    [{ pid: sfPid, idx: sfIdx }, { pid, idx }],
                    [
                        { from: { type: 'hand', pid: sfPid, idx: sfIdx }, to: { type: 'hand', pid, idx } },
                        { from: { type: 'hand', pid, idx }, to: { type: 'hand', pid: sfPid, idx: sfIdx } }
                    ]
                )
            });
            return;
        }
    }
}

// ==========================================
// Snap
// ==========================================
// NOTE ON HAND ARRAYS: a player's `cards` array always keeps its original
// slot positions for the whole round. Removing a card (successful snap)
// sets that slot to `null` rather than splicing it out — splicing would
// shift every later card down an index, silently reshuffling the player's
// own memorised layout. Likewise, adding a card back in (a given-away card,
// or a penalty card) fills the first available `null` slot if one exists,
// and only appends a brand new slot at the end if the hand has no gaps.
function firstEmptySlot(cards) {
    for (let i = 0; i < cards.length; i++) {
        if (cards[i] === null || cards[i] === undefined) return i;
    }
    return -1;
}

// Guards against a single client firing off multiple overlapping snap
// transactions. Each snap now does a real network round-trip (a Firestore
// transaction always hits the server, never the local cache), so if a
// player double- or triple-clicks while waiting — which is exactly what
// people do when something feels slow — every extra click used to kick off
// its own competing transaction. Those don't just waste a request: they
// contend with each other AND with the transaction already in flight,
// which is what actually made things feel laggy. Now only one snap
// attempt per client is ever in flight at a time.
let snapInFlight = false;

// Draws a penalty card straight from a room-document snapshot (as read
// inside a Firestore transaction), rather than from the local `gameState`
// cache. Mirrors `drawCardReplenishingIfNeeded`, but must not touch
// `gameState` because transaction callbacks can be retried by the SDK with
// a fresher read — using the stale local cache here would silently
// reintroduce the exact race this rewrite is meant to close.
function drawCardFromRoomData(data) {
    let deck = [...(data.deck || [])];
    let discard = [...(data.discard || [])];
    const replenished = reshuffleDiscardIntoDeckIfNeeded(deck, discard, { silent: true });
    if (!replenished) return null;
    deck = replenished.deck;
    discard = replenished.discard;
    const card = deck.pop();
    return { card, deck, discard };
}

// Snap resolution is done as a single Firestore transaction so that when
// several players click "snap" at the same instant, exactly one of them
// can win it — Firestore serializes the competing transactions, and every
// loser's callback is automatically retried against the state left behind
// by the winner, so it naturally sees the card already gone (or the
// discard pile already changed) instead of racing against a stale local
// cache. This replaces the old two-step "claim a snapLock field, then
// hope nobody else claimed it in the same window" approach, which had a
// real window where two clients could both read the lock as free and both
// think they'd won.
async function attemptSnap(pid, idx) {
    if (snapInFlight) return; // a previous click from this same client is still being processed
    snapInFlight = true;
    document.body.style.cursor = 'wait';

    // If the round-trip is taking a noticeable moment (slow connection,
    // heavy contention from several people snapping at once), let the
    // player know something is actually happening rather than leaving them
    // wondering if their click registered at all. Cleared as soon as we
    // have an answer, so on a fast connection this never appears.
    const slowNoticeTimer = setTimeout(() => {
        showToast("⚡ Processing your snap...", 'info', 1200);
    }, 500);

    playSfx('cardSnap');
    const roomRef = doc(db, "rooms", roomCode);
    const myName = gameState.players[localPlayerId]?.name || 'A player';

    let result;
    try {
        result = await runTransaction(db, async (tx) => {
            const snapDoc = await tx.get(roomRef);
            if (!snapDoc.exists()) return { outcome: 'noop' };
            const data = snapDoc.data();

            if (data.status !== 'PLAYING' || !data.discard || data.discard.length === 0) {
                return { outcome: 'noop' };
            }
            const topCard = data.discard[data.discard.length - 1];
            const targetCard = data.players?.[pid]?.cards?.[idx];

            // The slot is already empty — someone else's snap (or a give-away)
            // beat us to it between when we clicked and when this transaction
            // got to run. Penalize us for being too slow rather than silently
            // doing nothing, and don't try to guess who won it.
            if (!targetCard) {
                const drawn = drawCardFromRoomData(data);
                if (!drawn) return { outcome: 'no-cards' };
                const myCards = [...(data.players[localPlayerId].cards || [])];
                const emptyIdx = firstEmptySlot(myCards);
                const penaltyIdx = emptyIdx !== -1 ? emptyIdx : myCards.length;
                if (emptyIdx !== -1) { myCards[emptyIdx] = drawn.card; } else { myCards.push(drawn.card); }
                tx.update(roomRef, {
                    deck: drawn.deck, discard: drawn.discard,
                    [`players.${localPlayerId}.cards`]: myCards,
                    lastEvent: makeEvent(`${myName} was too slow — that card was already snapped! ${myName} takes a penalty.`)
                });
                return { outcome: 'too-slow', penaltyIdx };
            }

            if (targetCard.name === topCard.name) {
                const targetCards = [...data.players[pid].cards];
                targetCards[idx] = null; // leave the slot empty in place — don't shift other cards
                const newDiscard = [...data.discard, targetCard];
                if (pid === localPlayerId) {
                    tx.update(roomRef, {
                        [`players.${pid}.cards`]: targetCards, discard: newDiscard,
                        lastEvent: makeEvent(`${myName} snapped one of their own cards.`, null, null, [{ pid, idx }])
                    });
                    return { outcome: 'snap-own' };
                } else {
                    const oppName = data.players[pid]?.name || 'them';
                    // Normally the snapper now owes the victim a card from
                    // their own hand. But if the snapper's hand is itself
                    // completely empty (every one of their cards already
                    // snapped away earlier this round), there's nothing to
                    // give — creating a pendingGive here would softlock the
                    // game waiting on a card that can never be picked. In
                    // that case, just let the snap stand with no give-away.
                    const giverHasCard = (data.players[localPlayerId]?.cards || []).some(Boolean);
                    const updates = {
                        [`players.${pid}.cards`]: targetCards,
                        discard: newDiscard,
                        lastEvent: makeEvent(
                            giverHasCard
                                ? `${myName} snapped ${oppName}'s card #${idx + 1}!`
                                : `${myName} snapped ${oppName}'s card #${idx + 1} — but had no card of their own to give in return!`,
                            pid,
                            giverHasCard
                                ? `${myName} snapped YOUR card #${idx + 1}!`
                                : `${myName} snapped YOUR card #${idx + 1} — but had nothing to give you in return!`,
                            [{ pid, idx }]
                        )
                    };
                    if (giverHasCard) {
                        updates.pendingGive = { fromPid: localPlayerId, toPid: pid, toIdx: idx };
                    }
                    tx.update(roomRef, updates);
                    return { outcome: 'snap-opponent', oppName, giverHasCard };
                }
            }

            // Wrong card — penalty.
            const drawn = drawCardFromRoomData(data);
            if (!drawn) return { outcome: 'no-cards' };
            const myCards = [...(data.players[localPlayerId].cards || [])];
            const emptyIdx = firstEmptySlot(myCards);
            const penaltyIdx = emptyIdx !== -1 ? emptyIdx : myCards.length;
            if (emptyIdx !== -1) { myCards[emptyIdx] = drawn.card; } else { myCards.push(drawn.card); }
            tx.update(roomRef, {
                deck: drawn.deck, discard: drawn.discard,
                [`players.${localPlayerId}.cards`]: myCards,
                lastEvent: makeEvent(`${myName} attempted a snap but got it wrong and took a penalty card.`)
            });
            return { outcome: 'wrong', penaltyIdx };
        });
    } catch (e) {
        console.error('Snap transaction failed', e);
        showToast("Couldn't process that snap — try again.", 'error', NOTIFY_MS);
        clearTimeout(slowNoticeTimer);
        snapInFlight = false;
        document.body.style.cursor = '';
        return;
    }
    clearTimeout(slowNoticeTimer);
    snapInFlight = false;
    document.body.style.cursor = '';

    switch (result.outcome) {
        case 'snap-own':
            showToast("⚡ Snap! Card removed from your hand!", 'success', NOTIFY_MS);
            highlightSlots([{ pid, idx }], NOTIFY_MS);
            break;
        case 'snap-opponent':
            if (result.giverHasCard) {
                showToast(`⚡ Snapped ${result.oppName}'s card! Now pick one of YOUR cards to give them.`, 'success', NOTIFY_MS);
            } else {
                showToast(`⚡ Snapped ${result.oppName}'s card! You had nothing to give back.`, 'success', NOTIFY_MS);
            }
            highlightSlots([{ pid, idx }], NOTIFY_MS);
            break;
        case 'wrong':
            showToast("❌ Wrong snap! Penalty card added to your hand.", 'error', NOTIFY_MS);
            highlightSlots([{ pid: localPlayerId, idx: result.penaltyIdx }], NOTIFY_MS);
            break;
        case 'too-slow':
            showToast("❌ Too slow! Someone already snapped that. Penalty card added.", 'error', NOTIFY_MS);
            highlightSlots([{ pid: localPlayerId, idx: result.penaltyIdx }], NOTIFY_MS);
            break;
        case 'no-cards':
            showToast("No cards left to draw — deck and discard are both empty!", 'warning');
            break;
        default:
            break; // noop — stale click, nothing to do
    }
}

// ==========================================
// Rules Modal
// ==========================================
const rulesModal = document.getElementById("rulesModal");
document.getElementById("rulesBtn").addEventListener("click", () => rulesModal.classList.remove("hidden"));
document.getElementById("closeRulesBtn").addEventListener("click", () => rulesModal.classList.add("hidden"));
rulesModal.addEventListener("click", (e) => { if (e.target === rulesModal) rulesModal.classList.add("hidden"); });

// ==========================================
// Leaderboard Modal
// ==========================================
document.getElementById("leaderboardBtn").addEventListener("click", openLeaderboard);
document.getElementById("closeLeaderboardBtn").addEventListener("click", () => {
    document.getElementById("leaderboardModal").classList.add("hidden");
});
document.getElementById("leaderboardModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("leaderboardModal"))
        document.getElementById("leaderboardModal").classList.add("hidden");
});

// ==========================================
// Party Chat (Discord-style)
// ==========================================
let chatUnsub = null;         // Firestore listener for the room's chat subcollection
let chatOpen = false;         // whether the full panel is open
let chatHasUnread = false;    // unread badge tracking
let chatMembersUnsub = null;  // RTDB presence listener feeding the member list
let chatMembersVisible = true; // member sidebar shown/hidden inside the open panel
let chatLastGroupSenderId = null; // for message grouping (consecutive same-sender)
let chatLastGroupEl = null;

const chatLauncher = document.getElementById('chat-launcher');
const chatPanel = document.getElementById('party-chat-panel');
const chatToggle = document.getElementById('chat-toggle');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatMembersToggleBtn = document.getElementById('chat-members-toggle');
const chatBadge = document.getElementById('chat-badge');
const chatMessages = document.getElementById('chat-messages');
const chatEmpty = document.getElementById('chat-empty');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatMembersList = document.getElementById('chat-members-list');
const chatMembersHeading = document.getElementById('chat-members-heading');

// Only show the launcher/panel when a game room is active
function showChatPanel() { chatLauncher.classList.remove('is-hidden'); }
function hideChatPanel() {
    chatLauncher.classList.add('is-hidden');
    chatPanel.classList.add('chat-collapsed');
}
hideChatPanel(); // hidden on load until a room is joined

function openChatPanel() {
    chatOpen = true;
    chatPanel.classList.remove('chat-collapsed');
    chatLauncher.classList.add('is-hidden');
    chatBadge.classList.remove('has-new');
    chatHasUnread = false;
    requestAnimationFrame(() => { chatMessages.scrollTop = chatMessages.scrollHeight; });
    chatInput.focus();
}

function closeChatPanel() {
    chatOpen = false;
    chatPanel.classList.add('chat-collapsed');
    chatLauncher.classList.remove('is-hidden');
}

chatToggle.addEventListener('click', (e) => {
    // Ignore clicks on header action buttons — they have their own handlers
    if (e.target.closest('.chat-header-btn')) return;
    if (chatOpen) closeChatPanel(); else openChatPanel();
});
chatLauncher.addEventListener('click', openChatPanel);
chatCloseBtn.addEventListener('click', closeChatPanel);

chatMembersToggleBtn.addEventListener('click', () => {
    chatMembersVisible = !chatMembersVisible;
    chatPanel.classList.toggle('members-hidden', !chatMembersVisible);
    chatMembersToggleBtn.classList.toggle('is-active', chatMembersVisible);
});

function formatChatTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Renders a Discord-style avatar circle: emoji > photo > initial-letter fallback
function buildAvatarStyle(name, avatarEmoji, photoURL) {
    if (avatarEmoji) {
        return { html: escapeHtml(avatarEmoji), bg: '' };
    } else if (photoURL) {
        return { html: '', bg: `background-image:url('${photoURL}');` };
    }
    const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
    return { html: escapeHtml(initial), bg: '' };
}

function getPlayerAvatarInfo(pid, fallbackName) {
    const p = gameState.players && gameState.players[pid];
    return {
        name: p?.name || fallbackName || 'Player',
        avatarEmoji: p?.avatarEmoji || null,
        photoURL: p?.photoURL || null
    };
}

function appendChatMessage({ senderId, senderName, text, ts }) {
    const isMe = senderId === localPlayerId;

    // Remove "no messages" placeholder
    if (chatEmpty && chatEmpty.parentNode === chatMessages) {
        chatEmpty.remove();
    }

    const info = getPlayerAvatarInfo(senderId, senderName);
    const avatar = buildAvatarStyle(info.name, info.avatarEmoji, info.photoURL);
    const timeStr = formatChatTime(ts);

    // Group consecutive messages from the same sender, Discord-style
    if (chatLastGroupSenderId === senderId && chatLastGroupEl) {
        const line = document.createElement('div');
        line.className = 'chat-msg-solo';
        line.innerHTML = `
            <span class="chat-msg-hover-time">${timeStr}</span>
            <span class="chat-msg-line">${escapeHtml(text)}</span>`;
        chatLastGroupEl.appendChild(line);
    } else {
        const group = document.createElement('div');
        group.className = 'chat-msg-group';
        group.innerHTML = `
            <div class="chat-group-avatar" style="${avatar.bg}">${avatar.html}</div>
            <div class="chat-group-body">
                <div class="chat-group-headline">
                    <span class="chat-group-sender${isMe ? ' is-me' : ''}">${isMe ? 'You' : escapeHtml(info.name)}</span>
                    <span class="chat-group-time">${timeStr}</span>
                </div>
                <div class="chat-msg-line">${escapeHtml(text)}</div>
            </div>`;
        chatMessages.appendChild(group);
        chatLastGroupEl = group;
        chatLastGroupSenderId = senderId;
    }

    // Auto-scroll only when already near the bottom or if it's our own message
    const nearBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 60;
    if (nearBottom || isMe) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Show unread badge if panel is closed and message isn't ours
    if (!chatOpen && !isMe) {
        chatBadge.classList.add('has-new');
        chatHasUnread = true;
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Subscribe to the room's chat subcollection (most recent 80 messages)
function subscribeChatForRoom(code) {
    if (chatUnsub) { chatUnsub(); chatUnsub = null; }

    // Reset messages area + grouping state
    chatMessages.innerHTML = '';
    chatMessages.appendChild(chatEmpty);
    chatEmpty.style.display = '';
    chatLastGroupSenderId = null;
    chatLastGroupEl = null;

    const chatRef = collection(db, 'rooms', code, 'chat');
    const chatQuery = query(chatRef, orderBy('ts', 'asc'), limit(80));

    let firstLoad = true;
    chatUnsub = onSnapshot(chatQuery, (snap) => {
        if (firstLoad) {
            // On first load, render all existing messages without unread badges
            snap.docs.forEach(d => appendChatMessage(d.data()));
            firstLoad = false;
        } else {
            // Incremental: only process new messages
            snap.docChanges().forEach(change => {
                if (change.type === 'added') {
                    appendChatMessage(change.doc.data());
                }
            });
        }
    });
}

function unsubscribeChat() {
    if (chatUnsub) { chatUnsub(); chatUnsub = null; }
}

async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text || !roomCode) return;

    // Verify sender is still in the room players list
    if (!gameState.players || !gameState.players[localPlayerId]) return;

    const senderName = gameState.players[localPlayerId]?.name || 'Player';

    chatInput.value = '';
    chatInput.focus();

    try {
        await addDoc(collection(db, 'rooms', roomCode, 'chat'), {
            senderId: localPlayerId,
            senderName,
            text,
            ts: serverTimestamp()
        });
    } catch (err) {
        console.warn('Chat send failed:', err);
        showToast('Could not send message — check your connection.', 'error', 3000);
    }
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); }
});

// ==========================================
// Party Chat — member list (Discord-style sidebar)
// ==========================================
// Renders the member sidebar from gameState.players, marking online status
// from the same RTDB presence data already used for disconnect detection.
function renderChatMembers(presentMap) {
    if (!gameState.players) { chatMembersList.innerHTML = ''; chatMembersHeading.textContent = 'Party — 0'; return; }

    const pids = Object.keys(gameState.players);
    chatMembersHeading.textContent = `Party — ${pids.length}`;

    // Online members first, then offline, alphabetical-ish by join order otherwise
    const sorted = [...pids].sort((a, b) => {
        const aOnline = !!(presentMap && presentMap[a]);
        const bOnline = !!(presentMap && presentMap[b]);
        if (aOnline === bOnline) return 0;
        return aOnline ? -1 : 1;
    });

    chatMembersList.innerHTML = sorted.map(pid => {
        const p = gameState.players[pid];
        const isMe = pid === localPlayerId;
        const isHost = gameState.hostId === pid;
        const isOnline = !!(presentMap && presentMap[pid]);
        const avatar = buildAvatarStyle(p?.name, p?.avatarEmoji, p?.photoURL);
        return `
            <div class="chat-member-row${isOnline ? ' is-online' : ''}">
                <div class="chat-member-avatar-wrap">
                    <div class="chat-member-avatar" style="${avatar.bg}${isOnline ? '' : 'filter:grayscale(60%);opacity:0.6;'}">${avatar.html}</div>
                    <div class="chat-member-status${isOnline ? ' is-online' : ''}"></div>
                </div>
                <span class="chat-member-name">${escapeHtml(p?.name || 'Player')}${isHost ? '<span class="chat-member-crown" title="Host">👑</span>' : ''}${isMe ? ' <span class="you-tag">(you)</span>' : ''}</span>
            </div>`;
    }).join('');
}

function subscribeChatMembers(code) {
    unsubscribeChatMembers();
    const presenceListRef = ref(rtdb, `presence/${code}`);
    chatMembersUnsub = onValue(presenceListRef, (snap) => {
        renderChatMembers(snap.val() || {});
    });
}

function unsubscribeChatMembers() {
    if (chatMembersUnsub) { chatMembersUnsub(); chatMembersUnsub = null; }
}

// Hook into room subscription setup — show chat when a room is joined
function onChatRoomJoined(code) {
    showChatPanel();
    subscribeChatForRoom(code);
    subscribeChatMembers(code);
    renderChatMembers(null); // paint immediately from gameState while presence loads
}

function onChatRoomLeft() {
    hideChatPanel();
    unsubscribeChat();
    unsubscribeChatMembers();
    chatOpen = false;
    chatPanel.classList.add('chat-collapsed');
    chatPanel.classList.remove('members-hidden');
    chatMembersVisible = true;
    chatMembersToggleBtn.classList.add('is-active');
    chatBadge.classList.remove('has-new');
    chatMessages.innerHTML = '';
    chatMessages.appendChild(chatEmpty);
    chatMembersList.innerHTML = '';
    chatMembersHeading.textContent = 'Party — 0';
    chatLastGroupSenderId = null;
    chatLastGroupEl = null;
}