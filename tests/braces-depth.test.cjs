'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const braces = require(require.resolve('braces', { paths: [process.env.BRACES_ROOT] }));

test('ordinary patterns retain compile, expand and stringify behavior', () => {
  assert.equal(braces.compile('file-{a,b}.txt'), 'file-(a|b).txt');
  assert.deepEqual(braces.expand('{a,{b,c}}'), ['a', 'b', 'c']);
  assert.equal(braces.stringify(braces.parse('file-{a,b}.txt')), 'file-{a,b}.txt');
  assert.equal(braces.compile('\\{literal\\}'), '{literal}');
});

test('deep and unbalanced patterns reject before recursive walkers', () => {
  for (const input of ['{'.repeat(4000) + 'a,b' + '}'.repeat(4000), '('.repeat(4000) + 'a', '{'.repeat(4000) + 'a']) {
    for (const operation of ['parse', 'compile', 'expand', 'stringify']) {
      assert.throws(() => braces[operation](input), /brace AST nesting exceeds 128/);
    }
  }
});

test('direct AST and cyclic nodes cannot bypass the bound', () => {
  let ast = { type: 'text', value: 'a' };
  for (let i = 0; i < 10000; i++) ast = { type: 'root', nodes: [ast] };
  const cycle = { type: 'root', nodes: [] };
  cycle.nodes.push(cycle);
  for (const input of [ast, cycle]) {
    for (const operation of ['compile', 'expand', 'stringify']) {
      assert.throws(() => braces[operation](input), /brace AST nesting exceeds 128/);
    }
  }
});
