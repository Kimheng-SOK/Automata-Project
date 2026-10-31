import { State, Transition, FiniteAutomaton } from './models.js';

interface Point {
    x: number;
    y: number;
}

export class AutomataRenderer {
    private ctx: CanvasRenderingContext2D;
    private automata: FiniteAutomaton;
    private selectedState: number | null = null;

    private static readonly CURVE_OFFSET = 40;   // control-point distance for bidirectional curves
    private static readonly HIT_THRESHOLD = 10;  // px: how close a click must be to a transition

    constructor(canvas: HTMLCanvasElement, automata: FiniteAutomaton) {
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get canvas context');

        this.ctx = context;
        this.automata = automata;
    }

    setAutomata(automata: FiniteAutomaton): void {
        this.automata = automata;
    }

    setSelectedState(stateId: number | null): void {
        this.selectedState = stateId;
    }

    getSelectedState(): number | null {
        return this.selectedState;
    }

    render(): void {
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
            } else {
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

    drawTransitionPreview(fromStateId: number, toX: number, toY: number): void {
        const fromState = this.automata.getStateById(fromStateId);
        if (!fromState) return;

        this.ctx.beginPath();
        this.ctx.moveTo(fromState.x, fromState.y);
        this.ctx.lineTo(toX, toY);
        this.ctx.strokeStyle = '#3498db';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    private drawTransitions(): void {
        // Group transitions by from-to pairs
        const transitionGroups = new Map<string, Transition[]>();
        const bidirectionalPairs = new Set<string>();

        // First pass: group transitions
        this.automata.transitions.forEach(transition => {
            const key = `${transition.from}-${transition.to}`;
            if (!transitionGroups.has(key)) {
                transitionGroups.set(key, []);
            }
            const group = transitionGroups.get(key);
            if (group) group.push(transition);
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

            if (!fromState || !toState) return;

            const isBidirectional = bidirectionalPairs.has(key);
            const isSelfLoop = fromId === toId;

            if (isSelfLoop) {
                this.drawSelfLoop(fromState, transitions);
            } else if (isBidirectional) {
                // Draw bidirectional with distinct curves
                this.drawBidirectionalArrow(fromState, toState, transitions);
            } else {
                this.drawStraightArrow(fromState, toState, transitions);
            }
        });
    }

    private drawStraightArrow(fromState: State, toState: State, transitions: Transition[]): void {
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

    private drawBidirectionalArrow(fromState: State, toState: State, transitions: Transition[]): void {
        // Each direction is drawn once (drawTransitions calls this for both from->to and to->from)
        const control = this.getCurveControl(fromState, toState);
        this.drawCurvedArrow(fromState, toState, transitions, control.x, control.y);
    }

    // Control point of the curve used for from -> to when the reverse edge also exists.
    // The two directions bend to opposite sides of the straight line between the states.
    private getCurveControl(from: State, to: State): Point {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const perp = angle + Math.PI / 2;
        return {
            x: (from.x + to.x) / 2 + Math.cos(perp) * AutomataRenderer.CURVE_OFFSET,
            y: (from.y + to.y) / 2 + Math.sin(perp) * AutomataRenderer.CURVE_OFFSET
        };
    }

    private getCurveEndpoints(from: State, to: State, control: Point): { start: Point; end: Point; endAngle: number } {
        const angleToControl = Math.atan2(control.y - from.y, control.x - from.x);
        const angleFromControl = Math.atan2(to.y - control.y, to.x - control.x);
        return {
            start: {
                x: from.x + Math.cos(angleToControl) * from.radius,
                y: from.y + Math.sin(angleToControl) * from.radius
            },
            end: {
                x: to.x - Math.cos(angleFromControl) * to.radius,
                y: to.y - Math.sin(angleFromControl) * to.radius
            },
            endAngle: angleFromControl
        };
    }

    private drawCurvedArrow(fromState: State, toState: State, transitions: Transition[], controlX: number, controlY: number): void {
        const { start, end, endAngle } = this.getCurveEndpoints(fromState, toState, { x: controlX, y: controlY });
        const startX = start.x;
        const startY = start.y;
        const endX = end.x;
        const endY = end.y;
        const angleFromControl = endAngle;

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

    private drawSelfLoop(state: State, transitions: Transition[]): void {
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

    private drawArrowhead(x: number, y: number, angle: number): void {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - 12 * Math.cos(angle - Math.PI/6), y - 12 * Math.sin(angle - Math.PI/6));
        this.ctx.lineTo(x - 12 * Math.cos(angle + Math.PI/6), y - 12 * Math.sin(angle + Math.PI/6));
        this.ctx.closePath();
        this.ctx.fillStyle = '#3498db';
        this.ctx.fill();
    }

    findStateAtPosition(x: number, y: number): State | null {
        return this.automata.states.find(state => {
            const distance = Math.sqrt((x - state.x) ** 2 + (y - state.y) ** 2);
            return distance <= state.radius;
        }) || null;
    }

    // Returns the transition closest to (x, y), or null if nothing is within HIT_THRESHOLD.
    // Hit areas follow the real drawn shapes (curves for bidirectional pairs, the loop for
    // self-transitions) and also include the symbol label, so clicking the label works too.
    findTransitionAtPosition(x: number, y: number): Transition | null {
        let best: Transition | null = null;
        let bestDistance = AutomataRenderer.HIT_THRESHOLD;

        for (const trans of this.automata.transitions) {
            const fromState = this.automata.getStateById(trans.from);
            const toState = this.automata.getStateById(trans.to);
            if (!fromState || !toState) continue;

            const distance = this.distanceToTransition(x, y, trans, fromState, toState);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = trans;
            }
        }
        return best;
    }

    private distanceToTransition(x: number, y: number, trans: Transition, from: State, to: State): number {
        const symbols = this.automata.transitions
            .filter(t => t.from === trans.from && t.to === trans.to)
            .map(t => t.symbol)
            .join(',');

        let pathDistance: number;
        let labelAnchor: Point; // where drawX() calls fillText for the label

        if (from.id === to.id) {
            // Self-loop (see drawSelfLoop): circle of radius 25 centred 40px above the state
            const centerX = from.x;
            const centerY = from.y - 40;
            pathDistance = Math.abs(Math.hypot(x - centerX, y - centerY) - 25);
            labelAnchor = { x: centerX, y: centerY - 50 };
        } else if (this.automata.transitions.some(t => t.from === to.id && t.to === from.id)) {
            // Bidirectional pair (see drawCurvedArrow): follow the actual quadratic curve
            const control = this.getCurveControl(from, to);
            const { start, end } = this.getCurveEndpoints(from, to, control);
            pathDistance = this.distanceToPolyline(x, y, this.sampleCurve(start, control, end));
            labelAnchor = control;
        } else {
            // Straight arrow (see drawStraightArrow)
            const angle = Math.atan2(to.y - from.y, to.x - from.x);
            const x1 = from.x + Math.cos(angle) * from.radius;
            const y1 = from.y + Math.sin(angle) * from.radius;
            const x2 = to.x - Math.cos(angle) * to.radius;
            const y2 = to.y - Math.sin(angle) * to.radius;
            pathDistance = this.distanceToLine(x, y, x1, y1, x2, y2);
            labelAnchor = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 - 10 };
        }

        // Label box: text is drawn with its baseline at the anchor, so it sits just above it
        const halfWidth = Math.max(24, symbols.length * 9 + 12) / 2;
        const halfHeight = 11;
        const centerX = labelAnchor.x;
        const centerY = labelAnchor.y - 5;
        const dx = Math.max(Math.abs(x - centerX) - halfWidth, 0);
        const dy = Math.max(Math.abs(y - centerY) - halfHeight, 0);
        const labelDistance = Math.hypot(dx, dy);

        return Math.min(pathDistance, labelDistance);
    }

    private sampleCurve(start: Point, control: Point, end: Point, steps: number = 24): Point[] {
        const points: Point[] = [];
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const mt = 1 - t;
            points.push({
                x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
                y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y
            });
        }
        return points;
    }

    private distanceToPolyline(x: number, y: number, points: Point[]): number {
        let min = Infinity;
        for (let i = 0; i < points.length - 1; i++) {
            min = Math.min(min, this.distanceToLine(x, y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y));
        }
        return min;
    }

    private distanceToLine(x: number, y: number, x1: number, y1: number, x2: number, y2: number): number {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;

        let xx: number, yy: number;

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

    getMousePosition(canvas: HTMLCanvasElement, evt: MouseEvent): Point {
        const rect = canvas.getBoundingClientRect();
        return {
            x: evt.clientX - rect.left,
            y: evt.clientY - rect.top
        };
    }
}
