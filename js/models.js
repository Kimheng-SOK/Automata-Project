// Core Automata Classes
export class State {
    constructor(id, x, y, isInitial = false, isFinal = false) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isInitial = isInitial;
        this.isFinal = isFinal;
        this.radius = 30;
    }
}
export class Transition {
    constructor(from, to, symbol) {
        this.from = from;
        this.to = to;
        this.symbol = symbol;
    }
}
export class FiniteAutomaton {
    constructor() {
        this.states = [];
        this.transitions = [];
        this.alphabet = new Set();
        this.currentStateId = 0;
        this.regex = '';
    }
    addState(x, y, isInitial = false, isFinal = false) {
        const state = new State(this.currentStateId++, x, y, isInitial, isFinal);
        this.states.push(state);
        return state;
    }
    addTransition(from, to, symbol) {
        if (symbol && symbol.trim() !== '') {
            const transition = new Transition(from, to, symbol);
            this.transitions.push(transition);
            this.alphabet.add(symbol);
            return transition;
        }
        return null;
    }
    setInitialState(stateId) {
        this.states.forEach(state => {
            state.isInitial = state.id === stateId;
        });
    }
    toggleFinalState(stateId) {
        const state = this.states.find(s => s.id === stateId);
        if (state) {
            state.isFinal = !state.isFinal;
        }
    }
    deleteState(stateId) {
        this.states = this.states.filter(state => state.id !== stateId);
        this.transitions = this.transitions.filter(trans => trans.from !== stateId && trans.to !== stateId);
    }
    deleteTransition(from, to, symbol) {
        this.transitions = this.transitions.filter(trans => !(trans.from === from && trans.to === to && trans.symbol === symbol));
    }
    isDeterministic() {
        const stateTransitionMap = new Map();
        for (const state of this.states) {
            stateTransitionMap.set(state.id, new Map());
        }
        for (const transition of this.transitions) {
            const symbolMap = stateTransitionMap.get(transition.from);
            if (symbolMap && symbolMap.has(transition.symbol)) {
                return false;
            }
            symbolMap?.set(transition.symbol, transition.to);
        }
        return true;
    }
    acceptsString(input) {
        if (!this.isDeterministic()) {
            console.error("Automaton is not deterministic");
            return false;
        }
        let currentStates = this.states.filter(state => state.isInitial);
        if (currentStates.length !== 1) {
            console.error("No single initial state");
            return false;
        }
        for (const symbol of input) {
            if (!this.alphabet.has(symbol)) {
                return false;
            }
            const nextStates = this.transitions
                .filter(t => t.from === currentStates[0].id && t.symbol === symbol)
                .map(t => this.states.find(s => s.id === t.to));
            if (nextStates.length !== 1 || !nextStates[0]) {
                return false;
            }
            currentStates = nextStates;
        }
        return currentStates[0].isFinal;
    }
    getStateById(id) {
        return this.states.find(state => state.id === id);
    }
    toJSON() {
        return {
            states: this.states.map(state => ({
                id: state.id,
                x: state.x,
                y: state.y,
                isInitial: state.isInitial,
                isFinal: state.isFinal
            })),
            transitions: this.transitions.map(trans => ({
                from: trans.from,
                to: trans.to,
                symbol: trans.symbol
            })),
            alphabet: Array.from(this.alphabet),
            currentStateId: this.currentStateId,
            regex: this.regex
        };
    }
    static fromJSON(json) {
        const fa = new FiniteAutomaton();
        fa.states = json.states.map((s) => new State(s.id, s.x, s.y, s.isInitial, s.isFinal));
        fa.transitions = json.transitions.map((t) => new Transition(t.from, t.to, t.symbol));
        fa.alphabet = new Set(json.alphabet);
        fa.currentStateId = json.currentStateId;
        fa.regex = json.regex || '';
        return fa;
    }
    static convertNFAtoDFA(nfa) {
        if (nfa.isDeterministic()) {
            return nfa;
        }
        const dfa = new FiniteAutomaton();
        const stateMap = new Map();
        function epsilonClosure(states) {
            const closure = new Set(states);
            let changed = true;
            while (changed) {
                changed = false;
                for (const stateId of closure) {
                    nfa.transitions
                        .filter(t => t.from === stateId && t.symbol === 'ε')
                        .forEach(t => {
                        if (!closure.has(t.to)) {
                            closure.add(t.to);
                            changed = true;
                        }
                    });
                }
            }
            return closure;
        }
        const initialState = nfa.states.find(s => s.isInitial);
        if (!initialState)
            throw new Error("NFA has no initial state");
        const initialClosure = epsilonClosure([initialState.id]);
        const initialStateKey = Array.from(initialClosure).sort().join(',');
        const dfaInitialState = dfa.addState(50, 50, true, Array.from(initialClosure).some(id => {
            const state = nfa.getStateById(id);
            return state ? state.isFinal : false;
        }));
        stateMap.set(initialStateKey, dfaInitialState.id);
        const unprocessedStates = [initialClosure];
        while (unprocessedStates.length > 0) {
            const currentNFAStates = unprocessedStates.pop();
            if (!currentNFAStates)
                continue;
            const currentStateKey = Array.from(currentNFAStates).sort().join(',');
            const currentDFAStateId = stateMap.get(currentStateKey);
            if (currentDFAStateId === undefined)
                continue;
            for (const symbol of nfa.alphabet) {
                if (symbol === 'ε')
                    continue;
                const moveResult = new Set();
                for (const stateId of currentNFAStates) {
                    nfa.transitions
                        .filter(t => t.from === stateId && t.symbol === symbol)
                        .forEach(t => moveResult.add(t.to));
                }
                if (moveResult.size === 0)
                    continue;
                const newStateSet = epsilonClosure(Array.from(moveResult));
                const newStateKey = Array.from(newStateSet).sort().join(',');
                if (!stateMap.has(newStateKey)) {
                    const isFinal = Array.from(newStateSet).some(id => {
                        const state = nfa.getStateById(id);
                        return state ? state.isFinal : false;
                    });
                    const newDFAState = dfa.addState(50 + Math.random() * 300, 50 + Math.random() * 200, false, isFinal);
                    stateMap.set(newStateKey, newDFAState.id);
                    unprocessedStates.push(newStateSet);
                }
                dfa.addTransition(currentDFAStateId, stateMap.get(newStateKey), symbol);
            }
        }
        return dfa;
    }
    static minimizeDFA(dfa) {
        if (!dfa.isDeterministic()) {
            console.error("Automaton is not deterministic");
            return dfa;
        }
        let partition = [];
        const finalStates = new Set(dfa.states.filter(s => s.isFinal).map(s => s.id));
        const nonFinalStates = new Set(dfa.states.filter(s => !s.isFinal).map(s => s.id));
        if (finalStates.size > 0)
            partition.push(Array.from(finalStates));
        if (nonFinalStates.size > 0)
            partition.push(Array.from(nonFinalStates));
        if (partition.length === 1) {
            return this.createMinimizedDFA(dfa, partition);
        }
        let changed = true;
        while (changed) {
            changed = false;
            const newPartition = [];
            for (const group of partition) {
                if (group.length === 1) {
                    newPartition.push(group);
                    continue;
                }
                const splitGroups = this.splitPartitionGroup(dfa, group, partition);
                if (splitGroups.length > 1)
                    changed = true;
                newPartition.push(...splitGroups);
            }
            partition = newPartition;
        }
        return this.createMinimizedDFA(dfa, partition);
    }
    static splitPartitionGroup(dfa, group, partition) {
        const groupMap = new Map();
        for (const stateId of group) {
            const signature = [];
            for (const symbol of dfa.alphabet) {
                const transition = dfa.transitions.find(t => t.from === stateId && t.symbol === symbol);
                if (!transition) {
                    signature.push(null);
                    continue;
                }
                const targetGroupIndex = partition.findIndex(g => g.includes(transition.to));
                signature.push(targetGroupIndex);
            }
            const signatureKey = JSON.stringify(signature);
            if (!groupMap.has(signatureKey)) {
                groupMap.set(signatureKey, []);
            }
            const group = groupMap.get(signatureKey);
            if (group)
                group.push(stateId);
        }
        return Array.from(groupMap.values());
    }
    static createMinimizedDFA(dfa, partition) {
        const minimized = new FiniteAutomaton();
        const stateToGroupMap = new Map();
        partition.forEach((group, groupIndex) => {
            group.forEach(stateId => {
                stateToGroupMap.set(stateId, groupIndex);
            });
        });
        const newStates = [];
        partition.forEach((group, groupIndex) => {
            const isInitial = group.some(id => {
                const state = dfa.getStateById(id);
                return state ? state.isInitial : false;
            });
            const isFinal = group.some(id => {
                const state = dfa.getStateById(id);
                return state ? state.isFinal : false;
            });
            newStates[groupIndex] = minimized.addState(50 + groupIndex * 100, 50 + (groupIndex % 2) * 150, isInitial, isFinal);
        });
        const addedTransitions = new Set();
        partition.forEach((group, groupIndex) => {
            const representativeState = group[0];
            for (const symbol of dfa.alphabet) {
                const transition = dfa.transitions.find(t => t.from === representativeState && t.symbol === symbol);
                if (!transition)
                    continue;
                const targetGroup = stateToGroupMap.get(transition.to);
                if (targetGroup === undefined)
                    continue;
                const transitionKey = `${groupIndex}-${targetGroup}-${symbol}`;
                if (!addedTransitions.has(transitionKey)) {
                    minimized.addTransition(newStates[groupIndex].id, newStates[targetGroup].id, symbol);
                    addedTransitions.add(transitionKey);
                }
            }
        });
        return minimized;
    }
    static convertToRegex(automaton) {
        // Make a copy of the automaton to work with
        const dfa = new FiniteAutomaton();
        const stateMap = new Map();
        // Copy states
        automaton.states.forEach(state => {
            const newState = dfa.addState(state.x, state.y, state.isInitial, state.isFinal);
            stateMap.set(state.id, newState.id);
        });
        // Copy transitions
        automaton.transitions.forEach(transition => {
            const fromId = stateMap.get(transition.from);
            const toId = stateMap.get(transition.to);
            if (fromId !== undefined && toId !== undefined) {
                dfa.addTransition(fromId, toId, transition.symbol);
            }
        });
        // Add a new start state if needed
        let startState = dfa.states.findIndex(s => s.isInitial);
        if (startState === -1) {
            // No initial state, so create one
            const newStart = dfa.addState(0, 0, true, false);
            startState = dfa.states.length - 1;
        }
        // Add a new single accepting state if needed
        const finalStates = dfa.states.filter(s => s.isFinal);
        let acceptState;
        if (finalStates.length === 0) {
            // No final states, so create one
            acceptState = dfa.addState(100, 100, false, true).id;
        }
        else if (finalStates.length === 1) {
            // Just one final state
            acceptState = finalStates[0].id;
        }
        else {
            // Multiple final states, create a new single final state
            acceptState = dfa.addState(100, 100, false, true).id;
            // Add epsilon transitions from all original final states to the new final state
            finalStates.forEach(state => {
                if (state.id !== acceptState) {
                    dfa.addTransition(state.id, acceptState, 'ε');
                    state.isFinal = false; // No longer a final state
                }
            });
        }
        // State elimination algorithm
        const elimOrder = dfa.states
            .filter(s => !s.isInitial && s.id !== acceptState)
            .map(s => s.id);
        // For each state to eliminate
        for (const stateId of elimOrder) {
            // Find all transitions to this state
            const incomingTransitions = dfa.transitions.filter(t => t.to === stateId);
            // Find all transitions from this state
            const outgoingTransitions = dfa.transitions.filter(t => t.from === stateId);
            // Find self-loops (for Kleene star)
            const selfLoops = dfa.transitions.filter(t => t.from === stateId && t.to === stateId);
            const selfLoopRegex = selfLoops.length > 0 ?
                `(${selfLoops.map(t => t.symbol).join('|')})* ` :
                '';
            // For each incoming-outgoing pair, create a new transition
            for (const incoming of incomingTransitions) {
                if (incoming.from === stateId)
                    continue; // Skip self-loops
                for (const outgoing of outgoingTransitions) {
                    if (outgoing.to === stateId)
                        continue; // Skip self-loops
                    // Create a new compound transition
                    const newRegex = `${incoming.symbol}${selfLoopRegex}${outgoing.symbol}`;
                    // Check if there's already a transition between these states
                    const existingTransition = dfa.transitions.find(t => t.from === incoming.from && t.to === outgoing.to);
                    if (existingTransition) {
                        // Update the existing transition with OR
                        existingTransition.symbol = `(${existingTransition.symbol}|${newRegex})`;
                    }
                    else {
                        // Create a new transition
                        dfa.addTransition(incoming.from, outgoing.to, newRegex);
                    }
                }
            }
            // Remove all transitions to/from the eliminated state
            dfa.transitions = dfa.transitions.filter(t => t.from !== stateId && t.to !== stateId);
        }
        // Get the remaining transitions from start to accept
        const remainingTransitions = dfa.transitions.filter(t => dfa.states[startState] &&
            t.from === dfa.states[startState].id &&
            t.to === acceptState);
        if (remainingTransitions.length === 0) {
            return '∅'; // Empty language
        }
        // Combine all remaining transitions with OR
        const regex = remainingTransitions.map(t => t.symbol).join('|');
        // Simplify the regex if possible
        return this.simplifyRegex(regex);
    }
    static simplifyRegex(regex) {
        // Basic simplifications
        let simplified = regex;
        // Remove unnecessary parentheses
        simplified = simplified.replace(/\(([^|()]+)\)/g, '$1');
        // Simplify a|a to a
        const pattern = /\(([^()]+)\|\1\)/g;
        while (pattern.test(simplified)) {
            simplified = simplified.replace(pattern, '$1');
        }
        // Simplify (a)* to a*
        simplified = simplified.replace(/\(([^|()]+)\)\*/g, '$1*');
        return simplified;
    }
}
