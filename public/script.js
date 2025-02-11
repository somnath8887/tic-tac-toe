const socket = io();
let mode = "";
let currentPlayer = "X";
let gameBoard = ["","","","","","","","",""];
let gameActive = false;
let myTurn = false;
let offlinePlayers = { X: "", O: "" };
let onlineRoom = "";
let onlineSymbol = "";

/* Sound Elements */
const bgMusic = document.getElementById("bgMusic");
const clickSound = document.getElementById("clickSound");

/* Play click sound function */
function playClickSound() {
  clickSound.currentTime = 0;
  clickSound.play();
}

/* Theme Selector */
const themeSelect = document.getElementById("themeSelect");
function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.remove("dark");
  } else if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }
}
themeSelect.addEventListener("change", (e) => {
  applyTheme(e.target.value);
  playClickSound();
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (themeSelect.value === "system") {
    applyTheme("system");
  }
});
applyTheme(themeSelect.value);

/* Ping Display */
const pingDisplay = document.getElementById("pingDisplay");
setInterval(() => {
  const startTime = Date.now();
  socket.emit("pingCheck");
  socket.once("pongCheck", () => {
    let ping = Date.now() - startTime;
    pingDisplay.textContent = "Ping: " + ping + " ms";
  });
}, 5000);

/* Mode Selection */
document.getElementById("offlinePvPBtn").addEventListener("click", () => {
  playClickSound();
  mode = "offlinePvP";
  document.getElementById("mode-selection").style.display = "none";
  document.getElementById("offlinePvP-setup").style.display = "block";
});
document.getElementById("offlinePvAIBtn").addEventListener("click", () => {
  playClickSound();
  mode = "offlinePvAI";
  document.getElementById("mode-selection").style.display = "none";
  document.getElementById("offlinePvAI-setup").style.display = "block";
});
document.getElementById("onlineModeBtn").addEventListener("click", () => {
  playClickSound();
  mode = "online";
  document.getElementById("mode-selection").style.display = "none";
  document.getElementById("online-setup").style.display = "block";
});

/* Offline PvP */
document.getElementById("startPvPBtn").addEventListener("click", () => {
  playClickSound();
  offlinePlayers.X = document.getElementById("pvp-player1").value || "Player 1";
  offlinePlayers.O = document.getElementById("pvp-player2").value || "Player 2";
  document.getElementById("offlinePvP-setup").style.display = "none";
  startGame();
});
/* Offline PvAI */
document.getElementById("startPvAIBtn").addEventListener("click", () => {
  playClickSound();
  offlinePlayers.X = document.getElementById("pvai-player").value || "Player";
  offlinePlayers.O = "AI";
  document.getElementById("offlinePvAI-setup").style.display = "none";
  startGame();
});

