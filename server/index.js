require('dotenv').config();
const express = require('express');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http, { cors: { origin: "*" } });

// ── Supabase ─────────────────────────────────────────────────
// npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL      = process.env.SUPABASE_URL      || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SERVICE_ROLE_KEY'; // use service role key for writes
const supabase          = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Room store ───────────────────────────────────────────────
const rooms = {};

const ALL_CHALLENGE_IDS = [1,2,3,4,5,6,7,8,9,10,11,12];
const ALL_LANGUAGES     = ['javascript','python','java','cpp','sql'];
const SEQUENCE_LENGTH   = 12;

function buildRoundSequence() {
  const shuffled = [...ALL_CHALLENGE_IDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SEQUENCE_LENGTH).map(challengeId => ({
    challengeId,
    language: ALL_LANGUAGES[Math.floor(Math.random() * ALL_LANGUAGES.length)],
  }));
}

// ── Supabase helpers ─────────────────────────────────────────

// Save match result for one player via the upsert function
async function savePlayerResult({ name, won, points, rounds, bestMs }) {
  try {
    const { error } = await supabase.rpc('upsert_match_result', {
      p_name:    name.toLowerCase(),
      p_won:     won,
      p_points:  points,
      p_rounds:  rounds,
      p_best_ms: bestMs ?? null,
    });
    if (error) console.error('Supabase save error:', error.message);
    else console.log(`Saved stats for ${name}: won=${won}, pts=${points}, rounds=${rounds}`);
  } catch (err) {
    console.error('Supabase exception:', err.message);
  }
}

// Save both players' results after a match concludes
async function saveMatchResults(room, winnerSocketId, winnerPoints) {
  if (!room || room.players.length < 2) return;

  for (let i = 0; i < room.players.length; i++) {
    const socketId = room.players[i];
    const name     = room.playerNames[i] || `Player${i + 1}`;
    const won      = socketId === winnerSocketId;
    const stats    = room.playerStats?.[socketId] || {};

    await savePlayerResult({
      name,
      won,
      points:  won ? winnerPoints : (stats.points || 0),
      rounds:  stats.roundsSolved || 0,
      bestMs:  stats.bestRoundMs  || null,
    });
  }
}

// ── Leaderboard fetch (called by client via socket) ───────────
async function fetchLeaderboard(sortBy = 'wins') {
  const validSorts = {
    wins:         'wins',
    total_points: 'total_points',
    max_streak:   'max_streak',
    rounds:       'rounds_solved',
  };
  const col = validSorts[sortBy] || 'wins';

  const { data, error } = await supabase
    .from('players')
    .select('name, wins, losses, total_points, rounds_solved, best_round_ms, current_streak, max_streak, last_played')
    .order(col, { ascending: false })
    .limit(10);

  if (error) { console.error('Leaderboard fetch error:', error.message); return []; }
  return data || [];
}

