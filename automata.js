// Core Automata Classes
class State {
    constructor(id, x, y, isInitial = false, isFinal = false) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isInitial = isInitial;
        this.isFinal = isFinal;
        this.radius = 30;
    }
}

class Transition {
    constructor(from, to, symbol) {
        this.from = from;
        this.to = to;
        this.symbol = symbol;
    }
}

class FiniteAutomaton {
    constructor() {
        this.states = [];
        this.transitions = [];
        this.alphabet = new Set();
        this.currentStateId = 0;
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
        this.transitions = this.transitions.filter(
            trans => trans.from !== stateId && trans.to !== stateId
        );
    }

    deleteTransition(from, to, symbol) {
        this.transitions = this.transitions.filter(
            trans => !(trans.from === from && trans.to === to && trans.symbol === symbol)
        );
    }

    isDeterministic() {
        const stateTransitionMap = new Map();

        for (const state of this.states) {
            stateTransitionMap.set(state.id, new Map());
        }

        for (const transition of this.transitions) {
            const symbolMap = stateTransitionMap.get(transition.from);
            if (symbolMap.has(transition.symbol)) {
                return false;
            }
            symbolMap.set(transition.symbol, transition.to);
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

            if (nextStates.length !== 1) {
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
            currentStateId: this.currentStateId
        };
    }

    static fromJSON(json) {
        const fa = new FiniteAutomaton();
        fa.states = json.states.map(s => new State(s.id, s.x, s.y, s.isInitial, s.isFinal));
        fa.transitions = json.transitions.map(t => new Transition(t.from, t.to, t.symbol));
        fa.alphabet = new Set(json.alphabet);
        fa.currentStateId = json.currentStateId;
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
        if (!initialState) throw new Error("NFA has no initial state");

        const initialClosure = epsilonClosure([initialState.id]);
        const initialStateKey = Array.from(initialClosure).sort().join(',');

        const dfaInitialState = dfa.addState(50, 50, true,
            Array.from(initialClosure).some(id => nfa.getStateById(id).isFinal));
        stateMap.set(initialStateKey, dfaInitialState.id);

        const unprocessedStates = [initialClosure];

        while (unprocessedStates.length > 0) {
            const currentNFAStates = unprocessedStates.pop();
            const currentStateKey = Array.from(currentNFAStates).sort().join(',');
            const currentDFAStateId = stateMap.get(currentStateKey);

            for (const symbol of nfa.alphabet) {
                if (symbol === 'ε') continue;

                const moveResult = new Set();
                for (const stateId of currentNFAStates) {
                    nfa.transitions
                        .filter(t => t.from === stateId && t.symbol === symbol)
                        .forEach(t => moveResult.add(t.to));
                }

                if (moveResult.size === 0) continue;

                const newStateSet = epsilonClosure(Array.from(moveResult));
                const newStateKey = Array.from(newStateSet).sort().join(',');

                if (!stateMap.has(newStateKey)) {
                    const isFinal = Array.from(newStateSet).some(id => nfa.getStateById(id).isFinal);
                    const newDFAState = dfa.addState(
                        50 + Math.random() * 300,
                        50 + Math.random() * 200,
                        false,
                        isFinal
                    );
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

        if (finalStates.size > 0) partition.push(Array.from(finalStates));
        if (nonFinalStates.size > 0) partition.push(Array.from(nonFinalStates));

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
                if (splitGroups.length > 1) changed = true;
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
            groupMap.get(signatureKey).push(stateId);
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
            const isInitial = group.some(id => dfa.getStateById(id).isInitial);
            const isFinal = group.some(id => dfa.getStateById(id).isFinal);
            const newState = minimized.addState(
                50 + groupIndex * 100,
                50 + (groupIndex % 2) * 150,
                isInitial,
                isFinal
            );
            newStates[groupIndex] = newState;
        });

        const addedTransitions = new Set();
        partition.forEach((group, groupIndex) => {
            const representativeState = group[0];

            for (const symbol of dfa.alphabet) {
                const transition = dfa.transitions.find(t => t.from === representativeState && t.symbol === symbol);
                if (!transition) continue;

                const targetGroup = stateToGroupMap.get(transition.to);
                const transitionKey = `${groupIndex}-${targetGroup}-${symbol}`;

                if (!addedTransitions.has(transitionKey)) {
                    minimized.addTransition(newStates[groupIndex].id, newStates[targetGroup].id, symbol);
                    addedTransitions.add(transitionKey);
                }
            }
        });

        return minimized;
    }
}