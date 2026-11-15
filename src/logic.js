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
