// Branded types for type safety
export type Brand<T, B> = T & { __brand: B };

export type PlayerId = Brand<string, 'PlayerId'>;
export type UnitId = Brand<string, 'UnitId'>;
export type BuildingId = Brand<string, 'BuildingId'>;

// Utility types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// Result type for error handling
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Exhaustive check helper
export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
