// UI Event Handlers and DOM Manipulation
class UI {
    constructor(automataRenderer, currentAutomata) {
        this.renderer = automataRenderer;
        this.currentAutomata = currentAutomata;

        // DOM Elements
        this.testStringInput = document.getElementById('test-string');
        this.testResultDiv = document.getElementById('test-result');
        this.deterministicResultDiv = document.getElementById('deterministic-result');
        this.automataPropertiesDiv = document.getElementById('automata-properties');
        this.savedAutomataList = document.getElementById('saved-automata');
        this.automataNameInput = document.getElementById('automata-name');
        this.statusMessage = document.getElementById('status-message');
        this.stateCountSpan = document.getElementById('state-count');
        this.transitionCountSpan = document.getElementById('transition-count');
        this.exportNotification = document.getElementById('export-notification');

        // Transition Editor Modal Elements
        this.modal = document.getElementById('transition-modal');
        this.closeBtn = document.querySelector('.close-btn');
        this.cancelBtn = document.getElementById('cancel-edit');
        this.saveBtn = document.getElementById('save-transition');
        this.symbolListDiv = document.getElementById('symbol-list');
        this.newSymbolInput = document.getElementById('new-symbol');
        this.addSymbolBtn = document.getElementById('add-symbol');
        this.addEpsilonBtn = document.getElementById('add-epsilon');

        this.currentEditTransition = null;
        this.currentEditSymbols = [];

        this.isAddingTransition = false;
        this.transitionStartStateId = null;
        this.isDragging = false;
        this.dragState = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;

        this.setupEventListeners();
        this.updateProperties();
        this.updateStatus("Ready");
        this.updateSavedAutomataList();
    }

    // --- Public methods to update UI ---
    updateCurrentAutomata(automata) {
        this.currentAutomata = automata;
        this.renderer.setAutomata(automata);
        this.updateProperties();
    }

    updateProperties() {
        this.stateCountSpan.textContent = this.currentAutomata.states.length;
        this.transitionCountSpan.textContent = this.currentAutomata.transitions.length;

        const propertiesHTML = `
            <div>Total States:</div><div>${this.currentAutomata.states.length}</div>
            <div>Total Transitions:</div><div>${this.currentAutomata.transitions.length}</div>
            <div>Alphabet Size:</div><div>${this.currentAutomata.alphabet.size}</div>
            <div>Is Deterministic:</div><div>${this.currentAutomata.isDeterministic() ? 'Yes' : 'No'}</div>
        `;
        this.automataPropertiesDiv.innerHTML = propertiesHTML;
    }

    updateStatus(message) {
        this.statusMessage.textContent = message;
    }

