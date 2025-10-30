# AGENTS.md — Planar Division Game (“Cut the Plane!”)

A planning document for implementing a browser‑playable version of the Plane Division Game on a square grid. Written for a two‑player MVP first, with a roadmap for a Computer (AI) player.

---

## 1. Vision & Scope
**Goal:** A fast, intuitive, pen‑and‑paper‑style game playable in the browser. The board is graph paper; players click lattice points to draw straight segments that align with a predefined set of admissible directions. The segment extends across the board along the chosen line, splitting regions. A player loses immediately when the number of rooms (connected components of the complement) reaches or exceeds \(M\).

**MVP:** Local two‑player hot‑seat on one device; fixed board size; fixed admissible directions; visual region counter; undo for illegal moves only; deterministic rules validation; simple end screen.

**Future:** Online real‑time play, spectating, analysis mode, AI opponent(s), custom direction sets and board sizes, export/import of positions.

---

## 2. Product Requirements
### 2.1 Core Gameplay
- Click two lattice points to propose a line segment. If the segment’s direction is admissible, snap and extend it to a maximal line across the board (clipped to board bounds), unless blocked by optional obstacles (not MVP).
- Prevent duplicate or coincident lines.
- Update the arrangement and region count after each valid move.
- Count the number of connected regions C_n in the board (n: number of moves)
- Detect loss when \(C_n \ge M\). Declare the last mover the loser.

### 2.2 UI/UX
- Canvas‑based board rendering (pixel‑perfect grid). Hover previews showing the candidate line through the hovered pair of lattice points (or one point + direction gizmo).
- Clear status bar: current player, move number, current room count \(C_n\), target \(M\).
- Modal overlays: Help dialog (implemented) and Game Over dialog that announces the loser and offers a restart (implemented).
- Minimal controls: New Game, Set \(M\), Choose admissible directions \(\mathcal{P}\) (from presets), Undo (illegal‑move rollback only), Help.
- Accessibility: keyboard navigation for lattice selection; high‑contrast mode.

---

## 3. Architecture Overview
**Stack (proposed):**
- **Frontend:** TypeScript + React (Vite), Canvas 2D for board, Zustand/Recoil for state.
- **Geometry & Rules Engine:** Pure TypeScript module, functional core (immutable updates where feasible).
- **Room Counting:** Graph‑based flood fill on cell‑graph or planar embedding derived from grid edges and line barriers (see §6).
- **Persistence:** URL query state serialisation (MVP), localStorage for last match.
- **(Future)** Networking: WebRTC or Socket.IO via a lightweight Node service.

**High‑level modules:**
- `ui/` (React components, canvas renderer, HUD)
- `core/` (game state, rules, validators, reducers)
- `geom/` (grid model, line normalisation, intersection, rasterisation)
- `ai/` (heuristics, playouts, MCTS; future)
- `net/` (online play; future)
- `tests/` (unit + property tests)

---

## 4. Agents & Responsibilities
> “Agents” here are development roles/components; use them as GitHub labels or workstreams.

### A. **Game‑State Agent**
- Owns canonical state: board size, \(\mathcal{P}\), set of lines \(\{H_i\}\), region count \(C_n\), turn, \(M\).
- Provides pure reducers: `applyMove`, `recountRooms`, `isTerminal`.

### B. **Geometry Agent**
- Normalises direction vectors; maps lattice‑pair clicks to a direction class and intercept.
- Ensures uniqueness: no parallel duplicates with same intercept; handles numeric robustness via integer grid arithmetic.

### C. **Rules‑Validation Agent**
- Validates admissibility: direction \(\in \mathcal{P}\); line not already present; within bounds.
- Computes maximal segment across board bounding box (for rendering), but stores as line equation \(\alpha \cdot x + \ell = 0\).

### D. **Rendering Agent**
- Draws grid, hover previews, committed lines, and optionally region tinting.
- Maintains device‑pixel‑ratio sharpness.

### E. **Counting Agent**
- Maintains region count efficiently (incremental preferred; fallback to full recompute).
- Current implementation builds planar graph (board boundary + clipped line segments) and uses Euler characteristic to compute \(C_n\) on each move.
- Exposes `countRooms(lines, board)` returning \(C_n\).

