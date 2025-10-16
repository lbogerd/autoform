import type { JSONSchemaNode, NormalizedNode, NodeKind } from "./types";

/**
 * Walks a JSON Schema node and converts it into a normalized structure that is
 * easier for the renderer to work with (kind, enum, children, etc.).
 *
 * @param schema - JSON Schema definition produced from the Zod model.
 * @param path - Dot-notation path representing the field’s location.
 * @returns A normalized node capturing metadata for the renderer.
 */
export function normalize(schema: JSONSchemaNode, path = ""): NormalizedNode {
  const ui = schema["x-ui"];
  const title = schema.title;
  const description = schema.description;

  if (schema.type === "string") {
    if (schema.enum)
      return {
        kind: "select",
        path,
        title,
        description,
        schema,
        ui,
        enum: schema.enum,
      };
    if (schema.format === "email" || schema["x-ui"]?.widget === "email") {
      return { kind: "email", path, title, description, schema, ui };
    }
    if (
      schema.format === "uri" ||
      schema.format === "url" ||
      schema["x-ui"]?.widget === "url"
    ) {
      return { kind: "url", path, title, description, schema, ui };
    }
    if (schema.format === "date") {
      return { kind: "date", path, title, description, schema, ui };
    }
    if (schema.format === "time" || schema["x-ui"]?.widget === "time") {
      return { kind: "time", path, title, description, schema, ui };
    }
    if (
      schema.format === "date-time" ||
      schema["x-ui"]?.widget === "datetime"
    ) {
      return { kind: "dateTime", path, title, description, schema, ui };
    }
    return { kind: "string", path, title, description, schema, ui };
  }

  if (schema.type === "integer" || schema.type === "number") {
    return { kind: "number", path, title, description, schema, ui };
  }

  if (schema.type === "boolean") {
    return { kind: "boolean", path, title, description, schema, ui };
  }

  if (
    schema.type === "object" &&
    !schema.properties &&
    schema.additionalProperties
  ) {
    const additional = schema.additionalProperties;
    const itemNode =
      additional && typeof additional === "object"
        ? normalize(additional, `${path}.$value`)
        : {
            kind: "unknown" as NodeKind,
            path: `${path}.$value`,
            title,
            description,
            schema: {} as JSONSchemaNode,
          };

    return {
      kind: "record",
      path,
      title,
      description,
      schema,
      ui,
      item: itemNode,
    };
  }

  if (schema.type === "object" && schema.properties) {
    const order: string[] | undefined = schema["x-ui"]?.order;
    const propsSource = schema.properties;
    const keys = order ?? Object.keys(propsSource);

    const props = keys
      .map((k) => {
        const childSchema = propsSource?.[k];
        if (!childSchema) return null;
        return normalize(childSchema, path ? `${path}.${k}` : k);
      })
      .filter((child): child is NormalizedNode => child !== null);

    return {
      kind: "group",
      path,
      title,
      description,
      schema,
      ui,
      properties: props,
    };
  }

  if (schema.type === "array") {
    const rawItems = schema.items;
    const itemSchema = Array.isArray(rawItems) ? rawItems[0] : rawItems;
    const item = itemSchema
      ? normalize(itemSchema, `${path}.$item`)
      : undefined;

    return { kind: "array", path, title, description, schema, ui, item };
  }

  if (schema.oneOf || schema.anyOf) {
    const alts = schema.oneOf ?? schema.anyOf;
    const discriminator = schema.discriminator ?? null;

    // verified non-null above
    const oneOf = alts!.map((alt) => normalize(alt, path)); // same path; branch selection is UI-driven

    return {
      kind: "union",
      path,
      title,
      description,
      schema,
      ui,
      oneOf,
      discriminator,
    };
  }

  return { kind: "unknown", path, title, description, schema, ui };
}
