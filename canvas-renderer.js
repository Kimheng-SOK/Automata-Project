// Canvas Rendering Logic
class CanvasRenderer {
    constructor(canvas, automata) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.automata = automata; // Reference to the current FiniteAutomaton instance
        this.selectedState = null;
        this.transitionStartState = null;
        this.isAddingTransition = false;
    }

    setAutomata(automata) {
        this.automata = automata;
        this.render();
    }

    setSelectedState(stateId) {
        this.selectedState = stateId;
        this.render();
    }

    setTransitionMode(isActive, startStateId = null) {
        this.isAddingTransition = isActive;
        this.transitionStartState = startStateId;
        this.render(); // Re-render to show potential preview line
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw transitions first so states appear on top
        this.drawTransitions();

        // Draw states
        this.automata.states.forEach(state => {
            // Draw state circle
            this.ctx.beginPath();
            this.ctx.arc(state.x, state.y, state.radius, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#fff';
            this.ctx.strokeStyle = (this.selectedState === state.id) ? '#e74c3c' : '#333'; // Highlight selected
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
            const fromState = this.automata.getStateById(fromId);
            const toState = this.automata.getStateById(toId);

            if (!fromState || !toState) return;

            const isBidirectional = bidirectionalPairs.has(key);
            const isSelfLoop = fromId === toId;

            if (isSelfLoop) {
                this.drawSelfLoop(fromState, transitions);
            } else if (isBidirectional) {
                // Draw bidirectional with distinct curves
                this.drawBidirectionalArrow(fromState, toState, transitions, key);
            } else {
                this.drawStraightArrow(fromState, toState, transitions);
            }
        });
    }

    // Helper to draw a standard arrow
    drawArrow(startX, startY, endX, endY) {
        const headlen = 10; // length of head in pixels
        const angle = Math.atan2(endY - startY, endX - startX);
        this.ctx.lineTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
    }

    drawStraightArrow(fromState, toState, transitions) {
        const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
        const adjustedFromX = fromState.x + Math.cos(angle) * fromState.radius;
        const adjustedFromY = fromState.y + Math.sin(angle) * fromState.radius;
        const adjustedToX = toState.x - Math.cos(angle) * toState.radius;
        const adjustedToY = toState.y - Math.sin(angle) * toState.radius;

        this.ctx.beginPath();
        this.ctx.moveTo(adjustedFromX, adjustedFromY);
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.drawArrow(adjustedFromX, adjustedFromY, adjustedToX, adjustedToY);
        this.ctx.stroke();

        // Draw symbols
        const midX = (adjustedFromX + adjustedToX) / 2;
        const midY = (adjustedFromY + adjustedToY) / 2;

        this.ctx.fillStyle = '#333';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const symbols = transitions.map(t => t.symbol).join(', ');
        // Offset text slightly to avoid overlap with line
        const textOffsetX = -Math.sin(angle) * 10;
        const textOffsetY = Math.cos(angle) * 10;
        this.ctx.fillText(symbols, midX + textOffsetX, midY + textOffsetY);
    }

    drawBidirectionalArrow(fromState, toState, transitions, key) {
        const angle = Math.atan2(toState.y - fromState.y, toState.x - fromState.x);
        const distance = Math.sqrt(Math.pow(toState.x - fromState.x, 2) + Math.pow(toState.y - fromState.y, 2));

        // Offset control point to create a curve
        const curveOffset = 25; // How much to offset the curve
        const midX = (fromState.x + toState.x) / 2;
        const midY = (fromState.y + toState.y) / 2;

        // Perpendicular offset for the curve
        const normalAngle = angle + Math.PI / 2; // Perpendicular angle
        const controlPointX = midX + Math.cos(normalAngle) * curveOffset;
        const controlPointY = midY + Math.sin(normalAngle) * curveOffset;

        // Adjust start and end points to be on the state circle circumference
        const startX = fromState.x + Math.cos(angle) * fromState.radius;
        const startY = fromState.y + Math.sin(angle) * fromState.radius;
        const endX = toState.x - Math.cos(angle) * toState.radius;
        const endY = toState.y - Math.sin(angle) * toState.radius;


        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.quadraticCurveTo(controlPointX, controlPointY, endX, endY);
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw arrowhead at the end of the curve
        const arrowAngle = Math.atan2(endY - controlPointY, endX - controlPointX);
        const headlen = 10;
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(arrowAngle - Math.PI / 6), endY - headlen * Math.sin(arrowAngle - Math.PI / 6));
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(arrowAngle + Math.PI / 6), endY - headlen * Math.sin(arrowAngle + Math.PI / 6));
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw symbols
        this.ctx.fillStyle = '#333';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const symbols = transitions.map(t => t.symbol).join(', ');

        // Position text along the curve, slightly offset
        const textPosFactor = 0.5; // Place text at midpoint of curve
        const textX = (1 - textPosFactor) * (1 - textPosFactor) * startX + 2 * (1 - textPosFactor) * textPosFactor * controlPointX + textPosFactor * textPosFactor * endX;
        const textY = (1 - textPosFactor) * (1 - textPosFactor) * startY + 2 * (1 - textPosFactor) * textPosFactor * controlPointY + textPosFactor * textPosFactor * endY;

        // Calculate tangent for text rotation
        const tangentX = 2 * (1 - textPosFactor) * (controlPointX - startX) + 2 * textPosFactor * (endX - controlPointX);
        const tangentY = 2 * (1 - textPosFactor) * (controlPointY - startY) + 2 * textPosFactor * (endY - controlPointY);
        const textAngle = Math.atan2(tangentY, tangentX);

        this.ctx.save();
        this.ctx.translate(textX, textY);
        this.ctx.rotate(textAngle);
        // Offset text slightly more for curved lines
        this.ctx.fillText(symbols, 0, -15); // Adjust Y offset for text above curve
        this.ctx.restore();
    }


    drawSelfLoop(state, transitions) {
        const loopRadius = 25; // Radius of the loop
        const startAngle = -Math.PI * 0.7; // Start above the state
        const endAngle = -Math.PI * 0.3;   // End above the state
        const controlOffset = 50; // Distance of control point from state center

        // Calculate control point for the curve to make it loop
        const controlX = state.x;
        const controlY = state.y - state.radius - controlOffset;

        // Calculate start and end points on the state circle
        const startX = state.x + Math.cos(startAngle) * state.radius;
        const startY = state.y + Math.sin(startAngle) * state.radius;
        const endX = state.x + Math.cos(endAngle) * state.radius;
        const endY = state.y + Math.sin(endAngle) * state.radius;

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw arrowhead at end of loop
        const headlen = 10;
        const arrowAngle = Math.atan2(endY - controlY, endX - controlX);
        this.ctx.beginPath();
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(arrowAngle - Math.PI / 6), endY - headlen * Math.sin(arrowAngle - Math.PI / 6));
        this.ctx.moveTo(endX, endY);
        this.ctx.lineTo(endX - headlen * Math.cos(arrowAngle + Math.PI / 6), endY - headlen * Math.sin(arrowAngle + Math.PI / 6));
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Draw symbols
        this.ctx.fillStyle = '#333';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        const symbols = transitions.map(t => t.symbol).join(', ');

        // Position text above the loop
        this.ctx.fillText(symbols, state.x, state.y - state.radius - loopRadius - 10);
    }


    findStateAtPos(x, y) {
        return this.automata.states.find(state => {
            const distance = Math.sqrt((x - state.x) ** 2 + (y - state.y) ** 2);
            return distance <= state.radius;
        });
    }

    findTransitionAtPos(px, py) {
        // Iterate through all transitions and check if (px, py) is near the line/curve
        for (const transition of this.automata.transitions) {
            const fromState = this.automata.getStateById(transition.from);
            const toState = this.automata.getStateById(transition.to);

            if (!fromState || !toState) continue;

            // Define a hit radius for clicking on lines
            const hitRadius = 10;

            if (fromState.id === toState.id) {
                // Self-loop hit detection (simplified, could be improved)
                const loopRadius = 25;
                const distFromCenter = Math.sqrt((px - fromState.x) ** 2 + (py - (fromState.y - fromState.radius - loopRadius)) ** 2);
                if (distFromCenter <= loopRadius + hitRadius) {
                    return transition;
                }
            } else {
                // For straight or curved lines
                const dist = this.distToSegment(px, py, fromState.x, fromState.y, toState.x, toState.y);
                if (dist < hitRadius) {
                    return transition;
                }
            }
        }
        return null;
    }

    // Helper function to calculate distance from point to line segment
    distToSegment(px, py, x1, y1, x2, y2) {
        const lineLenSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
        if (lineLenSq === 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));

        const t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / lineLenSq;
        const closestX = x1 + t * (x2 - x1);
        const closestY = y1 + t * (y2 - y1);

        if (t < 0) return Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
        if (t > 1) return Math.sqrt(Math.pow(px - x2, 2) + Math.pow(py - y2, 2));

        return Math.sqrt(Math.pow(px - closestX, 2) + Math.pow(py - closestY, 2));
    }
}