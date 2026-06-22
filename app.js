import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore, doc, setDoc, getDoc, onSnapshot, updateDoc, arrayUnion,
    collection, addDoc, query, orderBy, limit, getDocs, deleteField
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
  measurementId: "G-40FS16HJCN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

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

// Account / auth state
let currentUser = null;        // Firebase Auth user object, or null if signed out / guest
let currentProfile = null;     // users/{uid} Firestore doc data, or null
let statsWrittenForRound = null; // roundSeenKey already written to stats, to avoid double-counting on re-render

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
    'Eternal Dutch', 'The Immortal', 'Dutch Supreme', 'Beyond Mortal', 'Dutch Transcendent'
];

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
            username: user.displayName || "Player",
            avatarEmoji: null, // null = use Google photo; set to an emoji string to override
            stats: defaultStats()
        };
        await setDoc(ref, currentProfile);
    }
    if (!currentProfile.stats) currentProfile.stats = defaultStats();
    if (currentProfile.stats.xp === undefined) currentProfile.stats.xp = 0;
    if (currentProfile.avatarEmoji === undefined) currentProfile.avatarEmoji = null;
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
}

function applySignedOutUI() {
    document.getElementById("headerSignInBtn").classList.remove("hidden");
    document.getElementById("headerAccountBtn").classList.add("hidden");
    document.getElementById("accountDropdown").classList.add("hidden");
    document.getElementById("landingSignInBtn").classList.remove("hidden");
    document.getElementById("landingSignedInChip").classList.add("hidden");
    delete document.getElementById("usernameInput").dataset.userEdited;
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
        currentUser = null;
        currentProfile = null;
        if (!roomCode) localPlayerId = guestPlayerId;
        applySignedOutUI();
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

document.getElementById("headerSignInBtn").addEventListener("click", handleSignIn);
document.getElementById("landingSignInBtn").addEventListener("click", handleSignIn);

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
const NOTIFY_MS = 4500;
const KING_NOTIFY_MS = 6000;

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

    // Step dots
    const dot1 = document.getElementById('abilityStepDot1');
    const dot2 = document.getElementById('abilityStepDot2');
    if (cfg.steps.length > 1) {
        dot2.classList.remove('hidden');
        dot1.className = `w-2 h-2 rounded-full ${step === 1 ? 'bg-indigo-400' : 'bg-slate-600'}`;
        dot2.className = `w-2 h-2 rounded-full ${step === 2 ? 'bg-indigo-400' : 'bg-slate-600'}`;
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
// Lobby / Room setup
// ==========================================
document.getElementById("createRoomBtn").addEventListener("click", async () => {
    const name = document.getElementById("usernameInput").value.trim() || "Player";
    roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    gameState = {
        code: roomCode, status: "LOBBY", hostId: localPlayerId,
        turnOrder: [localPlayerId], currentTurnIdx: 0, roundNumber: 0,
        players: { [localPlayerId]: { name, ready: false, cards: [], totalScore: 0 } },
        deck: createDeck(), discard: [], dutchCalledBy: null, finalTurnsLeft: null,
        turnPhase: 'AWAIT_DRAW', drawnCard: null, ability: null, pendingGive: null
    };
    await setDoc(doc(db, "rooms", roomCode), gameState);
    setupRoomSubscription(roomCode);
});

document.getElementById("joinRoomBtn").addEventListener("click", async () => {
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
        [`players.${localPlayerId}`]: { name, ready: false, cards: [], totalScore: 0 },
        turnOrder: arrayUnion(localPlayerId)
    });
    setupRoomSubscription(roomCode);
});

