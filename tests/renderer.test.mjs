import test from 'node:test';
import assert from 'node:assert/strict';
import { FiniteAutomaton as FA } from '../js/models.js';
import { AutomataRenderer } from '../js/renderer.js';

// Hit-testing doesn't draw anything, so a stub canvas is enough
const stubCanvas = { getContext: () => ({}) };

function setup(transitions, positions = [[100, 100], [400, 100]]) {
    const fa = new FA();
    positions.forEach(([x, y], i) => fa.addState(x, y, i === 0, false));
    for (const [from, to, sym] of transitions) fa.addTransition(from, to, sym);
    return { fa, renderer: new AutomataRenderer(stubCanvas, fa) };
}

const sym = t => (t ? t.symbol : null);

test('bidirectional pair: each curve is clickable on its own', () => {
    // q0 -a-> q1 bends downwards (canvas y+), q1 -b-> q0 bends upwards
    const { renderer } = setup([[0, 1, 'a'], [1, 0, 'b']]);
    assert.equal(sym(renderer.findTransitionAtPosition(250, 120)), 'a'); // bottom curve peak
    assert.equal(sym(renderer.findTransitionAtPosition(250, 80)), 'b');  // top curve peak
});

test('bidirectional pair: clicking the symbol label works', () => {
    const { renderer } = setup([[0, 1, 'a'], [1, 0, 'b']]);
    assert.equal(sym(renderer.findTransitionAtPosition(250, 136)), 'a');
    assert.equal(sym(renderer.findTransitionAtPosition(250, 56)), 'b');
});

test('bidirectional pair: empty space between the curves hits nothing', () => {
    const { renderer } = setup([[0, 1, 'a'], [1, 0, 'b']]);
    assert.equal(renderer.findTransitionAtPosition(250, 100), null);
    assert.equal(renderer.findTransitionAtPosition(250, 300), null);
});

test('bidirectional pair: the nearest curve wins near the states', () => {
    const { renderer } = setup([[0, 1, 'a'], [1, 0, 'b']]);
    assert.equal(sym(renderer.findTransitionAtPosition(180, 113)), 'a');
    assert.equal(sym(renderer.findTransitionAtPosition(180, 87)), 'b');
});

test('straight arrow still works', () => {
    const { renderer } = setup([[0, 1, 'a']]);
    assert.equal(sym(renderer.findTransitionAtPosition(250, 102)), 'a');
    assert.equal(renderer.findTransitionAtPosition(250, 160), null);
});

test('self-loop is clickable where it is drawn', () => {
    const { renderer } = setup([[0, 0, 'a']], [[200, 200]]);
    // loop: centre (200, 160), radius 25 -> rightmost point (225, 160)
    assert.equal(sym(renderer.findTransitionAtPosition(225, 160)), 'a');
    assert.equal(sym(renderer.findTransitionAtPosition(200, 135)), 'a');
    assert.equal(renderer.findTransitionAtPosition(300, 160), null);
});
