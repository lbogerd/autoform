import { z } from "zod";

import { FieldSchema, FormSchema } from "./schemas";

export type JsonSchema = Record<string, unknown>;

type AnyFormField = z.infer<typeof FieldSchema>;
type AnyFormSchema = z.infer<typeof FormSchema>;

/**
 * Determines whether the provided value is a plain object (record) and not an array.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Narrows a value to a string when possible.
 */
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

/**
 * Narrows a value to a number when possible.
 */
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

/**
 * Narrows a value to a boolean when possible.
 */
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

/**
 * Narrows a value to an array of strings when all items are strings.
 */
const asStringArray = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string")
    ? (value as string[])
    : undefined;

/**
 * Narrows a value to an array of numbers when all items are numbers.
 */
const asNumberArray = (value: unknown): number[] | undefined =>
  Array.isArray(value) && value.every((entry) => typeof entry === "number")
    ? (value as number[])
    : undefined;

/**
 * Converts an identifier or slug into title-cased words.
 */
const toWords = (value: string): string => {
  const normalized = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Removes a trailing token (e.g. "input") from a string for cleaner labels.
 */
const dropTrailingToken = (value: string, token: string): string => {
  const suffix = new RegExp(`(?:${token})$`, "i");
  return value.replace(suffix, "").trim();
};

/**
 * Performs a lightweight singularization for common plural suffixes.
 */
const singularize = (value: string): string => {
  if (/ies$/i.test(value)) {
    return value.slice(0, -3) + "y";
  }

  if (/ses$/i.test(value)) {
    return value.slice(0, -2);
  }

  if (/s$/i.test(value)) {
    return value.slice(0, -1);
  }

  return value;
};

const deriveTitle = (
  schema: JsonSchema,
  fallbackKey?: string,
  fallbackLabel?: string
): string => {
  // Prefer an explicit title on the schema.
  if (typeof schema.title === "string" && schema.title.trim()) {
    return schema.title.trim();
  }

  // Use a caller-provided fallback before inferring.
  if (typeof fallbackLabel === "string" && fallbackLabel.trim()) {
    return toWords(fallbackLabel.trim());
  }

  // When available, convert the property key into human readable text.
  if (fallbackKey) {
    return toWords(fallbackKey);
  }

  // As a last resort, infer from a test id.
  if (typeof schema.testId === "string" && schema.testId.trim()) {
    const cleaned = dropTrailingToken(
      schema.testId.replace(/[-_]/g, " "),
      "input"
    );
    return toWords(cleaned || schema.testId);
  }

  return "Field";
};

const extractTypes = (
  schema: JsonSchema
): { primary?: string; nullable: boolean } => {
  const rawType = schema.type;

  if (Array.isArray(rawType)) {
    // Split out `null` while tracking nullability.
    const filtered = rawType.filter((type): type is string => type !== "null");
    return {
      primary: filtered[0],
      nullable:
        filtered.length !== rawType.length ||
        rawType.includes("null") ||
        schema.nullable === true,
    };
  }

  if (typeof rawType === "string") {
    return {
      primary: rawType,
      nullable: schema.nullable === true,
    };
  }

  return { primary: undefined, nullable: schema.nullable === true };
};

/**
 * Maps string `format` hints onto specialized form field types.
 */
const mapStringFormatToType = (schema: JsonSchema): AnyFormField["type"] => {
  const format = typeof schema.format === "string" ? schema.format : undefined;

  switch (format) {
    case "email":
      return "email";
    case "password":
      return "password";
    case "uri":
    case "url":
      return "url";
    case "date":
      return "date";
    case "time":
      return "time";
    case "date-time":
      return "datetime";
    default:
      return "string";
  }
};

/**
 * Determines the key type for record fields based on `propertyNames` hints.
 */
const deriveRecordKeyType = (schema: JsonSchema): "string" | "number" => {
  if (isRecord(schema.propertyNames)) {
    const type = schema.propertyNames.type;
    if (type === "number" || type === "integer") {
      return "number";
    }
  }

  return "string";
};

/**
 * Converts a JSON Schema node into a strongly typed `Field` definition.
 */
const convertSchemaToField = (
  schema: JsonSchema,
  options: {
    key?: string;
    required: boolean;
    fallbackLabel?: string;
  }
): AnyFormField => {
  const { primary: typeFromSchema, nullable } = extractTypes(schema);
  const hasEnum = Array.isArray(schema.enum);

  // Seed common field metadata while deferring optional props.
  const baseField: Partial<AnyFormField> = {
    title: deriveTitle(schema, options.key, options.fallbackLabel),
    required: options.required,
  };

  if (typeof schema.description === "string" && schema.description.trim()) {
    baseField.description = schema.description;
  }

  if (typeof schema.errorMessage === "string" && schema.errorMessage.trim()) {
    baseField.errorMessage = schema.errorMessage;
  }

  if (typeof schema.testId === "string" && schema.testId.trim()) {
    baseField.testId = schema.testId;
  }

  if (nullable) {
    baseField.nullable = true;
  }

  const defaultValue = schema.default;

  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    // Create independent field definitions for each union branch.
    const variants = schema.anyOf.map((variant) => {
      if (!isRecord(variant)) {
        throw new Error("anyOf entries must be object schemas");
      }

      const fallbackLabel =
        typeof variant.testId === "string" && variant.testId.trim()
          ? dropTrailingToken(variant.testId.replace(/[-_]/g, " "), "input")
          : typeof variant.type === "string"
          ? variant.type
          : undefined;

      return convertSchemaToField(variant, {
        required: false,
        fallbackLabel,
      });
    });

    return {
      ...baseField,
      type: "union",
      anyOf: variants,
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    } as AnyFormField;
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    // Treat `oneOf` the same way as `anyOf` and surface them as union choices.
    const variants = schema.oneOf.map((variant) => {
      if (!isRecord(variant)) {
        throw new Error("oneOf entries must be object schemas");
      }

      const fallbackLabel =
        typeof variant.testId === "string" && variant.testId.trim()
          ? dropTrailingToken(variant.testId.replace(/[-_]/g, " "), "input")
          : typeof variant.type === "string"
          ? variant.type
          : undefined;

      return convertSchemaToField(variant, {
        required: false,
        fallbackLabel,
      });
    });

    return {
      ...baseField,
      type: "union",
      anyOf: variants,
      ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    } as AnyFormField;
  }

  const primitiveType: AnyFormField["type"] | undefined = (() => {
    if (typeFromSchema === "string" || (!typeFromSchema && schema.format)) {
      return mapStringFormatToType(schema);
    }

    if (typeFromSchema === "integer") {
      return "number";
    }

    if (
      typeFromSchema === "object" &&
      schema.additionalProperties &&
      isRecord(schema.additionalProperties) &&
      !isRecord(schema.properties)
    ) {
      return "record";
    }

    // Infer `object` type when only `properties` are provided.
    if (!typeFromSchema && isRecord(schema.properties)) {
      return "object";
    }

    return typeFromSchema as AnyFormField["type"] | undefined;
  })();

  switch (primitiveType) {
    case "string":
    case "email":
    case "password":
    case "url":
    case "time": {
      const defaultString = asString(defaultValue);
      const enumValues = hasEnum ? asStringArray(schema.enum) : undefined;

      return {
        ...baseField,
        type: primitiveType,
        ...(defaultString !== undefined ? { default: defaultString } : {}),
        ...(enumValues ? { enum: enumValues } : {}),
      } as AnyFormField;
    }
    case "date":
    case "datetime": {
      const defaultDate =
        typeof defaultValue === "string" || defaultValue instanceof Date
          ? defaultValue
          : undefined;

      return {
        ...baseField,
        type: primitiveType,
        ...(defaultDate !== undefined ? { default: defaultDate } : {}),
      } as AnyFormField;
    }
    case "number": {
      const defaultNumber = asNumber(defaultValue);
      const enumValues = hasEnum ? asNumberArray(schema.enum) : undefined;

      return {
        ...baseField,
        type: "number",
        ...(defaultNumber !== undefined ? { default: defaultNumber } : {}),
        ...(enumValues ? { enum: enumValues } : {}),
      } as AnyFormField;
    }
    case "boolean": {
      const defaultBool = asBoolean(defaultValue);

      return {
        ...baseField,
        type: "boolean",
        ...(defaultBool !== undefined ? { default: defaultBool } : {}),
      } as AnyFormField;
    }
    case "array": {
      const rawItems = schema.items;
      const itemSchema = Array.isArray(rawItems) ? rawItems[0] : rawItems;
      if (!isRecord(itemSchema)) {
        throw new Error("Array schema requires an object in 'items'");
      }

      // Use a singularized key or test id to derive child labels.
      const singularKey = options.key ? singularize(options.key) : undefined;
      const itemFallbackLabel =
        singularKey ??
        (typeof itemSchema.testId === "string"
          ? dropTrailingToken(itemSchema.testId.replace(/[-_]/g, " "), "input")
          : undefined);

      return {
        ...baseField,
        type: "array",
        itemType: convertSchemaToField(itemSchema, {
          required: false,
          fallbackLabel: itemFallbackLabel,
        }),
        ...(Array.isArray(defaultValue) ? { default: defaultValue } : {}),
      } as AnyFormField;
    }
    case "object": {
      const properties = isRecord(schema.properties) ? schema.properties : {};
      const requiredList = Array.isArray(schema.required)
        ? (schema.required as string[])
        : [];

      // Recursively convert each nested property.
      const mappedProperties = Object.entries(properties).reduce<
        Record<string, AnyFormField>
      >((acc, [key, propertySchema]) => {
        if (!isRecord(propertySchema)) {
          throw new Error(`Property ${key} must be an object schema`);
        }

        acc[key] = convertSchemaToField(propertySchema, {
          key,
          required: requiredList.includes(key),
        });
        return acc;
      }, {});

      return {
        ...baseField,
        type: "object",
        properties: mappedProperties,
        ...(isRecord(defaultValue) ? { default: defaultValue } : {}),
        ...(options.required ? { isRequired: true } : {}),
      } as AnyFormField;
    }
    case "record": {
      const valueSchema = schema.additionalProperties;
      if (!isRecord(valueSchema)) {
        throw new Error(
          "Record schema requires an object in 'additionalProperties'"
        );
      }

      return {
        ...baseField,
        type: "record",
        keyType: deriveRecordKeyType(schema),
        valueType: convertSchemaToField(valueSchema, {
          required: false,
        }),
        ...(isRecord(defaultValue) ? { default: defaultValue } : {}),
      } as AnyFormField;
    }
    default: {
      throw new Error(
        `Unsupported or missing type for schema${
          options.key ? ` at ${options.key}` : ""
        }`
      );
    }
  }
};

