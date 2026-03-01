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

![Status](https://img.shields.io/badge/status-LIVE-00f5ff?style=flat-square&labelColor=050810)
![Players](https://img.shields.io/badge/players-1v1-ff006e?style=flat-square&labelColor=050810)
![Languages](https://img.shields.io/badge/languages-5-ffbe0b?style=flat-square&labelColor=050810)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Node%20%2B%20Socket.io-06d6a0?style=flat-square&labelColor=050810)

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

| Language | Validation |
|----------|-----------|
| 🟨 JavaScript | Live test execution |
| 🐍 Python | Pattern matching |
| ☕ Java | Pattern matching |
| ⚙️ C++ | Pattern matching |
| 🗄️ SQL | Pattern matching |

### ⚡ Attack System
Earn points by solving — spend them to sabotage your opponent's editor:

| Attack | Effect | Cost |
|--------|--------|------|
| 🌫️ **Blur** | Blurs the entire editor | 50pts |
| 📳 **Shake** | Shakes the whole screen | 40pts |
| 🙃 **Flip** | Rotates everything 180° | 80pts |
| 🪞 **Mirror** | Flips editor horizontally | 60pts |
| 🎨 **Invert** | Inverts all colors | 30pts |
| 🔬 **Tiny** | Shrinks the editor | 70pts |

### ⏱️ Time Warfare
- 5-minute match timer displayed in the header
- Solve a round → **+10 seconds** for you, **-10 seconds** for opponent
- Timer flashes 🟡 yellow at 60s, 🔴 red at 30s
- Time runs out → winner decided by most points

### 🔊 Sound Effects
Fully synthesized via **Web Audio API** — zero audio files:
- 🎵 Ascending ding on solve
- 💥 Glitch buzz when attacked
- 🔔 Chime on bonus time
- 🥁 Thud on time penalty
- 🎺 Fanfare on victory
- 😢 Descending tones on defeat

---

## 🛠️ Tech Stack

```
Frontend                    Backend
────────────────────        ──────────────────────
React 18                    Node.js
Monaco Editor               Express
Socket.io-client            Socket.io
Web Audio API               In-memory room store
CSS3 Animations
Orbitron + Share Tech Mono
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/codaclub.git
cd codaclub

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
```

### Running locally

```bash
# Terminal 1 — start the battle server
node index.js
# 🚀 CodaClub Battle Server on http://localhost:4000

# Terminal 2 — start the React client
cd client
npm start
# Opens http://localhost:3000
```

### Environment

Update the socket URL in `App.js` to point to your server:

```js
// App.js — socketSingleton
s = io('http://localhost:4000');
```

For production/ngrok, replace with your public URL and set the ngrok header if needed.

---

## 🗂️ Project Structure

```
codaclub/
├── index.js              # WebSocket battle server
│
└── client/
    ├── src/
    │   ├── App.js        # All game logic + UI components
    │   └── App.css       # Neon cyberpunk design system
    └── public/
        └── index.html
```

### Key files

| File | Role |
|------|------|
| `index.js` | Room management, socket events, spectator broadcasting |
| `App.js` | Challenges pool, game state, SFX engine, all React components |
| `App.css` | CSS variables, attack effects, animations, spectator layout |

---

## 🔌 Socket Events Reference

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `create-room` | `{ roomCode, playerName, challengeId }` | Host creates a room |
| `join-room` | `{ roomCode, playerName }` | Player 2 joins |
| `spectate-room` | `{ roomCode }` | Spectator joins |
| `send-attack` | `{ type, roomCode }` | Send attack to opponent |
| `round-won` | `{ roomCode, points, nextChallengeId, nextLanguage }` | Notify round solve |
| `my-points-update` | `{ roomCode, points, playerName, challenge, timeLeft }` | Sync live state |
| `match-won` | `{ roomCode, winnerPoints }` | Declare match winner |
| `time-up` | `{ roomCode }` | Timer expired |

### Server → Client
| Event | Description |
|-------|-------------|
| `room-joined` | Both players connected — game starts |
| `receive-attack` | Attack payload from opponent |
| `opponent-round-won` | Opponent solved — move to next round |
| `time-penalty` | Deduct 10s from your timer |
| `match-over` | Opponent hit 500pts — you lose |
| `spectate-started` | Initial game state snapshot for spectator |
| `spectate-state-update` | Live state pushed to spectators |
| `opponent-disconnected` | Opponent left — you win |

---

## 🎨 Design System

CodaClub uses a cyberpunk neon aesthetic built on CSS custom properties:

```css
--neon-cyan:    #00f5ff   /* player 1, primary UI */
--neon-pink:    #ff006e   /* player 2, attacks, danger */
--neon-yellow:  #ffbe0b   /* points, warnings, spectate */
--neon-green:   #06d6a0   /* success, solve, win */
--dark-bg:      #050810   /* base background */
--panel-bg:     #0a0e1a   /* card/panel background */
```

Fonts: **Orbitron** (headings, scores) + **Share Tech Mono** (code, labels) + **Rajdhani** (body)

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

Pull requests welcome. For major changes, open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m 'feat: add your feature'
git push origin feature/your-feature
```

---

<div align="center">

Built with 🧠 by coders, for coders.

`// may your bugs be few and your opponents' many_`

</div>
