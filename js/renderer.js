export class AutomataRenderer {
    constructor(canvas, automata) {
        this.selectedState = null;
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('Could not get canvas context');
        this.ctx = context;
        this.automata = automata;
    }
    setAutomata(automata) {
        this.automata = automata;
    }
    setSelectedState(stateId) {
        this.selectedState = stateId;
    }
    getSelectedState() {
        return this.selectedState;
    }
    render() {
        const canvas = this.ctx.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw transitions first so states appear on top
        this.drawTransitions();
        // Draw states
        this.automata.states.forEach(state => {
            // Draw state circle
            this.ctx.beginPath();
            this.ctx.arc(state.x, state.y, state.radius, 0, 2 * Math.PI);
            // Highlight selected state
            if (this.selectedState === state.id) {
                this.ctx.fillStyle = '#e0f7fa';
            }
            else {
                this.ctx.fillStyle = '#fff';
            }
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.fill();
            this.ctx.stroke();
            // Draw state ID
            this.ctx.fillStyle = '#333';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(`q${state.id}`, state.x, state.y);
            // Draw initial state marker
            if (state.isInitial) {
                this.ctx.beginPath();
                this.ctx.moveTo(state.x - state.radius - 15, state.y);
                this.ctx.lineTo(state.x - state.radius, state.y);
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                // Draw arrowhead
                this.ctx.beginPath();
                this.ctx.moveTo(state.x - state.radius - 5, state.y - 5);
                this.ctx.lineTo(state.x - state.radius, state.y);
                this.ctx.lineTo(state.x - state.radius - 5, state.y + 5);
                this.ctx.fillStyle = '#333';
                this.ctx.fill();
            }
            // Draw final state marker (double circle)
            if (state.isFinal) {
                this.ctx.beginPath();
                this.ctx.arc(state.x, state.y, state.radius - 5, 0, 2 * Math.PI);
                this.ctx.strokeStyle = '#333';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });
    }
    drawTransitionPreview(fromStateId, toX, toY) {
        const fromState = this.automata.getStateById(fromStateId);
        if (!fromState)
            return;
        this.ctx.beginPath();
        this.ctx.moveTo(fromState.x, fromState.y);
        this.ctx.lineTo(toX, toY);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    drawTransitions() {
        // Group transitions by from-to pairs
        const transitionGroups = new Map();
        const bidirectionalPairs = new Set();
        // First pass: group transitions
        this.automata.transitions.forEach(transition => {
            const key = `${transition.from}-${transition.to}`;
            if (!transitionGroups.has(key)) {
                transitionGroups.set(key, []);
            }
            const group = transitionGroups.get(key);
            if (group)
                group.push(transition);
        });
        // Second pass: detect bidirectional pairs
        transitionGroups.forEach((_transitions, key) => {
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
            const fromState = this.automata.getStateById(fromId);
            const toState = this.automata.getStateById(toId);
            if (!fromState || !toState)
                return;
            const isBidirectional = bidirectionalPairs.has(key);
            const isSelfLoop = fromId === toId;
            if (isSelfLoop) {
                this.drawSelfLoop(fromState, transitions);
            }
            else if (isBidirectional) {
                // Draw bidirectional with distinct curves
                this.drawBidirectionalArrow(fromState, toState, transitions);
            }
            else {
                this.drawStraightArrow(fromState, toState, transitions);
            }
        });
    }
    drawStraightArrow(fromState, toState, transitions) {
        const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
        const adjustedFromX = fromState.x + Math.cos(angle) * fromState.radius;
        const adjustedFromY = fromState.y + Math.sin(angle) * fromState.radius;
        const adjustedToX = toState.x - Math.cos(angle) * toState.radius;
        const adjustedToY = toState.y - Math.sin(angle) * toState.radius;
        // Draw the line
        this.ctx.beginPath();
        this.ctx.moveTo(adjustedFromX, adjustedFromY);
        this.ctx.lineTo(adjustedToX, adjustedToY);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        // Draw arrowhead
        this.drawArrowhead(adjustedToX, adjustedToY, angle);
        // Draw symbols
        const symbols = transitions.map(t => t.symbol).join(',');
        const midX = (adjustedFromX + adjustedToX) / 2;
        const midY = (adjustedFromY + adjustedToY) / 2;
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(symbols, midX, midY - 10);
    }
    drawBidirectionalArrow(fromState, toState, transitions) {
        const dx = toState.x - fromState.x;
        const dy = toState.y - fromState.y;
        const angle = Math.atan2(dy, dx);
        // Midpoint
        const midX = (fromState.x + toState.x) / 2;
        const midY = (fromState.y + toState.y) / 2;
        // Calculate distinct curve offsets
        const perpAngle = angle + Math.PI / 2;
        const offset = 40;
        // Draw the "forward" curve (above the line)
        const controlX1 = midX + Math.cos(perpAngle) * offset;
        const controlY1 = midY + Math.sin(perpAngle) * offset;
        this.drawCurvedArrow(fromState, toState, transitions, controlX1, controlY1);
        // Draw the "reverse" curve (below the line)
        const controlX2 = midX - Math.cos(perpAngle) * offset;
        const controlY2 = midY - Math.sin(perpAngle) * offset;
        // For reverse transitions, we need to find the reverse transitions
        const reverseTransitions = this.automata.transitions.filter(t => t.from === toState.id && t.to === fromState.id);
        if (reverseTransitions.length > 0) {
            this.drawCurvedArrow(toState, fromState, reverseTransitions, controlX2, controlY2);
        }
    }
    drawCurvedArrow(fromState, toState, transitions, controlX, controlY) {
        const angleToControl = Math.atan2(controlY - fromState.y, controlX - fromState.x);
        const startX = fromState.x + Math.cos(angleToControl) * fromState.radius;
        const startY = fromState.y + Math.sin(angleToControl) * fromState.radius;
        const angleFromControl = Math.atan2(toState.y - controlY, toState.x - controlX);
        const endX = toState.x - Math.cos(angleFromControl) * toState.radius;
        const endY = toState.y - Math.sin(angleFromControl) * toState.radius;
        // Draw quadratic curve
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        // Draw arrowhead
        this.drawArrowhead(endX, endY, angleFromControl);
        // Draw symbols at the control point
        const symbols = transitions.map(t => t.symbol).join(',');
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(symbols, controlX, controlY);
        // Highlight epsilon transitions
        if (transitions.some(t => t.symbol === 'ε')) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(controlX, controlY, 10, 0, Math.PI * 2);
            this.ctx.strokeStyle = '#c0392b';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('ε', controlX, controlY);
        }
    }
    drawSelfLoop(state, transitions) {
        const loopRadius = 25;
        const centerX = state.x;
        const centerY = state.y - 40;
        // Draw loop
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, loopRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        // Draw arrowhead
        const arrowAngle = Math.PI * 1.5;
        const arrowX = centerX + loopRadius * Math.cos(arrowAngle);
        const arrowY = centerY + loopRadius * Math.sin(arrowAngle);
        this.drawArrowhead(arrowX, arrowY, arrowAngle);
        // Draw symbols
        const symbols = transitions.map(t => t.symbol).join(',');
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(symbols, centerX, centerY - 50);
    }
    drawArrowhead(x, y, angle) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - 12 * Math.cos(angle - Math.PI / 6), y - 12 * Math.sin(angle - Math.PI / 6));
        this.ctx.lineTo(x - 12 * Math.cos(angle + Math.PI / 6), y - 12 * Math.sin(angle + Math.PI / 6));
        this.ctx.closePath();
        this.ctx.fillStyle = '#3498db';
        this.ctx.fill();
    }
    findStateAtPosition(x, y) {
        return this.automata.states.find(state => {
            const distance = Math.sqrt((x - state.x) ** 2 + (y - state.y) ** 2);
            return distance <= state.radius;
        }) || null;
    }
    findTransitionAtPosition(x, y) {
        const threshold = 5;
        for (const trans of this.automata.transitions) {
            const fromState = this.automata.getStateById(trans.from);
            const toState = this.automata.getStateById(trans.to);
            if (!fromState || !toState)
                continue;
            if (fromState.id === toState.id) {
                // Self-transition (loop)
                const centerX = fromState.x;
                const centerY = fromState.y - 30;
                const radius = 25;
                const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                if (Math.abs(distance - radius) < threshold) {
                    return trans;
                }
            }
            else {
                // Normal transition
                const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
                const adjustedFromX = fromState.x + Math.cos(angle) * fromState.radius;
                const adjustedFromY = fromState.y + Math.sin(angle) * fromState.radius;
                const adjustedToX = toState.x - Math.cos(angle) * toState.radius;
                const adjustedToY = toState.y - Math.sin(angle) * toState.radius;
                // Distance from point to line segment
                const distance = this.distanceToLine(x, y, adjustedFromX, adjustedFromY, adjustedToX, adjustedToY);
                if (distance < threshold) {
                    return trans;
                }
            }
        }
        return null;
    }
    distanceToLine(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0)
            param = dot / len_sq;
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        }
        else if (param > 1) {
            xx = x2;
            yy = y2;
        }
        else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
    getMousePosition(canvas, evt) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
}
