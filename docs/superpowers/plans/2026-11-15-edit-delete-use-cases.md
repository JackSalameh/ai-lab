# Edit and Delete Use Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor edit or delete an existing use case row from the table, with the same validation as adding one, and have the hours totals stay correct afterward.

**Architecture:** Two new pure functions in `src/logic.js` (`updateUseCase`, `removeUseCase`) handle the data changes and are unit-tested in isolation, matching the existing `validateUseCase`/`calculateTotalHours` pattern. `src/app.js` wires them to new Edit/Delete buttons per row and a Cancel link that only appears while editing; `render()` already recalculates totals from `currentUseCases`, so no total-specific code is needed.

**Tech Stack:** Vanilla JS (ES modules), `node:test`, no frameworks/dependencies (per CLAUDE.md).

**Spec:** This document — requirements agreed with the user in conversation (no separate design doc file; this is a small change).

## Global Constraints

- No frameworks, no npm dependencies — Node built-ins only.
- All calculations and validation live in `src/logic.js` as pure functions, with tests.
- Run `npm test` before calling any task done.
- Data must stay fictional (repo is public) — no real data introduced by this change.
- Do not start a preview server (user will run it themselves) and do not commit (user reviews first).

## Review Focus

- **Editing a row, then deleting that same row before saving:** the edit form must not keep pointing at a row that no longer exists. (Already resolved with the user — exiting edit mode on delete of the currently-edited row — but the test for `removeUseCase` plus the app-level behavior must both reflect it.)
- **Saving an edit with invalid data:** must show the same validation errors as add, and must leave the row's stored data unchanged (no partial overwrite).
- **Deleting or editing an id that isn't in the list** (can't happen via the UI today, but the pure functions must not corrupt the list if it ever does): covered by dedicated tests per the user's request.
- **Hours totals after edit/delete:** changing a row's status or hoursSaved, or removing a row, must be reflected in realised/expected/total hours on the next render.
- **Cancelling an edit:** must restore the form to "add" mode (empty fields, "Add use case" label, Cancel link hidden) without touching `currentUseCases`.

---

### Task 1: Pure update/remove functions in `src/logic.js`

**Files:**
- Modify: `src/logic.js`
- Test: `tests/logic.test.js`

**Interfaces:**
- Consumes: existing `validateUseCase(candidate)` → `{ valid, errors }`.
- Produces:
  - `updateUseCase(useCases, id, candidate)` → `{ valid: boolean, errors: object, useCases: array }`. On invalid `candidate`, returns the original `useCases` array unchanged (same elements) plus `errors`. On valid `candidate`, returns a new array where the element whose `id` matches is replaced by `{ ...that element, ...candidate fields, id, hoursSaved: Number(candidate.hoursSaved) }`; elements are otherwise unchanged. If no element's `id` matches, returns a new array equal in content to the original (no-op).
  - `removeUseCase(useCases, id)` → new array with the matching-`id` element filtered out. If no element matches, returns an array equal in content to the original.
  - Later tasks (Task 2) call both by these exact names/signatures.

- [ ] **Step 1: Write the failing tests**

```js
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
```

Add `updateUseCase, removeUseCase` to the existing import from `'../src/logic.js'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `updateUseCase`/`removeUseCase` are not exported yet.

- [ ] **Step 3: Implement `updateUseCase` and `removeUseCase` in `src/logic.js`**

Follow the existing file's style (plain exported functions, no classes). `updateUseCase` calls `validateUseCase(candidate)` first; on failure return `{ valid: false, errors, useCases }` with the original array. On success, build the replacement row from `candidate` the same way the add-flow in `app.js` currently does (trimmed strings, `Number(hoursSaved)`), keep the original `id`, and `.map()` over `useCases` swapping in the replacement only where `id` matches. `removeUseCase` is a one-line `.filter()`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, all tests including the new ones.

- [ ] **Step 5: Commit**

Hold off — user reviews and commits manually (see Global Constraints).

---

### Task 2: Edit/Delete/Cancel UI in `index.html` and `src/app.js`

**Files:**
- Modify: `index.html`
- Modify: `src/app.js`

**Interfaces:**
- Consumes: `updateUseCase(useCases, id, candidate)` and `removeUseCase(useCases, id)` from Task 1, plus existing `validateUseCase`, `calculateTotalHours`, `calculateRealisedHours`, `calculateExpectedHours`.
- Produces: no new exports (browser-side wiring only).

- [ ] **Step 1: Add markup in `index.html`**

Add an "Actions" `<th>` to the table header. Next to the existing submit button in `#add-use-case-form`, add a `Cancel` button: `<button type="button" id="cancel-edit-button" hidden>Cancel</button>`. Give the existing submit button an id (e.g. `id="submit-button"`) so `app.js` can change its label.

