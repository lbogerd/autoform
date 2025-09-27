import type { _JSONSchema } from "node_modules/zod/v4/core/json-schema.d.cts";
import type { DeepPartial, FieldValues } from "react-hook-form";
import type { ZodAny, input as ZodInput, output as ZodOutput } from "zod";

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

export type AutoFormJsonValidation = {
  type: "json";
  schema: JsonSchema;
};

export type AutoFormZodValidation<TSchema extends ZodAny = ZodAny> = {
  type: "zod";
  schema: TSchema;
};

export type AutoFormValidationSchema<TSchema extends ZodAny = ZodAny> =
  | AutoFormJsonValidation
  | AutoFormZodValidation<TSchema>;

type ZodSchemaFromValidation<
  TValidation extends AutoFormValidationSchema | undefined
> = TValidation extends AutoFormZodValidation<infer TSchema> ? TSchema : never;

export type AutoFormValuesFromValidation<
  TValidation extends AutoFormValidationSchema | undefined
> = ZodSchemaFromValidation<TValidation> extends ZodAny
  ? ZodOutput<ZodSchemaFromValidation<TValidation>> & FieldValues
  : FieldValues;

export type AutoFormInputFromValidation<
  TValidation extends AutoFormValidationSchema | undefined
> = ZodSchemaFromValidation<TValidation> extends ZodAny
  ? ZodInput<ZodSchemaFromValidation<TValidation>> & FieldValues
  : FieldValues;

export type AutoFormDefaultValues<
  TValidation extends AutoFormValidationSchema | undefined
> = DeepPartial<AutoFormInputFromValidation<TValidation>>;

export type AutoFormSubmitValues<
  TValidation extends AutoFormValidationSchema | undefined
> = AutoFormValuesFromValidation<TValidation>;
