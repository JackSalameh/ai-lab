export const STATUSES = ['Idea', 'Pilot', 'In production', 'Stopped'];

export function validateUseCase({ name, owner, team, status, hoursSaved }) {
  const errors = {};

  if (!name || !String(name).trim()) {
    errors.name = 'Name is required.';
  }
  if (!owner || !String(owner).trim()) {
    errors.owner = 'Owner is required.';
  }
  if (!team || !String(team).trim()) {
    errors.team = 'Team is required.';
  }
  if (!STATUSES.includes(status)) {
    errors.status = `Status must be one of: ${STATUSES.join(', ')}.`;
  }

  const hours = Number(hoursSaved);
  if (hoursSaved === '' || hoursSaved === null || hoursSaved === undefined || !Number.isFinite(hours) || hours < 0) {
    errors.hoursSaved = 'Hours saved must be a number of 0 or more.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function calculateTotalHours(useCases) {
  return useCases.reduce((total, useCase) => total + Number(useCase.hoursSaved || 0), 0);
}

export function calculateRealisedHours(useCases) {
  return calculateTotalHours(useCases.filter((useCase) => useCase.status === 'In production'));
}

export function calculateExpectedHours(useCases) {
  return calculateTotalHours(useCases.filter((useCase) => useCase.status === 'Pilot'));
}

export function updateUseCase(useCases, id, candidate) {
  const { valid, errors } = validateUseCase(candidate);

  if (!valid) {
    return { valid, errors, useCases };
  }

  const updated = {
    id,
    name: String(candidate.name).trim(),
    owner: String(candidate.owner).trim(),
    team: String(candidate.team).trim(),
    status: candidate.status,
    hoursSaved: Number(candidate.hoursSaved),
  };

  return {
    valid: true,
    errors: {},
    useCases: useCases.map((useCase) => (useCase.id === id ? updated : useCase)),
  };
}

export function sortByHours(useCases, direction = 'asc') {
  const multiplier = direction === 'desc' ? -1 : 1;
  return [...useCases].sort(
    (a, b) => multiplier * (Number(a.hoursSaved) - Number(b.hoursSaved))
  );
}

const CSV_COLUMNS = ['id', 'name', 'owner', 'team', 'status', 'hoursSaved'];

function escapeCsvField(value) {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(useCases) {
  const lines = [CSV_COLUMNS.join(',')];
  for (const useCase of useCases) {
    lines.push(CSV_COLUMNS.map((column) => escapeCsvField(useCase[column])).join(','));
  }
  return lines.join('\r\n');
}

export function removeUseCase(useCases, id) {
  return useCases.filter((useCase) => useCase.id !== id);
}
