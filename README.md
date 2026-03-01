<div align="center">

```
 ██████╗ ██████╗ ██████╗  █████╗  ██████╗██╗     ██╗   ██╗██████╗ 
██╔════╝██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██║   ██║██╔══██╗
██║     ██║   ██║██║  ██║███████║██║     ██║     ██║   ██║██████╔╝
██║     ██║   ██║██║  ██║██╔══██║██║     ██║     ██║   ██║██╔══██╗
╚██████╗╚██████╔╝██████╔╝██║  ██║╚██████╗███████╗╚██████╔╝██████╔╝
 ╚═════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚══════╝ ╚═════╝ ╚═════╝
```

### `// competitive bug-fixing arena_`

[![Status](https://img.shields.io/badge/STATUS-LIVE-00f5ff?style=for-the-badge&labelColor=050810&logo=circle&logoColor=00f5ff)](https://github.com/yourusername/codaclub)
[![Players](https://img.shields.io/badge/MODE-1v1_BATTLE-ff006e?style=for-the-badge&labelColor=050810)](https://github.com/yourusername/codaclub)
[![Languages](https://img.shields.io/badge/LANGUAGES-5-ffbe0b?style=for-the-badge&labelColor=050810)](https://github.com/yourusername/codaclub)
[![Stack](https://img.shields.io/badge/STACK-React_+_Node_+_Socket.io-06d6a0?style=for-the-badge&labelColor=050810)](https://github.com/yourusername/codaclub)

</div>

---

## ⚡ What is CodaClub?

**CodaClub** is a real-time **1v1 multiplayer coding battle platform** where two developers race to fix intentionally broken code — under pressure, under attack, and against the clock.

Every round drops a new buggy function on both players. First one to identify and fix the bug scores points. Solve faster and you don't just pull ahead — you **steal time from your opponent**. Launch attacks to blur, flip, shake, or invert their editor. First to **500 points** wins.

> *Think LeetCode meets street fighter. Bug hunting as a contact sport.*

---

## 🎮 Core Gameplay Loop

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ROOM CREATED  →  OPPONENT JOINS  →  BATTLE STARTS    │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │  Random language picked  (JS / Python / Java /   │  │
│   │  C++ / SQL) — same for both players              │  │
│   │                                                  │  │
│   │  Buggy code drops in editor                      │  │
│   │                                                  │  │
│   │  Fix it → Submit → Tests pass?                   │  │
│   │       ✅  +points  +10s for you  -10s for them   │  │
│   │       ❌  Keep trying                            │  │
│   │                                                  │  │
│   │  Spend points → Launch attacks on opponent       │  │
│   │  Next round → New challenge → New language       │  │
│   └──────────────────────────────────────────────────┘  │
│                                                         │
│   FIRST TO 500 PTS WINS  —  OR  —  MOST PTS AT TIMER   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🌟 Features

### 🏆 Battle System
- **Real-time 1v1** — two players, one room code, instant sync via WebSockets
- **500-point win condition** — or most points when the 5-minute timer expires
- **Spectator Mode** — third party joins as live viewer, split-screen both players

### 🧠 Challenge Pool
- **12 unique bugs** × **5 languages** = **60 total variants**
- Each round picks a **random language** — both players get the same one
- **JavaScript** uses real test execution in the browser
- **Python, Java, C++, SQL** use smart pattern matching to validate fixes

| Language | Icon | Validation |
|----------|------|-----------|
| JavaScript | 🟨 | Live test execution |
| Python | 🐍 | Pattern matching |
| Java | ☕ | Pattern matching |
| C++ | ⚙️ | Pattern matching |
| SQL | 🗄️ | Pattern matching |

### ⚡ Attack System

Earn points by solving — spend them to sabotage your opponent's editor:

| Attack | Effect | Cost |
|--------|--------|------|
| 🌫️ **Blur** | Blurs the entire editor | 50 pts |
| 📳 **Shake** | Shakes the whole screen | 40 pts |
| 🙃 **Flip** | Rotates everything 180° | 80 pts |
| 🪞 **Mirror** | Flips editor horizontally | 60 pts |
| 🎨 **Invert** | Inverts all colors | 30 pts |
| 🔬 **Tiny** | Shrinks the editor to 50% | 70 pts |

### ⏱️ Time Warfare
- 5-minute match timer shown in the header
- Solve a round → **+10s for you**, **−10s for opponent**
- Timer turns 🟡 yellow at 60s, 🔴 red at 30s with pulsing glow
- Time runs out → winner decided by most points

### 🔊 Sound Effects

Fully synthesized via **Web Audio API** — zero audio files needed:

| Trigger | Sound |
|---------|-------|
| ✅ Solve | Ascending 4-note ding |
| ⚡ Attack received | Glitchy descending buzz |
| ⏱ Bonus time | Soft chime up |
| 💀 Penalty | Low thud |
| 🏆 Victory | Triumphant fanfare |
| 💀 Defeat | Sad descending tones |

---

## 🛠️ Tech Stack

```
Frontend                      Backend
──────────────────────────    ──────────────────────────
React 18                      Node.js
Monaco Editor                 Express
Socket.io-client              Socket.io
Web Audio API                 In-memory room store
CSS3 Animations + Keyframes
Orbitron + Share Tech Mono
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js `18+`
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/codaclub.git
cd codaclub

# Install server dependencies
npm install

# Install client dependencies
cd client && npm install
```

### Run locally

```bash
# Terminal 1 — Battle server
node index.js
# 🚀 CodaClub Battle Server on http://localhost:4000

# Terminal 2 — React client
cd client && npm start
# Opens http://localhost:3000
```

### Environment

Update the socket URL in `App.js`:

```js
// App.js — socketSingleton
s = io('http://localhost:4000');
```

> For production or ngrok tunnels, replace with your public URL and add the ngrok skip-warning header if needed.

---

## 🗂️ Project Structure

```
codaclub/
├── index.js                  ← WebSocket battle server
└── client/
    └── src/
        ├── App.js            ← All game logic + React components
        └── App.css           ← Neon cyberpunk design system
```

| File | Responsibility |
|------|---------------|
| `index.js` | Room management, socket events, spectator broadcasting |
| `App.js` | Challenges pool, SFX engine, game state, UI |
| `App.css` | CSS variables, attack effects, animations, spectator layout |

---

## 🔌 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | `{ roomCode, playerName, challengeId }` | Host creates a room |
| `join-room` | `{ roomCode, playerName }` | Player 2 joins |
| `spectate-room` | `{ roomCode }` | Spectator joins |
| `send-attack` | `{ type, roomCode }` | Fire attack at opponent |
| `round-won` | `{ roomCode, points, nextChallengeId, nextLanguage }` | Round solved |
| `my-points-update` | `{ roomCode, points, playerName, challenge, timeLeft }` | Live state sync |
| `match-won` | `{ roomCode, winnerPoints }` | Declare match winner |
| `time-up` | `{ roomCode }` | Timer expired |

### Server → Client

| Event | Description |
|-------|-------------|
| `room-joined` | Both players connected — battle starts |
| `receive-attack` | Incoming attack from opponent |
| `opponent-round-won` | Opponent solved — advance round |
| `time-penalty` | Deduct 10s from your clock |
| `match-over` | Opponent hit 500 pts — you lose |
| `spectate-started` | Initial snapshot sent to spectator |
| `spectate-state-update` | Live state pushed to spectators |
| `opponent-disconnected` | Opponent left — you win |

---

## 🎨 Design System

```css
--neon-cyan:    #00f5ff;   /* player 1, primary UI   */
--neon-pink:    #ff006e;   /* player 2, attacks       */
--neon-yellow:  #ffbe0b;   /* points, warnings        */
--neon-green:   #06d6a0;   /* success, solve, win     */
--dark-bg:      #050810;   /* base background         */
--panel-bg:     #0a0e1a;   /* card / panel background */
```

**Fonts:** `Orbitron` · `Share Tech Mono` · `Rajdhani`

---

## 🗺️ Roadmap

- [ ] Persistent leaderboard
- [ ] Custom challenge creator
- [ ] Tournament bracket mode (4+ players)
- [ ] Replay system — watch past battles
- [ ] Mobile-responsive layout
- [ ] More languages: Rust, Go, TypeScript

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

```bash
git checkout -b feature/your-feature
git commit -m 'feat: describe your change'
git push origin feature/your-feature
```

---

<div align="center">

Built with 🧠 by coders, for coders.

`// may your bugs be few and your opponents' many_`

</div>
