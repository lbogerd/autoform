/**
 * Attempts to coerce an arbitrary value into a valid {@link Date} instance.
 *
 * @param value - Raw value coming from default values, form state, or schema.
 * @returns A {@link Date} when the value can be interpreted as one, otherwise `undefined`.
 */
export const parseDateValue = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
};

/**
 * Normalizes a date-like value into the `YYYY-MM-DD` string used by native date inputs.
 *
 * @param value - Any value that might represent a date (string, Date, etc.).
 * @returns A formatted date string or an empty string when the value is not a valid date.
 */
export const formatDateForInput = (value: unknown): string => {
  const date = parseDateValue(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Extracts the `HH:MM` portion from time-like values so they can be consumed by time inputs.
 *
 * @param value - A string or {@link Date} potentially containing a time component.
 * @returns The first five characters of the time component or `undefined` if unavailable.
 */
export const extractTimeValue = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toTimeString().slice(0, 5);
  }

  if (typeof value === "string") {
    if (value.includes("T")) {
      const [, timePart] = value.split("T");
      if (timePart) {
        return timePart.slice(0, 5);
      }
    }

    if (/^\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 5);
    }
  }

  return undefined;
};
