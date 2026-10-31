# AGENT.md — Finite Automata Visualizer

You are improving an interactive web app for creating, visualizing and testing finite automata (DFA/NFA/ε-NFA). Read this whole file before changing anything. Work through the tasks in order, one task at a time.

## Project overview

- Plain TypeScript compiled with `tsc` to ES modules, served as static files. No framework, no bundler.
- Rendering is done on an HTML `<canvas>`.
- Automata are saved in `localStorage` and can be imported/exported as JSON.

### Layout

| Path | Purpose |
|---|---|
| `ts_src/models.ts` | Core classes (`State`, `Transition`, `FiniteAutomaton`) and algorithms: acceptance, NFA→DFA, minimization, regex conversion |
| `ts_src/renderer.ts` | Canvas drawing and hit-testing |
| `ts_src/storage.ts` | `localStorage` persistence and JSON import/export |
| `ts_src/main.ts` | UI wiring and event handlers (large; one closure with mutable state) |
| `js/` | Compiled output. It is committed, so rebuild it before finishing |
| `tests/models.test.mjs` | Unit tests for `js/models.js` using `node:test` |
| `index.html`, `css/style.css` | Markup and styles |

### Commands

```bash
npm install
npm run build   # tsc → js/
npm test        # builds, then runs node --test tests/*.test.mjs
npm start       # http-server for manual testing
```

## Domain rules (do not break these)

- The epsilon symbol is the constant `EPSILON` (`'ε'`) exported from `models.ts`. Any automaton containing an `ε` edge is non-deterministic.
- Transition symbols are **single characters**. Acceptance reads the input one character at a time, and regex output assumes single-character atoms.
- `acceptsString` simulates sets of states with ε-closure, so it works for DFAs, NFAs and ε-NFAs. Do not reintroduce a "must be deterministic" restriction.
- Use the existing helpers instead of duplicating logic: `epsilonClosure`, `rebuildAlphabet`, `hasEpsilonTransitions`, `FiniteAutomaton.layoutStates`, `removeUnreachableStates`.
- After deleting states or transitions, the alphabet must be rebuilt (`rebuildAlphabet`).
- Never build DOM from user-controlled strings with `innerHTML`. Use `textContent` or `createElement` (see `showRegexResult` in `main.ts`).
- Algorithms in `models.ts` must stay pure and DOM-free so they can be tested in Node.

## Working rules

1. **Tests first for logic.** Every change to `models.ts` (or new logic modules) needs tests in `tests/`. Use small hand-checkable automata and compare against a reference (for example, a JS `RegExp` or brute-force enumeration of short strings).
2. **Keep the build green.** Run `npm test` before finishing each task. It must pass with zero TypeScript errors.
3. **Rebuild `js/`.** Commit the compiled output together with the source changes.
4. **Small, focused commits**, one per task, with a clear message.
5. **Don't add dependencies** unless a task says so. If you think one is needed, explain why instead of adding it.
6. **Preserve existing behavior** that isn't part of the task: saving/loading, import/export, and the existing buttons. Old saved JSON must still load (new fields must be optional).
7. If a requirement is ambiguous, choose the simplest reasonable interpretation and note the assumption in the commit message or a code comment. Don't stop to ask unless you're truly blocked.

## Tasks

### Task 1 — Replace `prompt()`/`alert()`/`confirm()` with in-app UI

**Problem:** Adding a transition uses browser pop-ups. The double-click flow even asks the user to type a target state ID.

**Do:**
- Add a small inline editor or modal, anchored to the transition being created, to enter the symbol(s). It must support Enter to confirm and Escape to cancel, and must auto-focus.
- Creating a transition by double-clicking a state: the user clicks the **target state on the canvas** instead of typing an ID.
- Replace `alert()` messages (conversion, minimization, import errors) with the existing status area or a non-blocking toast. Replace `confirm()` for destructive actions with an in-app confirmation.
- Accept **comma-separated symbols** (`a,b`) and create one transition per symbol. Trim whitespace, ignore empty entries, and treat a lone `e` or `eps` as nothing special (only `ε` is epsilon; provide an "add ε" shortcut button/key).
- **Validate:** reject multi-character symbols with a clear message. Skip exact duplicate edges (same from, to, symbol).

**Acceptance:** no `prompt(`, `alert(` or `confirm(` remain in `ts_src/`. A transition can be created using only the mouse and keyboard. Entering `a,b` produces two transitions.

### Task 2 — Undo / redo and keyboard shortcuts

**Do:**
- Add a history stack (new file `ts_src/history.ts`) storing `toJSON()` snapshots. Push a snapshot before every mutation: add/delete/move state, add/edit/delete transition, toggle initial/final, convert, minimize, import, clear. Dragging a state counts as a single entry (snapshot on drag start or end, not on every mouse move).
- Cap the history (for example, 100 entries) and clear the redo stack on any new mutation.
- Shortcuts: `Ctrl/Cmd+Z` undo, `Ctrl+Y` or `Ctrl+Shift+Z` redo, `Delete`/`Backspace` removes the selected state (with confirmation from Task 1), `Escape` cancels the current mode. Ignore shortcuts while a text input is focused.
- Add Undo/Redo buttons that are disabled when the stack is empty.

