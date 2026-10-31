import test from 'node:test';
import assert from 'node:assert/strict';
import { FiniteAutomaton as FA } from '../js/models.js';

function build(states, transitions) {
    const fa = new FA();
    for (const [initial, final] of states) fa.addState(0, 0, initial, final);
    for (const [from, to, sym] of transitions) fa.addTransition(from, to, sym);
    return fa;
}

// NFA for strings over {a,b} ending in "ab"
const endsInAb = () => build(
    [[true, false], [false, false], [false, true]],
    [[0, 0, 'a'], [0, 0, 'b'], [0, 1, 'a'], [1, 2, 'b']]
);

test('NFA strings can be tested directly', () => {
    const nfa = endsInAb();
    for (const s of ['ab', 'aab', 'abab']) assert.equal(nfa.acceptsString(s), true, s);
    for (const s of ['', 'a', 'ba', 'abb']) assert.equal(nfa.acceptsString(s), false, s);
});

test('ε-transitions make an automaton non-deterministic and are followed', () => {
    const fa = build([[true, false], [false, true]], [[0, 1, 'ε'], [1, 1, 'a']]);
    assert.equal(fa.isDeterministic(), false);
    assert.equal(fa.acceptsString(''), true);
    assert.equal(fa.acceptsString('aaa'), true);
    assert.equal(fa.acceptsString('b'), false);
});

test('duplicate identical edges do not count as non-deterministic', () => {
    const fa = build([[true, false], [false, true]], [[0, 1, 'a'], [0, 1, 'a']]);
    assert.equal(fa.isDeterministic(), true);
});

test('NFA → DFA preserves the language, including ε-NFAs', () => {
    const dfa = FA.convertNFAtoDFA(endsInAb());
    assert.equal(dfa.isDeterministic(), true);
    for (const s of ['ab', 'aab', 'abab']) assert.equal(dfa.acceptsString(s), true, s);
    for (const s of ['', 'a', 'ba', 'abb']) assert.equal(dfa.acceptsString(s), false, s);

    const eps = build([[true, false], [false, true]], [[0, 1, 'ε'], [1, 1, 'a']]);
    const d2 = FA.convertNFAtoDFA(eps);
    assert.equal(d2.isDeterministic(), true);
    assert.equal(d2.acceptsString(''), true);
    assert.equal(d2.acceptsString('aa'), true);
});

test('minimization merges equivalent states and drops unreachable ones', () => {
    // states 2 and 3 are equivalent accepting sinks; state 4 is unreachable
    const fa = build(
        [[true, false], [false, false], [false, true], [false, true], [false, false]],
        [[0, 1, '0'], [0, 1, '1'], [1, 2, '0'], [1, 3, '1'],
         [2, 2, '0'], [2, 2, '1'], [3, 3, '0'], [3, 3, '1'], [4, 0, '0']]
    );
    const min = FA.minimizeDFA(fa);
    assert.equal(min.states.length, 3);
    assert.equal(min.acceptsString('00'), true);
    assert.equal(min.acceptsString('0'), false);
});

test('regex conversion', () => {
    const abStar = build([[true, false], [false, true]], [[0, 1, 'a'], [1, 1, 'b']]);
    assert.equal(FA.convertToRegex(abStar), 'ab*');

    const empty = build([[true, false]], []);
    assert.equal(FA.convertToRegex(empty), '∅');
});

test('generated regex agrees with the automaton', () => {
    const dfa = FA.convertNFAtoDFA(endsInAb());
    const re = new RegExp(`^(${FA.convertToRegex(dfa).replace(/ε/g, '')})$`);
    for (const s of ['', 'a', 'b', 'ab', 'aab', 'bab', 'abb', 'abab', 'ba', 'bbab'])
        assert.equal(re.test(s), dfa.acceptsString(s), s);
});

test('deleting transitions/states keeps the alphabet in sync', () => {
    const fa = build([[true, false], [false, true]], [[0, 1, 'a'], [0, 1, 'b']]);
    fa.deleteTransition(0, 1, 'b');
    assert.deepEqual(Array.from(fa.alphabet), ['a']);
    fa.deleteState(1);
    assert.equal(fa.alphabet.size, 0);
});
