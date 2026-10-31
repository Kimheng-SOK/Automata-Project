// Core Automata Classes
export class State {
    id: number;
    x: number;
    y: number;
    isInitial: boolean;
    isFinal: boolean;
    radius: number;

    constructor(id: number, x: number, y: number, isInitial: boolean = false, isFinal: boolean = false) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isInitial = isInitial;
        this.isFinal = isFinal;
        this.radius = 30;
    }
}

export class Transition {
    from: number;
    to: number;
    symbol: string;

    constructor(from: number, to: number, symbol: string) {
        this.from = from;
        this.to = to;
        this.symbol = symbol;
    }
}

export const EPSILON = 'ε';

export class FiniteAutomaton {
    states: State[];
    transitions: Transition[];
    alphabet: Set<string>;
    currentStateId: number;
    regex: string;

    constructor() {
        this.states = [];
        this.transitions = [];
        this.alphabet = new Set<string>();
        this.currentStateId = 0;
        this.regex = '';
    }

    addState(x: number, y: number, isInitial: boolean = false, isFinal: boolean = false): State {
        const state = new State(this.currentStateId++, x, y, isInitial, isFinal);
        this.states.push(state);
        return state;
    }

    addTransition(from: number, to: number, symbol: string): Transition | null {
        if (symbol && symbol.trim() !== '') {
            const transition = new Transition(from, to, symbol);
            this.transitions.push(transition);
            this.alphabet.add(symbol);
            return transition;
        }
        return null;
    }

    setInitialState(stateId: number): void {
        this.states.forEach(state => {
            state.isInitial = state.id === stateId;
        });
    }

    toggleFinalState(stateId: number): void {
        const state = this.states.find(s => s.id === stateId);
        if (state) {
            state.isFinal = !state.isFinal;
        }
    }

    deleteState(stateId: number): void {
        this.states = this.states.filter(state => state.id !== stateId);
        this.transitions = this.transitions.filter(
            trans => trans.from !== stateId && trans.to !== stateId
        );
        this.rebuildAlphabet();
    }

    deleteTransition(from: number, to: number, symbol: string): void {
        this.transitions = this.transitions.filter(
            trans => !(trans.from === from && trans.to === to && trans.symbol === symbol)
        );
        this.rebuildAlphabet();
    }

    // Keep the alphabet in sync with the transitions that actually exist
    rebuildAlphabet(): void {
        this.alphabet = new Set<string>(this.transitions.map(t => t.symbol));
    }

    hasEpsilonTransitions(): boolean {
        return this.transitions.some(t => t.symbol === EPSILON);
    }

    // All states reachable from `stateIds` using only ε-transitions (including the inputs)
    epsilonClosure(stateIds: Iterable<number>): Set<number> {
        const closure = new Set<number>(stateIds);
        const stack = Array.from(closure);
        while (stack.length > 0) {
            const id = stack.pop() as number;
            for (const t of this.transitions) {
                if (t.from === id && t.symbol === EPSILON && !closure.has(t.to)) {
                    closure.add(t.to);
                    stack.push(t.to);
                }
            }
        }
        return closure;
    }

    // Place states on a simple grid so generated automata are readable and stable
    static layoutStates(fa: FiniteAutomaton): void {
        const cols = Math.max(1, Math.ceil(Math.sqrt(fa.states.length)));
        fa.states.forEach((state, i) => {
            state.x = 80 + (i % cols) * 140;
            state.y = 80 + Math.floor(i / cols) * 130;
        });
    }

    isDeterministic(): boolean {
        // ε-moves make an automaton non-deterministic
        if (this.hasEpsilonTransitions()) return false;

        // For each (state, symbol) there may be at most one distinct target.
        // Duplicate identical edges are redundant, not non-deterministic.
        const seen = new Map<string, number>();
        for (const t of this.transitions) {
            const key = `${t.from}\u0000${t.symbol}`;
            const target = seen.get(key);
            if (target !== undefined && target !== t.to) return false;
            seen.set(key, t.to);
        }
        return true;
    }

    // Works for DFAs and NFAs (with or without ε-transitions) by tracking the set of current states
    acceptsString(input: string): boolean {
        const initial = this.states.filter(state => state.isInitial);
        if (initial.length !== 1) {
            console.error("No single initial state");
            return false;
        }

        let current = this.epsilonClosure([initial[0].id]);

        for (const symbol of input) {
            const moved = new Set<number>();
            for (const t of this.transitions) {
                if (t.symbol === symbol && current.has(t.from)) moved.add(t.to);
            }
            current = this.epsilonClosure(moved);
            if (current.size === 0) return false;
        }

        return Array.from(current).some(id => this.getStateById(id)?.isFinal === true);
    }

