import assert from 'node:assert/strict'
import { findLiteralMatches, replaceAllLiteral } from '../src/lib/textSearch'

assert.deepEqual(findLiteralMatches('Note note NOTE', 'note'), [0, 5, 10])
assert.deepEqual(findLiteralMatches('a.b a?b a.b', 'a.b'), [0, 8])
assert.deepEqual(findLiteralMatches('bananana', 'ana'), [1, 5])
assert.deepEqual(findLiteralMatches('anything', ''), [])
assert.equal(replaceAllLiteral('Note note', 'note', '$&'), '$& $&')
assert.equal(replaceAllLiteral('a.b and A.B', 'a.b', 'dot'), 'dot and dot')

console.log('textSearch tests passed')
