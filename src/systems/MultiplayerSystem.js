/* ========================================
   MULTIPLAYER SYSTEM — Firebase RTDB
   Race Mode: Challenge friends, ghost rendering
   ======================================== */

const MultiplayerSystem = {
  // Firebase RTDB reference
  _db: null,
  _matchRef: null,
  _matchId: null,
  _isHost: false,
  _opponent: null,
  _onOpponentUpdate: null,
  _syncInterval: null,
  _connected: false,

  // ── Initialize ──
  init() {
    try {
      if (window.firebase && window.firebase.database) {
        this._db = window.firebase.database();
        this._connected = true;
        console.log('[Multiplayer] Firebase RTDB connected');
      } else {
        console.warn('[Multiplayer] Firebase RTDB not available');
      }
    } catch(e) {
      console.warn('[Multiplayer] Init error:', e);
    }
  },

  // ── Create Match ──
  // Host creates a match room and waits for opponent
  async createMatch(levelNum, hostUsername) {
    if (!this._db) { this.init(); if (!this._db) return null; }

    const matchId = hostUsername + '_' + Date.now().toString(36);
    this._matchId = matchId;
    this._isHost = true;
    this._matchRef = this._db.ref('matches/' + matchId);

    const matchData = {
      host: hostUsername,
      opponent: null,
      levelNum: levelNum,
      status: 'waiting',  // waiting → countdown → racing → finished
      createdAt: Date.now(),
      players: {
        [hostUsername]: {
          x: 0, y: 0, state: 'idle',
          char: 'hero_red',
          ready: false,
          finishTime: null,
        }
      },
    };

    await this._matchRef.set(matchData);

    // Listen for opponent joining
    this._matchRef.child('opponent').on('value', (snap) => {
      const opp = snap.val();
      if (opp && !this._opponent) {
        this._opponent = opp;
        console.log('[Multiplayer] Opponent joined:', opp);
        if (this._onOpponentJoin) this._onOpponentJoin(opp);
      }
    });

    // Listen for status changes
    this._matchRef.child('status').on('value', (snap) => {
      const status = snap.val();
      if (this._onStatusChange) this._onStatusChange(status);
    });

    // Clean up match on disconnect
    this._matchRef.onDisconnect().update({ status: 'abandoned' });

    console.log('[Multiplayer] Match created:', matchId);
    return matchId;
  },

  // ── Join Match ──
  async joinMatch(matchId, joinerUsername) {
    if (!this._db) { this.init(); if (!this._db) return false; }

    this._matchId = matchId;
    this._isHost = false;
    this._matchRef = this._db.ref('matches/' + matchId);

    // Check if match exists and is waiting
    const snap = await this._matchRef.once('value');
    const data = snap.val();
    if (!data || data.status !== 'waiting') {
      console.warn('[Multiplayer] Match not available:', matchId);
      return false;
    }

    this._opponent = data.host;

    // Join the match
    const updates = {};
    updates['opponent'] = joinerUsername;
    updates['status'] = 'countdown';
    updates['players/' + joinerUsername] = {
      x: 0, y: 0, state: 'idle',
      char: 'hero_red',
      ready: false,
      finishTime: null,
    };
    await this._matchRef.update(updates);

    // Listen for status changes
    this._matchRef.child('status').on('value', (snap) => {
      const status = snap.val();
      if (this._onStatusChange) this._onStatusChange(status);
    });

    // Clean up on disconnect
    this._matchRef.onDisconnect().update({ status: 'abandoned' });

    console.log('[Multiplayer] Joined match:', matchId);
    return true;
  },

  // ── Sync Position ──
  // Called from LevelScene update loop (throttled to ~10fps)
  _lastSync: 0,
  syncPosition(username, x, y, state, velocityX, velocityY) {
    if (!this._matchRef || !username) return;
    const now = Date.now();
    if (now - this._lastSync < 100) return; // 10fps max
    this._lastSync = now;

    this._matchRef.child('players/' + username).update({
      x: Math.round(x),
      y: Math.round(y),
      state: state, // 'running', 'jumping', 'sliding', 'dead'
      vx: Math.round(velocityX || 0),
      vy: Math.round(velocityY || 0),
      ts: now,
    });
  },

  // ── Listen for Opponent Updates ──
  listenForOpponent(opponentUsername, callback) {
    if (!this._matchRef) return;
    this._onOpponentUpdate = callback;

    this._matchRef.child('players/' + opponentUsername).on('value', (snap) => {
      const data = snap.val();
      if (data && callback) {
        callback(data);
      }
    });
  },

  // ── Report Finish ──
  async reportFinish(username, finishTime) {
    if (!this._matchRef) return;

    await this._matchRef.child('players/' + username).update({
      finishTime: finishTime,
      state: 'finished',
    });

    // Check if both players finished
    const snap = await this._matchRef.once('value');
    const data = snap.val();
    if (!data || !data.players) return;

    const players = Object.entries(data.players);
    const allFinished = players.every(([_, p]) => p.finishTime !== null);

    if (allFinished) {
      // Determine winner
      let winner = null;
      let bestTime = Infinity;
      players.forEach(([name, p]) => {
        if (p.finishTime && p.finishTime < bestTime) {
          bestTime = p.finishTime;
          winner = name;
        }
      });

      await this._matchRef.update({
        status: 'finished',
        winner: winner,
        results: Object.fromEntries(players.map(([n, p]) => [n, p.finishTime])),
      });

      // Log to leaderboard
      if (window.db && data.levelNum) {
        try {
          await window.db.collection('race_results').add({
            matchId: this._matchId,
            levelNum: data.levelNum,
            winner: winner,
            players: Object.fromEntries(players.map(([n, p]) => [n, { finishTime: p.finishTime }])),
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
          });
        } catch(e) {}
      }
    }
  },

  // ── Challenge a Friend ──
  async challengeFriend(friendUsername, levelNum) {
    const tenant = (window.CHRONOVERSE_TENANT || '').toLowerCase();
    if (!tenant) return null;

    const matchId = await this.createMatch(levelNum, tenant);
    if (!matchId) return null;

    // Write challenge to friend's doc
    if (window.db) {
      try {
        await window.db.collection('kids').doc(friendUsername).set({
          pendingChallenge: {
            from: tenant,
            matchId: matchId,
            levelNum: levelNum,
            createdAt: Date.now(),
          }
        }, { merge: true });
      } catch(e) {
        console.warn('[Multiplayer] Challenge write error:', e);
      }
    }

    return matchId;
  },

  // ── Check for Pending Challenges ──
  async checkForChallenges() {
    const tenant = (window.CHRONOVERSE_TENANT || '').toLowerCase();
    if (!tenant || !window.db) return null;

    try {
      const doc = await window.db.collection('kids').doc(tenant).get();
      if (!doc.exists) return null;
      const data = doc.data();
      const challenge = data.pendingChallenge;

      if (challenge && (Date.now() - challenge.createdAt) < 300000) { // 5 min expiry
        return challenge;
      }

      // Clear expired challenges
      if (challenge) {
        await window.db.collection('kids').doc(tenant).set({
          pendingChallenge: null,
        }, { merge: true });
      }
    } catch(e) {}
    return null;
  },

  // ── Clear Challenge ──
  async clearChallenge() {
    const tenant = (window.CHRONOVERSE_TENANT || '').toLowerCase();
    if (!tenant || !window.db) return;
    try {
      await window.db.collection('kids').doc(tenant).set({
        pendingChallenge: null,
      }, { merge: true });
    } catch(e) {}
  },

  // ── Cleanup ──
  destroy() {
    if (this._matchRef) {
      this._matchRef.off();
      this._matchRef = null;
    }
    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }
    this._matchId = null;
    this._isHost = false;
    this._opponent = null;
    this._onOpponentUpdate = null;
    this._onOpponentJoin = null;
    this._onStatusChange = null;
  },

  // ── Event Handlers ──
  onOpponentJoin(callback) { this._onOpponentJoin = callback; },
  onStatusChange(callback) { this._onStatusChange = callback; },
};

// Initialize on load
window.MultiplayerSystem = MultiplayerSystem;
