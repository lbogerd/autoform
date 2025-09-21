import { AutoField } from "./auto-field";
import type { JsonSchema } from "./types";

export const resolveRef = (
  ref: string,
  schema: JsonSchema,
  visited: Record<string, JsonSchema>
): JsonSchema | null => {
  if (visited[ref]) return visited[ref];

  const parts = ref.split("/");
  let current: any = schema;

  for (const part of parts) {
    if (!current) return null;
    current = current[part];
  }

  return (current as JsonSchema) || null;
};

export const replaceRefs = (schema: JsonSchema): JsonSchema => {
  const visited: Record<string, JsonSchema> = Object.create(null);
  const replaceRef = (ref: string): JsonSchema | null => {
    const resolved = resolveRef(ref, schema, visited);
    if (resolved) {
      visited[ref] = resolved;
    }
    return resolved;
  };

  const recurse = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(recurse);
    }
    if (obj && typeof obj === "object") {
      if (obj.$ref && typeof obj.$ref === "string") {
        const resolved = replaceRef(obj.$ref);
        if (resolved) {
          return recurse(resolved);
        }
      }
      const newObj: any = {};
      for (const key in obj) {
        newObj[key] = recurse(obj[key]);
      }
      return newObj;
    }
    return obj;
  };

  return recurse(schema);
};

export const AutoForm = ({ schema }: { schema: JsonSchema }) => {
  const resolvedSchema = replaceRefs(schema);

  return (
    <form action="">
      <ul className="space-y-4">
        {Object.entries(resolvedSchema.properties).map(([key, value]) => (
          <li key={key}>
            <h2>{key}</h2>
            <AutoField jsonProperty={value} />
          </li>
        ))}
      </ul>
    </form>
  );
};
