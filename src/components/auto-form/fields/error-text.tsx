import type { FC } from "react";
import type { FieldErrors, FieldError } from "react-hook-form";

/**
 * Displays the validation message for a given field path using the
 * react-hook-form error structure.
 */
export const ErrorText: FC<{
  path: string;
  errors?: FieldErrors | undefined;
}> = ({ path, errors }) => {
  // find the error for the specific field path
  const err = path
    .split(".")
    .reduce<FieldError | FieldErrors | undefined>(
      (acc, k) => (acc ? (acc as FieldErrors)[k] : undefined),
      errors
    );
  if (!err) return null;

  let message: string | undefined;
  if (
    // check if the error is for the specific field path
    err &&
    "message" in err &&
    typeof (err as FieldError).message === "string"
  ) {
    message = (err as FieldError).message;
  } else if (
    // check if the error has multiple types (e.g., from multiple validation rules)
    // and join them into a single message
    err &&
    "types" in err &&
    Array.isArray((err as unknown as { types: unknown }).types)
  ) {
    message = (err as unknown as { types: string[] }).types.join(", ");
  }

  return (
    <span className="text-sm text-red-600 mt-1" role="alert">
      {message ?? "Invalid value"}
    </span>
  );
};
