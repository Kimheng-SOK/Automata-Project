import { FiniteAutomaton } from './models.js';
import { AutomataStorage } from './storage.js';
import { AutomataRenderer } from './renderer.js';

document.addEventListener('DOMContentLoaded', function() {
    type PendingTransition = { from: number; to: number };
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
    let pendingTransition: PendingTransition | null = null;

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
    const transitionCreator = document.getElementById('transition-creator') as HTMLDivElement;
    const transitionCreatorInput = document.getElementById('transition-symbol-input') as HTMLInputElement;
    const transitionCreatorConfirm = document.getElementById('transition-symbol-confirm') as HTMLButtonElement;
    const transitionCreatorCancel = document.getElementById('transition-symbol-cancel') as HTMLButtonElement;
    const transitionCreatorEpsilon = document.getElementById('transition-symbol-epsilon') as HTMLButtonElement;
    const actionDialog = document.getElementById('action-dialog') as HTMLDivElement;
    const actionDialogTitle = document.getElementById('action-dialog-title') as HTMLHeadingElement;
    const actionDialogMessage = document.getElementById('action-dialog-message') as HTMLParagraphElement;
    const actionDialogInput = document.getElementById('action-dialog-input') as HTMLInputElement;
    const actionDialogCancel = document.getElementById('action-dialog-cancel') as HTMLButtonElement;
    const actionDialogConfirm = document.getElementById('action-dialog-confirm') as HTMLButtonElement;
    let actionDialogConfirmHandler: (() => void) | null = null;

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
        pendingTransition = null;
        closeTransitionCreator();
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
            showConfirmDialog('Delete this state and all its transitions?', () => {
                currentAutomata.deleteState(selectedState);
                renderer.setSelectedState(null);
                renderer.render();
                updateProperties();
                updateStatus("State deleted");
            });
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
            updateStatus(`Conversion failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
            updateStatus(`Minimization failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    });

    document.getElementById('convert-to-regex')?.addEventListener('click', function() {
        try {
            const regex = FiniteAutomaton.convertToRegex(currentAutomata);
            currentAutomata.regex = regex;
            const regexResultDiv = document.getElementById('regex-result');
            if (regexResultDiv) {
                showRegexResult(regexResultDiv, 'Regular Expression:', regex);
                regexResultDiv.className = 'success result';
            }
            updateProperties();
            updateStatus("Converted to regular expression");
        } catch (e) {
            console.error('Regex conversion error:', e);
            const regexResultDiv = document.getElementById('regex-result');
            if (regexResultDiv) {
                showRegexResult(regexResultDiv, 'Conversion failed:', e instanceof Error ? e.message : 'Unknown error');
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
        showTextInputDialog('Export automata', 'Enter a name for this automata:', '', (name) => {
            const exportData = AutomataStorage.exportAutomata(name) ||
                JSON.stringify(currentAutomata.toJSON(), null, 2);

            AutomataStorage.saveAutomata(name, currentAutomata);

            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name.replace(/\W/g, '_')}_automata.json`;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);

            if (exportNotification) {
                exportNotification.textContent = `Automata exported to ${a.download}`;
                exportNotification.style.display = 'block';
                setTimeout(() => {
                    exportNotification.style.display = 'none';
                }, 3000);
            }

            updateStatus(`Automata exported as "${a.download}"`);
        });
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

            showTextInputDialog('Import automata', 'Enter a name for the imported automata:', '', (name) => {
                if (AutomataStorage.importAutomata(name, event.target!.result as string)) {
                    updateSavedAutomataList();
                    updateStatus(`Automata "${name}" imported`);
                } else {
                    updateStatus('Import failed: invalid format');
                }
            });
        };
        reader.readAsText(file);
        target.value = '';
    });

    document.getElementById('delete-all-automata')?.addEventListener('click', function() {
        showConfirmDialog('Delete all saved automata? This cannot be undone.', () => {
            AutomataStorage.deleteAllAutomata();
            updateSavedAutomataList();
            updateStatus("All automata deleted");
        });
    });

    // Modal event listeners
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    saveBtn?.addEventListener('click', saveTransitionChanges);

    addSymbolBtn?.addEventListener('click', function() {
        const symbol = newSymbolInput.value.trim();
        if (symbol) {
            const parsedSymbols = parseSymbolInput(symbol);
            if (parsedSymbols.invalidSymbols.length > 0) {
                updateStatus(`Invalid symbol "${parsedSymbols.invalidSymbols[0]}": symbols must be one character or ε`);
                return;
            }

            const nextSymbol = parsedSymbols.symbols[0];
            if (!nextSymbol) {
                updateStatus('Enter at least one symbol');
                return;
            }

            if (!currentEditSymbols.includes(nextSymbol)) {
                currentEditSymbols.push(nextSymbol);
                renderSymbolList();
            }

            newSymbolInput.value = '';
            newSymbolInput.focus();
        }
    });

    addEpsilonBtn?.addEventListener('click', function() {
        addEpsilonToEditSymbols();
    });

    transitionCreatorConfirm?.addEventListener('click', savePendingTransition);
    transitionCreatorCancel?.addEventListener('click', function() {
        closeTransitionCreator();
        endTransitionMode('Transition canceled');
    });
    transitionCreatorEpsilon?.addEventListener('click', appendEpsilonToTransitionInput);
    transitionCreatorInput?.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            savePendingTransition();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeTransitionCreator();
            endTransitionMode('Transition canceled');
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
            event.preventDefault();
            appendEpsilonToTransitionInput();
        }
    });

    actionDialogCancel?.addEventListener('click', closeActionDialog);
    actionDialogConfirm?.addEventListener('click', function() {
        actionDialogConfirmHandler?.();
    });
    actionDialogInput?.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            actionDialogConfirmHandler?.();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            closeActionDialog();
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
                } else {
                    pendingTransition = {
                        from: transitionStartState,
                        to: clickedState.id
                    };
                    openTransitionCreator(pos.x, pos.y);
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

        // Pointer cursor when hovering something clickable (a transition that is not under a state)
        if (!isDragging && !isAddingTransition) {
            const overTransition = renderer.findTransitionAtPosition(pos.x, pos.y) !== null;
            const overState = renderer.findStateAtPosition(pos.x, pos.y) !== null;
            canvas.style.cursor = overTransition && !overState ? 'pointer' : '';
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

    // Resizing a canvas clears it, so draw again afterwards
    window.addEventListener('load', () => renderer.render());
    window.addEventListener('resize', () => setTimeout(() => renderer.render(), 150));
    window.addEventListener('orientationchange', () => setTimeout(() => renderer.render(), 300));

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
            beginTransitionSelection(clickedState.id, true);
            return;
        }

        // Check if clicked near a transition line
        const clickedTransition = renderer.findTransitionAtPosition(pos.x, pos.y);

        if (clickedTransition) {
            showConfirmDialog(`Delete transition with symbol '${clickedTransition.symbol}'?`, () => {
                currentAutomata.deleteTransition(
                    clickedTransition.from, 
                    clickedTransition.to, 
                    clickedTransition.symbol
                );
                renderer.render();
                updateProperties();
                updateStatus("Transition deleted");
            });
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
                showConfirmDialog(`Delete automata "${name}"?`, () => {
                    AutomataStorage.deleteAutomata(name);
                    updateSavedAutomataList();
                    updateStatus(`Deleted automata: "${name}"`);
                });
            });

            li.appendChild(deleteBtn);
            savedAutomataList.appendChild(li);
        });
    }

    function updateStatus(message: string): void {
        if (statusMessage) statusMessage.textContent = message;
    }

    function beginTransitionSelection(startStateId: number, fromDoubleClick = false): void {
        isAddingTransition = true;
        transitionStartState = startStateId;
        pendingTransition = null;
        closeTransitionCreator();
        const addTransitionBtn = document.getElementById('add-transition');
        addTransitionBtn?.classList.add('active');
        renderer.render();
        updateStatus(
            fromDoubleClick
                ? `Transition start set to q${startStateId}. Click target state.`
                : 'Now select target state'
        );
    }

    function endTransitionMode(message?: string): void {
        isAddingTransition = false;
        transitionStartState = null;
        pendingTransition = null;
        const addTransitionBtn = document.getElementById('add-transition');
        addTransitionBtn?.classList.remove('active');
        renderer.render();
        if (message) updateStatus(message);
    }

    function openTransitionCreator(canvasX: number, canvasY: number): void {
        if (!transitionCreator || !transitionCreatorInput || !pendingTransition) return;

        const maxLeft = Math.max(canvas.width - 240, 16);
        const maxTop = Math.max(canvas.height - 120, 16);
        const left = Math.min(Math.max(canvasX + 12, 16), maxLeft);
        const top = Math.min(Math.max(canvasY + 12, 16), maxTop);

        transitionCreator.style.left = `${left}px`;
        transitionCreator.style.top = `${top}px`;
        transitionCreator.style.display = 'block';
        transitionCreatorInput.value = '';
        transitionCreatorInput.focus();
        updateStatus(`Enter symbol(s) for q${pendingTransition.from} → q${pendingTransition.to}`);
    }

    function closeTransitionCreator(): void {
        if (!transitionCreator) return;
        transitionCreator.style.display = 'none';
    }

    function appendEpsilonToTransitionInput(): void {
        if (!transitionCreatorInput) return;
        const value = transitionCreatorInput.value.trim();
        transitionCreatorInput.value = value.length === 0 ? 'ε' : `${value},ε`;
        transitionCreatorInput.focus();
    }

    function addEpsilonToEditSymbols(): void {
        const epsilon = 'ε';
        if (!currentEditSymbols.includes(epsilon)) {
            currentEditSymbols.push(epsilon);
            renderSymbolList();
        }
    }

    function parseSymbolInput(raw: string): { symbols: string[]; invalidSymbols: string[] } {
        const entries = raw
            .split(',')
            .map(part => part.trim())
            .filter(part => part.length > 0);
        const symbols: string[] = [];
        const invalidSymbols: string[] = [];

        entries.forEach(entry => {
            const isValid = entry === 'ε' || entry.length === 1;
            if (!isValid) {
                invalidSymbols.push(entry);
                return;
            }

            if (!symbols.includes(entry)) {
                symbols.push(entry);
            }
        });

        return { symbols, invalidSymbols };
    }

    function transitionExists(from: number, to: number, symbol: string): boolean {
        return currentAutomata.transitions.some(
            transition => transition.from === from && transition.to === to && transition.symbol === symbol
        );
    }

    function addValidatedTransitions(from: number, to: number, symbols: string[]): { added: number; skipped: number } {
        let added = 0;
        let skipped = 0;

        symbols.forEach(symbol => {
            if (transitionExists(from, to, symbol)) {
                skipped += 1;
                return;
            }

            const created = currentAutomata.addTransition(from, to, symbol);
            if (created) {
                added += 1;
            }
        });

        return { added, skipped };
    }

    function savePendingTransition(): void {
        if (!pendingTransition || !transitionCreatorInput) return;

        const parsedSymbols = parseSymbolInput(transitionCreatorInput.value);
        if (parsedSymbols.invalidSymbols.length > 0) {
            updateStatus(
                `Invalid symbol "${parsedSymbols.invalidSymbols[0]}": symbols must be one character or ε`
            );
            return;
        }

        if (parsedSymbols.symbols.length === 0) {
            updateStatus('Enter at least one symbol');
            return;
        }

        const result = addValidatedTransitions(pendingTransition.from, pendingTransition.to, parsedSymbols.symbols);
        renderer.render();
        updateProperties();
        closeTransitionCreator();

        if (result.added === 0) {
            endTransitionMode('No transitions added (all duplicates).');
            return;
        }

        const duplicateSuffix = result.skipped > 0 ? ` (${result.skipped} duplicate skipped)` : '';
        endTransitionMode(`Transition${result.added > 1 ? 's' : ''} added${duplicateSuffix}`);
    }

    function closeActionDialog(): void {
        if (!actionDialog || !actionDialogInput) return;
        actionDialog.style.display = 'none';
        actionDialogConfirmHandler = null;
        actionDialogInput.value = '';
    }

    function showConfirmDialog(message: string, onConfirm: () => void): void {
        if (!actionDialog || !actionDialogTitle || !actionDialogMessage || !actionDialogInput || !actionDialogConfirm) {
            return;
        }

        actionDialogTitle.textContent = 'Confirm action';
        actionDialogMessage.textContent = message;
        actionDialogInput.style.display = 'none';
        actionDialogConfirm.textContent = 'Confirm';
        actionDialogConfirmHandler = () => {
            closeActionDialog();
            onConfirm();
        };
        actionDialog.style.display = 'flex';
        actionDialogConfirm.focus();
    }

    function showTextInputDialog(
        title: string,
        message: string,
        initialValue: string,
        onConfirm: (value: string) => void
    ): void {
        if (!actionDialog || !actionDialogTitle || !actionDialogMessage || !actionDialogInput || !actionDialogConfirm) {
            return;
        }

        actionDialogTitle.textContent = title;
        actionDialogMessage.textContent = message;
        actionDialogInput.style.display = 'block';
        actionDialogInput.value = initialValue;
        actionDialogConfirm.textContent = 'Save';
        actionDialogConfirmHandler = () => {
            const value = actionDialogInput.value.trim();
            if (!value) {
                updateStatus('A name is required');
                actionDialogInput.focus();
                return;
            }

            closeActionDialog();
            onConfirm(value);
        };
        actionDialog.style.display = 'flex';
        actionDialogInput.focus();
        actionDialogInput.select();
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
            const symbolText = document.createElement('span');
            symbolText.textContent = symbol;
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-symbol';
            deleteBtn.textContent = '×';
            deleteBtn.addEventListener('click', function() {
                const index = currentEditSymbols.indexOf(symbol);
                if (index !== -1) {
                    currentEditSymbols.splice(index, 1);
                    renderSymbolList();
                }
            });

            symbolItem.append(symbolText, deleteBtn);

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

// Builds the result with textContent so user-controlled symbols can never inject HTML
function showRegexResult(container: HTMLElement, title: string, value: string): void {
    container.textContent = '';
    const titleDiv = document.createElement('div');
    titleDiv.className = 'regex-title';
    titleDiv.textContent = title;
    const valueDiv = document.createElement('div');
    valueDiv.className = 'regex-value';
    valueDiv.textContent = value;
    container.append(titleDiv, valueDiv);
}
