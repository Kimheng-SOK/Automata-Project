// script.js

// --- DOM Elements ---
const navButtons = document.querySelectorAll('nav button');
const sections = document.querySelectorAll('main section');

// Functionality Buttons
const designFAButton = document.getElementById('designFA');
const testDeterministicButton = document.getElementById('testDeterministic');
const testStringButton = document.getElementById('testString');
const nfaToDfaButton = document.getElementById('nfaToDfa');
const minimizeDFAButton = document.getElementById('minimizeDFA');
const manageFAsButton = document.getElementById('manageFAs');

// Design FA Section
const faDefinitionInput = document.getElementById('faDefinition');
const createFAButton = document.getElementById('createFA');
const faVisualizationDiv = document.getElementById('faVisualization');

// Test Deterministic Section
const checkDeterminismButton = document.getElementById('checkDeterminism');
const determinismResultPara = document.getElementById('determinismResult');

// Test String Acceptance Section
const stringToTestInput = document.getElementById('stringToTest');
const testStringAcceptanceButton = document.getElementById('testStringAcceptance');
const stringAcceptanceResultPara = document.getElementById('stringAcceptanceResult');

// NFA to DFA Conversion Section
const convertNfaToDfaButton = document.getElementById('convertNfaToDfa');
const dfaResultVisualizationDiv = document.getElementById('dfaResultVisualization');

// Minimize DFA Section
const minimizeDFAActionButton = document.getElementById('minimizeDFAButton');
const minimizedDFAVisualizationDiv = document.getElementById('minimizedDFAVisualization');

// Manage FAs Section
const savedFAList = document.getElementById('savedFAList');
const loadFAButton = document.getElementById('loadFA');
const editFAButton = document.getElementById('editFA');
const deleteFAButton = document.getElementById('deleteFA');

// --- Global Variables ---
let currentFA = null; // Stores the currently loaded or designed FA object
let savedFAs = [];    // Array to store all saved FA objects

// --- Helper Functions ---

// Function to show a specific section and hide others
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
}

// Function to save FAs to (e.g., Local Storage or simulate a database)
function saveFAsToStorage() {
    // For simplicity, using Local Storage. In a real app, this would be a backend database.
    localStorage.setItem('finiteAutomata', JSON.stringify(savedFAs));
    updateSavedFAList();
}

// Function to load FAs from storage
function loadFAsFromStorage() {
    const data = localStorage.getItem('finiteAutomata');
    if (data) {
        savedFAs = JSON.parse(data);
        updateSavedFAList();
    }
}

// Function to update the displayed list of saved FAs
function updateSavedFAList() {
    savedFAList.innerHTML = ''; // Clear existing list
    if (savedFAs.length === 0) {
        savedFAList.innerHTML = '<li>No FAs saved yet.</li>';
        return;
    }
    savedFAs.forEach((fa, index) => {
        const li = document.createElement('li');
        li.textContent = fa.name || `FA ${index + 1}`; // Display name or generic label
        li.dataset.index = index; // Store index for selection
        li.addEventListener('click', () => {
            // Remove 'selected' from others
            document.querySelectorAll('#savedFAList li').forEach(item => item.classList.remove('selected'));
            li.classList.add('selected');
        });
        savedFAList.appendChild(li);
    });
}

// Function to parse FA definition from text input
// This is a simplified parser. You'll need a more robust one for real use.
function parseFADefinition(text) {
    // Expected format: states:q0,q1; alphabet:0,1; transitions:q0,0,q0|q0,1,q1; start:q0; final:q1
    const fa = {};
    const parts = text.split(';').map(part => part.trim());

    parts.forEach(part => {
        const [key, value] = part.split(':').map(s => s.trim());
        switch (key) {
            case 'states':
                fa.states = value.split(',');
                break;
            case 'alphabet':
                fa.alphabet = value.split(',');
                break;
            case 'transitions':
                fa.transitions = value.split('|').map(t => {
                    const [from, symbol, to] = t.split(',');
                    return { from, symbol, to };
                });
                break;
            case 'start':
                fa.startState = value;
                break;
            case 'final':
                fa.finalStates = value.split(',');
                break;
            case 'name': // Optional name for the FA
                fa.name = value;
                break;
        }
    });
    return fa;
}

