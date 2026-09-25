// ちぇすの るーる（しょうぎばん 8x8）
// ます の ばんごう: index = rank*8 + file  (rank0 = しろの いちばん てまえ)
// こま: おおもじ = しろ, こもじ = くろ  P N B R Q K
(function (global) {
  'use strict';

  const N_OFF = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const K_OFF = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const fileOf = (s) => s & 7;
  const rankOf = (s) => s >> 3;
  const sq = (f, r) => r * 8 + f;
  const onBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const colorOf = (p) => (p ? (p < 'a' ? 'w' : 'b') : null);
  const typeOf = (p) => (p ? p.toUpperCase() : null);
  const other = (c) => (c === 'w' ? 'b' : 'w');

  function initial() {
    const b = new Array(64).fill(null);
    const back = 'RNBQKBNR';
    for (let f = 0; f < 8; f++) {
      b[sq(f, 0)] = back[f];
      b[sq(f, 1)] = 'P';
      b[sq(f, 6)] = 'p';
      b[sq(f, 7)] = back[f].toLowerCase();
    }
    return { b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1 };
  }

  function clone(s) {
    return { b: s.b.slice(), turn: s.turn, castle: Object.assign({}, s.castle), ep: s.ep, half: s.half, full: s.full };
  }

  // byColor の こまが sqr を ねらっているか
  function attacked(s, target, byColor) {
    const b = s.b;
    const tf = fileOf(target), tr = rankOf(target);
    // へいたい
    const pr = byColor === 'w' ? tr - 1 : tr + 1;
    const pawn = byColor === 'w' ? 'P' : 'p';
    for (const df of [-1, 1]) {
      const f = tf + df;
      if (onBoard(f, pr) && b[sq(f, pr)] === pawn) return true;
    }
    const knight = byColor === 'w' ? 'N' : 'n';
    for (const [df, dr] of N_OFF) {
      const f = tf + df, r = tr + dr;
      if (onBoard(f, r) && b[sq(f, r)] === knight) return true;
    }
    const king = byColor === 'w' ? 'K' : 'k';
    for (const [df, dr] of K_OFF) {
      const f = tf + df, r = tr + dr;
      if (onBoard(f, r) && b[sq(f, r)] === king) return true;
    }
    const slide = (dirs, types) => {
      for (const [df, dr] of dirs) {
        let f = tf + df, r = tr + dr;
        while (onBoard(f, r)) {
          const p = b[sq(f, r)];
          if (p) {
            if (colorOf(p) === byColor && types.includes(typeOf(p))) return true;
            break;
          }
          f += df; r += dr;
        }
      }
      return false;
    };
    return slide(DIAG, 'BQ') || slide(ORTH, 'RQ');
  }

  function kingSquare(s, color) {
    const k = color === 'w' ? 'K' : 'k';
    return s.b.indexOf(k);
  }

  function inCheck(s, color) {
    const k = kingSquare(s, color);
    return k >= 0 && attacked(s, k, other(color));
  }

  function pseudoMoves(s) {
    const moves = [];
    const b = s.b, me = s.turn, opp = other(me);
    for (let from = 0; from < 64; from++) {
      const p = b[from];
      if (!p || colorOf(p) !== me) continue;
      const t = typeOf(p), f0 = fileOf(from), r0 = rankOf(from);
      const add = (to, extra) => {
        const m = { from, to, piece: p, capture: b[to] };
        if (extra) Object.assign(m, extra);
        moves.push(m);
      };
      if (t === 'P') {
        const dir = me === 'w' ? 1 : -1;
        const startR = me === 'w' ? 1 : 6;
        const lastR = me === 'w' ? 7 : 0;
        const pushPromo = (to, cap) => {
          if (rankOf(to) === lastR) {
            for (const q of 'QRBN') add(to, { promo: me === 'w' ? q : q.toLowerCase() });
          } else add(to, cap);
        };
        const r1 = r0 + dir;
        if (onBoard(f0, r1) && !b[sq(f0, r1)]) {
          pushPromo(sq(f0, r1));
          const r2 = r0 + 2 * dir;
          if (r0 === startR && !b[sq(f0, r2)]) add(sq(f0, r2), { double: true });
        }
        for (const df of [-1, 1]) {
          const f = f0 + df;
          if (!onBoard(f, r1)) continue;
          const to = sq(f, r1);
          if (b[to] && colorOf(b[to]) === opp) pushPromo(to);
          else if (to === s.ep) add(to, { ep: true, capture: me === 'w' ? 'p' : 'P' });
        }
      } else if (t === 'N' || t === 'K') {
        for (const [df, dr] of t === 'N' ? N_OFF : K_OFF) {
          const f = f0 + df, r = r0 + dr;
          if (!onBoard(f, r)) continue;
          const to = sq(f, r);
          if (!b[to] || colorOf(b[to]) === opp) add(to);
        }
        if (t === 'K') {
          const home = me === 'w' ? 0 : 7;
          if (from === sq(4, home) && !attacked(s, from, opp)) {
            const kc = me === 'w' ? 'K' : 'k', qc = me === 'w' ? 'Q' : 'q';
            const rook = me === 'w' ? 'R' : 'r';
            if (s.castle[kc] && b[sq(7, home)] === rook && !b[sq(5, home)] && !b[sq(6, home)] &&
                !attacked(s, sq(5, home), opp) && !attacked(s, sq(6, home), opp)) {
              add(sq(6, home), { castle: 'K' });
            }
            if (s.castle[qc] && b[sq(0, home)] === rook && !b[sq(1, home)] && !b[sq(2, home)] && !b[sq(3, home)] &&
                !attacked(s, sq(3, home), opp) && !attacked(s, sq(2, home), opp)) {
              add(sq(2, home), { castle: 'Q' });
            }
          }
        }
      } else {
        const dirs = t === 'B' ? DIAG : t === 'R' ? ORTH : DIAG.concat(ORTH);
        for (const [df, dr] of dirs) {
          let f = f0 + df, r = r0 + dr;
          while (onBoard(f, r)) {
            const to = sq(f, r);
            if (b[to]) {
              if (colorOf(b[to]) === opp) add(to);
              break;
            }
            add(to);
            f += df; r += dr;
          }
        }
      }
    }
    return moves;
  }

  function makeMove(s, m) {
    const n = clone(s);
    const b = n.b, me = s.turn;
    b[m.to] = m.promo || m.piece;
    b[m.from] = null;
    if (m.ep) b[sq(fileOf(m.to), rankOf(m.from))] = null;
    if (m.castle) {
      const home = rankOf(m.from);
      if (m.castle === 'K') { b[sq(5, home)] = b[sq(7, home)]; b[sq(7, home)] = null; }
      else { b[sq(3, home)] = b[sq(0, home)]; b[sq(0, home)] = null; }
    }
    // きゃすりんぐの けんり
    const t = typeOf(m.piece);
    if (t === 'K') {
      if (me === 'w') { n.castle.K = n.castle.Q = false; } else { n.castle.k = n.castle.q = false; }
    }
    const touch = (x) => {
      if (x === 0) n.castle.Q = false;
      if (x === 7) n.castle.K = false;
      if (x === 56) n.castle.q = false;
      if (x === 63) n.castle.k = false;
    };
    touch(m.from); touch(m.to);
    n.ep = m.double ? (m.from + m.to) / 2 : -1;
    n.half = (t === 'P' || m.capture) ? 0 : s.half + 1;
    if (me === 'b') n.full = s.full + 1;
    n.turn = other(me);
    return n;
  }

  function legalMoves(s) {
    const me = s.turn;
    return pseudoMoves(s).filter((m) => !inCheck(makeMove(s, m), me));
  }

  function insufficient(s) {
    const rest = s.b.filter((p) => p && typeOf(p) !== 'K');
    if (rest.length === 0) return true;
    if (rest.length === 1 && 'NB'.includes(typeOf(rest[0]))) return true;
    return false;
  }

  // 'play' | 'mate' | 'stalemate' | 'insufficient' | 'fifty' | 'repetition'
  function status(s, history) {
    const legal = legalMoves(s);
    if (legal.length === 0) return inCheck(s, s.turn) ? 'mate' : 'stalemate';
    if (insufficient(s)) return 'insufficient';
    if (s.half >= 100) return 'fifty';
    if (history) {
      const key = posKey(s);
      let count = 0;
      for (const h of history) if (posKey(h) === key) count++;
      if (count >= 3) return 'repetition';
    }
    return 'play';
  }

  function posKey(s) {
    return s.b.map((p) => p || '.').join('') + s.turn + (s.castle.K ? 'K' : '') + (s.castle.Q ? 'Q' : '') +
      (s.castle.k ? 'k' : '') + (s.castle.q ? 'q' : '') + s.ep;
  }

  // ---------- ろぼっと（AI） ----------
  const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  // しろ から みた いち の てんすう (rank0 = しろの てまえ)
  const PST = {
    P: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0,
      5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
    N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    R: [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5,
      -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    K: [20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40, -40, -30, -30, -20,
      -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30]
  };

  function evaluate(s) {
    // s.turn から みた てんすう
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i];
      if (!p) continue;
      const t = typeOf(p);
      if (colorOf(p) === 'w') score += VAL[t] + PST[t][i];
      else score -= VAL[t] + PST[t][(7 - rankOf(i)) * 8 + fileOf(i)];
    }
    return s.turn === 'w' ? score : -score;
  }

  function orderMoves(moves) {
    return moves.sort((a, b) => {
      const va = (a.capture ? VAL[typeOf(a.capture)] * 10 - VAL[typeOf(a.piece)] : 0) + (a.promo ? 800 : 0);
      const vb = (b.capture ? VAL[typeOf(b.capture)] * 10 - VAL[typeOf(b.piece)] : 0) + (b.promo ? 800 : 0);
      return vb - va;
    });
  }

  function quiesce(s, alpha, beta, depth) {
    const stand = evaluate(s);
    if (stand >= beta) return beta;
    if (alpha < stand) alpha = stand;
    if (depth <= 0) return alpha;
    const caps = orderMoves(pseudoMoves(s).filter((m) => m.capture));
    for (const m of caps) {
      const n = makeMove(s, m);
      if (inCheck(n, s.turn)) continue;
      const sc = -quiesce(n, -beta, -alpha, depth - 1);
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }

  function negamax(s, depth, alpha, beta, ply) {
    if (depth === 0) return quiesce(s, alpha, beta, 4);
    const moves = orderMoves(legalMoves(s));
    if (moves.length === 0) return inCheck(s, s.turn) ? -100000 + ply : 0;
    let best = -Infinity;
    for (const m of moves) {
      const sc = -negamax(makeMove(s, m), depth - 1, -beta, -alpha, ply + 1);
      if (sc > best) best = sc;
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    return best;
  }

  // level: 1 やさしい, 2 ふつう, 3 つよい
  function bestMove(s, level) {
    const moves = legalMoves(s);
    if (moves.length === 0) return null;
    const depth = level >= 3 ? 3 : level === 2 ? 2 : 1;
    const noise = level >= 3 ? 8 : level === 2 ? 40 : 160;
    if (level <= 1 && Math.random() < 0.3) return moves[Math.floor(Math.random() * moves.length)];
    let best = null, bestScore = -Infinity;
    for (const m of orderMoves(moves)) {
      if (m.promo && typeOf(m.promo) !== 'Q' && level < 3) continue;
      const sc = -negamax(makeMove(s, m), depth - 1, -Infinity, Infinity, 1) + Math.random() * noise;
      if (sc > bestScore) { bestScore = sc; best = m; }
    }
    return best || moves[0];
  }

  global.Chess = {
    initial, clone, legalMoves, makeMove, status, inCheck, kingSquare, bestMove, posKey,
    fileOf, rankOf, sq, colorOf, typeOf, other
  };
  if (typeof module !== 'undefined') module.exports = global.Chess;
})(typeof window !== 'undefined' ? window : globalThis);
