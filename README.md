# Cut the Plane!

Take turns drawing lines and creating rooms. Can you leave your opponent with the wrong next cut?

**[Play in your browser](https://shizuo-kaji.github.io/CutThePlane/)** — play with a friend on the same device, challenge the computer, or watch two computers play.

## Your first game

The game opens with **Classic board** rules: two human players, a target of **20 rooms**, and horizontal, vertical, and diagonal cuts.

1. **Choose a grid point**, then a second point to draw a line through them. The line extends across the board.
2. **Check your cut.** With a mouse or keyboard, the preview shows how many rooms your proposed line will create and warns if it would end the game.
3. **Take turns.** Each accepted line stays on the board, and the room counter updates.
4. **Stay below 20.** The player whose cut makes the total reach **20 or more** loses.

The empty board is one room. Two parallel cuts make three rooms; two cuts crossing inside the board make four. Both players contribute to the same room total.

To play alone, change either player's control from **Human** to **Computer**. To change the target or try another set of rules, open **New game**.

## Drawing and changing your mind

- **Two points:** click or tap two grid points. Clicking the first point again cancels your selection.
- **One point and a direction:** choose a direction button below the board, then click or tap a grid point to draw a line in that direction.
- **Cancel a selection:** use **Cancel** or press **Escape** before completing the cut.
- **Invalid cuts:** a line already drawn, a forbidden direction, or another rule violation is rejected with an explanation. You keep your turn and can try again.

The colored lines show who drew each cut. **Labels** displays move numbers and marks points where three or more lines meet; **Room tint** helps you see the rooms.

## Choose your challenge

Open **New game** or **Change** to choose a preset. You can then adjust its rules before pressing **Start game**.

| Preset | How to play |
| --- | --- |
| **Classic board** | Stay below the target. Count rooms inside the square. Three or more lines may meet at one point. |
| **Simple plane** | Stay below the target. Count the whole plane. No three lines may meet at one point. |
| **Race** | Be the first to reach or exceed the target. Count the whole plane. No three lines may meet at one point. |
| **Limited lines** | Stay below the target. Count the whole plane, allow multiple lines to meet, and use at most three lines in each direction. |

The first three presets have no direction capacity limit. Presets choose the rule combination; the target, board size, allowed directions, and players can be adjusted separately.

### Win by avoiding—or by racing

- **Avoidance:** your cut loses if it makes the room count reach or exceed the target **M**.
- **Race:** your cut wins if it makes the room count reach or exceed **M**.

You do not have to hit the target exactly. A cut from 18 to 22 rooms crosses a target of 20 under either rule.

### Count the board or the whole plane

- **The board:** only rooms inside the original square count. A line along the square's edge is not allowed because it does not divide its interior.
- **The whole plane:** rooms outside the square count too, including regions that continue forever. Lines along the original square's edge are allowed in this mode.

In whole-plane mode, the view automatically zooms out to show off-board intersections. Choose **Board** to zoom back in for easier drawing, or **Fit all** to return to the full view. Changing the view never changes the score.

In every mode, choose your drawing points from the grid inside the original square. In whole-plane mode, the dashed square marks this drawing area.

### Allow or forbid triple points

A *triple point* is a point where three lines meet. Leave **Allow three or more lines at one point** on to permit such cuts. Turn it off to forbid them, including intersections outside the square. Parallel lines remain allowed.

### Limit the available lines

Turn on **Limit lines per direction** to set a capacity for each direction. The allowance is shared by both players: a horizontal capacity of 3 means three horizontal lines in total, not three each. A capacity of 0 disables that direction.

If the room count is still below the target when all capacities are used, the game is a **draw**. It is also a draw if no allowed cut remains. These draw rules apply to both Avoidance and Race.

### Change the size, target, or directions

A smaller target gives a shorter game. A larger board gives you more grid points to choose from. Direction presets offer horizontal and vertical cuts, with or without diagonals.

For other slopes, choose **Custom directions**. Enter up to eight pairs such as `1,0; 0,1; 2,1`: each pair means “this many steps right, this many steps up.” A negative second number slopes downward. For example, `2,1` allows lines going two steps right for every one step up. Set capacities for your chosen directions if you want limited lines.

## Controls at a glance

| Control | What it does |
| --- | --- |
| **New game / Change** | Opens the settings menu. **Start game** replaces the current match; **Cancel** keeps it. |
| **Human / Computer** | Chooses who controls each player. Set both to Computer to watch a match. |
| **Two points / direction buttons** | Switches between selecting two points and making a cut with one point in a chosen direction. |
| **Board / Fit all** | Changes the view in whole-plane mode without changing the score. |
| **Room tint / Labels** | Shows or hides room shading and move/intersection markers. |
| **How to play** | Opens the rules and pauses computer play while the menu is open. |
| **Play again / Change rules** | Starts another match after a result. You can also close the result to inspect the final board. |

**Keyboard:** press Tab to focus the board, use the arrow keys to move between grid points, and press Enter or Space to select. Escape cancels the current selection.

**Touch:** tap once for each point, or choose a direction and tap one point. In whole-plane mode, use **Board** if the drawing grid has become too small.

## Playing with the computer

The computer follows the same rules as a human and can play either side. It is a practice opponent and can make mistakes. Opening settings or Help pauses computer play; closing the menu resumes it.

Games are played on one device. Online multiplayer and saved matches are not available, so reloading or closing the page ends the current session.

## Behind the game: line arrangements

A collection of distinct straight lines is called a **line arrangement**. Its regions are the rooms counted in whole-plane mode. Adding a line that meets earlier lines at `j` distinct points creates `j + 1` new regions. When several lines meet at one point, that crossing is counted once for the new line.

An arrangement is **simple** when no three lines meet at one point; parallel lines are allowed. If `m_i` lines have direction `i`, the number of regions in a simple arrangement is

$$
R = 1 + \sum_i m_i + \sum_{i<j} m_i m_j.
$$

This formula counts the entire plane. Board-only scores can be smaller because some intersections and rooms lie outside the square.

The preprint cited below studies the simple whole-plane game with arbitrary line offsets, under both Avoidance and Race. This browser game selects lines through pairs of grid points in a fixed square. Its available lines are therefore finite, and running out of legal cuts is an additional draw condition. The browser's capacity and multiple-intersection options provide further variations to explore.

## Development

The app uses React, TypeScript, Vite, and Zustand. [Source repository](https://github.com/shizuo-kaji/CutThePlane).

### Run locally

From the project directory:

```bash
npm ci
npm run dev
```

Open the local address printed by Vite.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run build` | Type-check and build the app into `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm test -- --run` | Run the test suite once. |
| `npm run lint` | Run ESLint. |

### Implementation notes

- **Rules and state:** [`src/core/state.ts`](src/core/state.ts) validates cuts, updates scores, and resolves wins and draws. [`src/hooks/useGameStore.ts`](src/hooks/useGameStore.ts) connects those rules to player input and computer turns.
- **Geometry:** [`src/geom`](src/geom) normalizes directions, identifies duplicate lines, and computes intersections. The UI describes a line by a vector along it; the paper describes it by a normal vector. For a UI direction `(dx, dy)`, one corresponding normal is `(-dy, dx)`.
- **Counting:** [`src/core/counting.ts`](src/core/counting.ts) uses the insertion formula above, restricting crossings to the square's interior for board scoring. Exact integer intersection keys identify repeated crossings. The original Euler-characteristic counter is retained as an independent check in the tests.
- **Display:** [`src/ui/GameBoard.tsx`](src/ui/GameBoard.tsx) handles the canvas, previews, keyboard input, and automatic view fitting. View bounds and room shading do not determine the score.
- **Computer:** [`src/ai/greedy.ts`](src/ai/greedy.ts) uses a bounded alpha-beta search over legal cuts. [`src/ai/worker.ts`](src/ai/worker.ts) runs it in a cancellable Web Worker; returned moves are checked again before being played.
- **Tests:** [`src/core/__tests__`](src/core/__tests__) covers room counts, rule variations, off-board triple points, capacities, draws, view fitting, and computer decisions.

### Deployment

[The GitHub Actions workflow](.github/workflows/deploy.yml) builds on Node 20 and publishes `dist/` to GitHub Pages on pushes to `main`. [The Vite configuration](vite.config.ts) uses relative asset paths.

## Reference and citation

Shizuo Kaji, Shota Maehara, and Hiroki Sasaki. *Cut the Plane: A Game on Line Arrangements*. Preprint.

To cite the mathematical study of the game, use the following BibTeX entry:

```bibtex
@unpublished{KajiMaeharaSasakiCutThePlane,
  author = {Kaji, Shizuo and Maehara, Shota and Sasaki, Hiroki},
  title  = {{Cut the Plane: A Game on Line Arrangements}},
  note   = {Preprint}
}
```
