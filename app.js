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
function showToast(message, type = 'info', duration = 3000) {
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
    toast.className = `toast-enter flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium ${c.bg} ${c.text}`;
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
    }, 2000);
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
let initialPeekIdxsRemaining = []; // fixed set of card indices (bottom two) the player must peek at before play
let roundSeenKey = null;
let lastAbilityType = null; // track to avoid re-flashing

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
        steps: ['Pick one of YOUR cards to peek at.', "Now pick an OPPONENT'S card — you'll see it, then decide to swap."],
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

function makeEvent(message, targetPid = null, targetMessage = null) {
    return {
        id: Math.random().toString(36).substring(2, 10),
        message,
        targetMessage,
        actorId: localPlayerId,
        targetId: targetPid
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
    showToast((isTarget && evt.targetMessage) ? evt.targetMessage : evt.message, 'info', 3000);
}

// ==========================================
// Global UI Rendering Router
// ==========================================
function renderState() {
    maybeShowPublicEvent();
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
            lastAbilityType = null;
            lastShownEventId = gameState.lastEvent?.id || null;
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

        drawnCardArea.classList.remove('hidden');
        drawnCardArea.classList.add('flex');

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
        drawnCardArea.classList.add('hidden');
        drawnCardArea.classList.remove('flex');
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

    // Render player areas
    const oppsContainer = document.getElementById("opponentsContainer");
    oppsContainer.innerHTML = "";
    const heroContainer = document.getElementById("heroContainer");
    heroContainer.innerHTML = "";

    Object.keys(gameState.players).forEach(pid => {
        const playerObj = gameState.players[pid];
        if (pid === localPlayerId) {
            heroContainer.appendChild(createPlayerBoardElement(playerObj, pid, true, topCard, canSnap));
        } else {
            oppsContainer.appendChild(createPlayerBoardElement(playerObj, pid, false, topCard, canSnap));
        }
    });
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

function reveal(pid, idx, card, ms = 3500) {
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

    root.className = isHero
        ? "bg-slate-950 p-5 rounded-2xl border-2 border-amber-500/40 space-y-4 shadow-xl w-full"
        : "bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3";

    const isActiveTurn = activePid() === pid;

    root.innerHTML = `
        <div class="flex justify-between items-center flex-wrap gap-2">
            <h3 class="font-semibold text-white flex items-center gap-2 flex-wrap">
                ${isActiveTurn ? '<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block"></span>' : ''}
                <span>${player.name}</span>
                ${isHero ? '<span class="text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md border border-amber-500/20">You</span>' : ''}
                ${gameState.dutchCalledBy === pid ? '<span class="text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-md border border-rose-500/20 animate-pulse">Called Dutch!</span>' : ''}
                ${isPendingGiveTo ? '<span class="text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/20">Receiving...</span>' : ''}
            </h3>
            <span class="text-xs font-mono text-slate-500">Total: <span class="text-slate-300 font-bold">${player.totalScore || 0}</span></span>
        </div>
        <div class="card-grid max-w-[220px] ${isHero ? 'mx-auto sm:mx-0' : 'mx-auto'}">
            ${player.cards.map((card, idx) => {
                const seen = isRevealed(pid, idx);
                const midAction = isMyTurn && gameState.turnPhase === 'AWAIT_ABILITY';
                // NOTE: We intentionally do NOT compute or reveal which cards match the discard pile.
                // Snapping must be based on the player's own memory, not a visual hint.

                // Ability targeting highlight
                let abilityClass = '';
                if (isAbilityPhase && gameState.ability) {
                    const a = gameState.ability;
                    if ((a.type === '78' || (a.type === 'k' && a.step === 1)) && pid === localPlayerId) {
                        abilityClass = 'ability-own-target';
                    }
                    if ((a.type === '910' || (a.type === 'k' && a.step === 2)) && pid !== localPlayerId) {
                        abilityClass = 'ability-opp-target';
                    }
                    if (a.type === 'jq') {
                        if (a.step === 1 && pid === localPlayerId) abilityClass = 'ability-own-target';
                        if (a.step === 2 && pid !== localPlayerId) abilityClass = 'ability-opp-target';
                        if (a.step === 2 && pid === localPlayerId && a.ownIdx === idx) abilityClass = 'ability-selected';
                    }
                }

                if (isPendingGiveFrom && pid === localPlayerId) abilityClass = 'ability-own-target';

                const extraCardClass = abilityClass;

                if (seen) {
                    const cc = cardColorClass(seen);
                    const suit = seen.isJoker ? '🃏' : seen.suit;
                    const rank = seen.isJoker ? '🃏' : seen.name;
                    return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card playing-card card-revealing w-[90px] h-[126px] ${extraCardClass}" style="min-width:0">
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

                return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card card-back w-[90px] h-[126px] ${extraCardClass}" style="min-width:0">
                    ${!isHero ? `<div style="position:absolute;top:4px;right:6px;font-size:9px;color:rgba(99,102,241,0.5);font-weight:700">#${idx+1}</div>` : `<div style="position:absolute;top:4px;right:6px;font-size:9px;color:rgba(99,102,241,0.5);font-weight:700">#${idx+1}</div>`}
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
document.getElementById("drawDeck").addEventListener("click", async () => {
    if (gameState.status !== 'PLAYING') return;
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DRAW') return;
    if (initialPeekIdxsRemaining.length > 0) { showToast("Finish memorising your bottom cards first!", 'warning'); return; }
    if (!gameState.deck || gameState.deck.length === 0) { showToast("The deck is empty!", 'warning'); return; }

    const freshDeck = [...gameState.deck];
    const card = freshDeck.pop();
    await pushState({ deck: freshDeck, drawnCard: { card, source: 'deck' }, turnPhase: 'AWAIT_DECISION' });
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
            ability: { type: abilityType, step: 1, ownIdx: null, oppPid: null, oppIdx: null }
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
            const handScore = updatedPlayers[pid].cards.reduce((sum, c) => sum + (c.score || 0), 0);
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
        giverCards.splice(idx, 1);
        const toPid = gameState.pendingGive.toPid;
        const toIdx = gameState.pendingGive.toIdx;
        const receiverCards = [...gameState.players[toPid].cards];
        receiverCards.splice(toIdx, 0, givenCard);
        await pushState({
            [`players.${localPlayerId}.cards`]: giverCards,
            [`players.${toPid}.cards`]: receiverCards,
            pendingGive: null
        });
        showToast(`Card given to ${gameState.players[toPid]?.name || 'them'}.`, 'info', 2000);
        await pushState({ lastEvent: makeEvent(`${gameState.players[localPlayerId]?.name || 'A player'} handed a card to ${gameState.players[toPid]?.name || 'someone'}.`) });
        return;
    }

    const isMyTurn = activePid() === localPlayerId;

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
        const newDiscard = [...gameState.discard, oldCard];
        showToast("Card swapped!", 'success', 1500);
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        await advanceTurn({
            [`players.${localPlayerId}.cards`]: myCards, discard: newDiscard, drawnCard: null,
            lastEvent: makeEvent(`${myName} swapped their card #${idx + 1}.`)
        });
        return;
    }

    // 4. Initial peek phase — only the bottom two cards may be peeked, one at a time, in order
    if (initialPeekIdxsRemaining.length > 0 && pid === localPlayerId) {
        const nextRequiredIdx = initialPeekIdxsRemaining[0];
        if (idx !== nextRequiredIdx) {
            showToast(`Memorise your bottom cards first — click card #${nextRequiredIdx + 1}.`, 'warning', 2000);
            return;
        }
        const card = gameState.players[localPlayerId].cards[idx];
        initialPeekIdxsRemaining = initialPeekIdxsRemaining.slice(1);
        reveal(pid, idx, card, 4000);
        showToast(`Peeked at card #${idx + 1} — memorise it! ${initialPeekIdxsRemaining.length > 0 ? `${initialPeekIdxsRemaining.length} more to go.` : 'All set — play begins now.'}`, 'info', 3000);
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
        if (pid !== localPlayerId) { showToast("Pick one of YOUR OWN cards to peek at.", 'warning', 2000); return; }
        const card = gameState.players[pid].cards[idx];
        reveal(pid, idx, card, 4000);
        showToast(`👁️ You peeked at your card #${idx + 1} — it's ${card.name}${card.isJoker ? '' : card.suit}!`, 'ability', 3500);
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        await advanceTurn({ ability: null, lastEvent: makeEvent(`${myName} used the 7/8 ability to look at their own card #${idx + 1}.`) });
        return;
    }

    if (a.type === '910') {
        if (pid === localPlayerId) { showToast("Pick an OPPONENT'S card to spy on.", 'warning', 2000); return; }
        const card = gameState.players[pid].cards[idx];
        reveal(pid, idx, card, 4000);
        showToast(`🔍 Spied on ${gameState.players[pid]?.name}'s card #${idx + 1} — it's ${card.name}${card.isJoker ? '' : card.suit}!`, 'ability', 3500);
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        const targetName = gameState.players[pid]?.name || 'an opponent';
        await advanceTurn({
            ability: null,
            lastEvent: makeEvent(
                `${myName} used the 9/10 ability to look at ${targetName}'s card #${idx + 1}.`,
                pid,
                `${myName} used the 9/10 ability to look at YOUR card #${idx + 1}.`
            )
        });
        return;
    }

    if (a.type === 'jq') {
        if (a.step === 1) {
            if (pid !== localPlayerId) { showToast("First, pick one of YOUR OWN cards to swap.", 'warning', 2000); return; }
            showToast("✓ Your card selected. Now pick an opponent's card to swap with.", 'ability', 2500);
            await pushState({ ability: { ...a, step: 2, ownIdx: idx } });
        } else {
            if (pid === localPlayerId) { showToast("Now pick an OPPONENT'S card to swap with.", 'warning', 2000); return; }
            const myCards = [...gameState.players[localPlayerId].cards];
            const oppCards = [...gameState.players[pid].cards];
            const tmp = myCards[a.ownIdx];
            myCards[a.ownIdx] = oppCards[idx];
            oppCards[idx] = tmp;
            showToast(`🔀 Swapped with ${gameState.players[pid]?.name}'s card #${idx + 1}!`, 'success', 2500);
            const myName = gameState.players[localPlayerId]?.name || 'A player';
            const targetName = gameState.players[pid]?.name || 'an opponent';
            await advanceTurn({
                [`players.${localPlayerId}.cards`]: myCards,
                [`players.${pid}.cards`]: oppCards,
                ability: null,
                lastEvent: makeEvent(
                    `${myName} blind-swapped their card #${a.ownIdx + 1} with ${targetName}'s card #${idx + 1}.`,
                    pid,
                    `${myName} blind-swapped their card #${a.ownIdx + 1} with YOUR card #${idx + 1}.`
                )
            });
        }
        return;
    }

    if (a.type === 'k') {
        if (a.step === 1) {
            if (pid !== localPlayerId) { showToast("First, pick one of YOUR OWN cards to peek at.", 'warning', 2000); return; }
            const card = gameState.players[pid].cards[idx];
            reveal(pid, idx, card, 8000);
            showToast(`👑 Your card #${idx + 1} is ${card.name}${card.isJoker ? '' : card.suit}. Now spy on an opponent's card.`, 'ability', 3500);
            await pushState({ ability: { ...a, step: 2, ownIdx: idx } });
        } else {
            if (pid === localPlayerId) { showToast("Now pick an OPPONENT'S card to peek at.", 'warning', 2000); return; }
            const card = gameState.players[pid].cards[idx];
            reveal(pid, idx, card, 8000);
            const oppName = gameState.players[pid]?.name || 'opponent';
            setTimeout(async () => {
                const doSwap = await showChoiceModal(
                    `👑 ${oppName}'s card is ${card.name}${card.isJoker ? '' : card.suit}!`,
                    "You've peeked at both cards. Do you want to swap them?",
                    '🔄 Swap!',
                    'bg-indigo-600 hover:bg-indigo-500'
                );
                const myCards = [...gameState.players[localPlayerId].cards];
                const oppCards = [...gameState.players[pid].cards];
                const myName = gameState.players[localPlayerId]?.name || 'A player';
                if (doSwap) {
                    const tmp = myCards[a.ownIdx];
                    myCards[a.ownIdx] = oppCards[idx];
                    oppCards[idx] = tmp;
                    showToast(`🔄 Swapped your card #${a.ownIdx + 1} with ${oppName}'s card #${idx + 1}!`, 'success', 2500);
                    await advanceTurn({
                        [`players.${localPlayerId}.cards`]: myCards,
                        [`players.${pid}.cards`]: oppCards,
                        ability: null,
                        lastEvent: makeEvent(
                            `${myName} used the Black King ability and swapped their card #${a.ownIdx + 1} with ${oppName}'s card #${idx + 1}.`,
                            pid,
                            `${myName} used the Black King ability and swapped their card #${a.ownIdx + 1} with YOUR card #${idx + 1}.`
                        )
                    });
                } else {
                    showToast("Kept your cards as they are.", 'info', 1500);
                    await advanceTurn({
                        ability: null,
                        lastEvent: makeEvent(
                            `${myName} used the Black King ability to look at their own and ${oppName}'s cards, then kept everything as is.`,
                            pid,
                            `${myName} used the Black King ability to look at their own card and YOUR card #${idx + 1}, then kept everything as is.`
                        )
                    });
                }
            }, 150);
        }
        return;
    }
}

// ==========================================
// Snap
// ==========================================
async function attemptSnap(pid, idx) {
    if (!gameState.discard || gameState.discard.length === 0) return;
    const topCard = gameState.discard[gameState.discard.length - 1];
    const targetCard = gameState.players[pid]?.cards?.[idx];
    if (!targetCard) return;

    if (targetCard.name === topCard.name) {
        const targetCards = [...gameState.players[pid].cards];
        targetCards.splice(idx, 1);
        const newDiscard = [...gameState.discard, targetCard];
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        if (pid === localPlayerId) {
            showToast("⚡ Snap! Card removed from your hand!", 'success', 2500);
            await pushState({
                [`players.${pid}.cards`]: targetCards, discard: newDiscard,
                lastEvent: makeEvent(`${myName} snapped one of their own cards.`)
            });
        } else {
            const oppName = gameState.players[pid]?.name || 'them';
            showToast(`⚡ Snapped ${oppName}'s card! Now pick one of YOUR cards to give them.`, 'success', 4000);
            await pushState({
                [`players.${pid}.cards`]: targetCards,
                discard: newDiscard,
                pendingGive: { fromPid: localPlayerId, toPid: pid, toIdx: idx },
                lastEvent: makeEvent(
                    `${myName} snapped ${oppName}'s card #${idx + 1}!`,
                    pid,
                    `${myName} snapped YOUR card #${idx + 1}!`
                )
            });
        }
    } else {
        if (!gameState.deck || gameState.deck.length === 0) return;
        const freshDeck = [...gameState.deck];
        const penaltyCard = freshDeck.pop();
        const myCards = [...gameState.players[localPlayerId].cards, penaltyCard];
        const myName = gameState.players[localPlayerId]?.name || 'A player';
        await pushState({
            deck: freshDeck, [`players.${localPlayerId}.cards`]: myCards,
            lastEvent: makeEvent(`${myName} attempted a snap but got it wrong and took a penalty card.`)
        });
        showToast("❌ Wrong snap! Penalty card added to your hand.", 'error', 3000);
    }
}

// ==========================================
// Rules Modal
// ==========================================
const rulesModal = document.getElementById("rulesModal");
document.getElementById("rulesBtn").addEventListener("click", () => rulesModal.classList.remove("hidden"));
document.getElementById("closeRulesBtn").addEventListener("click", () => rulesModal.classList.add("hidden"));
rulesModal.addEventListener("click", (e) => { if (e.target === rulesModal) rulesModal.classList.add("hidden"); });