// Function to visualize FA (Placeholder - you'll need a library like D3.js or Mermaid.js)
function visualizeFA(fa, targetDiv) {
    targetDiv.innerHTML = ''; // Clear previous visualization
    if (!fa) {
        targetDiv.innerHTML = '<p>No FA to visualize.</p>';
        return;
    }
    // Simple text representation for now
    let vizHtml = `<h3>FA Visualization</h3>`;
    vizHtml += `<p><strong>States:</strong> ${fa.states ? fa.states.join(', ') : 'N/A'}</p>`;
    vizHtml += `<p><strong>Alphabet:</strong> ${fa.alphabet ? fa.alphabet.join(', ') : 'N/A'}</p>`;
    vizHtml += `<p><strong>Start State:</strong> ${fa.startState || 'N/A'}</p>`;
    vizHtml += `<p><strong>Final States:</strong> ${fa.finalStates ? fa.finalStates.join(', ') : 'N/A'}</p>`;
    vizHtml += `<p><strong>Transitions:</strong></p><ul>`;
    fa.transitions.forEach(t => {
        vizHtml += `<li>(${t.from}, ${t.symbol}) -> ${t.to}</li>`;
    });
    vizHtml += `</ul>`;
    targetDiv.innerHTML = vizHtml;

    // TODO: Integrate a proper visualization library (e.g., D3.js, Mermaid.js, vis.js)
    // For example, using Mermaid.js:
    /*
    const mermaidDefinition = `
        graph TD
            ${fa.states.map(s => `${s}`).join('\n')}
            ${fa.startState} --> ${fa.transitions.filter(t => t.from === fa.startState).map(t => `${t.to}`).join(', ')}
            ${fa.transitions.map(t => `${t.from} -- ${t.symbol} --> ${t.to}`).join('\n')}
            class ${fa.finalStates.join(', ')} final;
    `;
    targetDiv.innerHTML = `<pre class="mermaid">${mermaidDefinition}</pre>`;
    // You would then need to load Mermaid.js and call mermaid.init()
    */
}

// --- Core Automata Logic (PLACEHOLDERS) ---
// These functions will require significant logic implementation

/**
 * Tests if the given FA is deterministic or non-deterministic.
 * @param {object} fa The finite automaton object.
 * @returns {string} 'Deterministic' or 'Non-Deterministic'.
 */
function isDeterministic(fa) {
    if (!fa || !fa.transitions) return 'N/A (FA not defined)';

    const delta = new Map(); // Map: state -> symbol -> nextStates (Set)

    for (const transition of fa.transitions) {
        const key = `${transition.from}-${transition.symbol}`;
        if (!delta.has(key)) {
            delta.set(key, new Set());
        }
        delta.get(key).add(transition.to);
    }

    for (const [key, nextStates] of delta.entries()) {
        if (nextStates.size > 1) {
            return 'Non-Deterministic'; // Multiple transitions for same (state, symbol) pair
        }
    }
    // Also check for missing transitions if you want to be strict about completeness for DFA
    // For now, only checking for multiple transitions to determine non-determinism.
    return 'Deterministic';
}

/**
 * Tests if a given string is accepted by the FA.
 * This function will need to handle both DFA and NFA logic.
 * For NFA, you'd typically use a breadth-first search or recursive approach to explore all paths.
 * @param {object} fa The finite automaton object.
 * @param {string} str The string to test.
 * @returns {boolean} True if accepted, false otherwise.
 */
