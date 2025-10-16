import type { ReactNode } from "react";
import type {
  Control,
  FieldValues,
  UseFormRegister,
  FieldErrors,
} from "react-hook-form";

/**
 * Extra UI metadata that can be attached to schema nodes to control widgets,
 * placeholders, ordering, and other presentation hints.
 */
export type UiElementOptions = {
  widget?:
    | "text"
    | "email"
    | "url"
    | "number"
    | "select"
    | "checkbox"
    | "date"
    | "time"
    | "datetime"
    | "array"
    | "group"
    | "segmented"
    | "radio";
  testId?: string;
  order?: string[];
  placeholder?: string;
  help?: string;
  options?: string[];
};

/**
 * The normalized kinds of fields that the AutoForm renderer understands.
 */
export type NodeKind =
  | "string"
  | "email"
  | "url"
  | "number"
  | "boolean"
  | "date"
  | "time"
  | "dateTime"
  | "select"
  | "group"
  | "record"
  | "array"
  | "union"
  | "unknown";

/**
 * Minimal JSON Schema representation used by the renderer. The fields mirror
 * what `zod-to-json-schema` emits for the supported schema types.
 */
export type JSONSchemaNode = Record<string, unknown> & {
  type?: string;
  title?: string;
  description?: string;
  enum?: Array<string | number>;
  const?: unknown;
  default?: unknown;
  format?: string;
  minimum?: number;
  properties?: Record<string, JSONSchemaNode>;
  items?: JSONSchemaNode | JSONSchemaNode[];
  additionalProperties?: JSONSchemaNode | boolean;
  oneOf?: JSONSchemaNode[];
  anyOf?: JSONSchemaNode[];
  discriminator?: { propertyName: string };
  ["x-ui"]?: UiElementOptions;
};

/**
 * Shape produced by `normalize` that makes rendering logic simpler by
 * collapsing JSON Schema variants into a consistent structure.
 */
export type NormalizedNode = {
  kind: NodeKind;
  path: string; // dot path
  title?: string;
  description?: string;
  schema: JSONSchemaNode;
  ui?: UiElementOptions;
  enum?: Array<string | number>;
  item?: NormalizedNode;
  properties?: NormalizedNode[];
  oneOf?: NormalizedNode[];
  discriminator?: { propertyName: string } | null;
};

/**
 * Function signature used by field components to render nested nodes.
 */
export type FieldRenderer = (node: NormalizedNode) => ReactNode;

/**
 * Props shared by all field renderer components.
 */
export type FieldProps = {
  node: NormalizedNode;
  control: Control<FieldValues>;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors<FieldValues>;
  render: (node: NormalizedNode) => ReactNode;
};
