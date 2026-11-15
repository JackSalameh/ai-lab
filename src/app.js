import { validateUseCase, calculateTotalHours, calculateRealisedHours, calculateExpectedHours } from './logic.js';

const STORAGE_KEY = 'aiUseCases';

const tableBody = document.getElementById('use-case-table-body');
const totalHoursEl = document.getElementById('total-hours');
const realisedHoursEl = document.getElementById('realised-hours');
const expectedHoursEl = document.getElementById('expected-hours');
const form = document.getElementById('add-use-case-form');
const formErrorsEl = document.getElementById('form-errors');
const exportButton = document.getElementById('export-json-button');

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
  tableBody.innerHTML = '';
  for (const useCase of useCases) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(useCase.name)}</td>
      <td>${escapeHtml(useCase.owner)}</td>
      <td>${escapeHtml(useCase.team)}</td>
      <td>${escapeHtml(useCase.status)}</td>
      <td>${Number(useCase.hoursSaved)}</td>
    `;
    tableBody.appendChild(row);
  }
  totalHoursEl.textContent = calculateTotalHours(useCases);
  realisedHoursEl.textContent = calculateRealisedHours(useCases);
  expectedHoursEl.textContent = calculateExpectedHours(useCases);
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

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const candidate = {
    name: form.name.value.trim(),
    owner: form.owner.value.trim(),
    team: form.team.value.trim(),
    status: form.status.value,
    hoursSaved: form.hoursSaved.value.trim(),
  };

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
