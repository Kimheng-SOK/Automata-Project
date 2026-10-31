import test from 'node:test';
import assert from 'node:assert/strict';
import { FiniteAutomaton as FA } from '../js/models.js';
import { AutomataRenderer } from '../js/renderer.js';

// Canvas stub that records the path drawn for every curve, so we can click ON the real drawn line
function recordingCanvas() {
    const curves = [];
    let last = null;
    const ctx = new Proxy({}, {
        get(target, name) {
            if (name === 'moveTo') return (x, y) => { last = { x, y }; };
            if (name === 'quadraticCurveTo') return (cx, cy, x, y) => { curves.push({ start: last, control: { x: cx, y: cy }, end: { x, y } }); };
            return () => {};
        },
        set() { return true; }
    });
    return { canvas: { getContext: () => ctx, width: 700, height: 400 }, curves };
}

// small deterministic PRNG so failures are reproducible
function rng(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }

test('clicking anywhere on either drawn curve of a pair selects that curve (all angles)', () => {
    const rand = rng(42);
    for (let n = 0; n < 200; n++) {
        const ax = 80 + rand() * 500, ay = 60 + rand() * 280;
        const angle = rand() * Math.PI * 2, dist = 120 + rand() * 250;
        const bx = ax + Math.cos(angle) * dist, by = ay + Math.sin(angle) * dist;

        const fa = new FA();
        const p0 = fa.addState(ax, ay, true, false);
        const p1 = fa.addState(bx, by, false, true);
        fa.addTransition(p0.id, p1.id, 'a');
        fa.addTransition(p1.id, p0.id, 'b');

        const { canvas, curves } = recordingCanvas();
        const renderer = new AutomataRenderer(canvas, fa);
        renderer.render();
        assert.equal(curves.length, 2, 'each direction must be drawn exactly once');

        for (const c of curves) {
            const from = Math.hypot(c.start.x - ax, c.start.y - ay) < Math.hypot(c.start.x - bx, c.start.y - by) ? p0 : p1;
            const to = from === p0 ? p1 : p0;
            for (let t = 0.05; t <= 0.951; t += 0.05) {
                const mt = 1 - t;
                const x = mt * mt * c.start.x + 2 * mt * t * c.control.x + t * t * c.end.x;
                const y = mt * mt * c.start.y + 2 * mt * t * c.control.y + t * t * c.end.y;
                const hit = renderer.findTransitionAtPosition(x, y);
                assert.ok(hit, `miss at t=${t.toFixed(2)} (case ${n})`);
                assert.deepEqual([hit.from, hit.to], [from.id, to.id], `wrong curve at t=${t.toFixed(2)} (case ${n})`);
            }
        }
    }
});
