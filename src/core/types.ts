// core/types.ts
export type FieldKind =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "date"
  | "object"
  | "array"
  | "union";

export type BaseFieldSpec = {
  name: string;
  kind: FieldKind;
  required: boolean;
  label?: string;
  description?: string;
  defaultValue?: unknown;
};

export type StringFieldSpec = BaseFieldSpec & {
  kind: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "default" | "email" | "url" | "password" | "textarea";
};

export type NumberFieldSpec = BaseFieldSpec & {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
};

export type EnumFieldSpec = BaseFieldSpec & {
  kind: "enum";
  options?: { label: string; value: string | number }[];
};

export type BooleanFieldSpec = BaseFieldSpec & {
  kind: "boolean";
};

export type DateFieldSpec = BaseFieldSpec & {
  kind: "date";
  min?: string | Date;
  max?: string | Date;
};

export type ObjectFieldSpec = BaseFieldSpec & {
  kind: "object";
  fields: FieldSpec[];
};

export type ArrayFieldSpec = BaseFieldSpec & {
  kind: "array";
  elementSpec: FieldSpec;
  minItems?: number;
  maxItems?: number;
};

export type UnionFieldSpec = BaseFieldSpec & {
  kind: "union";
  options: FieldSpec[];
  discriminatorKey?: string; // For discriminated unions
};

export type FieldSpec =
  | StringFieldSpec
  | NumberFieldSpec
  | EnumFieldSpec
  | BooleanFieldSpec
  | DateFieldSpec
  | ObjectFieldSpec
  | ArrayFieldSpec
  | UnionFieldSpec;

export type FormMeta = {
  [field: string]: {
    label?: string;
    placeholder?: string;
    help?: string;
    order?: number;
    width?: "full" | "half" | "auto";
    widget?: "select" | "radio" | "checkbox" | "switch" | "number" | "date";
    options?: { label: string; value: string | number }[]; // override enum labels
  };
};