**Acceptance:** after any operation, undo restores the exact previous automaton (states, positions, transitions, alphabet, initial/final flags). Unit-test the history class (push/undo/redo/cap) in Node.

### Task 3 — Step-by-step simulation

**Do:**
- Add a pure function in `models.ts`, for example `simulate(input): { step: number; symbol: string | null; states: number[] }[]`, returning the set of active states (after ε-closure) before the first symbol and after each symbol, plus whether the final set accepts. It must reuse `epsilonClosure` and must not change `acceptsString` behavior.
- Add UI controls: **Step**, **Play/Pause**, **Reset**, and a speed control. Show the consumed and remaining input, and highlight all currently active states on the canvas. When the input ends, show accepted or rejected. If the active set becomes empty, show "stuck" and stop.
- Highlighting is a renderer concern (`setActiveStates(ids)`); don't store it in the automaton or in saved JSON.

**Acceptance:** tests cover a DFA, an NFA with branching, and an ε-NFA, with the exact expected state sets at each step. Editing the automaton while a simulation is running resets the simulation.

### Task 4 — Show the subset-construction table

**Do:**
- Make `convertNFAtoDFA` able to return, or expose through a companion function, the mapping from each DFA state to its set of NFA states.
- Label DFA states after conversion (for example `{q0,q1}`) and show a table: rows are DFA states, columns are alphabet symbols, cells are the target sets. Mark the initial and accepting states.
- Keep the return type backward compatible for existing callers, or update all callers.

**Acceptance:** a test checks the table for the "ends in ab" NFA. Labels still render correctly after save and load (store the label as an optional field in the JSON).

### Task 5 — More automata operations

**Do** (each as a pure static method with tests):
- `complete(dfa)`: add a dead state and missing transitions so every state has a transition for every symbol.
- `complement(dfa)`: complete, then flip accepting states.
- `areEquivalent(a, b)`: language equivalence of two DFAs, with a counterexample string when they differ.
- Optionally, `regexToNFA(regex)` using Thompson's construction for a small regex grammar (union `|`, concatenation, star `*`, parentheses, `ε`). Include a parser with clear error messages for invalid input.

**Acceptance:** property-style tests compare results against brute-force membership checks on all strings up to length 6 over the alphabet.

### Task 6 — Robustness

**Do:**
- Validate imported JSON in `storage.ts`: correct types, unique state ids, every transition references an existing state, exactly zero or one initial state, single-character symbols. Return a specific error message on failure instead of `false`.
- Wrap all `localStorage` access in `try/catch` and surface a friendly message if storage is full or unavailable.
- Enable `"noImplicitAny": true` in `tsconfig.json` and fix the resulting errors with real types, not `any`.

**Acceptance:** tests cover malformed imports (missing fields, dangling transition, duplicate ids, bad symbol). The build is clean with `noImplicitAny` on.

### Task 7 — Refactor `main.ts`

**Do:**
- Split into focused modules, for example `editor.ts` (canvas interaction state), `ui.ts` (DOM wiring and status/toasts), `simulation.ts`, `history.ts`. No behavior changes in this task.
- Replace the shared mutable variables with a small state object or class.
- Keep each file under roughly 300 lines.

**Acceptance:** `npm test` passes, and a manual smoke test of every button still works.

### Task 8 — Polish, accessibility, export

**Do:**
- Scale the canvas for `devicePixelRatio` so it is sharp on high-DPI screens. Re-measure on window resize.
- Add pointer/touch support for dragging and tapping on tablets and phones.
- Remove `maximum-scale=1.0` from the viewport meta tag so users can pinch-zoom.
- Add visible focus styles, `aria-label`s on buttons, and an `aria-live` region for the status messages and simulation results.
- Add **Export PNG** and **Export SVG** buttons for the current diagram.
- Add a GitHub Actions workflow (`.github/workflows/ci.yml`) running `npm ci && npm test` on push and pull request.

**Acceptance:** the CI workflow passes. Exported images contain the whole automaton and aren't clipped.

## Definition of done (for every task)

- [ ] `npm test` passes with no TypeScript errors
- [ ] New logic has tests; existing tests are unchanged unless the behavior change is intended and explained
- [ ] `js/` is rebuilt and committed
- [ ] No new `innerHTML` with user-controlled data, no new `prompt/alert/confirm`
- [ ] Previously saved automata (old JSON) still load
- [ ] README updated if a user-facing feature was added
- [ ] You have manually tried the feature in the browser (`npm start`) and described what you checked

## Final report format

When you finish a task, report: what changed (files), how you verified it (commands and results), any assumptions or trade-offs, and anything you noticed but left alone. Do not claim something works unless you ran it.
