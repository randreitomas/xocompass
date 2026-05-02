import type { components } from "../types/api";

export type ValidationErrorItem = components["schemas"]["ValidationError"];

export class ApiClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly validationErrors?: ValidationErrorItem[];

  constructor(params: {
    message: string;
    status: number;
    code?: string;
    validationErrors?: ValidationErrorItem[];
  }) {
    super(params.message);
    this.name = "ApiClientError";
    this.status = params.status;
    this.code = params.code;
    this.validationErrors = params.validationErrors;
  }
}

export interface ParsedErrorBody {
  message: string;
  code?: string;
  validationErrors?: ValidationErrorItem[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidationErrorArray(
  value: unknown
): value is ValidationErrorItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        Array.isArray(item.loc) &&
        typeof item.msg === "string" &&
        typeof item.type === "string"
    )
  );
}

/** Extract `{ code, message }` from arbitrary FastAPI / custom envelope shapes. */
function extractFromDetailObject(detail: Record<string, unknown>): ParsedErrorBody {
  const code = typeof detail.code === "string" ? detail.code : undefined;
  const messageRaw =
    typeof detail.message === "string"
      ? detail.message
      : typeof detail.detail === "string"
        ? detail.detail
        : undefined;
  const message = messageRaw ?? "Request failed";
  return { code, message };
}

export function parseErrorJson(status: number, json: unknown): ParsedErrorBody {
  if (isRecord(json) && isValidationErrorArray(json.detail)) {
    const first = json.detail[0];
    const msg = first?.msg ?? "Validation failed";
    return {
      message: msg,
      validationErrors: json.detail,
    };
  }

  if (isRecord(json) && typeof json.detail === "string") {
    return { message: json.detail };
  }

  if (isRecord(json) && isRecord(json.detail)) {
    return extractFromDetailObject(json.detail);
  }

  if (isRecord(json) && json.error != null && isRecord(json.error)) {
    return extractFromDetailObject(json.error);
  }

  if (isRecord(json)) {
    const code = typeof json.code === "string" ? json.code : undefined;
    const message =
      typeof json.message === "string"
        ? json.message
        : typeof json.msg === "string"
          ? json.msg
          : `HTTP ${status}`;
    return { code, message };
  }

  return { message: `HTTP ${status}` };
}

export async function parseErrorResponse(res: Response): Promise<ParsedErrorBody> {
  const text = await res.text();
  if (!text.trim()) {
    return { message: res.statusText || `HTTP ${res.status}` };
  }
  try {
    const json: unknown = JSON.parse(text);
    return parseErrorJson(res.status, json);
  } catch {
    return { message: text };
  }
}
