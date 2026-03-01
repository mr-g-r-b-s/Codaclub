const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

const rooms = {};

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('create-room', ({ roomCode, playerName, challengeId }) => {
    if (rooms[roomCode]) { socket.emit('room-error', { message: 'Room already exists.' }); return; }
    rooms[roomCode] = {
      players: [socket.id],
      playerNames: [playerName],
      spectators: [],
      challengeId,
      gameState: null // live snapshot for spectators
    };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isSpectator = false;
    console.log(`Room created: ${roomCode} by ${playerName}`);
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room) { socket.emit('room-error', { message: `Room "${roomCode}" not found.` }); return; }
    if (room.players.length >= 2) { socket.emit('room-error', { message: 'Room is full!' }); return; }
    room.players.push(socket.id);
    room.playerNames.push(playerName);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isSpectator = false;
    console.log(`${playerName} joined room: ${roomCode}`);
    io.to(roomCode).emit('room-joined', { roomCode, challengeId: room.challengeId });
  });

  // ← NEW: spectator join
  socket.on('spectate-room', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) { socket.emit('room-error', { message: `Room "${roomCode}" not found.` }); return; }
    if (room.players.length < 2) { socket.emit('room-error', { message: 'Battle hasn\'t started yet!' }); return; }
    room.spectators.push(socket.id);
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isSpectator = true;
    console.log(`Spectator joined room: ${roomCode}`);
    // send current game snapshot immediately
    socket.emit('spectate-started', {
      playerNames: room.playerNames,
      gameState: room.gameState
    });
  });

  socket.on('send-attack', ({ type, roomCode }) => {
    socket.to(roomCode).emit('receive-attack', { type });
  });

  socket.on('round-won', ({ roomCode, points, nextChallengeId, challengeTitle }) => {
    socket.to(roomCode).emit('opponent-round-won', { opponentPoints: points, nextChallengeId });
    // ← NEW: time penalty — tell opponent to lose 10s
    socket.to(roomCode).emit('time-penalty', { seconds: 10 });
    // update spectator state
    if (rooms[roomCode]) {
      rooms[roomCode].gameState = { ...(rooms[roomCode].gameState || {}), lastEvent: 'round-won', challengeTitle };
      io.to(roomCode).emit('spectate-state-update', { gameState: rooms[roomCode].gameState });
    }
    console.log(`Round won in ${roomCode} — pts: ${points}`);
  });

  socket.on('my-points-update', ({ roomCode, points, playerName, challenge, timeLeft }) => {
    socket.to(roomCode).emit('opponent-points-update', { points });
    // update spectator live state
    if (rooms[roomCode]) {
      const idx = rooms[roomCode].players.indexOf(socket.id);
      if (!rooms[roomCode].gameState) rooms[roomCode].gameState = { players: [{}, {}] };
      if (!rooms[roomCode].gameState.players) rooms[roomCode].gameState.players = [{}, {}];
      if (idx !== -1) {
        rooms[roomCode].gameState.players[idx] = { points, playerName, challenge, timeLeft };
      }
      io.to(roomCode).emit('spectate-state-update', { gameState: rooms[roomCode].gameState });
    }
  });

  socket.on('match-won', ({ roomCode, winnerPoints }) => {
    socket.to(roomCode).emit('match-over', { winnerPoints });
    if (rooms[roomCode]) delete rooms[roomCode];
    console.log(`Match over in room ${roomCode} — winner: ${winnerPoints}pts`);
  });

  socket.on('time-up', ({ roomCode }) => {
    socket.to(roomCode).emit('opponent-time-up');
    if (rooms[roomCode]) delete rooms[roomCode];
    console.log(`Time up in room ${roomCode}`);
  });

  socket.on('disconnect', () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && !socket.isSpectator) {
      socket.to(roomCode).emit('opponent-disconnected');
      delete rooms[roomCode];
      console.log(`Room ${roomCode} closed — player disconnected`);
    }
    console.log('Player disconnected:', socket.id);
  });
});

http.listen(4000, () => console.log('🚀 CodaClub Battle Server on http://localhost:4000'));