### F. **AI Agent (Future)**
- **Level 1:** Greedy heuristics (avoid high room creation; block opponent threats; favour symmetry).
- **Level 2:** Monte Carlo playouts with fast approximate counting.
- **Level 3:** MCTS with learned priors over directions/placements.

### G. **Net/Sync Agent (Future)**
- Manages online lobbies, turn order, and conflict resolution.

---

## 5. Admissible Directions (\(\mathcal{P}\))
### 5.1 Representation
- Use reduced integer slope vectors \((a,b)\) with \(\gcd(a,b)=1\). Include axis‑aligned `(1,0)`, `(0,1)` by default; optionally diagonals `(1,1)`, `(1,−1)` etc.
- Direction equivalence class \([\pm(a,b)]\) (line orientation irrespective of sign).

### 5.2 UI Presets
- **Orthogonal:** {(1,0), (0,1)}
- **Orthogonal + Diagonals:** {(1,0), (0,1), (1,1), (1,−1)}
- **Custom:** User supplies finite set of integer vectors (clamped to small norms for MVP).

---

## 6. Region Counting Strategy
- Clip every line to the board, add intersections, and treat the arrangement as a planar graph.
- Use Euler characteristic \(F = E - V + C\) (faces = rooms) with components from flood fill over the graph.
- Pros: Exact count for arbitrary admissible directions; scales with number of lines rather than board area.
- Cons: Rebuilds the full arrangement each move; optimise later by tracking incremental changes.

**Optimisation:** Explore incremental updates by only re‑computing affected segments/vertices per new line.

---

## 7. Data Structures
```ts
// Canonical line representation (grid‑friendly)
interface Direction { a: number; b: number; } // gcd(a,b)=1
interface Line { dir: Direction; c: number; } // ax + by + c = 0 with integer c

interface GameState {
  size: number; // grid size (number of cells per side)
  P: Direction[]; // admissible directions
  lines: Line[];
  rooms: number; // C_n
  turn: 0 | 1; // current player index
  M: number;
}
```

**Notes:**
- Compute `c` from a chosen lattice anchor `(x0,y0)` via `a*x0 + b*y0 + c = 0` ⇒ `c = −(a*x0 + b*y0)`.
- Line equality: same `(a,b,c)` up to global sign; normalise so `a>0` or (`a==0` and `b>0`).

---

## 8. Move Lifecycle
1. **Input:** player selects two lattice points *(or)* one point + direction (keyboard).
2. **Validation:** `direction ∈ P` and not duplicate.
3. **Commit:** add normalised line; recompute or incrementally update `rooms`.
4. **Terminal check:** if `rooms ≥ M` then current player loses; stop.
5. **Turn switch.**

---

## 9. Rendering Plan
- Single `<canvas>` for board; overlay for UI hints.
- Draw order: grid → existing lines → hover preview → HUD.
- Hit‑testing: map mouse to nearest lattice point with snap radius.
- DPI handling: scale by `window.devicePixelRatio`.

---

## 10. Testing Strategy
- **Unit tests:** direction reduction, line equality, duplicate detection, cell‑graph updates, room counting on known configurations.
- **Property tests:** symmetry invariance; commutativity of line order for `C_n` (face count is set‑dependent not order‑dependent) — useful oracle cases.
- **Golden tests:** small boards with precomputed \(C_n\).

---

## 11. AI Roadmap (Post‑MVP)
- **Heuristics:** penalise moves with large expected \(\Delta C\); reward centre‑preserving lines; prefer balancing orientations.
- **Threat detection:** compute upper bounds on rooms added by a candidate line (fast grid heuristic).
- **Search:** random playouts with approximate counting; later MCTS with rollout policies; caching by `(lines set, P, size)` hash (Zobrist‑style).

---

## 12. Current Status (GitHub Pages MVP)
- Local hot‑seat gameplay, move validation, and region counting are implemented in TypeScript with Zustand state management.
- UI includes HUD, controls, Help modal, and newly added Game Over modal plus footer link to the GitHub repository.
- GitHub Actions workflow builds with Vite and deploys to GitHub Pages (`https://shizuo-kaji.github.io/CutThePlane/`).
- Remaining MVP gaps: keyboard accessibility, illegal‑move undo history, custom presets UI polish, and performance optimisations for large boards.
