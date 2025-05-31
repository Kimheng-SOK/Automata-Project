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

class AutomataStorage {
    static STORAGE_KEY = 'finiteAutomata';

    static saveAutomata(name, automata) {
        const savedAutomata = this.getAllAutomata();
        savedAutomata[name] = automata.toJSON();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedAutomata));
    }

    static getAllAutomata() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : {};
    }

    static getAutomata(name) {
        const all = this.getAllAutomata();
        return all[name] ? FiniteAutomaton.fromJSON(all[name]) : null;
    }

    static deleteAutomata(name) {
        const savedAutomata = this.getAllAutomata();
        delete savedAutomata[name];
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedAutomata));
    }

    static getAutomataNames() {
        return Object.keys(this.getAllAutomata());
    }

    static deleteAllAutomata() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    static exportAutomata(name) {
        const all = this.getAllAutomata();
        return all[name] ? JSON.stringify(all[name], null, 2) : null;
    }

    static importAutomata(name, jsonData) {
        try {
            const data = JSON.parse(jsonData);
            if (data.states && data.transitions) {
                const savedAutomata = this.getAllAutomata();
                savedAutomata[name] = data;
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(savedAutomata));
                return true;
            }
        } catch (e) {
            console.error("Invalid automata data", e);
        }
        return false;
    }
}

