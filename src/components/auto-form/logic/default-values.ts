import * as z from "zod";
import type { NormalizedNode } from "./types";

/**
 * Extracts the default values defined in a Zod schema by parsing an empty
 * object, allowing the form to start with sensible initial state.
 *
 * @param schema - The Zod schema that may include `.default()` values.
 * @returns A partial object containing any defaults the schema provides.
 */
export function getDefaultsFromZod<T>(schema: z.ZodTypeAny): Partial<T> {
  // Let Zod populate defaults by parsing an empty object.
  const res = schema.safeParse({});

  if (res.success) return res.data as Partial<T>;

  return {};
}

/**
 * Determines an initial value for a normalized node by inspecting schema
 * defaults, enums, and node kind heuristics.
 *
 * @param node - The normalized node whose default should be generated.
 * @returns A default value matching the node’s type, or `undefined` if none.
 */
export function getDefaultValueForNode(node?: NormalizedNode | null): unknown {
  if (!node) return undefined;

  const rawDefault = node.schema?.default ?? node.schema?.const;

  if (rawDefault !== undefined) {
    const clone = (value: unknown) => {
      type StructuredCloneFn = (v: unknown) => unknown;
      const globalClone = (
        globalThis as unknown as { structuredClone?: StructuredCloneFn }
      ).structuredClone;

      if (typeof globalClone === "function") {
        return globalClone(value);
      }

      try {
        return JSON.parse(JSON.stringify(value));
      } catch {
        return value;
      }
    };

    return clone(rawDefault);
  }

  switch (node.kind) {
    case "select":
      if (node.enum && node.enum.length > 0) {
        return node.enum[0];
      }
      return "";

    case "string":
    case "email":
    case "url":
    case "date":
    case "time":
    case "dateTime":
      return "";

    case "number": {
      const minimum = node.schema?.minimum;
      if (typeof minimum === "number") return minimum;
      return 0;
    }

    case "boolean":
      return false;

    case "group": {
      const result: Record<string, unknown> = {};

      for (const child of node.properties ?? []) {
        const segments = child.path.split(".");
        const key = segments[segments.length - 1] ?? "";
        if (!key) continue;
        result[key] = getDefaultValueForNode(child);
      }
      return result;
    }

    case "record":
      return {};

    case "array":
      return [];

    case "union": {
      const firstAlt = node.oneOf?.[0];
      if (!firstAlt) return undefined;

      const value = getDefaultValueForNode(firstAlt);

      const discKey = node.discriminator?.propertyName ?? "kind";
      const discConst = firstAlt.schema?.properties?.[discKey]?.const;

      if (discConst === undefined) {
        return value;
      }

      if (typeof value === "object" && value !== null) {
        return { ...value, [discKey]: discConst };
      }

      return { [discKey]: discConst };
    }
    default:
      return undefined;
  }
}
