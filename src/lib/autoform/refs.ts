import type { JsonSchema } from "@/components/autoform/types";
import type { _JSONSchema } from "node_modules/zod/v4/core/json-schema.d.cts";

export const replaceRefs = (schema: JsonSchema): JsonSchema => {
  const defs: Record<string, _JSONSchema> = schema.$defs ?? {};
  const input: Record<string, _JSONSchema> = schema.properties ?? {};
  const resolved: Record<string, _JSONSchema> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === "object" && "$ref" in value) {
      const ref = (value as { $ref: string }).$ref;
      const refKey = ref.replace("#/$defs/", "");
      resolved[key] = defs[refKey] ?? value;
    } else {
      resolved[key] = value;
    }
  }

  return {
    ...schema,
    // Only set properties if the original had them, to keep the shape stable.
    ...(schema.properties ? { properties: resolved } : {}),
  };
};
