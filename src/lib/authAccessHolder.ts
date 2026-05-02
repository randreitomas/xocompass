/** In-memory access token mirror for apiClient (React state is updated in parallel). */
export const authAccessHolder: { token: string | null } = { token: null };
