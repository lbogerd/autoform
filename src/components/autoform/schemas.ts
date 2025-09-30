import * as z from "zod";

export const BaseFieldSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  errorMessage: z.string().optional(),
  required: z.boolean().default(false).optional(),
  nullable: z.boolean().default(false).optional(),
});

// PRIMITIVE TYPES
export const StringFieldSchema = BaseFieldSchema.extend({
  type: z.literal("string"),
  default: z.string().optional(),
  enum: z.array(z.string()).optional(),
});

export const NumberFieldSchema = BaseFieldSchema.extend({
  type: z.literal("number"),
  default: z.number().optional(),
  enum: z.array(z.number()).optional(),
});

export const BooleanFieldSchema = BaseFieldSchema.extend({
  type: z.literal("boolean"),
  default: z.boolean().optional(),
  enum: z.array(z.boolean()).optional(),
});

type BaseField = z.infer<typeof BaseFieldSchema>;
type StringField = z.infer<typeof StringFieldSchema>;
type NumberField = z.infer<typeof NumberFieldSchema>;
type BooleanField = z.infer<typeof BooleanFieldSchema>;

interface ObjectField extends BaseField {
  type: "object";
  properties: Record<string, Field>;
  isRequired?: boolean;
  errorMessages?: Record<string, string>;
  default?: Record<string, unknown>;
}

interface ArrayField extends BaseField {
  type: "array";
  itemType: Field;
  default?: unknown[];
}

interface UnionField extends BaseField {
  type: "union";
  anyOf: Field[];
  default?: unknown;
}

interface RecordField extends BaseField {
  type: "record";
  keyType: "string" | "number";
  valueType: Field;
  default?: Record<string | number, unknown>;
}

type Field =
  | StringField
  | NumberField
  | BooleanField
  | ArrayField
  | UnionField
  | ObjectField
  | RecordField;

export const ObjectFieldSchema = BaseFieldSchema.extend({
  type: z.literal("object"),
  properties: z.record(
    z.string(),
    z.lazy(() => FieldSchema)
  ),
  isRequired: z.boolean().optional(),
  errorMessages: z.record(z.string(), z.string()).optional(),
  default: z.record(z.string(), z.any()).optional(),
}) satisfies z.ZodType<ObjectField>;

export const ArrayFieldSchema = BaseFieldSchema.extend({
  type: z.literal("array"),
  itemType: z.lazy(() => FieldSchema),
  default: z.array(z.any()).optional(),
}) satisfies z.ZodType<ArrayField>;

export const UnionFieldSchema = BaseFieldSchema.extend({
  type: z.literal("union"),
  anyOf: z.array(z.lazy(() => FieldSchema)),
  default: z.any().optional(),
}) satisfies z.ZodType<UnionField>;

export const RecordFieldSchema = BaseFieldSchema.extend({
  type: z.literal("record"),
  keyType: z.union([z.literal("string"), z.literal("number")]),
  valueType: z.lazy(() => FieldSchema),
  default: z.record(z.union([z.string(), z.number()]), z.any()).optional(),
}) satisfies z.ZodType<RecordField>;

export const FieldSchema: z.ZodType<Field> = z.union([
  StringFieldSchema,
  NumberFieldSchema,
  BooleanFieldSchema,
  ObjectFieldSchema,
  ArrayFieldSchema,
  UnionFieldSchema,
  RecordFieldSchema,
]);

export const FormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.record(z.string(), FieldSchema),
});