function testStringAcceptance(fa, str) {
    if (!fa || !fa.startState || !fa.finalStates || !fa.transitions) {
        console.error("Invalid FA structure for string testing.");
        return false;
    }

    // This is a simplified DFA acceptance logic. For NFA, it's more complex.
    let currentStates = new Set([fa.startState]);

    for (const symbol of str) {
        let nextStates = new Set();
        currentStates.forEach(currentState => {
            fa.transitions.forEach(t => {
                if (t.from === currentState && t.symbol === symbol) {
                    nextStates.add(t.to);
                }
            });
        });
        currentStates = nextStates;
        if (currentStates.size === 0) {
            return false; // No valid transitions for the current symbol
        }
    }

    // Check if any of the final states are reachable at the end
    for (const finalState of fa.finalStates) {
        if (currentStates.has(finalState)) {
            return true;
        }
    }
    return false;
}

/**
 * Constructs an equivalent DFA from an NFA.
 * This is a core algorithm in automata theory (subset construction).
 * @param {object} nfa The non-deterministic finite automaton object.
 * @returns {object} The equivalent deterministic finite automaton object.
 */
function convertNfaToDfa(nfa) {
    if (!nfa || isDeterministic(nfa) === 'Deterministic') {
        console.warn("Input is already a DFA or invalid NFA.");
        return nfa;
    }
    // --- Subset Construction Algorithm ---
    const dfaStates = new Set();
    const dfaTransitions = [];
    let dfaStartState = '';
    const dfaFinalStates = new Set();
    const dfaAlphabet = nfa.alphabet;

    const queue = [];
    const stateMap = new Map(); // Maps frozenset of NFA states to DFA state name (e.g., '{q0,q1}' -> 'Q0')
    let stateCounter = 0;

    // 1. Calculate epsilon closure of start state (if NFA-epsilon)
    // For now, assuming NFA without epsilon transitions.
    // The initial DFA state is the set containing the NFA start state.
    const initialDfaStateSet = new Set([nfa.startState]);
    const initialDfaStateName = `Q${stateCounter++}`;
    dfaStartState = initialDfaStateName;
    dfaStates.add(initialDfaStateName);
    stateMap.set(JSON.stringify(Array.from(initialDfaStateSet).sort()), initialDfaStateName);
    queue.push(initialDfaStateSet);

    while (queue.length > 0) {
        const currentNfaStateSet = queue.shift();
        const currentDfaStateName = stateMap.get(JSON.stringify(Array.from(currentNfaStateSet).sort()));

        // Check if current DFA state contains any NFA final states
        for (const nfaFinalState of nfa.finalStates) {
            if (currentNfaStateSet.has(nfaFinalState)) {
                dfaFinalStates.add(currentDfaStateName);
                break;
            }
        }

        for (const symbol of dfaAlphabet) {
            let nextNfaStateSet = new Set();
            for (const nfaState of currentNfaStateSet) {
                // Find all transitions from nfaState on current symbol
                nfa.transitions.forEach(t => {
                    if (t.from === nfaState && t.symbol === symbol) {
                        nextNfaStateSet.add(t.to);
                    }
                });
            }

            if (nextNfaStateSet.size > 0) {
                const sortedNextNfaStateArray = Array.from(nextNfaStateSet).sort();
                const nextNfaStateSetKey = JSON.stringify(sortedNextNfaStateArray);
                let nextDfaStateName;

                if (!stateMap.has(nextNfaStateSetKey)) {
                    nextDfaStateName = `Q${stateCounter++}`;
                    stateMap.set(nextNfaStateSetKey, nextDfaStateName);
                    dfaStates.add(nextDfaStateName);
                    queue.push(nextNfaStateSet); // Add new DFA state to queue for processing
                } else {
                    nextDfaStateName = stateMap.get(nextNfaStateSetKey);
                }
                dfaTransitions.push({ from: currentDfaStateName, symbol: symbol, to: nextDfaStateName });
            }
        }
    }

    return {
        states: Array.from(dfaStates),
        alphabet: dfaAlphabet,
        transitions: dfaTransitions,
        startState: dfaStartState,
        finalStates: Array.from(dfaFinalStates),
        name: `${nfa.name || 'NFA'} to DFA`
    };
}

/**
 * Minimizes a DFA.
 * This typically involves the Myhill-Nerode theorem or table-filling algorithm.
 * @param {object} dfa The deterministic finite automaton object.
 * @returns {object} The minimized DFA object.
 */
