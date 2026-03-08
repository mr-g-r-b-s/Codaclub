require('dotenv').config();
const express = require('express');
const app     = express();
const http    = require('http').createServer(app);
const io      = require('socket.io')(http, { cors: { origin: "*" } });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL     || 'https://YOUR_PROJECT.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'YOUR_SERVICE_ROLE_KEY'
);

const rooms = {};

const ALL_CHALLENGE_IDS = [1,2,3,4,5,6,7,8,9,10,11,12];
const ALL_LANGUAGES     = ['javascript','python','java','cpp','sql'];
const SEQUENCE_LENGTH   = 12;
const MATCH_DURATION    = 5 * 60; // seconds

function buildRoundSequence() {
  const shuffled = [...ALL_CHALLENGE_IDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, SEQUENCE_LENGTH).map(challengeId => ({
    challengeId,
    language: ALL_LANGUAGES[Math.floor(Math.random() * ALL_LANGUAGES.length)],
  }));
}

// ── Supabase: save both players' stats after a match ─────────
async function saveMatchResults({ room, winnerSocketId, isDraw, matchDurationS }) {
  if (!room || room.players.length < 2) return;

  // Only save if BOTH players are logged in (not guests)
  const p0 = room.playerMeta[room.players[0]];
  const p1 = room.playerMeta[room.players[1]];
  if (!p0?.isLoggedIn || !p1?.isLoggedIn) {
    console.log('Guest in match — stats not saved');
    return;
  }

  for (let i = 0; i < 2; i++) {
    const socketId = room.players[i];
    const oppIdx   = i === 0 ? 1 : 0;
    const meta     = room.playerMeta[socketId];
    const oppMeta  = room.playerMeta[room.players[oppIdx]];
    const stats    = room.playerStats[socketId] || {};
    const oppStats = room.playerStats[room.players[oppIdx]] || {};

    const won = !isDraw && socketId === winnerSocketId;

    try {
      const { error } = await supabase.rpc('upsert_match_result', {
        p_username:   meta.username.toLowerCase(),
        p_opponent:   oppMeta.username.toLowerCase(),
        p_won:        won,
        p_draw:       isDraw,
        p_points:     stats.points      || 0,
        p_opp_points: oppStats.points   || 0,
        p_rounds:     stats.roundsSolved || 0,
        p_best_ms:    stats.bestRoundMs  || null,
        p_duration_s: matchDurationS    || 0,
      });
      if (error) console.error(`Supabase error for ${meta.username}:`, error.message);
      else console.log(`Saved stats: ${meta.username} — won=${won}, pts=${stats.points}`);
    } catch (err) {
      console.error('Supabase exception:', err.message);
    }
  }
}

// ── Leaderboard fetch ─────────────────────────────────────────
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
    .select('username, wins, losses, total_points, rounds_solved, best_round_ms, current_streak, max_streak, last_played')
    .order(col, { ascending: false })
    .limit(10);
  if (error) { console.error('Leaderboard fetch error:', error.message); return []; }
  return data || [];
}

// ── Match history fetch ───────────────────────────────────────
async function fetchMatchHistory(username) {
  const { data, error } = await supabase
    .from('match_history')
    .select('opponent, result, my_points, opp_points, rounds_solved, duration_s, played_at')
    .eq('username', username.toLowerCase())
    .order('played_at', { ascending: false })
    .limit(10);
  if (error) { console.error('History fetch error:', error.message); return []; }
  return data || [];
}