// ── Socket.io ─────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  // ── CREATE ROOM ────────────────────────────────────────────
  socket.on('create-room', ({ roomCode, playerName }) => {
    if (rooms[roomCode]) { socket.emit('room-error', { message: 'Room already exists.' }); return; }
    rooms[roomCode] = {
      players:      [socket.id],
      playerNames:  [playerName],
      spectators:   [],
      roundSequence: buildRoundSequence(),
      playerStats:  { [socket.id]: { points: 0, roundsSolved: 0, bestRoundMs: null } },
      gameState:    null,
    };
    socket.join(roomCode);
    socket.roomCode    = roomCode;
    socket.isSpectator = false;
    console.log(`Room created: ${roomCode} by ${playerName}`);
  });

  // ── JOIN ROOM ──────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, playerName }) => {
    const room = rooms[roomCode];
    if (!room)                  { socket.emit('room-error', { message: `Room "${roomCode}" not found.` }); return; }
    if (room.players.length>=2) { socket.emit('room-error', { message: 'Room is full!' }); return; }

    room.players.push(socket.id);
    room.playerNames.push(playerName);
    room.playerStats[socket.id] = { points: 0, roundsSolved: 0, bestRoundMs: null };
    socket.join(roomCode);
    socket.roomCode    = roomCode;
    socket.isSpectator = false;
    console.log(`${playerName} joined ${roomCode}`);

    io.to(roomCode).emit('match-ready', {
      roundSequence: room.roundSequence,
      playerNames:   room.playerNames,
    });
  });

  // ── SPECTATE ───────────────────────────────────────────────
  socket.on('spectate-room', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room)                   { socket.emit('room-error', { message: `Room "${roomCode}" not found.` }); return; }
    if (room.players.length < 2) { socket.emit('room-error', { message: "Battle hasn't started yet!" }); return; }
    room.spectators.push(socket.id);
    socket.join(roomCode);
    socket.roomCode    = roomCode;
    socket.isSpectator = true;
    socket.emit('spectate-started', { playerNames: room.playerNames, gameState: room.gameState });
  });

  // ── LEADERBOARD REQUEST ────────────────────────────────────
  socket.on('get-leaderboard', async ({ sortBy }) => {
    const rows = await fetchLeaderboard(sortBy);
    socket.emit('leaderboard-data', { rows });
  });

  // ── ATTACK RELAY ───────────────────────────────────────────
  socket.on('send-attack', ({ type, roomCode }) => {
    socket.to(roomCode).emit('receive-attack', { type });
  });

  // ── ROUND SOLVED ───────────────────────────────────────────
  // Client sends roundsSolved count and optional bestRoundMs for this round
  socket.on('round-solved', ({ roomCode, points, newRoundIndex, roundMs }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Update server-side stats for this player
    if (room.playerStats[socket.id]) {
      const ps = room.playerStats[socket.id];
      ps.points       = points;
      ps.roundsSolved = newRoundIndex; // newRoundIndex = number of rounds solved so far
      if (roundMs) {
        ps.bestRoundMs = ps.bestRoundMs === null ? roundMs : Math.min(ps.bestRoundMs, roundMs);
      }
    }

    socket.to(roomCode).emit('opponent-advanced', {
      opponentPoints:     points,
      opponentRoundIndex: newRoundIndex,
    });

    if (!room.gameState) room.gameState = { players: [{},{}] };
    const idx = room.players.indexOf(socket.id);
    if (idx !== -1) {
      room.gameState.players[idx] = { points, roundIndex: newRoundIndex };
      io.to(roomCode).emit('spectate-state-update', { gameState: room.gameState });
    }
  });

  // ── LIVE POINTS SYNC ───────────────────────────────────────
  socket.on('my-points-update', ({ roomCode, points, playerName, challenge, timeLeft }) => {
    const room = rooms[roomCode];
    if (room?.playerStats?.[socket.id]) room.playerStats[socket.id].points = points;
    socket.to(roomCode).emit('opponent-points-update', { points });
    if (room) {
      if (!room.gameState) room.gameState = { players: [{},{}] };
      const idx = room.players.indexOf(socket.id);
      if (idx !== -1) {
        room.gameState.players[idx] = { points, playerName, challenge, timeLeft };
        io.to(roomCode).emit('spectate-state-update', { gameState: room.gameState });
      }
    }
  });

  // ── MATCH WON (500 pts) ────────────────────────────────────
  socket.on('match-won', async ({ roomCode, winnerPoints }) => {
    const room = rooms[roomCode];
    socket.to(roomCode).emit('match-over', { winnerPoints });
    if (room) {
      await saveMatchResults(room, socket.id, winnerPoints);
      delete rooms[roomCode];
    }
    console.log(`Match over in ${roomCode} — winner: ${winnerPoints}pts`);
  });

  // ── TIMER EXPIRED ──────────────────────────────────────────
  socket.on('time-up', async ({ roomCode, myPoints, opponentPoints: oppPts }) => {
    const room = rooms[roomCode];
    socket.to(roomCode).emit('opponent-time-up');
    if (room) {
      // Determine winner by points
      const myIdx  = room.players.indexOf(socket.id);
      const oppIdx = myIdx === 0 ? 1 : 0;
      const myWon  = (myPoints || 0) > (oppPts || 0);
      // Save both
      const winnerId = myWon ? socket.id : room.players[oppIdx];
      const winPts   = myWon ? (myPoints || 0) : (oppPts || 0);
      await saveMatchResults(room, winnerId, winPts);
      delete rooms[roomCode];
    }
  });

  // ── DISCONNECT ─────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && !socket.isSpectator) {
      const room = rooms[roomCode];
      socket.to(roomCode).emit('opponent-disconnected');
      // Disconnecting player counts as a loss; opponent wins
      const oppSocketId = room.players.find(id => id !== socket.id);
      if (oppSocketId) {
        const oppStats = room.playerStats?.[oppSocketId] || {};
        await saveMatchResults(room, oppSocketId, oppStats.points || 0);
      }
      delete rooms[roomCode];
    }
    console.log('disconnected:', socket.id);
  });
});

http.listen(4000, () => console.log('🚀 CodaClub Battle Server on http://localhost:4000'));