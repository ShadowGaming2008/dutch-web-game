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
// Custom Modal System (replaces alert/confirm)
// ==========================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const colors = {
        info: 'bg-slate-800 border-slate-600 text-slate-100',
        success: 'bg-emerald-900 border-emerald-500 text-emerald-100',
        error: 'bg-rose-900 border-rose-500 text-rose-100',
        warning: 'bg-amber-900 border-amber-500 text-amber-100'
    };
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all duration-300 opacity-0 translate-y-2 ${colors[type]}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('opacity-0', 'translate-y-2');
    });
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showConfirm(message, subtext = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in">
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
    return showConfirmCustom(message, subtext, confirmLabel, confirmClass);
}

function showConfirmCustom(message, subtext, confirmLabel, confirmClass) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4';
        overlay.innerHTML = `
            <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
                <p class="text-white font-bold text-lg leading-snug">${message}</p>
                ${subtext ? `<p class="text-slate-400 text-sm">${subtext}</p>` : ''}
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
let peeksRemaining = 0;
let roundSeenKey = null;

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
            deck.push({ id: Math.random().toString(36).substring(2, 7), suit, name: val.n, score: actualValue, color: isRed(suit) ? 'text-rose-500' : 'text-slate-200' });
        });
    });
    deck.push({ id: Math.random().toString(36).substring(2, 7), suit: '🃏', name: 'Joker', score: 0, color: 'text-amber-400' });
    deck.push({ id: Math.random().toString(36).substring(2, 7), suit: '🃏', name: 'Joker', score: 0, color: 'text-amber-400' });
    return deck.sort(() => Math.random() - 0.5);
};

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
        code: roomCode,
        status: "LOBBY",
        hostId: localPlayerId,
        turnOrder: [localPlayerId],
        currentTurnIdx: 0,
        roundNumber: 0,
        players: {
            [localPlayerId]: { name, ready: false, cards: [], totalScore: 0 }
        },
        deck: createDeck(),
        discard: [],
        dutchCalledBy: null,
        finalTurnsLeft: null,
        turnPhase: 'AWAIT_DRAW',
        drawnCard: null,
        ability: null,
        pendingGive: null
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
// Global UI Rendering Router
// ==========================================
function renderState() {
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
            peeksRemaining = 2;
            revealed = {};
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
            <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                <span class="font-medium text-sm text-white">${p.name} ${pid === gameState.hostId ? '👑' : ''}</span>
                <span class="text-xs px-2 py-1 rounded font-bold ${p.ready ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">${p.ready ? 'Ready' : 'Not Ready'}</span>
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
        updatedPlayers[pid] = {
            ...updatedPlayers[pid],
            cards: [freshDeck.pop(), freshDeck.pop(), freshDeck.pop(), freshDeck.pop()],
            ready: false
        };
    });

    const initialDiscard = freshDeck.pop();

    await pushState({
        status: "PLAYING",
        deck: freshDeck,
        discard: [initialDiscard],
        players: updatedPlayers,
        roundNumber: (gameState.roundNumber || 0) + 1,
        currentTurnIdx: 0,
        turnPhase: 'AWAIT_DRAW',
        drawnCard: null,
        ability: null,
        dutchCalledBy: null,
        finalTurnsLeft: null,
        pendingGive: null
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
        turnBanner.innerText = "⭐ YOUR TURN ⭐";
        turnBanner.className = "bg-amber-500 text-slate-950 p-3 rounded-xl font-black text-center text-lg shadow-lg shadow-amber-500/20";
    } else {
        const opposingName = gameState.players[activeTurnPlayerId]?.name || "Opponent";
        turnBanner.innerText = `Waiting for ${opposingName}...`;
        turnBanner.className = "bg-slate-800 text-slate-400 p-3 rounded-xl font-bold text-center text-sm";
    }

    const discPile = document.getElementById("discardPile");
    if (gameState.discard && gameState.discard.length > 0) {
        const topCard = gameState.discard[gameState.discard.length - 1];
        discPile.innerHTML = `
            <div class="absolute inset-1 bg-slate-950 rounded-lg flex flex-col items-center justify-center p-2 border border-slate-800 shadow-md">
                <span class="text-2xl ${topCard.color}">${topCard.suit}</span>
                <span class="text-sm font-black text-white">${topCard.name}</span>
            </div>`;
    } else {
        discPile.innerHTML = `<span class="text-xs text-slate-600 font-bold">EMPTY</span>`;
    }

    const drawDeckEl = document.getElementById("drawDeck");
    if (isMyTurn && gameState.turnPhase === 'AWAIT_DECISION' && gameState.drawnCard) {
        const c = gameState.drawnCard.card;
        drawDeckEl.innerHTML = `
            <span class="text-2xl ${c.color}">${c.suit}</span>
            <span class="text-sm font-black text-white">${c.name}</span>
            <span class="text-[9px] text-indigo-300 font-bold mt-1">DRAWN</span>`;
    } else {
        drawDeckEl.innerHTML = `<span class="text-3xl">🎴</span><span class="text-[10px] text-indigo-300 font-bold mt-2">DRAW</span>`;
    }

    const discardDrawnBtn = document.getElementById("discardDrawnBtn");
    if (isMyTurn && gameState.turnPhase === 'AWAIT_DECISION' && gameState.drawnCard && gameState.drawnCard.source === 'deck') {
        discardDrawnBtn.classList.remove("hidden");
    } else {
        discardDrawnBtn.classList.add("hidden");
    }

    const dutchBtn = document.getElementById("callDutchBtn");
    dutchBtn.disabled = !(isMyTurn && gameState.turnPhase === 'AWAIT_DRAW' && !gameState.dutchCalledBy);

    // Snap highlight: show which cards are snappable
    const topCard = gameState.discard?.[gameState.discard.length - 1];
    const canSnap = topCard && gameState.status === 'PLAYING' && !gameState.pendingGive;

    if (gameState.pendingGive && gameState.pendingGive.fromPid === localPlayerId) {
        setInstruction(`Snap! Now pick one of YOUR cards to give to ${gameState.players[gameState.pendingGive.toPid]?.name || 'them'}.`);
    } else if (peeksRemaining > 0) {
        setInstruction(`Quick — peek at ${peeksRemaining} of your own card${peeksRemaining > 1 ? 's' : ''} to memorise them before play starts.`);
    } else if (isMyTurn && gameState.turnPhase === 'AWAIT_DRAW') {
        setInstruction("Your turn: draw from the deck, take the top discard, or call Dutch!");
    } else if (isMyTurn && gameState.turnPhase === 'AWAIT_DECISION') {
        setInstruction(gameState.drawnCard.source === 'deck'
            ? "Swap it into your hand by clicking a card, or discard it to use its power."
            : "Click one of your cards to swap it with the card you picked up.");
    } else if (isMyTurn && gameState.turnPhase === 'AWAIT_ABILITY') {
        setInstruction(abilityInstructionText());
    } else {
        setInstruction(canSnap ? "You can SNAP any card — yours or anyone else's — if it matches the discard pile!" : "Watch the board...");
    }

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
    if (a.type === '78') return "7/8 power: click one of YOUR cards to peek at it.";
    if (a.type === '910') return "9/10 power: click an OPPONENT'S card to peek at it.";
    if (a.type === 'jq') return a.step === 1 ? "J/Q power: click one of YOUR cards to swap (blind)." : "Now click an OPPONENT'S card to complete the swap.";
    if (a.type === 'k') return a.step === 1 ? "Black King: click one of YOUR cards to peek at it." : "Now click an OPPONENT'S card — then decide if you want to swap.";
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
    root.className = isHero
        ? "bg-slate-950 p-6 rounded-2xl border-2 border-amber-500/50 space-y-4 shadow-xl w-full"
        : "bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3";

    const isPendingGiveFrom = gameState.pendingGive?.fromPid === localPlayerId;
    const isPendingGiveTo = gameState.pendingGive?.toPid === pid;

    root.innerHTML = `
        <div class="flex justify-between items-center">
            <h3 class="font-bold text-white flex items-center gap-2 flex-wrap">
                <span>${player.name}</span>
                ${isHero ? '<span class="text-xs font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">You</span>' : ''}
                ${gameState.dutchCalledBy === pid ? '<span class="text-xs font-bold uppercase tracking-widest bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded animate-pulse">Called Dutch!</span>' : ''}
                ${isPendingGiveTo ? '<span class="text-xs font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">Receiving card...</span>' : ''}
            </h3>
            <span class="text-xs font-mono text-slate-400">Score: ${player.totalScore || 0}</span>
        </div>
        <div class="card-grid max-w-[200px] mx-auto">
            ${player.cards.map((card, idx) => {
                const seen = isRevealed(pid, idx);
                // Snap highlight: a card glows if canSnap AND it matches the top of discard
                // But only if we're not in the middle of something that blocks snapping
                const isMyTurn = activePid() === localPlayerId;
                const midAction = isMyTurn && (gameState.turnPhase === 'AWAIT_ABILITY');
                const snapEligible = canSnap && !midAction && !isPendingGiveFrom && topCard && card.name === topCard.name;

                if (seen) {
                    return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card w-20 h-28 bg-slate-900 border-2 ${snapEligible ? 'border-emerald-400 shadow-emerald-400/30 shadow-lg' : 'border-amber-400'} rounded-xl flex flex-col items-center justify-center cursor-pointer select-none shadow transition hover:scale-105 active:scale-95">
                        <span class="text-2xl ${seen.color}">${seen.suit}</span>
                        <span class="text-sm font-black text-white">${seen.name}</span>
                        ${snapEligible ? '<span class="text-[8px] text-emerald-400 font-black uppercase tracking-widest mt-1">SNAP!</span>' : ''}
                    </div>`;
                }
                return `<div data-pid="${pid}" data-cidx="${idx}" class="game-card w-20 h-28 bg-gradient-to-br from-slate-800 to-slate-900 border ${snapEligible ? 'border-emerald-400/60 shadow-emerald-400/20 shadow-lg animate-pulse' : 'border-slate-700 hover:border-amber-400'} rounded-xl flex flex-col items-center justify-center cursor-pointer select-none relative shadow transition hover:scale-105 active:scale-95 overflow-hidden">
                    <span class="text-xs text-slate-500 font-bold">#${idx + 1}</span>
                    ${snapEligible ? '<span class="text-[8px] text-emerald-400 font-black uppercase tracking-widest mt-1">SNAP?</span>' : ''}
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
    if (peeksRemaining > 0) { showToast("Finish peeking at your cards first!", 'warning'); return; }
    if (!gameState.deck || gameState.deck.length === 0) { showToast("The deck is empty!", 'warning'); return; }

    const freshDeck = [...gameState.deck];
    const card = freshDeck.pop();
    await pushState({
        deck: freshDeck,
        drawnCard: { card, source: 'deck' },
        turnPhase: 'AWAIT_DECISION'
    });
});

document.getElementById("discardPile").addEventListener("click", async () => {
    if (gameState.status !== 'PLAYING') return;
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DRAW') return;
    if (peeksRemaining > 0) { showToast("Finish peeking at your cards first!", 'warning'); return; }
    if (!gameState.discard || gameState.discard.length === 0) { showToast("The discard pile is empty!", 'warning'); return; }

    const freshDiscard = [...gameState.discard];
    const card = freshDiscard.pop();
    await pushState({
        discard: freshDiscard,
        drawnCard: { card, source: 'discard' },
        turnPhase: 'AWAIT_DECISION'
    });
});

document.getElementById("discardDrawnBtn").addEventListener("click", async () => {
    if (activePid() !== localPlayerId) return;
    if (gameState.turnPhase !== 'AWAIT_DECISION' || !gameState.drawnCard || gameState.drawnCard.source !== 'deck') return;

    const card = gameState.drawnCard.card;
    const newDiscard = [...gameState.discard, card];
    const abilityType = isSpecial(card);

    if (abilityType) {
        await pushState({
            discard: newDiscard,
            drawnCard: null,
            turnPhase: 'AWAIT_ABILITY',
            ability: { type: abilityType, step: 1, ownIdx: null, oppPid: null, oppIdx: null }
        });
    } else {
        await advanceTurn({ discard: newDiscard, drawnCard: null });
    }
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

    await advanceTurn({
        dutchCalledBy: localPlayerId,
        finalTurnsLeft: Object.keys(gameState.players).length - 1
    });
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
        ...extraFields,
        currentTurnIdx: nextIdx,
        turnPhase: 'AWAIT_DRAW',
        ability: null,
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
        <div class="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl p-3">
            <span class="font-semibold text-white">${i === 0 ? '🏆 ' : ''}${p.name}</span>
            <span class="text-sm text-slate-400">This round: <span class="text-white font-mono">${p.lastHandScore ?? 0}</span> &nbsp;|&nbsp; Total: <span class="text-amber-400 font-mono font-bold">${p.totalScore || 0}</span></span>
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
        if (pid !== localPlayerId) return; // must pick from your own hand
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

        await advanceTurn({
            [`players.${localPlayerId}.cards`]: myCards,
            discard: newDiscard,
            drawnCard: null
        });
        return;
    }

    // 4. Initial peek phase
    if (peeksRemaining > 0 && pid === localPlayerId) {
        const card = gameState.players[localPlayerId].cards[idx];
        peeksRemaining -= 1;
        reveal(pid, idx, card, 4000);
        return;
    }

    // 5. Snap attempt - can snap ANY card (yours or opponent's) if it matches discard
    if (isMyTurn && (gameState.turnPhase === 'AWAIT_DECISION' || gameState.turnPhase === 'AWAIT_ABILITY')) {
        return; // mid-action, ignore
    }
    await attemptSnap(pid, idx);
}

async function resolveAbilityClick(pid, idx) {
    const a = gameState.ability;

    if (a.type === '78') {
        if (pid !== localPlayerId) return;
        const card = gameState.players[pid].cards[idx];
        reveal(pid, idx, card, 3500);
        await advanceTurn({ ability: null });
        return;
    }

    if (a.type === '910') {
        if (pid === localPlayerId) return;
        const card = gameState.players[pid].cards[idx];
        reveal(pid, idx, card, 3500);
        await advanceTurn({ ability: null });
        return;
    }

    if (a.type === 'jq') {
        if (a.step === 1) {
            if (pid !== localPlayerId) return;
            await pushState({ ability: { ...a, step: 2, ownIdx: idx } });
        } else {
            if (pid === localPlayerId) return;
            const myCards = [...gameState.players[localPlayerId].cards];
            const oppCards = [...gameState.players[pid].cards];
            const tmp = myCards[a.ownIdx];
            myCards[a.ownIdx] = oppCards[idx];
            oppCards[idx] = tmp;
            await advanceTurn({
                [`players.${localPlayerId}.cards`]: myCards,
                [`players.${pid}.cards`]: oppCards,
                ability: null
            });
        }
        return;
    }

    if (a.type === 'k') {
        if (a.step === 1) {
            if (pid !== localPlayerId) return;
            const card = gameState.players[pid].cards[idx];
            reveal(pid, idx, card, 8000);
            await pushState({ ability: { ...a, step: 2, ownIdx: idx } });
        } else {
            if (pid === localPlayerId) return;
            const card = gameState.players[pid].cards[idx];
            reveal(pid, idx, card, 8000);
            const oppName = gameState.players[pid]?.name || 'opponent';
            setTimeout(async () => {
                const doSwap = await showChoiceModal(
                    `Swap with ${oppName}'s card?`,
                    "You've peeked at both. Do you want to swap your card with theirs?",
                    '🔄 Swap!',
                    'bg-indigo-600 hover:bg-indigo-500'
                );
                const myCards = [...gameState.players[localPlayerId].cards];
                const oppCards = [...gameState.players[pid].cards];
                if (doSwap) {
                    const tmp = myCards[a.ownIdx];
                    myCards[a.ownIdx] = oppCards[idx];
                    oppCards[idx] = tmp;
                    await advanceTurn({
                        [`players.${localPlayerId}.cards`]: myCards,
                        [`players.${pid}.cards`]: oppCards,
                        ability: null
                    });
                } else {
                    await advanceTurn({ ability: null });
                }
            }, 150);
        }
        return;
    }
}

// ==========================================
// Snap — can snap any card (own OR opponent) if it matches discard
// ==========================================
async function attemptSnap(pid, idx) {
    if (!gameState.discard || gameState.discard.length === 0) return;
    const topCard = gameState.discard[gameState.discard.length - 1];
    const targetCard = gameState.players[pid]?.cards?.[idx];
    if (!targetCard) return;

    if (targetCard.name === topCard.name) {
        // Successful snap
        const targetCards = [...gameState.players[pid].cards];
        targetCards.splice(idx, 1);
        const newDiscard = [...gameState.discard, targetCard];

        if (pid === localPlayerId) {
            // Snapped own card — just remove it
            showToast("Snap! Nice one 🎉", 'success', 2000);
            await pushState({
                [`players.${pid}.cards`]: targetCards,
                discard: newDiscard
            });
        } else {
            // Snapped opponent's card — they get the slot back, you must give a card
            showToast(`Snap on ${gameState.players[pid]?.name || 'them'}! Now give them one of your cards.`, 'success', 3500);
            await pushState({
                [`players.${pid}.cards`]: targetCards,
                discard: newDiscard,
                pendingGive: { fromPid: localPlayerId, toPid: pid, toIdx: idx }
            });
        }
    } else {
        // Failed snap penalty
        if (!gameState.deck || gameState.deck.length === 0) return;
        const freshDeck = [...gameState.deck];
        const penaltyCard = freshDeck.pop();
        const myCards = [...gameState.players[localPlayerId].cards, penaltyCard];
        await pushState({
            deck: freshDeck,
            [`players.${localPlayerId}.cards`]: myCards
        });
        showToast("Wrong snap! You draw a penalty card. 😬", 'error', 3000);
    }
}

// ==========================================
// Rules Modal
// ==========================================
const rulesModal = document.getElementById("rulesModal");
document.getElementById("rulesBtn").addEventListener("click", () => rulesModal.classList.remove("hidden"));
document.getElementById("closeRulesBtn").addEventListener("click", () => rulesModal.classList.add("hidden"));