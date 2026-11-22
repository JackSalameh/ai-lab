import {
  validateUseCase,
  calculateTotalHours,
  calculateRealisedHours,
  calculateExpectedHours,
  updateUseCase,
  removeUseCase,
  sortByHours,
} from './logic.js';

const STORAGE_KEY = 'aiUseCases';

const tableBody = document.getElementById('use-case-table-body');
const totalHoursEl = document.getElementById('total-hours');
const realisedHoursEl = document.getElementById('realised-hours');
const expectedHoursEl = document.getElementById('expected-hours');
const form = document.getElementById('add-use-case-form');
const formErrorsEl = document.getElementById('form-errors');
const submitButton = document.getElementById('submit-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const exportButton = document.getElementById('export-json-button');
const resetButton = document.getElementById('reset-button');
const resetErrorsEl = document.getElementById('reset-errors');
const sortHoursButton = document.getElementById('sort-hours-button');
const sortHoursIndicator = document.getElementById('sort-hours-indicator');

let editingId = null;
let sortDirection = null;

function loadUseCases() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return Promise.resolve(JSON.parse(stored));
  }
  return fetch('data/use-cases.json')
    .then((response) => response.json())
    .then((seedData) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
      return seedData;
    });
}

function saveUseCases(useCases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(useCases));
}

function render(useCases) {
  const rows = sortDirection ? sortByHours(useCases, sortDirection) : useCases;

  tableBody.innerHTML = '';
  for (const useCase of rows) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(useCase.name)}</td>
      <td>${escapeHtml(useCase.owner)}</td>
      <td>${escapeHtml(useCase.team)}</td>
      <td>${escapeHtml(useCase.status)}</td>
      <td>${Number(useCase.hoursSaved)}</td>
      <td>
        <button type="button" class="edit-button" data-id="${useCase.id}">Edit</button>
        <button type="button" class="delete-button" data-id="${useCase.id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  }
  totalHoursEl.textContent = calculateTotalHours(useCases);
  realisedHoursEl.textContent = calculateRealisedHours(useCases);
  expectedHoursEl.textContent = calculateExpectedHours(useCases);
}

function resetFormToAddMode() {
  editingId = null;
  form.reset();
  submitButton.textContent = 'Add use case';
  cancelEditButton.hidden = true;
  formErrorsEl.textContent = '';
}

function onEditClick(id) {
  const useCase = currentUseCases.find((item) => item.id === id);
  if (!useCase) return;

  form.name.value = useCase.name;
  form.owner.value = useCase.owner;
  form.team.value = useCase.team;
  form.status.value = useCase.status;
  form.hoursSaved.value = useCase.hoursSaved;

  editingId = id;
  submitButton.textContent = 'Save changes';
  cancelEditButton.hidden = false;
  formErrorsEl.textContent = '';
}

function onDeleteClick(id) {
  const useCase = currentUseCases.find((item) => item.id === id);
  if (!useCase) return;

  const confirmed = window.confirm(`Delete "${useCase.name}"? This cannot be undone.`);
  if (!confirmed) return;

  currentUseCases = removeUseCase(currentUseCases, id);
  saveUseCases(currentUseCases);
  render(currentUseCases);

  if (editingId === id) {
    resetFormToAddMode();
  }
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

function nextId(useCases) {
  return useCases.reduce((max, useCase) => Math.max(max, useCase.id), 0) + 1;
}

let currentUseCases = [];

loadUseCases().then((useCases) => {
  currentUseCases = useCases;
  render(currentUseCases);
});

tableBody.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const id = Number(target.dataset.id);
  if (target.classList.contains('edit-button')) {
    onEditClick(id);
  } else if (target.classList.contains('delete-button')) {
    onDeleteClick(id);
  }
});

cancelEditButton.addEventListener('click', () => {
  resetFormToAddMode();
});

sortHoursButton.addEventListener('click', () => {
  sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  sortHoursIndicator.textContent = sortDirection === 'asc' ? '▲' : '▼';
  render(currentUseCases);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const candidate = {
    name: form.name.value.trim(),
    owner: form.owner.value.trim(),
    team: form.team.value.trim(),
    status: form.status.value,
    hoursSaved: form.hoursSaved.value.trim(),
  };

  if (editingId !== null) {
    const result = updateUseCase(currentUseCases, editingId, candidate);

    if (!result.valid) {
      formErrorsEl.textContent = Object.values(result.errors).join(' ');
      return;
    }

    currentUseCases = result.useCases;
    saveUseCases(currentUseCases);
    render(currentUseCases);
    resetFormToAddMode();
    return;
  }

  const { valid, errors } = validateUseCase(candidate);

  if (!valid) {
    formErrorsEl.textContent = Object.values(errors).join(' ');
    return;
  }

  formErrorsEl.textContent = '';

  const newUseCase = {
    id: nextId(currentUseCases),
    name: candidate.name,
    owner: candidate.owner,
    team: candidate.team,
    status: candidate.status,
    hoursSaved: Number(candidate.hoursSaved),
  };

  currentUseCases = [...currentUseCases, newUseCase];
  saveUseCases(currentUseCases);
  render(currentUseCases);
  form.reset();
});

exportButton.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(currentUseCases, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'use-cases.json';
  link.click();
  URL.revokeObjectURL(url);
});

resetButton.addEventListener('click', async () => {
  const confirmed = window.confirm(
    'Resetting will replace all current data with the starting data and cannot be undone. Export JSON first if you want to keep a copy. Continue?'
  );
  if (!confirmed) return;

  try {
    const response = await fetch('data/use-cases.json');
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    const seedData = await response.json();

    currentUseCases = seedData;
    saveUseCases(currentUseCases);
    render(currentUseCases);
    resetFormToAddMode();
    resetErrorsEl.textContent = '';
  } catch (error) {
    resetErrorsEl.textContent = 'Could not load starting data. Your current data has not been changed.';
  }
});