function minimizeDFA(dfa) {
    if (!dfa || isDeterministic(dfa) === 'Non-Deterministic') {
        console.warn("Input is not a DFA or is invalid for minimization.");
        return null; // Or throw error
    }

    // Step 1: Remove unreachable states (if any)
    const reachableStates = new Set();
    const queue = [dfa.startState];
    reachableStates.add(dfa.startState);

    let head = 0;
    while(head < queue.length) {
        const currentState = queue[head++];
        dfa.transitions.forEach(t => {
            if (t.from === currentState && !reachableStates.has(t.to)) {
                reachableStates.add(t.to);
                queue.push(t.to);
            }
        });
    }

    const effectiveStates = dfa.states.filter(s => reachableStates.has(s));
    const effectiveTransitions = dfa.transitions.filter(t => 
        reachableStates.has(t.from) && reachableStates.has(t.to)
    );
    const effectiveFinalStates = dfa.finalStates.filter(s => reachableStates.has(s));

    // Step 2: Partition states into equivalence classes
    // Initial partition: {final states}, {non-final states}
    let P = [
        new Set(effectiveFinalStates),
        new Set(effectiveStates.filter(s => !effectiveFinalStates.includes(s)))
    ].filter(s => s.size > 0); // Remove empty sets

    let P_new = [];
    let changed = true;

    while (changed) {
        changed = false;
        P_new = [];

        for (const set_of_states of P) {
            if (set_of_states.size <= 1) {
                P_new.push(set_of_states);
                continue;
            }

            // For each set, try to split it
            let splitOccurred = false;
            for (const symbol of dfa.alphabet) {
                const subPartitions = new Map(); // Map: representative_class_id -> Set of states

                for (const state of set_of_states) {
                    // Find the state reached by 'symbol'
                    const transition = effectiveTransitions.find(t => t.from === state && t.symbol === symbol);
                    const nextState = transition ? transition.to : null;

                    // Find which partition the nextState belongs to
                    let representativeClassId = null;
                    if (nextState === null) {
                        representativeClassId = 'null'; // For states with no transition on this symbol
                    } else {
                        for (const p_set of P) {
                            if (p_set.has(nextState)) {
                                representativeClassId = Array.from(p_set).sort().join(','); // Use sorted string as ID
                                break;
                            }
                        }
                    }

                    if (!subPartitions.has(representativeClassId)) {
                        subPartitions.set(representativeClassId, new Set());
                    }
                    subPartitions.get(representativeClassId).add(state);
                }

                if (subPartitions.size > 1) {
                    // Split the current set
                    subPartitions.forEach(subset => P_new.push(subset));
                    splitOccurred = true;
                    changed = true;
                    break; // Move to next set_of_states after splitting
                }
            }
            if (!splitOccurred) {
                P_new.push(set_of_states); // No split needed for this set
            }
        }
        P = P_new;
    }

    // Step 3: Construct minimized DFA from equivalence classes
    const minimizedStates = [];
    const minimizedTransitions = [];
    let minimizedStartState = '';
    const minimizedFinalStates = [];

    // Map old states to new minimized states
    const stateToMinimizedStateMap = new Map();
    P.forEach((set, index) => {
        const newDfaStateName = `Qmin${index}`;
        minimizedStates.push(newDfaStateName);
        for (const state of set) {
            stateToMinimizedStateMap.set(state, newDfaStateName);
        }
    });

    // Determine start state
    minimizedStartState = stateToMinimizedStateMap.get(dfa.startState);

    // Determine final states
    minimizedStates.forEach(minimizedState => {
        // Pick any original state from this minimized state's set
        const originalStateSet = Array.from(P.find(set => stateToMinimizedStateMap.get(Array.from(set)[0]) === minimizedState));
        if (effectiveFinalStates.some(fs => originalStateSet.includes(fs))) {
            minimizedFinalStates.push(minimizedState);
        }
    });

    // Construct transitions
    for (const originalState of effectiveStates) {
        const minimizedFromState = stateToMinimizedStateMap.get(originalState);
        for (const symbol of dfa.alphabet) {
            const transition = effectiveTransitions.find(t => t.from === originalState && t.symbol === symbol);
            if (transition) {
                const minimizedToState = stateToMinimizedStateMap.get(transition.to);
                // Add transition only once per minimized state pair and symbol
                const exists = minimizedTransitions.some(t =>
                    t.from === minimizedFromState && t.symbol === symbol && t.to === minimizedToState
                );
                if (!exists) {
                    minimizedTransitions.push({
                        from: minimizedFromState,
                        symbol: symbol,
                        to: minimizedToState
                    });
                }
            }
        }
    }

    return {
        states: minimizedStates,
        alphabet: dfa.alphabet,
        transitions: minimizedTransitions,
        startState: minimizedStartState,
        finalStates: minimizedFinalStates,
        name: `${dfa.name || 'DFA'} Minimized`
    };
}


