import { FiniteAutomaton } from './models.js';
import { AutomataStorage } from './storage.js';
import { AutomataRenderer } from './renderer.js';

document.addEventListener('DOMContentLoaded', function() {
    // Get canvas and create objects
    const canvas = document.getElementById('automata-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    let currentAutomata = new FiniteAutomaton();
    const renderer = new AutomataRenderer(canvas, currentAutomata);

    // UI state variables
    let isAddingTransition = false;
    let transitionStartState: number | null = null;
    let isDragging = false;
    let dragState: number | null = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    // UI Elements
    const testStringInput = document.getElementById('test-string') as HTMLInputElement;
    const testResultDiv = document.getElementById('test-result') as HTMLDivElement;
    const deterministicResultDiv = document.getElementById('deterministic-result') as HTMLDivElement;
    const automataPropertiesDiv = document.getElementById('automata-properties') as HTMLDivElement;
    const savedAutomataList = document.getElementById('saved-automata') as HTMLUListElement;
    const automataNameInput = document.getElementById('automata-name') as HTMLInputElement;
    const statusMessage = document.getElementById('status-message') as HTMLDivElement;
    const stateCount = document.getElementById('state-count') as HTMLSpanElement;
    const transitionCount = document.getElementById('transition-count') as HTMLSpanElement;
    const exportNotification = document.getElementById('export-notification') as HTMLDivElement;

    // Transition Editor Modal Elements
    const modal = document.getElementById('transition-modal') as HTMLDivElement;
    const closeBtn = document.querySelector('.close-btn') as HTMLElement;
    const cancelBtn = document.getElementById('cancel-edit') as HTMLButtonElement;
    const saveBtn = document.getElementById('save-transition') as HTMLButtonElement;
    const symbolList = document.getElementById('symbol-list') as HTMLDivElement;
    const newSymbolInput = document.getElementById('new-symbol') as HTMLInputElement;
    const addSymbolBtn = document.getElementById('add-symbol') as HTMLButtonElement;
    const addEpsilonBtn = document.getElementById('add-epsilon') as HTMLButtonElement;
    let currentEditTransition: { from: number; to: number; symbol: string } | null = null;
    let currentEditSymbols: string[] = [];

    // Initialize
    renderer.render();
    updateSavedAutomataList();
    updateProperties();
    updateStatus("Ready");

    // Set up window resize handler
    window.addEventListener('resize', function() {
        // Redraw canvas on resize
        setTimeout(() => {
            const canvasContainer = document.querySelector('.canvas-container');
            if (canvasContainer) {
                const { width, height } = (canvasContainer as HTMLElement).getBoundingClientRect();
                canvas.width = Math.max(width - 2, 300);
                canvas.height = Math.max(height - 2, 200);
                renderer.render();
            }
        }, 100);
    });

    // Event Listeners
    document.getElementById('add-state')?.addEventListener('click', function() {
        const x = Math.random() * (canvas.width - 60) + 30;
        const y = Math.random() * (canvas.height - 60) + 30;
        currentAutomata.addState(x, y);
        renderer.render();
        updateProperties();
        updateStatus("State added");
    });

    document.getElementById('add-transition')?.addEventListener('click', function() {
        isAddingTransition = !isAddingTransition;
        transitionStartState = null;
        this.classList.toggle('active', isAddingTransition);
        renderer.render();
        updateStatus(isAddingTransition ? "Select first state for transition" : "Transition mode canceled");
    });

    document.getElementById('set-initial')?.addEventListener('click', function() {
        const selectedState = renderer.getSelectedState();
        if (selectedState !== null) {
            currentAutomata.setInitialState(selectedState);
            renderer.render();
            updateProperties();
            updateStatus("Initial state set");
        } else {
            updateStatus("Select a state first");
        }
    });

    document.getElementById('set-final')?.addEventListener('click', function() {
        const selectedState = renderer.getSelectedState();
        if (selectedState !== null) {
            currentAutomata.toggleFinalState(selectedState);
            renderer.render();
            updateProperties();
            updateStatus("Final state toggled");
        } else {
            updateStatus("Select a state first");
        }
    });

    document.getElementById('delete-element')?.addEventListener('click', function() {
        const selectedState = renderer.getSelectedState();
        if (selectedState !== null) {
            if (confirm('Delete this state and all its transitions?')) {
                currentAutomata.deleteState(selectedState);
                renderer.setSelectedState(null);
                renderer.render();
                updateProperties();
                updateStatus("State deleted");
            }
        } else {
            updateStatus("Select a state to delete");
        }
    });

    document.getElementById('test-acceptance')?.addEventListener('click', function() {
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
            if (e instanceof Error) {
                testResultDiv.textContent = `Error: ${e.message}`;
            } else {
                testResultDiv.textContent = 'An unknown error occurred';
            }
            testResultDiv.className = 'error result';
            updateStatus("Error testing string");
        }
    });

    document.getElementById('check-deterministic')?.addEventListener('click', function() {
        const isDfa = currentAutomata.isDeterministic();
        deterministicResultDiv.textContent = isDfa ? 
            'The automaton is deterministic (DFA)' : 
            'The automaton is non-deterministic (NFA)';
        deterministicResultDiv.className = isDfa ? 'success result' : 'error result';
        updateStatus(isDfa ? "Automaton is deterministic" : "Automaton is non-deterministic");
    });

    document.getElementById('convert-to-dfa')?.addEventListener('click', function() {
        try {
            currentAutomata = FiniteAutomaton.convertNFAtoDFA(currentAutomata);
            renderer.setAutomata(currentAutomata);
            renderer.render();
            updateProperties();
            updateStatus("NFA converted to DFA");
        } catch (e) {
            console.error('Conversion error:', e);
            alert(`Conversion failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
            updateStatus("Conversion error");
        }
    });

    document.getElementById('minimize-dfa')?.addEventListener('click', function() {
        try {
            currentAutomata = FiniteAutomaton.minimizeDFA(currentAutomata);
            renderer.setAutomata(currentAutomata);
            renderer.render();
            updateProperties();
            updateStatus("DFA minimized");
        } catch (e) {
            console.error('Minimization error:', e);
            alert(`Minimization failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
            updateStatus("Minimization error");
        }
    });

    document.getElementById('convert-to-regex')?.addEventListener('click', function() {
        try {
            const regex = FiniteAutomaton.convertToRegex(currentAutomata);
            currentAutomata.regex = regex;
            const regexResultDiv = document.getElementById('regex-result');
            if (regexResultDiv) {
                regexResultDiv.innerHTML = `<div class="regex-title">Regular Expression:</div><div class="regex-value">${regex}</div>`;
                regexResultDiv.className = 'success result';
            }
            updateProperties();
            updateStatus("Converted to regular expression");
        } catch (e) {
            console.error('Regex conversion error:', e);
            const regexResultDiv = document.getElementById('regex-result');
            if (regexResultDiv) {
                regexResultDiv.innerHTML = `<div class="regex-title">Conversion failed:</div><div class="regex-value">${e instanceof Error ? e.message : 'Unknown error'}</div>`;
                regexResultDiv.className = 'error result';
            }
            updateStatus("Regex conversion error");
        }
    });

    document.getElementById('save-automata')?.addEventListener('click', function() {
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

    document.getElementById('new-automata')?.addEventListener('click', function() {
        currentAutomata = new FiniteAutomaton();
        renderer.setAutomata(currentAutomata);
        renderer.setSelectedState(null);
        renderer.render();
        updateProperties();
        updateStatus("New automata created");
    });

    document.getElementById('export-automata')?.addEventListener('click', function() {
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
            a.download = `${name.replace(/\W/g, '_')}_automata.json`;
            document.body.appendChild(a);
            a.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            // Show notification
            if (exportNotification) {
                exportNotification.textContent = `Automata exported to ${a.download}`;
                exportNotification.style.display = 'block';
                setTimeout(() => {
                    exportNotification.style.display = 'none';
                }, 3000);
            }

            updateStatus(`Automata exported as "${a.download}"`);
        }
    });

    document.getElementById('import-automata')?.addEventListener('click', function() {
        const importFile = document.getElementById('import-file') as HTMLInputElement;
        if (importFile) importFile.click();
    });

    document.getElementById('import-file')?.addEventListener('change', function(e) {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            if (!event.target?.result) return;

            const name = prompt("Enter a name for the imported automata:");
            if (name) {
                if (AutomataStorage.importAutomata(name, event.target.result as string)) {
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
        target.value = '';
    });

    document.getElementById('delete-all-automata')?.addEventListener('click', function() {
        if (confirm("Are you sure you want to delete ALL saved automata? This cannot be undone.")) {
            AutomataStorage.deleteAllAutomata();
            updateSavedAutomataList();
            updateStatus("All automata deleted");
        }
    });

    // Modal event listeners
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    saveBtn?.addEventListener('click', saveTransitionChanges);

    addSymbolBtn?.addEventListener('click', function() {
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

    addEpsilonBtn?.addEventListener('click', function() {
        const epsilon = 'ε';
        if (!currentEditSymbols.includes(epsilon)) {
            currentEditSymbols.push(epsilon);
            renderSymbolList();
        }
    });

    // Canvas Event Listeners
    canvas.addEventListener('mousedown', function(e) {
        const pos = renderer.getMousePosition(canvas, e);

        // Check if clicked on a state
        const clickedState = renderer.findStateAtPosition(pos.x, pos.y);

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
                        const addTransitionBtn = document.getElementById('add-transition');
                        addTransitionBtn?.classList.remove('active');
                        transitionStartState = null;
                        renderer.render();
                        updateProperties();
                        updateStatus("Transition added");
                    }
                }
            }
        } else if (clickedState) {
            // Start dragging
            isDragging = true;
            dragState = clickedState.id;
            dragOffsetX = pos.x - clickedState.x;
            dragOffsetY = pos.y - clickedState.y;
            renderer.setSelectedState(clickedState.id);
            renderer.render();
        } else {
            renderer.setSelectedState(null);
            renderer.render();
        }
    });

    canvas.addEventListener('mousemove', function(e) {
        const pos = renderer.getMousePosition(canvas, e);

        if (isDragging && dragState !== null) {
            const state = currentAutomata.getStateById(dragState);
            if (state) {
                state.x = pos.x - dragOffsetX;
                state.y = pos.y - dragOffsetY;
                renderer.render();
            }
        }

        // Show transition preview
        if (isAddingTransition && transitionStartState !== null) {
            renderer.render();
            renderer.drawTransitionPreview(transitionStartState, pos.x, pos.y);
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

        const pos = renderer.getMousePosition(canvas, e);
        const clickedTransition = renderer.findTransitionAtPosition(pos.x, pos.y);

        if (clickedTransition) {
            openTransitionEditor(clickedTransition);
        }
    });

    canvas.addEventListener('dblclick', function(e) {
        const pos = renderer.getMousePosition(canvas, e);

        // Check if clicked on a state
        const clickedState = renderer.findStateAtPosition(pos.x, pos.y);

        if (clickedState) {
            // If a state is double-clicked, show the transition editor for all transitions from this state
            // First check if there are any transitions from this state
            const stateTransitions = currentAutomata.transitions.filter(t => t.from === clickedState.id);

            if (stateTransitions.length > 0) {
                // Open transition editor with the first transition
                openTransitionEditor(stateTransitions[0]);
                updateStatus("Editing transitions from state q" + clickedState.id);
            } else {
                // If no transitions exist, prompt to add one
                const targetState = prompt('Enter target state ID for new transition:');
                const symbol = prompt('Enter transition symbol:');

                if (targetState !== null && symbol !== null) {
                    const targetId = parseInt(targetState);
                    if (!isNaN(targetId) && currentAutomata.getStateById(targetId)) {
                        const newTransition = currentAutomata.addTransition(clickedState.id, targetId, symbol);
                        if (newTransition) {
                            renderer.render();
                            updateProperties();
                            openTransitionEditor(newTransition);
                            updateStatus("New transition added and opened for editing");
                        }
                    } else {
                        updateStatus("Invalid target state ID");
                    }
                }
            }
            return;
        }

        // Check if clicked near a transition line
        const clickedTransition = renderer.findTransitionAtPosition(pos.x, pos.y);

        if (clickedTransition) {
            if (confirm(`Delete transition with symbol '${clickedTransition.symbol}'?`)) {
                currentAutomata.deleteTransition(
                    clickedTransition.from, 
                    clickedTransition.to, 
                    clickedTransition.symbol
                );
                renderer.render();
                updateProperties();
                updateStatus("Transition deleted");
            }
        }
    });

    // Helper functions
    function updateProperties(): void {
        if (stateCount) stateCount.textContent = currentAutomata.states.length.toString();
        if (transitionCount) transitionCount.textContent = currentAutomata.transitions.length.toString();

        const html = `
            <div>States:</div>
            <div>${currentAutomata.states.length}</div>
            <div>Transitions:</div>
            <div>${currentAutomata.transitions.length}</div>
            <div>Alphabet:</div>
            <div>${Array.from(currentAutomata.alphabet).join(', ') || 'None'}</div>
            <div>Initial State:</div>
            <div>${currentAutomata.states.find(s => s.isInitial) ? 'q' + currentAutomata.states.find(s => s.isInitial)?.id : 'None'}</div>
            <div>Final States:</div>
            <div>${currentAutomata.states.filter(s => s.isFinal).map(s => 'q' + s.id).join(', ') || 'None'}</div>
            ${currentAutomata.regex ? `<div>Regex:</div><div class="property-regex">${currentAutomata.regex}</div>` : ''}
        `;
        if (automataPropertiesDiv) automataPropertiesDiv.innerHTML = html;
    }

    function updateSavedAutomataList(): void {
        if (!savedAutomataList) return;

        savedAutomataList.innerHTML = '';
        const names = AutomataStorage.getAutomataNames();
        names.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.addEventListener('click', function() {
                const automata = AutomataStorage.getAutomata(name);
                if (automata) {
                    currentAutomata = automata;
                    renderer.setAutomata(currentAutomata);
                    renderer.render();
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

    function updateStatus(message: string): void {
        if (statusMessage) statusMessage.textContent = message;
    }

    function openTransitionEditor(transition: { from: number; to: number; symbol: string }): void {
        currentEditTransition = transition;
        currentEditSymbols = currentAutomata.transitions
            .filter(t => t.from === transition.from && t.to === transition.to)
            .map(t => t.symbol);

        renderSymbolList();
        if (modal) {
            // Update the modal title to show which states are being edited
            const modalTitle = document.querySelector('#transition-modal .modal-title') as HTMLElement;
            if (modalTitle) {
                modalTitle.textContent = `Transition q${transition.from} → q${transition.to}`;
            }

            modal.style.display = 'flex';

            // Focus on the new symbol input for quick editing
            if (newSymbolInput) {
                newSymbolInput.focus();
            }
        }
    }

    function renderSymbolList(): void {
        if (!symbolList) return;

        symbolList.innerHTML = '';
        currentEditSymbols.forEach(symbol => {
            const symbolItem = document.createElement('div');
            symbolItem.className = 'symbol-item';
            symbolItem.innerHTML = `
                <span>${symbol}</span>
                <span class="delete-symbol">×</span>
            `;

            const deleteBtn = symbolItem.querySelector('.delete-symbol');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    const index = currentEditSymbols.indexOf(symbol);
                    if (index !== -1) {
                        currentEditSymbols.splice(index, 1);
                        renderSymbolList();
                    }
                });
            }

            symbolList.appendChild(symbolItem);
        });
    }

    function closeModal(): void {
        if (modal) modal.style.display = 'none';
    }

    function saveTransitionChanges(): void {
        if (!currentEditTransition) return;

        // Remove all existing transitions between these states
        currentAutomata.transitions = currentAutomata.transitions.filter(t => 
            !(t.from === currentEditTransition!.from && t.to === currentEditTransition!.to)
        );

        // Add new transitions for each symbol
        currentEditSymbols.forEach(symbol => {
            currentAutomata.addTransition(
                currentEditTransition!.from,
                currentEditTransition!.to,
                symbol
            );
        });

        renderer.render();
        updateProperties();
        updateStatus("Transition symbols updated");
        closeModal();
    }
});
