# Cut the Plane!

A browser-based implementation of the Planar Division Game. Players alternate drawing maximal lines on a lattice board; the player whose move causes the number of regions to reach the target loses.

## Getting Started

[Play online](https://shizuo-kaji.github.io/CutThePlane/) or run locally:

```bash
npm install
npm run dev
```

The dev server runs on Vite with hot module reload. Use the on-screen controls to adjust the board size, room target `M`, and admissible direction presets or provide custom direction vectors.

## Rules of Play

1. Players alternate turns. On your turn pick a lattice point on the grid as the start of your line.
2. Pick a second lattice point that lies in one of the admissible directions shown in the controls (or the Help overlay). The game automatically extends the line through both points to its maximal length within the board bounds.
3. Illegal selections (duplicate lines, boundary-parallel lines, or directions not in the admissible set) are rejected and the turn stays with the current player.
4. After every legal move the game recomputes the number of rooms—connected open regions of the board. If your move pushes the room count to or beyond the target value `M`, you lose immediately.

Use the Help button in the app header to display these rules in-game along with a quick summary of the available controls.

## Testing & Builds

- `npm test` — run Vitest unit tests for the core geometry and state reducers.
- `npm run build` — type-check the project and produce a production build.

## Deployment to GitHub Pages

This repo includes a reusable GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the app and publishes it to GitHub Pages.

1. Push the project to GitHub with the game source located in `web/`.
2. Ensure your default branch is named `main` (or adjust the workflow trigger).
3. In the repository settings, enable GitHub Pages with the “GitHub Actions” source option.
4. The workflow runs on every push to `main` (or via **Run workflow**) and deploys the contents of `web/dist` to Pages automatically.

Because `vite.config.ts` is configured with `base: './'`, the build uses relative asset paths that work out of the box on Pages deployments.

## Project Structure

- `src/core` — canonical state, reducers, and room-counting utilities.
- `src/geom` — direction normalization, line representation, and clipping helpers.
- `src/ui` — React components for the canvas renderer, HUD, and control panel.
- `src/hooks` — Zustand-powered store for UI state and move handling.

The room counter builds a planar graph from the board boundary plus the drawn lines and applies Euler’s characteristic to determine the number of regions. Tests cover representative geometries and rule-validation edge cases.
