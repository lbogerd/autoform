import * as z from "zod";

export const BaseFieldSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  errorMessage: z.string().optional(),
  required: z.boolean().default(false).optional(),
  nullable: z.boolean().default(false).optional(),
  testId: z.string().optional(),
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

// PRIMITIVE SUBTYPES (like email, password etc)
export const EmailFieldSchema = StringFieldSchema.extend({
  type: z.literal("email"),
  default: z.email().optional(),
  enum: z.array(z.email()).optional(),
});

export const PasswordFieldSchema = StringFieldSchema.extend({
  type: z.literal("password"),
  default: z.never(),
  enum: z.array(z.string()).optional(),
});

export const UrlFieldSchema = StringFieldSchema.extend({
  type: z.literal("url"),
  default: z.url().optional(),
  enum: z.array(z.url()).optional(),
});

type EmailField = z.infer<typeof EmailFieldSchema>;
type PasswordField = z.infer<typeof PasswordFieldSchema>;
type UrlField = z.infer<typeof UrlFieldSchema>;

// COMPLEX TYPES
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

interface DateField extends BaseField {
  type: "date";
  default?: string | Date;
}

interface TimeField extends BaseField {
  type: "time";
  default?: string;
}

interface DateTimeField extends BaseField {
  type: "datetime";
  default?: string | Date;
}

type Field =
  | StringField
  | NumberField
  | BooleanField
  | EmailField
  | PasswordField
  | UrlField
  | ArrayField
  | UnionField
  | ObjectField
  | RecordField
  | DateField
  | TimeField
  | DateTimeField;

export const ObjectFieldSchema = BaseFieldSchema.extend({
  type: z.literal("object"),
  properties: z.record(
    z.string(),
    z.lazy(() => FieldSchema),
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
  default: z.record(z.union([z.string(), z.number()]), z.unknown()).optional(),
}) satisfies z.ZodType<RecordField>;

export const DateFieldSchema = BaseFieldSchema.extend({
  type: z.literal("date"),
  default: z.union([z.string(), z.date()]).optional(),
}) satisfies z.ZodType<DateField>;

export const TimeFieldSchema = BaseFieldSchema.extend({
  type: z.literal("time"),
  default: z.string().optional(),
}) satisfies z.ZodType<TimeField>;

export const DateTimeFieldSchema = BaseFieldSchema.extend({
  type: z.literal("datetime"),
  default: z.union([z.string(), z.date()]).optional(),
}) satisfies z.ZodType<DateTimeField>;

export const FieldSchema: z.ZodType<Field> = z.union([
  StringFieldSchema,
  NumberFieldSchema,
  BooleanFieldSchema,
  EmailFieldSchema,
  PasswordFieldSchema,
  UrlFieldSchema,
  ObjectFieldSchema,
  ArrayFieldSchema,
  UnionFieldSchema,
  RecordFieldSchema,
  DateFieldSchema,
  TimeFieldSchema,
  DateTimeFieldSchema,
]);

export const FormSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.record(z.string(), FieldSchema),
});
