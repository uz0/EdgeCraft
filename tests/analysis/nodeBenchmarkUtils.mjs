export function buildWeightMap(libraryConfig) {
  return new Map(libraryConfig.map((entry) => [entry.id, entry.weights.node]));
}

export function getNodeWeight(weightMap, libraryId) {
  const weight = weightMap.get(libraryId);
  if (typeof weight !== 'number') {
    throw new Error(`Unknown benchmark library "${libraryId}"`);
  }

  return weight;
}

export function simulateWork(samples, weight) {
  const totalIterations = Math.max(1, Math.floor(samples * 350 * weight));
  let accumulator = 0;

  for (let i = 0; i < totalIterations; i += 1) {
    const value = (i % 360) * 0.0174533;
    accumulator += Math.sin(value) * Math.cos(value + weight);
  }

  return Number(accumulator.toFixed(4));
}