// --- Event Listeners ---

// Navigation buttons to show/hide sections
navButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        const targetSectionId = `${event.target.id}Section`;
        showSection(targetSectionId);
    });
});

// Design FA
createFAButton.addEventListener('click', () => {
    try {
        currentFA = parseFADefinition(faDefinitionInput.value);
        currentFA.name = currentFA.name || `FA-${new Date().getTime()}`; // Assign a default name if not provided
        visualizeFA(currentFA, faVisualizationDiv);
        alert('FA designed successfully! You can now test it or save it.');
        // Optionally, save the newly designed FA to the list of saved FAs
        savedFAs.push(currentFA);
        saveFAsToStorage(); // Persist the new FA
    } catch (error) {
        faVisualizationDiv.innerHTML = `<p style="color: red;">Error parsing FA: ${error.message}. Please check format.</p>`;
        console.error("Error creating FA:", error);
    }
});

// Test Deterministic/Non-Deterministic
checkDeterminismButton.addEventListener('click', () => {
    if (!currentFA) {
        determinismResultPara.textContent = 'Please design or load an FA first.';
        return;
    }
    const type = isDeterministic(currentFA);
    determinismResultPara.textContent = `The current FA is: ${type}.`;
});

// Test String Acceptance
testStringAcceptanceButton.addEventListener('click', () => {
    if (!currentFA) {
        stringAcceptanceResultPara.textContent = 'Please design or load an FA first.';
        return;
    }
    const testString = stringToTestInput.value;
    if (!testString) {
        stringAcceptanceResultPara.textContent = 'Please enter a string to test.';
        return;
    }
    const accepted = testStringAcceptance(currentFA, testString);
    stringAcceptanceResultPara.textContent = `String "${testString}" is ${accepted ? 'ACCEPTED' : 'REJECTED'}.`;
});

// NFA to DFA Conversion
convertNfaToDfaButton.addEventListener('click', () => {
    if (!currentFA) {
        dfaResultVisualizationDiv.innerHTML = '<p style="color: red;">Please design or load an NFA first.</p>';
        return;
    }
    if (isDeterministic(currentFA) === 'Deterministic') {
        dfaResultVisualizationDiv.innerHTML = '<p>The current FA is already deterministic. No conversion needed.</p>';
        visualizeFA(currentFA, dfaResultVisualizationDiv);
        return;
    }
    try {
        const dfa = convertNfaToDfa(currentFA);
        currentFA = dfa; // Update current FA to the newly generated DFA
        visualizeFA(dfa, dfaResultVisualizationDiv);
        alert('NFA successfully converted to an equivalent DFA!');
        // Optionally save the converted DFA
        savedFAs.push(dfa);
        saveFAsToStorage();
    } catch (error) {
        dfaResultVisualizationDiv.innerHTML = `<p style="color: red;">Error during NFA to DFA conversion: ${error.message}</p>`;
        console.error("NFA to DFA error:", error);
    }
});

