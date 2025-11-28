# arena_irrigation_planner
Arena Irrigation Planner

Simple static HTML/JS tool to help plan a perimeter big-gun irrigation system for a rectangular arena.

## Features

- Input arena width and length (in feet).
- Choose a sprinkler radius (pre-set for Nelson 75 / 100 series or custom).
- Choose sprinkler placement mode:
  - Corners only
  - Automatically spaced along the entire perimeter
- Graphical arena view using HTML5 Canvas:
  - Shows arena outline
  - Displays approximate sprinkler coverage circles
  - Lets you draw rectangular "no-go" areas where sprinklers cannot be placed (e.g. near gates, seating, buildings).
- Automatically computes:
  - Number of sprinklers
  - Estimated length of 4" perimeter mainline pipe
  - Rough thrust-block counts
- Builds a basic "shopping list" that you can export to PDF via your browser's print dialog.

## Usage

1. Open `index.html` in a modern browser (Chrome, Edge, Safari, Firefox).
2. Enter your arena width and length (in feet).
3. Select a sprinkler type or custom radius.
4. Select placement mode:
   - **Corners only** â sprinklers only at arena corners, if allowed by no-go areas.
   - **Perimeter auto** â sprinklers automatically spaced along all four sides.
5. To add a no-go area:
   - Click **Start No-Go Area**.
   - Click one corner of the restricted region on the arena graphic.
   - Click the opposite corner to finish.
6. Click **Recalculate Layout** to update sprinklers and shopping list.
7. Click **Export Shopping List to PDF** to open your browserâs print dialog.
   - Choose **Save as PDF** as the destination.

## Notes & Limitations

- This tool provides **approximate** coverage and pipe length; it is only for preliminary planning.
- Sprinkler hydraulics, pump sizing, and structural design (thrust blocks, risers) must be validated by a qualified engineer or installer.
- Export to PDF is implemented using the browserâs `window.print()` function and a print-focused stylesheet which prints only the shopping list section.
