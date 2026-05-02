import { ApiClientError } from "./apiError";

/** User-visible copy keyed by backend error codes when available. */
export function formatApiErrorForUi(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.validationErrors?.length) {
      return error.validationErrors.map((v) => v.msg).join("; ");
    }
    switch (error.code) {
      case "token_expired":
        return "Your session expired. Please sign in again.";
      case "not_found":
      case "model_not_found":
        return "No data was found for this request.";
      case "forbidden":
      case "insufficient_permissions":
        return "You do not have permission for this action.";
      case "validation_error":
        return error.message || "Invalid input.";
      default:
        break;
    }
    if (error.status === 403) {
      return "You do not have permission for this action.";
    }
    if (error.status === 404) {
      return "Resource not found.";
    }
    return error.message || `Request failed (${error.status}).`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}