    getStateById(id: number): State | undefined {
        return this.states.find(state => state.id === id);
    }

    toJSON(): any {
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

    static fromJSON(json: any): FiniteAutomaton {
        const fa = new FiniteAutomaton();
        fa.states = json.states.map((s: any) => new State(s.id, s.x, s.y, s.isInitial, s.isFinal));
        fa.transitions = json.transitions.map((t: any) => new Transition(t.from, t.to, t.symbol));
        fa.alphabet = new Set<string>(json.alphabet);
        fa.currentStateId = json.currentStateId;
        fa.regex = json.regex || '';
        return fa;
    }

    static convertNFAtoDFA(nfa: FiniteAutomaton): FiniteAutomaton {
        if (nfa.isDeterministic()) {
            return nfa;
        }

        const initialState = nfa.states.find(s => s.isInitial);
        if (!initialState) throw new Error("NFA has no initial state");

        const keyOf = (set: Set<number>) => Array.from(set).sort((a, b) => a - b).join(',');
        const anyFinal = (set: Set<number>) =>
            Array.from(set).some(id => nfa.getStateById(id)?.isFinal === true);

        const dfa = new FiniteAutomaton();
        const stateMap = new Map<string, number>();

        const initialClosure = nfa.epsilonClosure([initialState.id]);
        const dfaInitial = dfa.addState(0, 0, true, anyFinal(initialClosure));
        stateMap.set(keyOf(initialClosure), dfaInitial.id);

        const unprocessed: Set<number>[] = [initialClosure];

        while (unprocessed.length > 0) {
            const currentSet = unprocessed.pop() as Set<number>;
            const currentDfaId = stateMap.get(keyOf(currentSet)) as number;

            for (const symbol of nfa.alphabet) {
                if (symbol === EPSILON) continue;

                const moved = new Set<number>();
                for (const t of nfa.transitions) {
                    if (t.symbol === symbol && currentSet.has(t.from)) moved.add(t.to);
                }
                if (moved.size === 0) continue;

                const target = nfa.epsilonClosure(moved);
                const targetKey = keyOf(target);

                if (!stateMap.has(targetKey)) {
                    const created = dfa.addState(0, 0, false, anyFinal(target));
                    stateMap.set(targetKey, created.id);
                    unprocessed.push(target);
                }

                dfa.addTransition(currentDfaId, stateMap.get(targetKey) as number, symbol);
            }
        }

        FiniteAutomaton.layoutStates(dfa);
        return dfa;
    }

    static minimizeDFA(dfa: FiniteAutomaton): FiniteAutomaton {
        if (!dfa.isDeterministic()) {
            console.error("Automaton is not deterministic");
            return dfa;
        }

        dfa = FiniteAutomaton.removeUnreachableStates(dfa);

        let partition: number[][] = [];
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
            const newPartition: number[][] = [];

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

    // Returns a copy of the automaton containing only states reachable from the initial state
    static removeUnreachableStates(fa: FiniteAutomaton): FiniteAutomaton {
        const initial = fa.states.find(s => s.isInitial);
        if (!initial) return fa;

        const reachable = new Set<number>([initial.id]);
        const stack = [initial.id];
        while (stack.length > 0) {
            const id = stack.pop() as number;
            for (const t of fa.transitions) {
                if (t.from === id && !reachable.has(t.to)) {
                    reachable.add(t.to);
                    stack.push(t.to);
                }
            }
        }
        if (reachable.size === fa.states.length) return fa;

        const pruned = new FiniteAutomaton();
        pruned.states = fa.states
            .filter(s => reachable.has(s.id))
            .map(s => new State(s.id, s.x, s.y, s.isInitial, s.isFinal));
        pruned.transitions = fa.transitions
            .filter(t => reachable.has(t.from) && reachable.has(t.to))
            .map(t => new Transition(t.from, t.to, t.symbol));
        pruned.currentStateId = fa.currentStateId;
        pruned.rebuildAlphabet();
        return pruned;
    }

    static splitPartitionGroup(dfa: FiniteAutomaton, group: number[], partition: number[][]): number[][] {
        const groupMap = new Map<string, number[]>();

        for (const stateId of group) {
            const signature: (number | null)[] = [];

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
            if (group) group.push(stateId);
        }

        return Array.from(groupMap.values());
    }

    static createMinimizedDFA(dfa: FiniteAutomaton, partition: number[][]): FiniteAutomaton {
        const minimized = new FiniteAutomaton();
        const stateToGroupMap = new Map<number, number>();

        partition.forEach((group, groupIndex) => {
            group.forEach(stateId => {
                stateToGroupMap.set(stateId, groupIndex);
            });
        });

        const newStates: State[] = [];
        partition.forEach((group, groupIndex) => {
            const isInitial = group.some(id => {
                const state = dfa.getStateById(id);
                return state ? state.isInitial : false;
            });
            const isFinal = group.some(id => {
                const state = dfa.getStateById(id);
                return state ? state.isFinal : false;
            });
            newStates[groupIndex] = minimized.addState(
                0,
                0,
                isInitial,
                isFinal
            );
        });

        FiniteAutomaton.layoutStates(minimized);

        const addedTransitions = new Set<string>();
        partition.forEach((group, groupIndex) => {
            const representativeState = group[0];

            for (const symbol of dfa.alphabet) {
                const transition = dfa.transitions.find(t => t.from === representativeState && t.symbol === symbol);
                if (!transition) continue;

                const targetGroup = stateToGroupMap.get(transition.to);
                if (targetGroup === undefined) continue;

                const transitionKey = `${groupIndex}-${targetGroup}-${symbol}`;

                if (!addedTransitions.has(transitionKey)) {
                    minimized.addTransition(newStates[groupIndex].id, newStates[targetGroup].id, symbol);
                    addedTransitions.add(transitionKey);
                }
            }
        });

        return minimized;
    }

    // State elimination on a generalized NFA (new start/accept states, regex labels on edges).
    // Precedence: 0 = union, 1 = concatenation, 2 = atom or starred expression.
    static convertToRegex(automaton: FiniteAutomaton): string {
        type Re = { s: string; p: number };
        const eps: Re = { s: EPSILON, p: 2 };
        const wrap = (r: Re, minPrec: number) => (r.p < minPrec ? `(${r.s})` : r.s);

        const union = (a: Re | undefined, b: Re | undefined): Re | undefined => {
            if (!a) return b;
            if (!b) return a;
            if (a.s === b.s) return a;
            return { s: `${a.s}|${b.s}`, p: 0 };
        };
        const concat = (a: Re | undefined, b: Re | undefined): Re | undefined => {
            if (!a || !b) return undefined;
            if (a.s === EPSILON) return b;
            if (b.s === EPSILON) return a;
            return { s: `${wrap(a, 1)}${wrap(b, 1)}`, p: 1 };
        };
        const star = (a: Re | undefined): Re => {
            if (!a || a.s === EPSILON) return eps;
            if (a.s.endsWith('*') && a.p === 2) return a;
            return { s: `${wrap(a, 2)}*`, p: 2 };
        };

        const START = -1;
        const ACCEPT = -2;
        const edges = new Map<string, Re>();
        const key = (i: number, j: number) => `${i}>${j}`;
        const addEdge = (i: number, j: number, r: Re) => {
            edges.set(key(i, j), union(edges.get(key(i, j)), r) as Re);
        };

        const initial = automaton.states.find(s => s.isInitial);
        if (!initial) return '∅';

        addEdge(START, initial.id, eps);
        automaton.states.filter(s => s.isFinal).forEach(s => addEdge(s.id, ACCEPT, eps));
        automaton.transitions.forEach(t => addEdge(t.from, t.to, { s: t.symbol, p: 2 }));

        let remaining = automaton.states.map(s => s.id);

        for (const k of automaton.states.map(s => s.id)) {
            const loop = star(edges.get(key(k, k)));
            const others = [START, ACCEPT, ...remaining.filter(id => id !== k)];

            for (const i of others) {
                const incoming = edges.get(key(i, k));
                if (!incoming) continue;
                for (const j of others) {
                    const outgoing = edges.get(key(k, j));
                    if (!outgoing) continue;
                    const through = concat(concat(incoming, loop), outgoing);
                    if (through) addEdge(i, j, through);
                }
            }

            // Drop every edge touching the eliminated state
            for (const e of Array.from(edges.keys())) {
                const [a, b] = e.split('>').map(Number);
                if (a === k || b === k) edges.delete(e);
            }
            remaining = remaining.filter(id => id !== k);
        }

        const result = edges.get(key(START, ACCEPT));
        return result ? result.s : '∅';
    }
}
