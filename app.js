import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// REPLACE WITH YOUR FIREBASE CONFIGURATION
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

// State Engine Variables
let localPlayerId = Math.random().toString(36).substring(2, 9);
let roomCode = "";
let gameState = {};
let hasPeekedInitial = false;

// Card Deck Generation
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
            if (val.n === 'K' && (suit === '♥' || suit === '♦')) actualValue = -2; // Red King Rule
            deck.push({ id: Math.random().toString(36).substring(2,7), suit, name: val.n, score: actualValue, color: (suit==='♥'||suit==='♦')?'text-rose-500':'text-slate-200' });
        });
    });
    deck.push({ id: Math.random().toString(36).substring(2,7), suit: '🃏', name: 'Joker', score: 0, color: 'text-amber-400' });
    deck.push({ id: Math.random().toString(36).substring(2,7), suit: '🃏', name: 'Joker', score: 0, color: 'text-amber-400' });
    return deck.sort(() => Math.random() - 0.5);
};

// DOM Routing Elements
const landingScreen = document.getElementById("screen-landing");
const lobbyScreen = document.getElementById("screen-lobby");
const gameScreen = document.getElementById("screen-game");

// Actions Setup
document.getElementById("createRoomBtn").addEventListener("click", async () => {
    const name = document.getElementById("usernameInput").value.trim() || "Player";
    roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    gameState = {
        code: roomCode,
        status: "LOBBY",
        hostId: localPlayerId,
        turnOrder: [localPlayerId],
        currentTurnIdx: 0,
        players: {
            [localPlayerId]: { name, ready: false, cards: [], totalScore: 0 }
        },
        deck: createDeck(),
        discard: [],
        dutchCalledBy: null
    };

    await setDoc(doc(db, "rooms", roomCode), gameState);
    setupRoomSubscription(roomCode);
});

