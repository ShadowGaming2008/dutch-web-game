import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
let roomCode = "";
let gameState = {};
let revealed = {};
let highlightMap = {};      // key `${pid}-${idx}` -> timestamp until which a glow highlight shows (no card value, just "something happened here")
let initialPeekIdxsRemaining = []; // fixed set of card indices (bottom two) the player must peek at before play
let roundSeenKey = null;
let lastAbilityType = null; // track to avoid re-flashing
let lastHighlightEventId = null;

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
        steps: ["Pick ANY card to peek at — yours or an opponent's.", "Pick a second card (any player, but not two of your own) to peek at, then decide whether to swap them."],
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
    const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
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
    } else if (gameState.status === "ROUND_END") {
        roundEndScreen.classList.remove("hidden");
        renderRoundEnd();
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

    const opponents = Object.keys(gameState.players).filter(pid => pid !== localPlayerId);
    // Distribute: top gets first 3, left gets 4th, right gets 5th
    opponents.forEach((pid, i) => {
        const playerObj = gameState.players[pid];
        const el = createPlayerBoardElement(playerObj, pid, false, topCard, canSnap);
        if (i < 3) {
            zoneTop.appendChild(el);
        } else if (i === 3) {
            el.classList.add("side-zone");
            zoneLeft.appendChild(el);
        } else if (i === 4) {
            el.classList.add("side-zone");
            zoneRight.appendChild(el);
        }
    });

    // Hero
    const heroObj = gameState.players[localPlayerId];
    if (heroObj) {
        heroContainer.appendChild(createPlayerBoardElement(heroObj, localPlayerId, true, topCard, canSnap));
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

function createPlayerBoardElement(player, pid, isHero, topCard, canSnap) {
    const root = document.createElement("div");
    const isMyTurn = activePid() === localPlayerId;
    const isPendingGiveFrom = gameState.pendingGive?.fromPid === localPlayerId;
    const isPendingGiveTo = gameState.pendingGive?.toPid === pid;
    const isAbilityPhase = isMyTurn && gameState.turnPhase === 'AWAIT_ABILITY' && gameState.ability;

    root.className = isHero ? "hero-zone" : "opp-zone";
    if (!isHero && activePid() === pid) root.classList.add("active-turn");

    const isActiveTurn = activePid() === pid;

    // Determine card size based on zone
    const cardW = isHero ? 82 : 64;
    const cardH = isHero ? 116 : 90;

    root.innerHTML = `
        <div class="player-meta">
            <div class="player-name-row">
                ${isActiveTurn ? '<div class="turn-dot"></div>' : ''}
                <span style="font-size:12px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px">${player.name}</span>
                ${isHero ? '<span class="status-badge" style="background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.25)">You</span>' : ''}
                ${gameState.dutchCalledBy === pid ? '<span class="status-badge" style="background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.25);animation:dot-pulse 1s infinite">Dutch!</span>' : ''}
                ${isPendingGiveTo ? '<span class="status-badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.25)">Receiving</span>' : ''}
            </div>
            <span class="score-chip">Pts: <span>${player.totalScore || 0}</span></span>
        </div>
        <div class="card-grid" style="grid-template-columns: repeat(2, ${cardW}px); gap:${isHero?6:4}px;">
            ${player.cards.map((card, idx) => {
                const seen = isRevealed(pid, idx);
                const midAction = isMyTurn && gameState.turnPhase === 'AWAIT_ABILITY';
                // NOTE: We intentionally do NOT compute or reveal which cards match the discard pile.
                // Snapping must be based on the player's own memory, not a visual hint.

                // Ability targeting highlight
                let abilityClass = '';
                if (isAbilityPhase && gameState.ability) {
                    const a = gameState.ability;
                    if (a.type === '78' && pid === localPlayerId) {
                        abilityClass = 'ability-own-target';
                    }
                    if (a.type === '910' && pid !== localPlayerId) {
                        abilityClass = 'ability-opp-target';
                    }
                    if (a.type === 'jq') {
                        if (a.step === 1 && pid === localPlayerId) abilityClass = 'ability-own-target';
                        if (a.step === 2 && pid !== localPlayerId) abilityClass = 'ability-opp-target';
                        if (a.step === 2 && pid === localPlayerId && a.ownIdx === idx) abilityClass = 'ability-selected';
                    }
                    if (a.type === 'k') {
                        // Step 1: every card on the board is a valid first pick.
                        // Step 2: every card is valid EXCEPT the one already chosen,
                        // and except your own cards if you already picked your own.
                        if (a.step === 1) {
                            abilityClass = 'ability-opp-target';
                        } else if (a.first) {
                            const isFirstSlot = a.first.pid === pid && a.first.idx === idx;
                            const bothWouldBeOwn = a.first.pid === localPlayerId && pid === localPlayerId;
                            if (isFirstSlot) abilityClass = 'ability-selected';
                            else if (!bothWouldBeOwn) abilityClass = 'ability-opp-target';
                        }
                    }
                }

                if (isPendingGiveFrom && pid === localPlayerId) abilityClass = 'ability-own-target';

                const hl = isHighlighted(pid, idx) ? 'highlight-glow' : '';
                const extraCardClass = `${abilityClass} ${hl}`.trim();

                // Empty slot — a card was snapped away from here earlier this
                // round. Render distinctly from a real face-down card so no
                // one mistakes it for a card still in play, and skip the
                // click handler entirely (handled by the guard in
                // handleCardInteraction, but no point making it look clickable).
                if (!card) {
                    return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card ${hl}" style="min-width:0;cursor:default;width:${cardW}px;height:${cardH}px;border-radius:8px;border:2px dashed rgba(100,116,139,0.5);display:flex;align-items:center;justify-content:center">
                        <div class="card-slot-number" style="position:static;background:none;border:none;box-shadow:none;color:#475569">#${idx + 1}</div>
                    </div>`;
                }

                if (seen) {
                    const cc = cardColorClass(seen);
                    const suit = seen.isJoker ? '🃏' : seen.suit;
                    const rank = seen.isJoker ? '🃏' : seen.name;
                    return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card playing-card card-revealing ${extraCardClass}" style="min-width:0;width:${cardW}px;height:${cardH}px">
                        <div class="card-slot-number">#${idx + 1}</div>
                        <div class="corner-tl ${cc}">
                            <div class="rank">${rank}</div>
                            ${suit && !seen.isJoker ? `<div class="suit-sm">${suit}</div>` : ''}
                        </div>
                        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.07;font-size:2.5rem" class="${cc}">${suit}</div>
                        <div class="text-center">
                            <div class="text-xl ${cc}">${suit}</div>
                        </div>
                        <div class="corner-br ${cc}">
                            <div class="rank">${rank}</div>
                            ${suit && !seen.isJoker ? `<div class="suit-sm">${suit}</div>` : ''}
                        </div>
                    </div>`;
                }

                return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card card-back ${extraCardClass}" style="min-width:0;width:${cardW}px;height:${cardH}px">
                    <div class="card-slot-number">#${idx + 1}</div>
                </div>`;
            }).join('')}
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
    const waitMsg = document.getElementById("nextRoundWaitMsg");
    if (gameState.hostId === localPlayerId) {
        nextBtn.classList.remove("hidden");
        waitMsg.classList.add("hidden");
    } else {
        nextBtn.classList.add("hidden");
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

        // Second card: any card EXCEPT the one already picked, and you may
        // not pick two of your own — every other combination is fair game
        // (two different opponents, two of the same opponent, or yours + theirs).
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
            const doSwap = await showChoiceModal(
                `👑 Second card — ${describeSlot(secondPid, secondIdx)} is ${card.name}${card.isJoker ? '' : card.suit}!`,
                `You peeked at ${describeSlot(firstPid, firstIdx)} and ${describeSlot(secondPid, secondIdx)}. Swap those two cards with each other?`,
                '🔄 Swap!',
                'bg-indigo-600 hover:bg-indigo-500'
            );
            const myName = gameState.players[localPlayerId]?.name || 'A player';
            const involvesMe = firstPid === localPlayerId || secondPid === localPlayerId;
            const otherPid = firstPid === localPlayerId ? secondPid : (secondPid === localPlayerId ? firstPid : null);

            if (doSwap) {
                const firstCards = [...gameState.players[firstPid].cards];
                const secondCards = firstPid === secondPid ? firstCards : [...gameState.players[secondPid].cards];
                const tmp = firstCards[firstIdx];
                firstCards[firstIdx] = secondCards[secondIdx];
                secondCards[secondIdx] = tmp;

                const updates = { [`players.${firstPid}.cards`]: firstCards };
                if (firstPid !== secondPid) updates[`players.${secondPid}.cards`] = secondCards;

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
            } else {
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