/**
 * Recursively removes redundant nullable flags that default to `false`.
 */
const sanitizeField = (field: AnyFormField): AnyFormField => {
  const cleaned = { ...field } as AnyFormField & Record<string, unknown>;

  if (field.nullable === false) {
    Reflect.deleteProperty(cleaned, "nullable");
  }

  switch (cleaned.type) {
    case "object":
      cleaned.properties = Object.fromEntries(
        Object.entries(cleaned.properties).map(([key, value]) => [
          key,
          sanitizeField(value),
        ])
      );
      break;
    case "array":
      cleaned.itemType = sanitizeField(cleaned.itemType);
      break;
    case "union":
      cleaned.anyOf = cleaned.anyOf.map(sanitizeField);
      break;
    case "record":
      cleaned.valueType = sanitizeField(cleaned.valueType);
      break;
    default:
      break;
  }

  return cleaned as AnyFormField;
};

/**
 * Converts a JSON Schema document into an AutoForm schema definition.
 */
export const fromJsonSchema = (schema: JsonSchema): AnyFormSchema => {
  if (!isRecord(schema)) {
    throw new Error("JSON Schema root must be an object");
  }

  const properties = isRecord(schema.properties) ? schema.properties : {};
  const required = Array.isArray(schema.required)
    ? (schema.required as string[])
    : [];

  const fields = Object.entries(properties).reduce<
    Record<string, AnyFormField>
  >((acc, [key, propertySchema]) => {
    if (!isRecord(propertySchema)) {
      throw new Error(`Property ${key} must be an object schema`);
    }

    // Convert each property definition into a form field.
    acc[key] = convertSchemaToField(propertySchema, {
      key,
      required: required.includes(key),
    });
    return acc;
  }, {});

  const result: AnyFormSchema = {
    title: typeof schema.title === "string" ? schema.title : undefined,
    description:
      typeof schema.description === "string" ? schema.description : undefined,
    fields,
  };

  const parsed = FormSchema.parse(result);
  const sanitizedFields = Object.fromEntries(
    Object.entries(parsed.fields).map(([key, field]) => [
      key,
      sanitizeField(field),
    ])
  );

  return {
    ...parsed,
    fields: sanitizedFields,
  } satisfies AnyFormSchema;
};