    updateSavedAutomataList() {
        this.savedAutomataList.innerHTML = '';
        const automataNames = AutomataStorage.getAutomataNames(); // Assumes AutomataStorage is globally available or imported

        if (automataNames.length === 0) {
            this.savedAutomataList.innerHTML = '<li>No saved automata.</li>';
            return;
        }

        automataNames.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.dataset.automataName = name; // Store name for loading

            const deleteBtn = document.createElement('span');
            deleteBtn.textContent = '×';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.title = `Delete ${name}`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent loading when deleting
                if (confirm(`Are you sure you want to delete "${name}"?`)) {
                    AutomataStorage.deleteAutomata(name);
                    this.updateSavedAutomataList();
                    this.updateStatus(`Automata "${name}" deleted`);
                }
            });

            li.appendChild(deleteBtn);

            li.addEventListener('click', () => {
                const loadedAutomata = AutomataStorage.getAutomata(name);
                if (loadedAutomata) {
                    this.updateCurrentAutomata(loadedAutomata);
                    this.renderer.setSelectedState(null); // Deselect any state
                    this.updateStatus(`Automata "${name}" loaded`);
                } else {
                    this.updateStatus(`Failed to load "${name}"`);
                }
            });
            this.savedAutomataList.appendChild(li);
        });
    }

    showExportNotification(filename) {
        this.exportNotification.textContent = `Automata exported to ${filename}`;
        this.exportNotification.style.display = 'block';
        setTimeout(() => {
            this.exportNotification.style.display = 'none';
        }, 3000);
    }

    // --- Modal related methods ---
    openTransitionEditor(transition) {
        this.currentEditTransition = transition;
        this.currentEditSymbols = this.currentAutomata.transitions
            .filter(t => t.from === transition.from && t.to === transition.to)
            .map(t => t.symbol);

        this.renderSymbolList();
        this.modal.style.display = 'flex';
        this.updateStatus("Editing transition symbols");
    }

    closeModal = () => { // Use arrow function to preserve 'this' context
        this.modal.style.display = 'none';
        this.currentEditTransition = null;
        this.currentEditSymbols = [];
        this.newSymbolInput.value = '';
        this.updateStatus("Ready");
    }

    renderSymbolList() {
        this.symbolListDiv.innerHTML = '';
        this.currentEditSymbols.forEach(symbol => {
            const symbolItem = document.createElement('div');
            symbolItem.classList.add('symbol-item');
            symbolItem.innerHTML = `
                <span>${symbol}</span>
                <span class="delete-symbol" data-symbol="${symbol}">&times;</span>
            `;
            symbolItem.querySelector('.delete-symbol').addEventListener('click', (e) => {
                const symbolToDelete = e.target.dataset.symbol;
                this.currentEditSymbols = this.currentEditSymbols.filter(s => s !== symbolToDelete);
                this.renderSymbolList();
            });
            this.symbolListDiv.appendChild(symbolItem);
        });
    }

    saveTransitionChanges = () => {
        if (!this.currentEditTransition) return;

        const from = this.currentEditTransition.from;
        const to = this.currentEditTransition.to;

        // Delete all existing transitions between from and to
        this.currentAutomata.transitions = this.currentAutomata.transitions.filter(
            t => !(t.from === from && t.to === to)
        );

        // Add new transitions based on currentEditSymbols
        this.currentEditSymbols.forEach(symbol => {
            this.currentAutomata.addTransition(from, to, symbol);
        });

        // Recalculate alphabet as symbols might have been removed or added
        this.currentAutomata.alphabet = new Set(this.currentAutomata.transitions.map(t => t.symbol));

        this.renderer.setAutomata(this.currentAutomata); // Re-render with updated data
        this.updateProperties();
        this.closeModal();
        this.updateStatus("Transition symbols updated");
    }


    // --- Setup all Event Listeners ---
    setupEventListeners() {
        // Button Event Listeners
        document.getElementById('add-state').addEventListener('click', () => {
            const x = Math.random() * (this.renderer.canvas.width - 60) + 30;
            const y = Math.random() * (this.renderer.canvas.height - 60) + 30;
            this.currentAutomata.addState(x, y);
            this.renderer.setAutomata(this.currentAutomata);
            this.updateProperties();
            this.updateStatus("State added");
        });

        document.getElementById('add-transition').addEventListener('click', function() {
            this.isAddingTransition = !this.isAddingTransition;
            this.transitionStartStateId = null;
            this.renderer.setTransitionMode(this.isAddingTransition);
            this.classList.toggle('active', this.isAddingTransition);
            this.updateStatus(this.isAddingTransition ? "Select first state for transition" : "Transition mode canceled");
        }.bind(this)); // Bind 'this' to the UI instance

        document.getElementById('set-initial').addEventListener('click', () => {
            if (this.renderer.selectedState !== null) {
                this.currentAutomata.setInitialState(this.renderer.selectedState);
                this.renderer.setAutomata(this.currentAutomata);
                this.updateProperties();
                this.updateStatus("Initial state set");
            } else {
                this.updateStatus("Select a state first");
            }
        });

        document.getElementById('set-final').addEventListener('click', () => {
            if (this.renderer.selectedState !== null) {
                this.currentAutomata.toggleFinalState(this.renderer.selectedState);
                this.renderer.setAutomata(this.currentAutomata);
                this.updateProperties();
                this.updateStatus("Final state toggled");
            } else {
                this.updateStatus("Select a state first");
            }
        });

        document.getElementById('delete-element').addEventListener('click', () => {
            if (this.renderer.selectedState !== null) {
                if (confirm('Delete this state and all its transitions?')) {
                    this.currentAutomata.deleteState(this.renderer.selectedState);
                    this.renderer.setSelectedState(null);
                    this.renderer.setAutomata(this.currentAutomata);
                    this.updateProperties();
                    this.updateStatus("State deleted");
                }
            } else {
                this.updateStatus("Select a state to delete");
            }
        });

        document.getElementById('test-acceptance').addEventListener('click', () => {
            const inputString = this.testStringInput.value;
            if (inputString === "") {
                this.updateStatus("Enter a string to test");
                return;
            }

            try {
                if (!this.currentAutomata.isDeterministic()) {
                    this.testResultDiv.textContent = `Error: Automaton is non-deterministic. Cannot test acceptance directly. Convert to DFA first.`;
                    this.testResultDiv.className = 'error result';
                    this.updateStatus("Test failed: NFA detected");
                    return;
                }
                const result = this.currentAutomata.acceptsString(inputString);
                this.testResultDiv.textContent = result ?
                    `String "${inputString}" is accepted` :
                    `String "${inputString}" is not accepted`;
                this.testResultDiv.className = result ? 'success result' : 'error result';
                this.updateStatus(result ? "String accepted" : "String rejected");
            } catch (e) {
                this.testResultDiv.textContent = `Error: ${e.message}`;
                this.testResultDiv.className = 'error result';
                this.updateStatus("Error testing string");
            }
        });

        document.getElementById('check-deterministic').addEventListener('click', () => {
            const isDfa = this.currentAutomata.isDeterministic();
            this.deterministicResultDiv.textContent = isDfa ?
                'The automaton is deterministic (DFA)' :
                'The automaton is non-deterministic (NFA)';
            this.deterministicResultDiv.className = isDfa ? 'success result' : 'error result';
            this.updateStatus(isDfa ? "Automaton is deterministic" : "Automaton is non-deterministic");
        });

        document.getElementById('convert-to-dfa').addEventListener('click', () => {
            try {
                this.updateCurrentAutomata(FiniteAutomaton.convertNFAtoDFA(this.currentAutomata));
                this.renderer.setSelectedState(null);
                this.updateStatus("NFA converted to DFA");
            } catch (e) {
                console.error('Conversion error:', e);
                alert(`Conversion failed: ${e.message}`);
                this.updateStatus("Conversion error");
            }
        });

        document.getElementById('minimize-dfa').addEventListener('click', () => {
            try {
                // Ensure it's a DFA before minimizing
                if (!this.currentAutomata.isDeterministic()) {
                    alert("Please convert the NFA to DFA before attempting minimization.");
                    this.updateStatus("Minimization failed: Not a DFA");
                    return;
                }
                this.updateCurrentAutomata(FiniteAutomaton.minimizeDFA(this.currentAutomata));
                this.renderer.setSelectedState(null);
                this.updateStatus("DFA minimized");
            } catch (e) {
                console.error('Minimization error:', e);
                alert(`Minimization failed: ${e.message}`);
                this.updateStatus("Minimization error");
            }
        });

        document.getElementById('save-automata').addEventListener('click', () => {
            const name = this.automataNameInput.value.trim();
            if (name) {
                AutomataStorage.saveAutomata(name, this.currentAutomata);
                this.updateSavedAutomataList();
                this.automataNameInput.value = '';
                this.updateStatus(`Automata saved as "${name}"`);
            } else {
                this.updateStatus("Enter a name for the automata");
            }
        });

        document.getElementById('new-automata').addEventListener('click', () => {
            this.updateCurrentAutomata(new FiniteAutomaton());
            this.renderer.setSelectedState(null);
            this.updateStatus("New automata created");
        });

        document.getElementById('export-automata').addEventListener('click', () => {
            const name = prompt("Enter a name for this automata to export:");
            if (name) {
                // Save current state for export
                AutomataStorage.saveAutomata(name, this.currentAutomata);
                const exportData = AutomataStorage.exportAutomata(name);

                if (exportData) {
                    const blob = new Blob([exportData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${name.replace(/[^\w]/g, '_')}_automata.json`;
                    document.body.appendChild(a);
                    a.click();

                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);

                    this.showExportNotification(a.download);
                    this.updateStatus(`Automata exported as "${a.download}"`);
                } else {
                    this.updateStatus("Export failed: Automata not found or invalid.");
                }
            }
        });

        document.getElementById('import-automata').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const name = prompt("Enter a name for the imported automata:");
                if (name) {
                    if (AutomataStorage.importAutomata(name, event.target.result)) {
                        this.updateSavedAutomataList();
                        alert("Automata imported successfully!");
                        this.updateStatus(`Automata "${name}" imported`);
                    } else {
                        alert("Failed to import automata. Invalid format.");
                        this.updateStatus("Import failed");
                    }
                }
            };
            reader.readAsText(file);
            e.target.value = ''; // Clear file input
        });

        document.getElementById('delete-all-automata').addEventListener('click', () => {
            if (confirm("Are you sure you want to delete ALL saved automata? This cannot be undone.")) {
                AutomataStorage.deleteAllAutomata();
                this.updateSavedAutomataList();
                this.updateStatus("All automata deleted");
            }
        });

        // Modal event listeners
        this.closeBtn.addEventListener('click', this.closeModal);
        this.cancelBtn.addEventListener('click', this.closeModal);
        this.saveBtn.addEventListener('click', this.saveTransitionChanges);

        this.addSymbolBtn.addEventListener('click', () => {
            const symbol = this.newSymbolInput.value.trim();
            if (symbol) {
                if (!this.currentEditSymbols.includes(symbol)) {
                    this.currentEditSymbols.push(symbol);
                    this.renderSymbolList();
                    this.newSymbolInput.value = '';
                    this.newSymbolInput.focus();
                }
            }
        });

        this.addEpsilonBtn.addEventListener('click', () => {
            const epsilon = 'ε';
            if (!this.currentEditSymbols.includes(epsilon)) {
                this.currentEditSymbols.push(epsilon);
                this.renderSymbolList();
            }
        });

        // Canvas Event Listeners
        this.renderer.canvas.addEventListener('mousedown', (e) => {
            const pos = this.getMousePos(this.renderer.canvas, e);
            const clickedState = this.renderer.findStateAtPos(pos.x, pos.y);

            if (this.isAddingTransition) {
                if (clickedState) {
                    if (this.transitionStartStateId === null) {
                        this.transitionStartStateId = clickedState.id;
                        this.renderer.setTransitionMode(true, clickedState.id);
                        this.updateStatus("Now select target state");
                    } else {
                        const symbol = prompt('Enter transition symbol:');
                        if (symbol !== null) {
                            this.currentAutomata.addTransition(this.transitionStartStateId, clickedState.id, symbol);
                            this.isAddingTransition = false;
                            document.getElementById('add-transition').classList.remove('active');
                            this.transitionStartStateId = null;
                            this.renderer.setTransitionMode(false);
                            this.renderer.setAutomata(this.currentAutomata);
                            this.updateProperties();
                            this.updateStatus("Transition added");
                        }
                    }
                }
            } else if (clickedState) {
                // Start dragging
                this.isDragging = true;
                this.dragState = clickedState;
                this.dragOffsetX = pos.x - clickedState.x;
                this.dragOffsetY = pos.y - clickedState.y;
                this.renderer.setSelectedState(clickedState.id);
            } else {
                this.renderer.setSelectedState(null);
            }
        });

        this.renderer.canvas.addEventListener('mousemove', (e) => {
            const pos = this.getMousePos(this.renderer.canvas, e);

            if (this.isDragging && this.dragState) {
                this.dragState.x = pos.x - this.dragOffsetX;
                this.dragState.y = pos.y - this.dragOffsetY;
                this.renderer.render();
            }

            // Show transition preview line
            if (this.isAddingTransition && this.transitionStartStateId !== null) {
                this.renderer.render(); // Re-render to clear previous preview
                const startState = this.currentAutomata.getStateById(this.transitionStartStateId);
                if (startState) {
                    this.renderer.ctx.beginPath();
                    this.renderer.ctx.moveTo(startState.x, startState.y);
                    this.renderer.ctx.lineTo(pos.x, pos.y);
                    this.renderer.ctx.strokeStyle = '#3498db';
                    this.renderer.ctx.lineWidth = 2;
                    this.renderer.ctx.setLineDash([5, 5]);
                    this.renderer.ctx.stroke();
                    this.renderer.ctx.setLineDash([]);
                }
            }
        });

        this.renderer.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.dragState = null;
        });

        this.renderer.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.dragState = null;
        });

        this.renderer.canvas.addEventListener('click', (e) => {
            if (this.isAddingTransition || this.isDragging) return;

            const pos = this.getMousePos(this.renderer.canvas, e);
            const clickedTransition = this.renderer.findTransitionAtPos(pos.x, pos.y);

            if (clickedTransition) {
                this.openTransitionEditor(clickedTransition);
            }
        });

        this.renderer.canvas.addEventListener('dblclick', (e) => {
            const pos = this.getMousePos(this.renderer.canvas, e);
            const clickedTransition = this.renderer.findTransitionAtPos(pos.x, pos.y);

            if (clickedTransition) {
                if (confirm(`Delete transition with symbol '${clickedTransition.symbol}'?`)) {
                    this.currentAutomata.deleteTransition(
                        clickedTransition.from,
                        clickedTransition.to,
                        clickedTransition.symbol
                    );
                    this.renderer.setAutomata(this.currentAutomata);
                    this.updateProperties();
                    this.updateStatus("Transition deleted");
                }
            }
        });
    }

    // Helper function for mouse position
    getMousePos(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
}