/* Online Setup */
document.getElementById("createRoomBtn").addEventListener("click", () => {
  playClickSound();
  document.getElementById("online-options").style.display = "none";
  document.getElementById("online-create").style.display = "block";
});
document.getElementById("joinRoomBtn").addEventListener("click", () => {
  playClickSound();
  document.getElementById("online-options").style.display = "none";
  document.getElementById("online-join").style.display = "block";
});
document.getElementById("startOnlineCreateBtn").addEventListener("click", () => {
  playClickSound();
  onlineRoom = document.getElementById("online-roomName-create").value;
  let roomPass = document.getElementById("online-roomPass-create").value;
  offlinePlayers.X = document.getElementById("online-playerName-create").value || "Player X";
  onlineSymbol = "X";
  socket.emit("createRoomOnline", { roomName: onlineRoom, roomPass, playerName: offlinePlayers.X });
});
document.getElementById("startOnlineJoinBtn").addEventListener("click", () => {
  playClickSound();
  onlineRoom = document.getElementById("online-roomName-join").value;
  let roomPass = document.getElementById("online-roomPass-join").value;
  offlinePlayers.O = document.getElementById("online-playerName-join").value || "Player O";
  onlineSymbol = "O";
  socket.emit("joinRoomOnline", { roomName: onlineRoom, roomPass, playerName: offlinePlayers.O });
});
socket.on("roomCreatedOnline", (roomName) => {
  document.getElementById("online-create").style.display = "none";
  document.getElementById("online-waiting").style.display = "block";
  document.getElementById("online-loading").style.display = "block";
  console.log("Room created. Waiting for opponent...");
});
socket.on("onlineError", (msg) => {
  document.getElementById("online-error").style.display = "block";
  document.getElementById("online-error").textContent = msg;
});
socket.on("startOnlineGame", (data) => {
  offlinePlayers.X = data.players.X;
  offlinePlayers.O = data.players.O;
  document.getElementById("online-setup").style.display = "none";
  document.getElementById("online-waiting").style.display = "none";
  document.getElementById("online-loading").style.display = "none";
  console.log("Opponent joined. Starting game...");
  startGame();
});
socket.on("moveOnlineMade", (data) => {
  if(data.index === -1 && data.player === "restart") {
    resetGame();
    return;
  }
  if(gameBoard[data.index] === "") {
    gameBoard[data.index] = data.player;
    let cell = document.getElementById("cell-" + data.index);
    cell.textContent = data.player;
    cell.classList.add("taken");
    cell.classList.add(data.player === "X" ? "x-move" : "o-move");
    checkGameOver();
    if(gameActive) {
      switchTurn();
    }
  }
});
socket.on("restartGameOnline", (data) => {
  resetGame();
});
socket.on("gameOverOnline", (data) => {
  showWinModal(data.winner);
});
socket.on("chatMessage", (data) => {
  let msgDiv = document.createElement("div");
  msgDiv.textContent = data.sender + ": " + data.message;
  document.getElementById("chat-messages").appendChild(msgDiv);
  showProfileOverlay(data.sender, data.message);
});
socket.on("reaction", (data) => {
  let reactDiv = document.createElement("div");
  reactDiv.textContent = data.sender + " reacted: " + data.reaction;
  document.getElementById("chat-messages").appendChild(reactDiv);
  showProfileOverlay(data.sender, data.reaction);
});
socket.on("closeGameOnline", (data) => {
  if(data.message) {
    alert(data.message);
  }
  closeGame();
});
document.getElementById("chat-send").addEventListener("click", () => {
  playClickSound();
  let msg = document.getElementById("chat-input").value;
  if(msg) {
    socket.emit("chatMessage", { room: onlineRoom, sender: getMyName(), message: msg });
    document.getElementById("chat-input").value = "";
  }
});
document.querySelectorAll(".reaction-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    playClickSound();
    socket.emit("reaction", { room: onlineRoom, sender: getMyName(), reaction: btn.textContent });
  });
});
document.getElementById("restart-btn").addEventListener("click", () => {
  playClickSound();
  resetGame();
  if(mode === "online") {
    socket.emit("restartGameOnline", { room: onlineRoom });
  }
});
document.getElementById("closeGameBtn").addEventListener("click", () => {
  playClickSound();
  closeGame();
  if(mode === "online") {
    socket.emit("closeGameOnline", { room: onlineRoom });
  }
});
document.querySelectorAll(".cell").forEach((cell, index) => {
  cell.addEventListener("click", () => {
    if(!gameActive || !myTurn || gameBoard[index] !== "") return;
    playClickSound();
    if(mode === "online") {
      // Optimistic UI update
      gameBoard[index] = currentPlayer;
      cell.textContent = currentPlayer;
      cell.classList.add("taken");
      cell.classList.add(currentPlayer === "X" ? "x-move" : "o-move");
      checkGameOver();
      socket.emit("moveOnline", { room: onlineRoom, index, player: currentPlayer });
      if(gameActive) { switchTurn(); }
    } else {
      gameBoard[index] = currentPlayer;
      cell.textContent = currentPlayer;
      cell.classList.add("taken");
      cell.classList.add(currentPlayer === "X" ? "x-move" : "o-move");
      checkGameOver();
      if(gameActive) {
        if(mode === "offlinePvAI" && currentPlayer === "X") {
          switchTurn();
          setTimeout(aiMove, 500);
        } else {
          switchTurn();
        }
      }
    }
  });
});
document.getElementById("playAgainBtn").addEventListener("click", () => {
  playClickSound();
  resetGame();
  hideWinModal();
  if(mode === "online") {
    socket.emit("restartGameOnline", { room: onlineRoom });
  }
});
document.getElementById("exitBtn").addEventListener("click", () => {
  playClickSound();
  hideWinModal();
  closeGame();
});