function setupRoomSubscription(code) {
    onSnapshot(doc(db, "rooms", code), (docSnap) => {
        if (!docSnap.exists()) return;
        gameState = docSnap.data();
        renderState();
    });
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

function makeEvent(message, targetPid = null, targetMessage = null, highlights = []) {
    return {
        id: Math.random().toString(36).substring(2, 10),
        message,
        targetMessage,
        actorId: localPlayerId,
        targetId: targetPid,
        highlights
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
// Global UI Rendering Router
// ==========================================
function renderState() {
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
        }
        renderGameBoard();
        renderVoteKickModal();
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
    Object.keys(gameState.players).forEach(pid => {
        const p = gameState.players[pid];
        playerList.innerHTML += `
            <div class="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex justify-between items-center">
                <span class="font-semibold text-sm text-white flex items-center gap-1.5">
                    ${pid === gameState.hostId ? '<span class="text-amber-400">👑</span>' : ''}
                    ${p.name}
                </span>
                <span class="text-xs px-2.5 py-1 rounded-lg font-bold ${p.ready ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}">${p.ready ? '✓ Ready' : 'Not Ready'}</span>
            </div>`;
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
        updatedPlayers[pid] = { ...updatedPlayers[pid], cards: [freshDeck.pop(), freshDeck.pop(), freshDeck.pop(), freshDeck.pop()], ready: false };
    });
    const initialDiscard = freshDeck.pop();
    await pushState({
        status: "PLAYING", deck: freshDeck, discard: [initialDiscard],
        players: updatedPlayers, roundNumber: (gameState.roundNumber || 0) + 1,
        currentTurnIdx: 0, turnPhase: 'AWAIT_DRAW', drawnCard: null,
        ability: null, dutchCalledBy: null, finalTurnsLeft: null, pendingGive: null
    });
}

document.getElementById("startMatchBtn").addEventListener("click", dealNewRound);
document.getElementById("nextRoundBtn").addEventListener("click", dealNewRound);

// ==========================================
// End Game — host-only, offered alongside "Start Next Round" on the
// round-end screen. Returns everyone to the lobby for this same room
// (same code, same seated players) rather than dissolving the room or
// sending people back to the landing screen. Each player's cumulative
// totalScore is intentionally left untouched — this is a "stop here for
// now" action, not a "wipe the scoreboard" action, so the room's running
// standings are still there if the host starts a fresh game later.
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

function renderGameBoard() {
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
    dutchBtn.disabled = !(isMyTurn && gameState.turnPhase === 'AWAIT_DRAW' && !gameState.dutchCalledBy);

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
                    abilityClass = 'ability-opp-target';
                } else if (a.step === 2 && a.first) {
                    const isFirstSlot = a.first.pid === pid && a.first.idx === idx;
                    const bothWouldBeOwn = a.first.pid === localPlayerId && pid === localPlayerId;
                    if (isFirstSlot) abilityClass = 'ability-selected';
                    else if (!bothWouldBeOwn) abilityClass = 'ability-opp-target';
                } else if (a.step === 3) {
                    // Free-pick step 3: all cards are valid targets
                    abilityClass = 'ability-opp-target';
                } else if (a.step === 4 && a.swapFirst) {
                    const isSwapFirstSlot = a.swapFirst.pid === pid && a.swapFirst.idx === idx;
                    if (isSwapFirstSlot) abilityClass = 'ability-selected';
                    else abilityClass = 'ability-opp-target';
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
        return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card card-back ${extraCardClass}" style="width:${cardW}px;height:${cardH}px">
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
            <span class="score-chip">Pts: <span>${player.totalScore || 0}</span></span>
        </div>
        <div style="${scrollStyle}">
            <div style="${gridStyle}">${cardsHTML}</div>
        </div>
    `;

    root.querySelectorAll('.game-card').forEach(el => {
        el.addEventListener('click', () => handleCardInteraction(el.dataset.pid, parseInt(el.dataset.cidx)));
    });

    return root;
}

// ==========================================
// Draw / Discard pile interactions
// ==========================================

// When the draw deck runs out, the discard pile (minus its top card, which
// must stay face-up and in play) is shuffled and becomes the new deck.
// Returns { card, deck, discard } on success, or null if there's truly
// nowhere left to draw from (deck empty AND discard has 0-1 cards).
function reshuffleDiscardIntoDeckIfNeeded(deck, discard) {
    if (deck.length > 0) return { deck, discard };
    if (!discard || discard.length <= 1) return null; // nothing to reshuffle (need to keep the top card)
    const topCard = discard[discard.length - 1];
    const rest = discard.slice(0, -1);
    const reshuffled = rest.sort(() => Math.random() - 0.5);
    showToast("🔄 Deck empty — reshuffled the discard pile!", 'info', NOTIFY_MS);
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
    await pushState({ discard: freshDiscard, drawnCard: { card, source: 'discard' }, turnPhase: 'AWAIT_DECISION' });
});

// Discard with ability
document.getElementById("discardDrawnBtn").addEventListener("click", async () => {
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DECISION' || !gameState.drawnCard || gameState.drawnCard.source !== 'deck') return;
    const card = gameState.drawnCard.card;
    const newDiscard = [...gameState.discard, card];
    const abilityType = isSpecial(card);
    if (abilityType) {
        await pushState({
            discard: newDiscard, drawnCard: null,
            turnPhase: 'AWAIT_ABILITY',
            ability: { type: abilityType, step: 1, ownIdx: null, oppPid: null, oppIdx: null, first: null, second: null }
        });
    } else {
        await advanceTurn({ discard: newDiscard, drawnCard: null });
    }
});

// Discard without ability (or non-special card discard)
document.getElementById("discardDrawnNoAbilityBtn").addEventListener("click", async () => {
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DECISION' || !gameState.drawnCard || gameState.drawnCard.source !== 'deck') return;
    const card = gameState.drawnCard.card;
    const newDiscard = [...gameState.discard, card];
    await advanceTurn({ discard: newDiscard, drawnCard: null });
});

// ==========================================
// Call Dutch
// ==========================================
document.getElementById("callDutchBtn").addEventListener("click", async () => {
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DRAW' || gameState.dutchCalledBy) return;
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
    if (gameState.dutchCalledBy && gameState.dutchCalledBy !== targetPid && typeof gameState.finalTurnsLeft === 'number') {
        updates.finalTurnsLeft = Math.max(0, gameState.finalTurnsLeft - 1);
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
        const updatedPlayers = { ...gameState.players };
        Object.keys(updatedPlayers).forEach(pid => {
            const handScore = updatedPlayers[pid].cards.reduce((sum, c) => sum + (c ? (c.score || 0) : 0), 0);
            updatedPlayers[pid] = {
                ...updatedPlayers[pid],
                totalScore: (updatedPlayers[pid].totalScore || 0) + handScore,
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
    const sorted = Object.entries(gameState.players).sort((a, b) => (a[1].totalScore || 0) - (b[1].totalScore || 0));
    scoresEl.innerHTML = sorted.map(([pid, p], i) => `
        <div class="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-3.5">
            <span class="font-semibold text-white flex items-center gap-2">
                ${i === 0 ? '<span class="text-amber-400">🏆</span>' : `<span class="text-slate-500 font-mono text-sm">${i + 1}.</span>`}
                ${p.name}
                ${pid === localPlayerId ? '<span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-1.5 py-0.5 rounded">You</span>' : ''}
            </span>
            <span class="text-sm text-slate-400">
                This round: <span class="text-white font-mono font-bold">${p.lastHandScore ?? 0}</span>
                &nbsp;·&nbsp;
                Total: <span class="text-amber-400 font-mono font-bold">${p.totalScore || 0}</span>
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
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        await advanceTurn({
            [`players.${localPlayerId}.cards`]: myCards, discard: newDiscard, drawnCard: null,
            lastEvent: makeEvent(`${myName} swapped their card #${idx + 1}.`, null, null, [{ pid: localPlayerId, idx }])
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
        reveal(pid, idx, card, NOTIFY_MS);
        showToast(`👁️ You peeked at your card #${idx + 1} — it's ${card.name}${card.isJoker ? '' : card.suit}!`, 'ability', NOTIFY_MS);
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        await advanceTurn({ ability: null, lastEvent: makeEvent(`${myName} used the 7/8 ability to look at their own card #${idx + 1}.`, null, null, [{ pid, idx }]) });
        return;
    }

    if (a.type === '910') {
        if (pid === localPlayerId) { showToast("Pick an OPPONENT'S card to spy on.", 'warning', NOTIFY_MS); return; }
        const card = gameState.players[pid].cards[idx];
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
                    [{ pid: localPlayerId, idx: a.ownIdx }, { pid, idx }]
                )
            });
        }
        return;
    }

    if (a.type === 'k') {
        if (a.step === 1) {
            // First card: ANY card, yours or any opponent's.
            const card = gameState.players[pid].cards[idx];
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
                        lastEvent: makeEvent(publicMsg, otherPid, targetMsg, [{ pid: firstPid, idx: firstIdx }, { pid: secondPid, idx: secondIdx }])
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
                lastEvent: makeEvent(publicMsg, otherPid, targetMsg, [{ pid: sfPid, idx: sfIdx }, { pid, idx }])
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

async function attemptSnap(pid, idx) {
    if (!gameState.discard || gameState.discard.length === 0) return;
    const topCard = gameState.discard[gameState.discard.length - 1];
    const targetCard = gameState.players[pid]?.cards?.[idx];
    if (!targetCard) return;

    if (targetCard.name === topCard.name) {
        const targetCards = [...gameState.players[pid].cards];
        targetCards[idx] = null; // leave the slot empty in place — don't shift other cards
        const newDiscard = [...gameState.discard, targetCard];
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        if (pid === localPlayerId) {
            showToast("⚡ Snap! Card removed from your hand!", 'success', NOTIFY_MS);
            highlightSlots([{ pid, idx }], NOTIFY_MS);
            await pushState({
                [`players.${pid}.cards`]: targetCards, discard: newDiscard,
                lastEvent: makeEvent(`${myName} snapped one of their own cards.`, null, null, [{ pid, idx }])
            });
        } else {
            const oppName = gameState.players[pid]?.name || 'them';
            showToast(`⚡ Snapped ${oppName}'s card! Now pick one of YOUR cards to give them.`, 'success', NOTIFY_MS);
            highlightSlots([{ pid, idx }], NOTIFY_MS);
            await pushState({
                [`players.${pid}.cards`]: targetCards,
                discard: newDiscard,
                pendingGive: { fromPid: localPlayerId, toPid: pid, toIdx: idx },
                lastEvent: makeEvent(
                    `${myName} snapped ${oppName}'s card #${idx + 1}!`,
                    pid,
                    `${myName} snapped YOUR card #${idx + 1}!`,
                    [{ pid, idx }]
                )
            });
        }
    } else {
        const drawn = await drawCardReplenishingIfNeeded();
        if (!drawn) return; // both deck and discard were empty — nothing to penalize with
        const myCards = [...gameState.players[localPlayerId].cards];
        const emptyIdx = firstEmptySlot(myCards);
        const penaltyIdx = emptyIdx !== -1 ? emptyIdx : myCards.length;
        if (emptyIdx !== -1) {
            myCards[emptyIdx] = drawn.card;
        } else {
            myCards.push(drawn.card); // no empty slot — genuinely grow the hand by one
        }
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        highlightSlots([{ pid: localPlayerId, idx: penaltyIdx }], NOTIFY_MS);
        await pushState({
            deck: drawn.deck, discard: drawn.discard,
            [`players.${localPlayerId}.cards`]: myCards,
            lastEvent: makeEvent(`${myName} attempted a snap but got it wrong and took a penalty card.`)
        });
        showToast("❌ Wrong snap! Penalty card added to your hand.", 'error', NOTIFY_MS);
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