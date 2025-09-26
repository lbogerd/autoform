import type {
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
} from "react-hook-form";

export type FieldErrorLike =
  | FieldError
  | FieldErrorsImpl<FieldValues>
  | Merge<FieldErrorsImpl<FieldValues>, FieldError>
  | Array<
      | FieldError
      | FieldErrorsImpl<FieldValues>
      | Merge<FieldErrorsImpl<FieldValues>, FieldError>
      | undefined
    >
  | undefined;

export function sanitizeErrorId(name: string): string {
  return `error-${name.replace(/[^a-zA-Z0-9_-]+/g, "_")}`;
}

export function getFieldErrorMessage(
  error: FieldErrorLike
): string | undefined {
  if (!error) {
    return undefined;
  }

  if (Array.isArray(error)) {
    for (const entry of error) {
      const message = getFieldErrorMessage(entry as FieldErrorLike);
      if (message) {
        return message;
      }
    }
    return undefined;
  }

  if (typeof error === "object") {
    if (
      Object.prototype.hasOwnProperty.call(error, "message") &&
      typeof (error as FieldError).message === "string" &&
      (error as FieldError).message
    ) {
      return (error as FieldError).message;
    }

    for (const value of Object.values(error as Record<string, unknown>)) {
      const message = getFieldErrorMessage(value as FieldErrorLike);
      if (message) {
        return message;
      }
    }
  }

  return undefined;
}

export function getChildError(
  error: FieldErrorLike,
  key: string | number
): FieldErrorLike {
  if (!error) {
    return undefined;
  }

  if (Array.isArray(error)) {
    const index = typeof key === "number" ? key : Number(key);
    if (!Number.isNaN(index)) {
      return error[index] as FieldErrorLike;
    }
    return undefined;
  }

  if (typeof error === "object") {
    const record = error as Record<string, unknown>;
    const byExactKey = record[key as keyof typeof record];
    if (byExactKey !== undefined) {
      return byExactKey as FieldErrorLike;
    }

    const byStringKey = record[String(key)];
    if (byStringKey !== undefined) {
      return byStringKey as FieldErrorLike;
    }
  }

  return undefined;
}