// ─────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('connected:', socket.id);

  // ── CREATE ROOM ──────────────────────────────────────────────
  socket.on('create-room', ({ roomCode, playerName, isLoggedIn, username }) => {
    if (rooms[roomCode]) { socket.emit('room-error', { message: 'Room already exists.' }); return; }
    rooms[roomCode] = {
      players:       [socket.id],
      playerNames:   [playerName],
      spectators:    [],
      roundSequence: buildRoundSequence(),
      playerStats:   { [socket.id]: { points: 0, roundsSolved: 0, bestRoundMs: null } },
      playerMeta:    { [socket.id]: { isLoggedIn: !!isLoggedIn, username: username || playerName } },
      gameState:     null,
      startedAt:     null,
    };
    socket.join(roomCode);
    socket.roomCode    = roomCode;
    socket.isSpectator = false;
    console.log(`Room created: ${roomCode} by ${playerName}`);
  });

  // ── JOIN ROOM ────────────────────────────────────────────────
  socket.on('join-room', ({ roomCode, playerName, isLoggedIn, username }) => {
    const room = rooms[roomCode];
    if (!room)                  { socket.emit('room-error', { message: `Room "${roomCode}" not found.` }); return; }
    if (room.players.length>=2) { socket.emit('room-error', { message: 'Room is full!' }); return; }

    room.players.push(socket.id);
    room.playerNames.push(playerName);
    room.playerStats[socket.id] = { points: 0, roundsSolved: 0, bestRoundMs: null };
    room.playerMeta[socket.id]  = { isLoggedIn: !!isLoggedIn, username: username || playerName };
    room.startedAt = Date.now(); // match starts when 2nd player joins
    socket.join(roomCode);
    socket.roomCode    = roomCode;
    socket.isSpectator = false;
    console.log(`${playerName} joined ${roomCode}`);

    io.to(roomCode).emit('match-ready', {
      roundSequence: room.roundSequence,
      playerNames:   room.playerNames,
    });
  });

  // ── SPECTATE ─────────────────────────────────────────────────
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

  // ── LEADERBOARD ──────────────────────────────────────────────
  socket.on('get-leaderboard', async ({ sortBy }) => {
    const rows = await fetchLeaderboard(sortBy);
    socket.emit('leaderboard-data', { rows });
  });

  // ── MATCH HISTORY ────────────────────────────────────────────
  socket.on('get-match-history', async ({ username }) => {
    const rows = await fetchMatchHistory(username);
    socket.emit('match-history-data', { rows });
  });

  // ── ATTACK ───────────────────────────────────────────────────
  socket.on('send-attack', ({ type, roomCode }) => {
    socket.to(roomCode).emit('receive-attack', { type });
  });

  // ── ROUND SOLVED ─────────────────────────────────────────────
  socket.on('round-solved', ({ roomCode, points, newRoundIndex, roundMs }) => {
    const room = rooms[roomCode];
    if (!room) return;
    if (room.playerStats[socket.id]) {
      const ps = room.playerStats[socket.id];
      ps.points       = points;
      ps.roundsSolved = newRoundIndex;
      if (roundMs) ps.bestRoundMs = ps.bestRoundMs === null ? roundMs : Math.min(ps.bestRoundMs, roundMs);
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

  // ── LIVE POINTS SYNC ──────────────────────────────────────────
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

  // ── MATCH WON (500 pts) ───────────────────────────────────────
  socket.on('match-won', async ({ roomCode, winnerPoints }) => {
    const room = rooms[roomCode];
    socket.to(roomCode).emit('match-over', { winnerPoints });
    if (room) {
      const durationS = room.startedAt ? Math.floor((Date.now() - room.startedAt) / 1000) : 0;
      await saveMatchResults({ room, winnerSocketId: socket.id, isDraw: false, matchDurationS: durationS });
      delete rooms[roomCode];
    }
  });

  // ── TIME UP ───────────────────────────────────────────────────
  socket.on('time-up', async ({ roomCode, myPoints, opponentPoints: oppPts }) => {
    const room = rooms[roomCode];
    socket.to(roomCode).emit('opponent-time-up');
    if (room) {
      const durationS  = room.startedAt ? Math.floor((Date.now() - room.startedAt) / 1000) : 0;
      const myIdx      = room.players.indexOf(socket.id);
      const oppIdx     = myIdx === 0 ? 1 : 0;
      const isDraw     = (myPoints || 0) === (oppPts || 0);
      const winnerSocketId = isDraw ? null
        : (myPoints || 0) > (oppPts || 0) ? socket.id : room.players[oppIdx];
      // Update final points in stats
      if (room.playerStats[socket.id])           room.playerStats[socket.id].points = myPoints || 0;
      if (room.playerStats[room.players[oppIdx]]) room.playerStats[room.players[oppIdx]].points = oppPts || 0;
      await saveMatchResults({ room, winnerSocketId, isDraw, matchDurationS: durationS });
      delete rooms[roomCode];
    }
  });

  // ── DISCONNECT ────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    const roomCode = socket.roomCode;
    if (roomCode && rooms[roomCode] && !socket.isSpectator) {
      const room          = rooms[roomCode];
      const oppSocketId   = room.players.find(id => id !== socket.id);
      socket.to(roomCode).emit('opponent-disconnected');
      if (oppSocketId && room.startedAt) {
        const durationS = Math.floor((Date.now() - room.startedAt) / 1000);
        await saveMatchResults({ room, winnerSocketId: oppSocketId, isDraw: false, matchDurationS: durationS });
      }
      delete rooms[roomCode];
    }
    console.log('disconnected:', socket.id);
  });
});

http.listen(4000, () => console.log('🚀 CodaClub Battle Server on http://localhost:4000'));