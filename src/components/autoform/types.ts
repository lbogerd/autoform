import type { _JSONSchema } from "node_modules/zod/v4/core/json-schema.d.cts";

// Shared base for all property variants
export type BaseProperty = {
  description?: string;
};

export type StringProperty = BaseProperty & {
  type: "string";
  format?: "email" | "uri" | "date-time" | "date" | "time" | string;
  pattern?: string;
  enum?: Array<string | number>;
};

export type NumberProperty = BaseProperty & {
  type: "number" | "integer";
};

export type BooleanProperty = BaseProperty & {
  type: "boolean";
};

export type ArrayProperty = BaseProperty & {
  type: "array";
  items: JsonProperty;
};

export type ObjectProperty = BaseProperty & {
  type: "object";
  // Explicit object fields, if any
  properties?: Record<string, JsonProperty>;
  // Record-like objects use additionalProperties to describe value type
  // and propertyNames (usually a string schema) to constrain keys
  additionalProperties?: boolean | JsonProperty;
  propertyNames?: Partial<StringProperty>;
  required?: string[];
};

export type NullProperty = BaseProperty & {
  type: "null";
};

export type TypeProperty =
  | StringProperty
  | NumberProperty
  | BooleanProperty
  | ArrayProperty
  | ObjectProperty
  | NullProperty;

export type JsonProperty = { anyOf?: TypeProperty[] } | TypeProperty;

export type JsonSchema = {
  $schema?: string;
  title?: string;
  description?: string;
  examples?: unknown[];
  type?: string;
  properties?: Record<string, _JSONSchema>;
  required?: string[];
  $defs?: Record<string, _JSONSchema>;
};
