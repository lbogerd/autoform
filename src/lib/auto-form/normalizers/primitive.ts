import { extractTimeValue, formatDateForInput } from "../date-helpers";
import type { AnyField, NormalizationContext } from "./types";

// WHY: Primitive fields already align with form inputs. The normalizer simply
// defends against `Date` instances or loosely typed values sneaking through so
// downstream consumers see consistent strings or booleans.
export const normalizePrimitiveField = (
  field: AnyField,
  value: unknown,
  _context: NormalizationContext
): unknown => {
  switch (field.type) {
    case "string":
    case "email":
    case "password":
    case "url": {
      if (typeof value !== "string" || value === "") {
        return undefined;
      }

      return value;
    }
    case "date": {
      if (typeof value === "string") {
        return value === "" ? undefined : value;
      }

      const formatted = formatDateForInput(value);
      return formatted === "" ? undefined : formatted;
    }
    case "time": {
      if (typeof value === "string") {
        return value === "" ? undefined : value;
      }

      return extractTimeValue(value);
    }
    case "datetime": {
      if (!value || typeof value !== "object") {
        return undefined;
      }

      const rawDate = (value as { date?: unknown }).date;
      const rawTime = (value as { time?: unknown }).time;

      const datePart =
        typeof rawDate === "string" ? rawDate : formatDateForInput(rawDate);
      const timePart =
        typeof rawTime === "string"
          ? rawTime
          : extractTimeValue(rawTime) ?? undefined;

      if (!datePart && !timePart) {
        return undefined;
      }

      const formattedDate =
        typeof datePart === "string" && datePart !== ""
          ? datePart
          : undefined;

      if (!formattedDate) {
        return timePart;
      }

      return timePart ? `${formattedDate}T${timePart}` : formattedDate;
    }
    default:
      return value;
  }
};