- [ ] **Step 2: Track edit state and render Edit/Delete buttons in `src/app.js`**

Add `let editingId = null;` near `currentUseCases`. In `render()`, add a 6th `<td>` per row containing an Edit button and a Delete button, each carrying the row's `id` (e.g. `data-id="${useCase.id}"` plus a class like `edit-button`/`delete-button`). Use one delegated click listener on `tableBody` (added once, outside `render()`) that reads `event.target.dataset.id` and `event.target.classList` to dispatch to an `onEditClick(id)` or `onDeleteClick(id)` function — needed because `render()` wipes and rebuilds `innerHTML` on every change, so per-button listeners would be discarded.

- [ ] **Step 3: Implement edit entry (`onEditClick`)**

Find the row in `currentUseCases` by `id`, fill `form.name/owner/team/status/hoursSaved.value` from it, set `editingId = id`, set the submit button's `textContent` to `'Save changes'`, and unhide `#cancel-edit-button`.

- [ ] **Step 4: Implement cancel (`cancel-edit-button` click handler)**

Set `editingId = null`, `form.reset()`, submit button `textContent` back to `'Add use case'`, hide `#cancel-edit-button`, clear `formErrorsEl.textContent`.

- [ ] **Step 5: Implement delete (`onDeleteClick`)**

Look up the row's name for the confirm message, call `window.confirm(...)`; if confirmed, `currentUseCases = removeUseCase(currentUseCases, id)`, `saveUseCases(currentUseCases)`, `render(currentUseCases)`. If `id === editingId`, also run the same reset as Step 4 (cancel the stale edit).

- [ ] **Step 6: Branch the form submit handler on `editingId`**

In the existing `form.addEventListener('submit', ...)`, after building `candidate` the same way as today: if `editingId === null`, keep today's add behavior unchanged. If `editingId !== null`, call `updateUseCase(currentUseCases, editingId, candidate)`; on `!valid` show `result.errors` in `formErrorsEl` exactly like add does today; on success set `currentUseCases = result.useCases`, `saveUseCases(currentUseCases)`, `render(currentUseCases)`, then run the same reset as Step 4 (clears `editingId`, resets the form/button/Cancel link).

- [ ] **Step 7: Manual verification (no automated DOM tests in this codebase)**

The user will run `npm run preview` themselves and check: edit fills the form and updates the row and totals on save; delete asks for confirmation and updates totals; deleting the row being edited clears the form back to "Add use case"; cancel restores the form without changing data; invalid edits show errors and don't change the row.

- [ ] **Step 8: Commit**

Hold off — user reviews and commits manually (see Global Constraints).

---

## Self-Review

1. **Spec coverage:** Edit button + fill form + same validation (Task 2 Steps 2,3,6) ✓. Delete + confirm (Task 2 Step 5) ✓. Pure `update`/`remove` functions with tests (Task 1) ✓. Totals update after edit/delete (handled for free by existing `render()`, no separate task needed) ✓. Cancel link (Task 2 Steps 1,4) ✓. Delete-while-editing behavior (Task 2 Step 5) ✓. Id-is-always-present / id-not-found test (Task 1 tests) ✓.
2. **Step scan:** no step left as "TBD"; Task 1 Step 3 and Task 2 Steps 2–6 state exact function/element names and leave only ordinary implementation (no algorithmic ambiguity) to the implementer.
3. **Type consistency:** `updateUseCase`/`removeUseCase` names and shapes match between Task 1 (definition) and Task 2 (consumption).
4. **Review Focus:** all five listed items map to a concrete test or step above.
5. **Proportion:** plan is longer than the diff will be mostly because of inlined test code (so the implementer copies exact assertions); acceptable given the project has no separate spec file.