// Minimize DFA
minimizeDFAActionButton.addEventListener('click', () => {
    if (!currentFA) {
        minimizedDFAVisualizationDiv.innerHTML = '<p style="color: red;">Please design or load an FA first.</p>';
        return;
    }
    if (isDeterministic(currentFA) === 'Non-Deterministic') {
        minimizedDFAVisualizationDiv.innerHTML = '<p style="color: red;">Cannot minimize an NFA. Please convert it to a DFA first.</p>';
        return;
    }

    try {
        const minimized = minimizeDFA(currentFA);
        if (minimized) {
            currentFA = minimized; // Update current FA to the minimized DFA
            visualizeFA(minimized, minimizedDFAVisualizationDiv);
            alert('DFA successfully minimized!');
            // Optionally save the minimized DFA
            savedFAs.push(minimized);
            saveFAsToStorage();
        } else {
             minimizedDFAVisualizationDiv.innerHTML = '<p style="color: red;">Failed to minimize DFA. Check console for errors.</p>';
        }
    } catch (error) {
        minimizedDFAVisualizationDiv.innerHTML = `<p style="color: red;">Error during DFA minimization: ${error.message}</p>`;
        console.error("DFA minimization error:", error);
    }
});


// Manage FAs
loadFAButton.addEventListener('click', () => {
    const selectedLi = document.querySelector('#savedFAList li.selected');
    if (selectedLi) {
        const index = parseInt(selectedLi.dataset.index);
        currentFA = savedFAs[index];
        alert(`Loaded FA: ${currentFA.name}`);
        // Optionally, show the design section with the loaded FA's definition
        faDefinitionInput.value = `name:${currentFA.name}; states:${currentFA.states.join(',')}; alphabet:${currentFA.alphabet.join(',')}; transitions:${currentFA.transitions.map(t => `${t.from},${t.symbol},${t.to}`).join('|')}; start:${currentFA.startState}; final:${currentFA.finalStates.join(',')}`;
        visualizeFA(currentFA, faVisualizationDiv);
        showSection('designFASection'); // Switch to design section to show loaded FA
    } else {
        alert('Please select an FA to load.');
    }
});

editFAButton.addEventListener('click', () => {
    const selectedLi = document.querySelector('#savedFAList li.selected');
    if (selectedLi) {
        const index = parseInt(selectedLi.dataset.index);
        const faToEdit = savedFAs[index];
        // Load FA data into the design input fields for editing
        faDefinitionInput.value = `name:${faToEdit.name || ''}; states:${faToEdit.states.join(',')}; alphabet:${faToEdit.alphabet.join(',')}; transitions:${faToEdit.transitions.map(t => `${t.from},${t.symbol},${t.to}`).join('|')}; start:${faToEdit.startState}; final:${faToEdit.finalStates.join(',')}`;
        currentFA = faToEdit; // Set currentFA to the one being edited
        showSection('designFASection');
        alert(`Editing FA: ${faToEdit.name}. Make changes and click 'Create FA' to save.`);
        // After editing and clicking 'Create FA', you'll need to decide if it updates the existing or creates new.
        // For simplicity, current 'createFAButton' adds new. You could modify it to update if 'currentFA' is already set and matches an existing one.
    } else {
        alert('Please select an FA to edit.');
    }
});

deleteFAButton.addEventListener('click', () => {
    const selectedLi = document.querySelector('#savedFAList li.selected');
    if (selectedLi && confirm('Are you sure you want to delete the selected FA?')) {
        const index = parseInt(selectedLi.dataset.index);
        const deletedFAName = savedFAs[index].name;
        savedFAs.splice(index, 1); // Remove from array
        saveFAsToStorage(); // Persist changes
        alert(`FA "${deletedFAName}" deleted successfully.`);
        if (currentFA && currentFA.name === deletedFAName) {
            currentFA = null; // Clear current FA if it was the one deleted
            faVisualizationDiv.innerHTML = '';
        }
    } else if (!selectedLi) {
        alert('Please select an FA to delete.');
    }
});


// --- Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    showSection('designFASection'); // Show design section by default
    loadFAsFromStorage(); // Load any previously saved FAs
});