document.getElementById("joinRoomBtn").addEventListener("click", async () => {
    const name = document.getElementById("usernameInput").value.trim() || "Player";
    const enteredCode = document.getElementById("roomCodeInput").value.trim().toUpperCase();
    if (!enteredCode) return alert("Enter valid party code.");

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

// Global UI Rendering Router State Machine
function renderState() {
    if (gameState.status === "LOBBY") {
        landingScreen.classList.add("hidden");
        lobbyScreen.classList.remove("hidden");
        gameScreen.classList.add("hidden");
        
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

        if (gameState.hostId === localPlayerId) {
            const startBtn = document.getElementById("startMatchBtn");
            startBtn.classList.remove("hidden");
            const allReady = Object.values(gameState.players).every(p => p.ready);
            startBtn.disabled = !allReady;
        }
    } else if (gameState.status === "PLAYING") {
        landingScreen.classList.add("hidden");
        lobbyScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");
        renderGameBoard();
    }
}

// Ready Button Action toggle
document.getElementById("readyBtn").addEventListener("click", async () => {
    const isReady = gameState.players[localPlayerId].ready;
    await updateDoc(doc(db, "rooms", roomCode), {
        [`players.${localPlayerId}.ready`]: !isReady
    });
});

// Start Match Engine Deals hands
document.getElementById("startMatchBtn").addEventListener("click", async () => {
    let freshDeck = [...gameState.deck];
    let updatedPlayers = { ...gameState.players };

    Object.keys(updatedPlayers).forEach(pid => {
        updatedPlayers[pid].cards = [freshDeck.pop(), freshDeck.pop(), freshDeck.pop(), freshDeck.pop()];
    });

    const initialDiscard = freshDeck.pop();

    await updateDoc(doc(db, "rooms", roomCode), {
        status: "PLAYING",
        deck: freshDeck,
        discard: [initialDiscard],
        players: updatedPlayers
    });
});

// Render Playing Game Board Area Grid positions
function renderGameBoard() {
    const activeTurnPlayerId = gameState.turnOrder[gameState.currentTurnIdx];
    const turnBanner = document.getElementById("gameTurnBanner");
    
    if (activeTurnPlayerId === localPlayerId) {
        turnBanner.innerText = "⭐ YOUR TURN ⭐";
        turnBanner.className = "bg-amber-500 text-slate-950 p-3 rounded-xl font-black text-center text-lg shadow-lg shadow-amber-500/20";
    } else {
        const opposingName = gameState.players[activeTurnPlayerId]?.name || "Opponent";
        turnBanner.innerText = `Waiting for ${opposingName}...`;
        turnBanner.className = "bg-slate-800 text-slate-400 p-3 rounded-xl font-bold text-center text-sm";
    }

    // Top Discard Card Stack Frame rendering
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

    // Render Enemies Array view
    const oppsContainer = document.getElementById("opponentsContainer");
    oppsContainer.innerHTML = "";
    
    // Render Self Container Screen Block Context
    const heroContainer = document.getElementById("heroContainer");
    heroContainer.innerHTML = "";

    Object.keys(gameState.players).forEach(pid => {
        const playerObj = gameState.players[pid];
        if (pid === localPlayerId) {
            heroContainer.appendChild(createPlayerBoardElement(playerObj, pid, true));
        } else {
            oppsContainer.appendChild(createPlayerBoardElement(playerObj, pid, false));
        }
    });
}

function createPlayerBoardElement(player, pid, isHero) {
    const root = document.createElement("div");
    root.className = isHero ? "bg-slate-950 p-6 rounded-2xl border-2 border-amber-500/50 space-y-4 shadow-xl w-full" : "bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3";
    
    root.innerHTML = `
        <div class="flex justify-between items-center">
            <h3 class="font-bold text-white flex items-center gap-2">
                <span>${player.name}</span> ${isHero ? '<span class="text-xs font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">You</span>' : ''}
            </h3>
            <span class="text-xs font-mono text-slate-400">Score: ${player.totalScore || 0}</span>
        </div>
        <div class="card-grid max-w-[200px] mx-auto">
            ${player.cards.map((card, idx) => `
                <div data-pid="${pid}" data-cidx="${idx}" class="game-card w-20 h-28 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-amber-400 rounded-xl flex flex-col items-center justify-center cursor-pointer select-none relative shadow transition shadow-black/50 overflow-hidden">
                    <span class="text-xs text-slate-500 font-bold">#${idx+1}</span>
                </div>
            `).join('')}
        </div>
    `;

    // Hook card action listeners for playing interactions
    root.querySelectorAll('.game-card').forEach(el => {
        el.addEventListener('click', () => handleCardInteraction(el.dataset.pid, parseInt(el.dataset.cidx)));
    });

    return root;
}

// Card Game Action Event Logic Matrix
function handleCardInteraction(targetPlayerId, cardIdx) {
    const activeTurnPlayerId = gameState.turnOrder[gameState.currentTurnIdx];
    
    // Initial peek game start logic state check helper
    if (!hasPeekedInitial && targetPlayerId === localPlayerId) {
        const cardObj = gameState.players[localPlayerId].cards[cardIdx];
        alert(`Your card #${cardIdx + 1} value is: [ ${cardObj.name} of ${cardObj.suit} ]`);
        return;
    }

    if (activeTurnPlayerId !== localPlayerId) {
        alert("Wait until it is your turn to swap or pull actions!");
        return;
    }
    
    // Default dynamic replacement action execution fallback wrapper
    alert(`Swapping discard top card index action with selected target index #${cardIdx + 1}.`);
}

// Rules Helper Interactivity Modal trigger actions
const rulesModal = document.getElementById("rulesModal");
document.getElementById("rulesBtn").addEventListener("click", () => rulesModal.classList.remove("hidden"));
document.getElementById("closeRulesBtn").addEventListener("click", () => rulesModal.classList.add("hidden"));