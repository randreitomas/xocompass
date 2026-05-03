import type { components } from "../types/api";

export type ModelDropdownItem = components["schemas"]["ModelDropdownItem"];

export function getLatestTrainedModel(
  models: ModelDropdownItem[]
): ModelDropdownItem | undefined {
  if (models.length === 0) return undefined;
  return [...models].sort((a, b) => {
    const tb = new Date(b.created_at).getTime();
    const ta = new Date(a.created_at).getTime();
    if (tb !== ta) return tb - ta;
    return b.id - a.id;
  })[0];
}

/**
 * Picks the dashboard model: explicit preference when valid in the registry,
 * otherwise the most recently trained model (by `created_at`).
 * While the registry is empty, returns `preferredId` only (may be null — avoid bogus default IDs).
 */
export function resolveEffectiveModelId(
  models: ModelDropdownItem[],
  preferredId: number | null
): number | null {
  if (models.length === 0) return preferredId;
  if (preferredId != null && models.some((m) => m.id === preferredId)) {
    return preferredId;
  }
  return getLatestTrainedModel(models)?.id ?? null;
}
