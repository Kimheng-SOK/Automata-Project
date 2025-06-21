# Finite Automata Visualizer

An interactive web application for creating, visualizing, and testing finite automata (DFA and NFA).

## Features

- Create and edit states and transitions
- Set initial and final states
- Test string acceptance
- Check if automaton is deterministic
- Convert NFA to DFA
- Minimize DFA
- Save and load automata
- Import/export automata as JSON

## Development Setup

### Prerequisites

- Node.js and npm

### Installation

```bash
# Install dependencies
npm install

# Build TypeScript files
npm run build

# Start development server
npm start
```

### Development

For active development with auto-rebuild:

```bash
npm run watch
```

## Project Structure

- `ts_src/` - TypeScript source files
  - `models.ts` - Core automata classes and algorithms
  - `renderer.ts` - Canvas rendering logic
  - `storage.ts` - LocalStorage persistence
  - `main.ts` - Main application logic
- `js/` - Compiled JavaScript files
- `index.html` - Main HTML file
- `style.css` - CSS styles

## License

MIT
