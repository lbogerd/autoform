import { AutoField } from "./auto-field";
import type { JsonSchema } from "./types";

export const replaceRefs = (schema: JsonSchema): JsonSchema => {
  // find all properties that are $ref and replace them with the actual definition from $defs
  const defs = schema.$defs || {};
  const resolvedProperties: Record<string, any> = {};

  for (const [key, value] of Object.entries(schema.properties || {})) {
    if (typeof value === "object" && "$ref" in value) {
      const ref = (value as { $ref: string }).$ref;
      const refKey = ref.replace("#/$defs/", "");

      if (refKey in defs) {
        resolvedProperties[key] = defs[refKey];
      } else {
        resolvedProperties[key] = value; // keep as is
      }
    } else {
      resolvedProperties[key] = value;
    }
  }

  return {
    ...schema,
    properties: resolvedProperties,
  };
};

export const AutoForm = ({ schema }: { schema: JsonSchema }) => {
  const resolvedSchema = replaceRefs(schema);

  return (
    <form action="">
      <ul className="space-y-4">
        {Object.entries(resolvedSchema.properties || {}).map(([key, value]) => (
          <li key={key}>
            <h2>{key}</h2>
            <AutoField jsonProperty={value} />
          </li>
        ))}
      </ul>
    </form>
  );
};
