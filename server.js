const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let rooms = {};

io.on('connection', (socket) => {
  console.log("New connection:", socket.id);

  // For ping check
  socket.on("pingCheck", () => {
    socket.emit("pongCheck");
  });

  socket.on('createRoomOnline', (data) => {
    const { roomName, roomPass, playerName } = data;
    if (!rooms[roomName]) {
      rooms[roomName] = { 
        password: roomPass, 
        players: { X: { id: socket.id, name: playerName }, O: null } 
      };
      socket.join(roomName);
      console.log("Room created:", roomName, "by", playerName);
      socket.emit('roomCreatedOnline', roomName);
    } else {
      socket.emit('onlineError', 'Room already exists.');
    }
  });

  socket.on('joinRoomOnline', (data) => {
    const { roomName, roomPass, playerName } = data;
    if (rooms[roomName] && !rooms[roomName].players.O) {
      if (rooms[roomName].password === roomPass) {
        rooms[roomName].players.O = { id: socket.id, name: playerName };
        socket.join(roomName);
        console.log("Player joined room:", roomName, "as", playerName);
        io.in(roomName).emit('startOnlineGame', { 
          roomName, 
          players: { X: rooms[roomName].players.X.name, O: playerName } 
        });
      } else {
        socket.emit('onlineError', 'Incorrect room password.');
      }
    } else {
      socket.emit('onlineError', 'Room does not exist or is full.');
    }
  });

  socket.on('moveOnline', (data) => {
    io.in(data.room).emit('moveOnlineMade', data);
  });

  socket.on('gameOverOnline', (data) => {
    io.in(data.room).emit('gameOverOnline', data);
  });
  
  socket.on('restartGameOnline', (data) => {
    io.in(data.room).emit('restartGameOnline', data);
  });

  socket.on('chatMessage', (data) => {
    io.in(data.room).emit('chatMessage', data);
  });

  socket.on('reaction', (data) => {
    io.in(data.room).emit('reaction', data);
  });

  socket.on('closeGameOnline', (data) => {
    io.in(data.room).emit('closeGameOnline', data);
  });

  socket.on('disconnect', () => {
    console.log("Disconnected:", socket.id);
    for (let roomName in rooms) {
      let room = rooms[roomName];
      if (room.players.X && room.players.X.id === socket.id) {
        console.log("Room creator disconnected from room:", roomName);
        io.in(roomName).emit('closeGameOnline', { message: 'Room creator disconnected' });
        delete rooms[roomName];
      } else if (room.players.O && room.players.O.id === socket.id) {
        console.log("Player O disconnected from room:", roomName);
        io.in(roomName).emit('closeGameOnline', { message: 'Opponent disconnected' });
        room.players.O = null;
      }
    }
  });
});

http.listen(PORT, () => { 
  console.log("Server running on port", PORT); 
});
