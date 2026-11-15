import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  validateUseCase,
  calculateTotalHours,
  calculateRealisedHours,
  calculateExpectedHours,
  updateUseCase,
  removeUseCase,
  STATUSES,
} from '../src/logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedUseCases = JSON.parse(
  readFileSync(path.join(__dirname, '../data/use-cases.json'), 'utf-8')
);

describe('calculateTotalHours', () => {
  test('sums the 5 seed use cases to 20 hours', () => {
    assert.equal(calculateTotalHours(seedUseCases), 20);
  });

  test('returns 0 for an empty list', () => {
    assert.equal(calculateTotalHours([]), 0);
  });

  test('adds decimal hours correctly (2.5 + 1.5 = 4)', () => {
    assert.equal(
      calculateTotalHours([{ hoursSaved: 2.5 }, { hoursSaved: 1.5 }]),
      4
    );
  });
});

describe('calculateRealisedHours', () => {
  test('sums only "In production" rows in the seed data to 10 hours', () => {
    assert.equal(calculateRealisedHours(seedUseCases), 10);
  });

  test('returns 0 for an empty list', () => {
    assert.equal(calculateRealisedHours([]), 0);
  });

  test('ignores Idea, Pilot, and Stopped rows', () => {
    const useCases = [
      { status: 'Idea', hoursSaved: 3 },
      { status: 'Pilot', hoursSaved: 5 },
      { status: 'Stopped', hoursSaved: 7 },
    ];
    assert.equal(calculateRealisedHours(useCases), 0);
  });
});

describe('calculateExpectedHours', () => {
  test('sums only "Pilot" rows in the seed data to 10 hours', () => {
    assert.equal(calculateExpectedHours(seedUseCases), 10);
  });

  test('returns 0 for an empty list', () => {
    assert.equal(calculateExpectedHours([]), 0);
  });

  test('ignores Idea, In production, and Stopped rows', () => {
    const useCases = [
      { status: 'Idea', hoursSaved: 3 },
      { status: 'In production', hoursSaved: 5 },
      { status: 'Stopped', hoursSaved: 7 },
    ];
    assert.equal(calculateExpectedHours(useCases), 0);
  });
});

describe('validateUseCase - accepted', () => {
  const base = {
    name: 'Doc Summarizer',
    owner: 'Jane Doe',
    team: 'Ops',
    status: STATUSES[0],
    hoursSaved: 5,
  };

  test('accepts a complete valid entry', () => {
    const result = validateUseCase(base);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, {});
  });

  test('accepts hoursSaved of 0', () => {
    const result = validateUseCase({ ...base, hoursSaved: 0 });
    assert.equal(result.valid, true);
  });

  test('accepts hoursSaved of 2.5', () => {
    const result = validateUseCase({ ...base, hoursSaved: 2.5 });
    assert.equal(result.valid, true);
  });
});

describe('validateUseCase - rejected', () => {
  const base = {
    name: 'Doc Summarizer',
    owner: 'Jane Doe',
    team: 'Ops',
    status: STATUSES[0],
    hoursSaved: 5,
  };

  test('rejects a missing name', () => {
    const result = validateUseCase({ ...base, name: undefined });
    assert.equal(result.valid, false);
    assert.ok(result.errors.name);
  });

  test('rejects a missing owner', () => {
    const result = validateUseCase({ ...base, owner: undefined });
    assert.equal(result.valid, false);
    assert.ok(result.errors.owner);
  });

  test('rejects a missing team', () => {
    const result = validateUseCase({ ...base, team: undefined });
    assert.equal(result.valid, false);
    assert.ok(result.errors.team);
  });

  test('rejects a name made of only spaces', () => {
    const result = validateUseCase({ ...base, name: '   ' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.name);
  });

  test('rejects negative hoursSaved (-3)', () => {
    const result = validateUseCase({ ...base, hoursSaved: -3 });
    assert.equal(result.valid, false);
    assert.ok(result.errors.hoursSaved);
  });

  test('rejects non-numeric hoursSaved ("abc")', () => {
    const result = validateUseCase({ ...base, hoursSaved: 'abc' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.hoursSaved);
  });

  test('rejects empty hoursSaved ("")', () => {
    const result = validateUseCase({ ...base, hoursSaved: '' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.hoursSaved);
  });
});

describe('updateUseCase', () => {
  const base = [
    { id: 1, name: 'A', owner: 'Jane', team: 'Ops', status: 'Idea', hoursSaved: 2 },
    { id: 2, name: 'B', owner: 'Jo', team: 'Eng', status: 'Pilot', hoursSaved: 3 },
  ];
  const edit = { name: 'A2', owner: 'Jane', team: 'Ops', status: 'In production', hoursSaved: 9 };

  test('replaces the matching row and preserves its id', () => {
    const result = updateUseCase(base, 1, edit);
    assert.equal(result.valid, true);
    assert.deepEqual(result.useCases[0], { id: 1, name: 'A2', owner: 'Jane', team: 'Ops', status: 'In production', hoursSaved: 9 });
    assert.deepEqual(result.useCases[1], base[1]);
  });

  test('rejects invalid candidate data and leaves the list unchanged', () => {
    const result = updateUseCase(base, 1, { ...edit, name: '' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.name);
    assert.deepEqual(result.useCases, base);
  });

  test('leaves the list unchanged when no row matches the id', () => {
    const result = updateUseCase(base, 999, edit);
    assert.equal(result.valid, true);
    assert.deepEqual(result.useCases, base);
  });
});

describe('removeUseCase', () => {
  const base = [
    { id: 1, name: 'A', owner: 'Jane', team: 'Ops', status: 'Idea', hoursSaved: 2 },
    { id: 2, name: 'B', owner: 'Jo', team: 'Eng', status: 'Pilot', hoursSaved: 3 },
  ];

  test('removes the row with the matching id', () => {
    const result = removeUseCase(base, 1);
    assert.deepEqual(result, [base[1]]);
  });

  test('leaves the list unchanged when no row matches the id', () => {
    const result = removeUseCase(base, 999);
    assert.deepEqual(result, base);
  });
});
