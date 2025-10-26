export function simulateWork(samples: number, weight: number): number {
  const totalIterations = Math.max(1, Math.floor(samples * 350 * weight));
  let accumulator = 0;

  for (let i = 0; i < totalIterations; i += 1) {
    const value = (i % 360) * 0.0174533;
    accumulator += Math.sin(value) * Math.cos(value + weight);
  }

  return accumulator;
}