function startGame() {
  gameBoard = ["","","","","","","","",""];
  currentPlayer = "X";
  gameActive = true;
  if(mode === "online") {
    myTurn = (currentPlayer === onlineSymbol);
  } else {
    myTurn = true;
  }
  document.getElementById("game-container").style.display = "block";
  if(mode === "online") {
    document.getElementById("chat-container").style.display = "block";
  }
  updatePlayerInfo();
  clearBoardUI();
  updateStatus();
}
function updatePlayerInfo() {
  document.getElementById("player1-name").textContent = offlinePlayers.X;
  document.getElementById("player2-name").textContent = offlinePlayers.O;
}
function clearBoardUI() {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.textContent = "";
    cell.classList.remove("taken", "x-move", "o-move");
  });
}
function switchTurn() {
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  if(mode === "online") {
    myTurn = ((currentPlayer === "X" && onlineSymbol === "X") || (currentPlayer === "O" && onlineSymbol === "O"));
  } else {
    myTurn = true;
  }
  updateStatus();
}
function updateStatus() {
  document.getElementById("status").textContent = "Turn: " + currentPlayer;
}
function resetGame() {
  gameBoard = ["","","","","","","","",""];
  gameActive = true;
  currentPlayer = "X";
  if(mode === "online") {
    myTurn = (currentPlayer === onlineSymbol);
  } else {
    myTurn = true;
  }
  clearBoardUI();
  updateStatus();
}
function closeGame() {
  gameActive = false;
  document.getElementById("game-container").style.display = "none";
  document.getElementById("chat-container").style.display = "none";
  document.getElementById("mode-selection").style.display = "block";
  document.getElementById("offlinePvP-setup").style.display = "none";
  document.getElementById("offlinePvAI-setup").style.display = "none";
  document.getElementById("online-setup").style.display = "none";
}
function getMyName() {
  if(mode === "online") {
    return onlineSymbol === "X" ? offlinePlayers.X : offlinePlayers.O;
  }
  return "";
}
function isTie() {
  return gameBoard.every(cell => cell !== "");
}
function checkWinner() {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for(let combo of wins) {
    if(gameBoard[combo[0]] && gameBoard[combo[0]] === gameBoard[combo[1]] && gameBoard[combo[0]] === gameBoard[combo[2]]) {
      return gameBoard[combo[0]];
    }
  }
  return null;
}
function checkGameOver() {
  let winner = checkWinner();
  if(winner) {
    gameActive = false;
    if(mode === "online") {
      socket.emit("gameOverOnline", { room: onlineRoom, winner });
    }
    showWinModal(winner);
  } else if(isTie()) {
    gameActive = false;
    showWinModal("Tie");
  }
}
function showWinModal(winner) {
  let winText = "";
  if(winner === "Tie") {
    winText = "It's a Tie!";
  } else if(winner === "X") {
    winText = offlinePlayers.X + " Wins!";
  } else if(winner === "O") {
    winText = offlinePlayers.O + " Wins!";
  }
  document.getElementById("winMessage").textContent = winText;
  document.getElementById("winModal").style.display = "flex";
}
function hideWinModal() {
  document.getElementById("winModal").style.display = "none";
}
function aiMove() {
  let bestMove = minimax(gameBoard, "O").index;
  if(bestMove === undefined) return;
  gameBoard[bestMove] = "O";
  let cell = document.getElementById("cell-" + bestMove);
  cell.textContent = "O";
  cell.classList.add("taken", "o-move");
  checkGameOver();
  if(gameActive) {
    switchTurn();
  }
}
function minimax(newBoard, player) {
  let availSpots = newBoard.map((e,i)=> e === "" ? i : null).filter(e=>e!==null);
  let winner = checkWinnerBoard(newBoard);
  if(winner==="X") return {score:-10};
  else if(winner==="O") return {score:10};
  else if(availSpots.length===0) return {score:0};
  let moves = [];
  for(let i=0; i<availSpots.length; i++){
    let move = {};
    move.index = availSpots[i];
    newBoard[availSpots[i]] = player;
    let result = minimax(newBoard, player==="O" ? "X" : "O");
    move.score = result.score;
    newBoard[availSpots[i]] = "";
    moves.push(move);
  }
  let bestMove;
  if(player==="O") {
    let bestScore = -10000;
    for(let i=0; i<moves.length; i++){
      if(moves[i].score > bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  } else {
    let bestScore = 10000;
    for(let i=0; i<moves.length; i++){
      if(moves[i].score < bestScore) {
        bestScore = moves[i].score;
        bestMove = i;
      }
    }
  }
  return moves[bestMove];
}
function checkWinnerBoard(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for(let combo of wins) {
    if(board[combo[0]] && board[combo[0]] === board[combo[1]] && board[combo[0]] === board[combo[2]]) {
      return board[combo[0]];
    }
  }
  return null;
}
function showProfileOverlay(sender, text) {
  let overlay;
  if(sender === offlinePlayers.X) {
    overlay = document.getElementById("player1-reaction");
  } else if(sender === offlinePlayers.O) {
    overlay = document.getElementById("player2-reaction");
  }
  if(overlay) {
    overlay.textContent = text;
    overlay.style.display = "block";
    overlay.style.opacity = 1;
    setTimeout(() => {
      overlay.style.transition = "opacity 1s";
      overlay.style.opacity = 0;
      setTimeout(() => {
        overlay.style.display = "none";
        overlay.style.transition = "";
      }, 1000);
    }, 5000);
  }
}