// Main Application
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('automata-canvas');
    const ctx = canvas.getContext('2d');
    let currentAutomata = new FiniteAutomaton();
    let selectedState = null;
    let isAddingTransition = false;
    let transitionStartState = null;
    let isDragging = false;
    let dragState = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    // UI Elements
    const testStringInput = document.getElementById('test-string');
    const testResultDiv = document.getElementById('test-result');
    const deterministicResultDiv = document.getElementById('deterministic-result');
    const automataPropertiesDiv = document.getElementById('automata-properties');
    const savedAutomataList = document.getElementById('saved-automata');
    const automataNameInput = document.getElementById('automata-name');
    const statusMessage = document.getElementById('status-message');
    const stateCount = document.getElementById('state-count');
    const transitionCount = document.getElementById('transition-count');
    const exportNotification = document.getElementById('export-notification');
    
    // Transition Editor Modal Elements
    const modal = document.getElementById('transition-modal');
    const closeBtn = document.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancel-edit');
    const saveBtn = document.getElementById('save-transition');
    const symbolList = document.getElementById('symbol-list');
    const newSymbolInput = document.getElementById('new-symbol');
    const addSymbolBtn = document.getElementById('add-symbol');
    const addEpsilonBtn = document.getElementById('add-epsilon');
    let currentEditTransition = null;
    let currentEditSymbols = [];
    
    // Initialize
    renderAutomata();
    updateSavedAutomataList();
    updateProperties();
    updateStatus("Ready");
    
    // Event Listeners
    document.getElementById('add-state').addEventListener('click', function() {
        const x = Math.random() * (canvas.width - 60) + 30;
        const y = Math.random() * (canvas.height - 60) + 30;
        currentAutomata.addState(x, y);
        renderAutomata();
        updateProperties();
        updateStatus("State added");
    });
    
    document.getElementById('add-transition').addEventListener('click', function() {
        isAddingTransition = !isAddingTransition;
        transitionStartState = null;
        this.classList.toggle('active', isAddingTransition);
        renderAutomata();
        updateStatus(isAddingTransition ? "Select first state for transition" : "Transition mode canceled");
    });
    
    document.getElementById('set-initial').addEventListener('click', function() {
        if (selectedState !== null) {
            currentAutomata.setInitialState(selectedState);
            renderAutomata();
            updateProperties();
            updateStatus("Initial state set");
        } else {
            updateStatus("Select a state first");
        }
    });
    
    document.getElementById('set-final').addEventListener('click', function() {
        if (selectedState !== null) {
            currentAutomata.toggleFinalState(selectedState);
            renderAutomata();
            updateProperties();
            updateStatus("Final state toggled");
        } else {
            updateStatus("Select a state first");
        }
    });
    
    document.getElementById('delete-element').addEventListener('click', function() {
        if (selectedState !== null) {
            if (confirm('Delete this state and all its transitions?')) {
                currentAutomata.deleteState(selectedState);
                selectedState = null;
                renderAutomata();
                updateProperties();
                updateStatus("State deleted");
            }
        } else {
            updateStatus("Select a state to delete");
        }
    });
    
    document.getElementById('test-acceptance').addEventListener('click', function() {
        const inputString = testStringInput.value;
        if (inputString === "") {
            updateStatus("Enter a string to test");
            return;
        }
        
        try {
            const result = currentAutomata.acceptsString(inputString);
            testResultDiv.textContent = result ? 
                `String "${inputString}" is accepted` : 
                `String "${inputString}" is not accepted`;
            testResultDiv.className = result ? 'success result' : 'error result';
            updateStatus(result ? "String accepted" : "String rejected");
        } catch (e) {
            testResultDiv.textContent = `Error: ${e.message}`;
            testResultDiv.className = 'error result';
            updateStatus("Error testing string");
        }
    });
    
    document.getElementById('check-deterministic').addEventListener('click', function() {
        const isDfa = currentAutomata.isDeterministic();
        deterministicResultDiv.textContent = isDfa ? 
            'The automaton is deterministic (DFA)' : 
            'The automaton is non-deterministic (NFA)';
        deterministicResultDiv.className = isDfa ? 'success result' : 'error result';
        updateStatus(isDfa ? "Automaton is deterministic" : "Automaton is non-deterministic");
    });
    
    document.getElementById('convert-to-dfa').addEventListener('click', function() {
        try {
            currentAutomata = FiniteAutomaton.convertNFAtoDFA(currentAutomata);
            renderAutomata();
            updateProperties();
            updateStatus("NFA converted to DFA");
        } catch (e) {
            console.error('Conversion error:', e);
            alert(`Conversion failed: ${e.message}`);
            updateStatus("Conversion error");
        }
    });
    
    document.getElementById('minimize-dfa').addEventListener('click', function() {
        try {
            currentAutomata = FiniteAutomaton.minimizeDFA(currentAutomata);
            renderAutomata();
            updateProperties();
            updateStatus("DFA minimized");
        } catch (e) {
            console.error('Minimization error:', e);
            alert(`Minimization failed: ${e.message}`);
            updateStatus("Minimization error");
        }
    });
    
    document.getElementById('save-automata').addEventListener('click', function() {
        const name = automataNameInput.value.trim();
        if (name) {
            AutomataStorage.saveAutomata(name, currentAutomata);
            updateSavedAutomataList();
            automataNameInput.value = '';
            updateStatus(`Automata saved as "${name}"`);
        } else {
            updateStatus("Enter a name for the automata");
        }
    });
    
    document.getElementById('new-automata').addEventListener('click', function() {
        currentAutomata = new FiniteAutomaton();
        selectedState = null;
        renderAutomata();
        updateProperties();
        updateStatus("New automata created");
    });
    
    document.getElementById('export-automata').addEventListener('click', function() {
        const name = prompt("Enter a name for this automata:");
        if (name) {
            const exportData = AutomataStorage.exportAutomata(name) || 
                            JSON.stringify(currentAutomata.toJSON(), null, 2);
            
            // Save in localStorage
            AutomataStorage.saveAutomata(name, currentAutomata);
            
            // Download as file
            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name.replace(/[^\w]/g, '_')}_automata.json`;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            // Show notification
            exportNotification.textContent = `Automata exported to ${a.download}`;
            exportNotification.style.display = 'block';
            setTimeout(() => {
                exportNotification.style.display = 'none';
            }, 3000);
            
            updateStatus(`Automata exported as "${a.download}"`);
        }
    });
    
    document.getElementById('import-automata').addEventListener('click', function() {
        document.getElementById('import-file').click();
    });
    
    document.getElementById('import-file').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const name = prompt("Enter a name for the imported automata:");
            if (name) {
                if (AutomataStorage.importAutomata(name, event.target.result)) {
                    updateSavedAutomataList();
                    alert("Automata imported successfully!");
                    updateStatus(`Automata "${name}" imported`);
                } else {
                    alert("Failed to import automata. Invalid format.");
                    updateStatus("Import failed");
                }
            }
        };
        reader.readAsText(file);
        this.value = '';
    });
    
    document.getElementById('delete-all-automata').addEventListener('click', function() {
        if (confirm("Are you sure you want to delete ALL saved automata? This cannot be undone.")) {
            AutomataStorage.deleteAllAutomata();
            updateSavedAutomataList();
            updateStatus("All automata deleted");
        }
    });
    
    // Modal event listeners
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    saveBtn.addEventListener('click', saveTransitionChanges);
    
    addSymbolBtn.addEventListener('click', function() {
        const symbol = newSymbolInput.value.trim();
        if (symbol) {
            if (!currentEditSymbols.includes(symbol)) {
                currentEditSymbols.push(symbol);
                renderSymbolList();
                newSymbolInput.value = '';
                newSymbolInput.focus();
            }
        }
    });
    
    addEpsilonBtn.addEventListener('click', function() {
        const epsilon = 'ε';
        if (!currentEditSymbols.includes(epsilon)) {
            currentEditSymbols.push(epsilon);
            renderSymbolList();
        }
    });
    
    // Canvas Event Listeners
    canvas.addEventListener('mousedown', function(e) {
        const pos = getMousePos(canvas, e);
        
        // Check if clicked on a state
        const clickedState = currentAutomata.states.find(state => {
            const distance = Math.sqrt((pos.x - state.x) ** 2 + (pos.y - state.y) ** 2);
            return distance <= state.radius;
        });
        
        if (isAddingTransition) {
            if (clickedState) {
                if (transitionStartState === null) {
                    transitionStartState = clickedState.id;
                    updateStatus("Now select target state");
                } else if (transitionStartState !== clickedState.id || clickedState.id === transitionStartState) {
                    const symbol = prompt('Enter transition symbol:');
                    if (symbol !== null) {
                        currentAutomata.addTransition(transitionStartState, clickedState.id, symbol);
                        isAddingTransition = false;
                        document.getElementById('add-transition').classList.remove('active');
                        transitionStartState = null;
                        renderAutomata();
                        updateProperties();
                        updateStatus("Transition added");
                    }
                }
            }
        } else if (clickedState) {
            // Start dragging
            isDragging = true;
            dragState = clickedState;
            dragOffsetX = pos.x - clickedState.x;
            dragOffsetY = pos.y - clickedState.y;
            selectedState = clickedState.id;
            renderAutomata();
        } else {
            selectedState = null;
            renderAutomata();
        }
    });
    
    canvas.addEventListener('mousemove', function(e) {
        const pos = getMousePos(canvas, e);
        
        if (isDragging && dragState) {
            dragState.x = pos.x - dragOffsetX;
            dragState.y = pos.y - dragOffsetY;
            renderAutomata();
        }
        
        // Show transition preview
        if (isAddingTransition && transitionStartState !== null) {
            renderAutomata();
            const startState = currentAutomata.getStateById(transitionStartState);
            ctx.beginPath();
            ctx.moveTo(startState.x, startState.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    });
    
    canvas.addEventListener('mouseup', function() {
        isDragging = false;
        dragState = null;
    });
    
    canvas.addEventListener('mouseleave', function() {
        isDragging = false;
        dragState = null;
    });
    
    canvas.addEventListener('click', function(e) {
        if (isAddingTransition || isDragging) return;
        
        const pos = getMousePos(canvas, e);
        const clickedTransition = findTransitionAtPos(pos.x, pos.y);
        
        if (clickedTransition) {
            openTransitionEditor(clickedTransition);
        }
    });
    
    canvas.addEventListener('dblclick', function(e) {
        const pos = getMousePos(canvas, e);
        
        // Check if clicked near a transition line
        const clickedTransition = findTransitionAtPos(pos.x, pos.y);
        
        if (clickedTransition) {
            if (confirm(`Delete transition with symbol '${clickedTransition.symbol}'?`)) {
                currentAutomata.deleteTransition(
                    clickedTransition.from, 
                    clickedTransition.to, 
                    clickedTransition.symbol
                );
                renderAutomata();
                updateProperties();
                updateStatus("Transition deleted");
            }
        }
    });
    
    // Helper functions
    function getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
    
    function renderAutomata() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw transitions first so states appear on top
        drawTransitions();
        
        // Draw states
        currentAutomata.states.forEach(state => {
            // Draw state circle
            ctx.beginPath();
            ctx.arc(state.x, state.y, state.radius, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
            
            // Draw state ID
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`q${state.id}`, state.x, state.y);
            
            // Draw initial state marker
            if (state.isInitial) {
                ctx.beginPath();
                ctx.moveTo(state.x - state.radius - 15, state.y);
                ctx.lineTo(state.x - state.radius, state.y);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Draw arrowhead
                ctx.beginPath();
                ctx.moveTo(state.x - state.radius - 5, state.y - 5);
                ctx.lineTo(state.x - state.radius, state.y);
                ctx.lineTo(state.x - state.radius - 5, state.y + 5);
                ctx.fillStyle = '#333';
                ctx.fill();
            }
            
            // Draw final state marker (double circle)
            if (state.isFinal) {
                ctx.beginPath();
                ctx.arc(state.x, state.y, state.radius - 5, 0, 2 * Math.PI);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }
    
    function drawTransitions() {
        // Group transitions by from-to pairs
        const transitionGroups = new Map();
        const bidirectionalPairs = new Set();
        
        // First pass: group transitions
        currentAutomata.transitions.forEach(transition => {
            const key = `${transition.from}-${transition.to}`;
            if (!transitionGroups.has(key)) {
                transitionGroups.set(key, []);
            }
            transitionGroups.get(key).push(transition);
        });
        
        // Second pass: detect bidirectional pairs
        transitionGroups.forEach((transitions, key) => {
            const [from, to] = key.split('-').map(Number);
            const reverseKey = `${to}-${from}`;
            if (transitionGroups.has(reverseKey)) {
                bidirectionalPairs.add(key);
                bidirectionalPairs.add(reverseKey);
            }
        });
        
        // Draw each transition
        transitionGroups.forEach((transitions, key) => {
            const [fromId, toId] = key.split('-').map(Number);
            const fromState = currentAutomata.getStateById(fromId);
            const toState = currentAutomata.getStateById(toId);
            
            if (!fromState || !toState) return;
            
            const isBidirectional = bidirectionalPairs.has(key);
            const isSelfLoop = fromId === toId;
            
            if (isSelfLoop) {
                drawSelfLoop(fromState, transitions);
            } else if (isBidirectional) {
                // Draw bidirectional with distinct curves
                drawBidirectionalArrow(fromState, toState, transitions);
            } else {
                drawStraightArrow(fromState, toState, transitions);
            }
        });
    }
    
    function drawStraightArrow(fromState, toState, transitions) {
        const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
        const adjustedFromX = fromState.x + Math.cos(angle) * fromState.radius;
        const adjustedFromY = fromState.y + Math.sin(angle) * fromState.radius;
        const adjustedToX = toState.x - Math.cos(angle) * toState.radius;
        const adjustedToY = toState.y - Math.sin(angle) * toState.radius;
        
        // Draw the line
        ctx.beginPath();
        ctx.moveTo(adjustedFromX, adjustedFromY);
        ctx.lineTo(adjustedToX, adjustedToY);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw arrowhead
        drawArrowhead(adjustedToX, adjustedToY, angle);
        
        // Draw symbols
        const symbols = transitions.map(t => t.symbol).join(',');
        const midX = (adjustedFromX + adjustedToX) / 2;
        const midY = (adjustedFromY + adjustedToY) / 2;
        
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(symbols, midX, midY - 10);
    }
    
    function drawBidirectionalArrow(fromState, toState, transitions) {
        const dx = toState.x - fromState.x;
        const dy = toState.y - fromState.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        // Midpoint
        const midX = (fromState.x + toState.x) / 2;
        const midY = (fromState.y + toState.y) / 2;
        
        // Calculate distinct curve offsets
        const perpAngle = angle + Math.PI/2;
        const offset = 40;
        
        // Draw the "forward" curve (above the line)
        const controlX1 = midX + Math.cos(perpAngle) * offset;
        const controlY1 = midY + Math.sin(perpAngle) * offset;
        drawCurvedArrow(fromState, toState, transitions, controlX1, controlY1);
        
        // Draw the "reverse" curve (below the line)
        const controlX2 = midX - Math.cos(perpAngle) * offset;
        const controlY2 = midY - Math.sin(perpAngle) * offset;
        
        // For reverse transitions, we need to find the reverse transitions
        const reverseKey = `${toState.id}-${fromState.id}`;
        const reverseTransitions = currentAutomata.transitions.filter(
            t => t.from === toState.id && t.to === fromState.id
        );
        
        if (reverseTransitions.length > 0) {
            drawCurvedArrow(toState, fromState, reverseTransitions, controlX2, controlY2);
        }
    }
    
    function drawCurvedArrow(fromState, toState, transitions, controlX, controlY) {
        const angleToControl = Math.atan2(controlY - fromState.y, controlX - fromState.x);
        const startX = fromState.x + Math.cos(angleToControl) * fromState.radius;
        const startY = fromState.y + Math.sin(angleToControl) * fromState.radius;
        
        const angleFromControl = Math.atan2(toState.y - controlY, toState.x - controlX);
        const endX = toState.x - Math.cos(angleFromControl) * toState.radius;
        const endY = toState.y - Math.sin(angleFromControl) * toState.radius;
        
        // Draw quadratic curve
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw arrowhead
        drawArrowhead(endX, endY, angleFromControl);
        
        // Draw symbols at the control point
        const symbols = transitions.map(t => t.symbol).join(',');
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(symbols, controlX, controlY);
        
        // Highlight epsilon transitions
        if (transitions.some(t => t.symbol === 'ε')) {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(controlX, controlY, 10, 0, Math.PI * 2);
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('ε', controlX, controlY);
        }
    }
    
    function drawSelfLoop(state, transitions) {
        const loopRadius = 25;
        const centerX = state.x;
        const centerY = state.y - 40;
        
        // Draw loop
        ctx.beginPath();
        ctx.arc(centerX, centerY, loopRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw arrowhead
        const arrowAngle = Math.PI * 1.5;
        const arrowX = centerX + loopRadius * Math.cos(arrowAngle);
        const arrowY = centerY + loopRadius * Math.sin(arrowAngle);
        drawArrowhead(arrowX, arrowY, arrowAngle);
        
        // Draw symbols
        const symbols = transitions.map(t => t.symbol).join(',');
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(symbols, centerX, centerY - 50);
    }
    
    function drawArrowhead(x, y, angle) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 12 * Math.cos(angle - Math.PI/6), y - 12 * Math.sin(angle - Math.PI/6));
        ctx.lineTo(x - 12 * Math.cos(angle + Math.PI/6), y - 12 * Math.sin(angle + Math.PI/6));
        ctx.closePath();
        ctx.fillStyle = '#3498db';
        ctx.fill();
    }
    
    function updateProperties() {
        stateCount.textContent = currentAutomata.states.length;
        transitionCount.textContent = currentAutomata.transitions.length;
        
        let html = `
            <div>States:</div>
            <div>${currentAutomata.states.length}</div>
            <div>Transitions:</div>
            <div>${currentAutomata.transitions.length}</div>
            <div>Alphabet:</div>
            <div>${Array.from(currentAutomata.alphabet).join(', ') || 'None'}</div>
            <div>Initial State:</div>
            <div>${currentAutomata.states.find(s => s.isInitial) ? 'q' + currentAutomata.states.find(s => s.isInitial).id : 'None'}</div>
            <div>Final States:</div>
            <div>${currentAutomata.states.filter(s => s.isFinal).map(s => 'q' + s.id).join(', ') || 'None'}</div>
        `;
        automataPropertiesDiv.innerHTML = html;
    }
    
    function updateSavedAutomataList() {
        savedAutomataList.innerHTML = '';
        const names = AutomataStorage.getAutomataNames();
        names.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.addEventListener('click', function() {
                const automata = AutomataStorage.getAutomata(name);
                if (automata) {
                    currentAutomata = automata;
                    renderAutomata();
                    updateProperties();
                    li.classList.add('highlight');
                    setTimeout(() => li.classList.remove('highlight'), 1500);
                    updateStatus(`Loaded automata: "${name}"`);
                }
            });
            
            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = '✕';
            deleteBtn.className = 'delete-btn';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm(`Delete automata "${name}"?`)) {
                    AutomataStorage.deleteAutomata(name);
                    updateSavedAutomataList();
                    updateStatus(`Deleted automata: "${name}"`);
                }
            });
            
            li.appendChild(deleteBtn);
            savedAutomataList.appendChild(li);
        });
    }
    
    function updateStatus(message) {
        statusMessage.textContent = message;
    }
    
    function findTransitionAtPos(x, y) {
        const threshold = 5;
        
        for (const trans of currentAutomata.transitions) {
            const fromState = currentAutomata.getStateById(trans.from);
            const toState = currentAutomata.getStateById(trans.to);
            
            if (fromState.id === toState.id) {
                // Self-transition (loop)
                const centerX = fromState.x;
                const centerY = fromState.y - 30;
                const radius = 25;
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                
                if (Math.abs(distance - radius) < threshold) {
                    return trans;
                }
            } else {
                // Normal transition
                const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
                const adjustedFromX = fromState.x + Math.cos(angle) * fromState.radius;
                const adjustedFromY = fromState.y + Math.sin(angle) * fromState.radius;
                const adjustedToX = toState.x - Math.cos(angle) * toState.radius;
                const adjustedToY = toState.y - Math.sin(angle) * toState.radius;
                
                // Distance from point to line segment
                const distance = distanceToLine(
                    x, y,
                    adjustedFromX, adjustedFromY,
                    adjustedToX, adjustedToY
                );
                
                if (distance < threshold) {
                    return trans;
                }
            }
        }
        return null;
    }
    
    function distanceToLine(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    function openTransitionEditor(transition) {
        currentEditTransition = transition;
        currentEditSymbols = currentAutomata.transitions
            .filter(t => t.from === transition.from && t.to === transition.to)
            .map(t => t.symbol);
        
        renderSymbolList();
        modal.style.display = 'flex';
    }
    
    function renderSymbolList() {
        symbolList.innerHTML = '';
        currentEditSymbols.forEach(symbol => {
            const symbolItem = document.createElement('div');
            symbolItem.className = 'symbol-item';
            symbolItem.innerHTML = `
                <span>${symbol}</span>
                <span class="delete-symbol">×</span>
            `;
            
            const deleteBtn = symbolItem.querySelector('.delete-symbol');
            deleteBtn.addEventListener('click', function() {
                const index = currentEditSymbols.indexOf(symbol);
                if (index !== -1) {
                    currentEditSymbols.splice(index, 1);
                    renderSymbolList();
                }
            });
            
            symbolList.appendChild(symbolItem);
        });
    }
    
    function closeModal() {
        modal.style.display = 'none';
    }
    
    function saveTransitionChanges() {
        if (!currentEditTransition) return;
        
        // Remove all existing transitions between these states
        currentAutomata.transitions = currentAutomata.transitions.filter(t => 
            !(t.from === currentEditTransition.from && t.to === currentEditTransition.to)
        );
        
        // Add new transitions for each symbol
        currentEditSymbols.forEach(symbol => {
            currentAutomata.addTransition(
                currentEditTransition.from,
                currentEditTransition.to,
                symbol
            );
        });
        
        renderAutomata();
        updateProperties();
        updateStatus("Transition symbols updated");
        closeModal();
    }
});