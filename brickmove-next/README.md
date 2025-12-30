# BrickMove Next

This is a new version of the BrickMove application, built with Next.js, React, and Tailwind CSS.

## Features

- **Tree Structure**: Break down mathematical statements step-by-step.
- **Leaf Node APIs**: Map leaf nodes to Lean4 Mathlib APIs.
- **Dynamic Updates**: When a node is broken down further, it loses its API mapping (as it's no longer a leaf).
- **Persistence**: Save and load the proof tree to `data/tree.json`.

## Getting Started

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```

3.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Project Structure

- `src/app/page.tsx`: Main application page.
- `src/components/TreeNodeComponent.tsx`: Recursive tree node component.
- `src/types/index.ts`: TypeScript definitions.
- `src/app/api/tree/route.ts`: API route for saving/loading the tree.
