import * as z from "zod";
import type {
  FieldSpec,
  StringFieldSpec,
  NumberFieldSpec,
  BooleanFieldSpec,
  EnumFieldSpec,
  DateFieldSpec,
  FormMeta,
} from "./types";

/**
 * Utilities to unwrap optional/nullable/default wrappers while collecting metadata.
 */
type UnwrapResult = {
  schema: z.ZodTypeAny;
  required: boolean;
  defaultValue?: unknown;
};

function unwrap(schema: z.ZodTypeAny): UnwrapResult {
  let current: z.ZodTypeAny = schema;
  let required = true;
  let defaultValue: unknown | undefined;

  // unwrap defaults first so we still know optionality afterwards
  if (current instanceof z.ZodDefault) {
    defaultValue = (current as any)._def.defaultValue();
    current = (current as any)._def.innerType;
    required = false; // has a default
  }

  // optional
  if (current instanceof z.ZodOptional) {
    required = false;
    current = (current as any)._def.innerType;
  }

  // nullable doesn't affect required from a form perspective – still required unless optional/default.
  if (current instanceof z.ZodNullable) {
    current = (current as any)._def.innerType;
  }

  return { schema: current, required, defaultValue };
}

/**
 * Introspect a single property schema into an internal FieldSpec description.
 */
export function introspectProperty(
  name: string,
  schema: z.ZodTypeAny
): FieldSpec | undefined {
  const { schema: unwrapped, required, defaultValue } = unwrap(schema);

  // STRING -------------------------------------------------------------
  if (unwrapped instanceof z.ZodString) {
    const checks: any[] = (unwrapped as any)._def.checks || [];
    const spec: StringFieldSpec = {
      kind: "string",
      name,
      required,
      defaultValue,
      format: "default",
    };
    for (const c of checks) {
      switch (c.kind) {
        case "min":
          spec.minLength = c.value;
          break;
        case "max":
          spec.maxLength = c.value;
          break;
        case "email":
          spec.format = "email";
          break;
        case "url":
          spec.format = "url";
          break;
        case "regex":
          spec.pattern = c.regex?.source;
          break;
      }
    }
    return spec;
  }

  // NUMBER -------------------------------------------------------------
  if (unwrapped instanceof z.ZodNumber) {
    const checks: any[] = (unwrapped as any)._def.checks || [];
    const spec: NumberFieldSpec = {
      kind: "number",
      name,
      required,
      defaultValue,
    };
    for (const c of checks) {
      switch (c.kind) {
        case "min":
          spec.min = c.value;
          break;
        case "max":
          spec.max = c.value;
          break;
        case "multipleOf":
          spec.step = c.value;
          break;
      }
    }
    return spec;
  }

  // BOOLEAN ------------------------------------------------------------
  if (unwrapped instanceof z.ZodBoolean) {
    const spec: BooleanFieldSpec = {
      kind: "boolean",
      name,
      required,
      defaultValue,
    };
    return spec;
  }

  // DATE ---------------------------------------------------------------
  if (unwrapped instanceof z.ZodDate) {
    const spec: DateFieldSpec = {
      kind: "date",
      name,
      required,
      defaultValue,
    };
    return spec;
  }

  // ENUM / LITERAL UNION ----------------------------------------------
  if (unwrapped instanceof z.ZodEnum) {
    const values: string[] = (unwrapped as any).options as string[];
    const spec: EnumFieldSpec = {
      kind: "enum",
      name,
      required,
      defaultValue,
      options: values.map((v) => ({ label: v, value: v })),
    };
    return spec;
  }

  // native enum: we approximate by reading _def.values (runtime shape subject to change across versions)
  if ((unwrapped as any)?._def?.typeName === "ZodNativeEnum") {
    const enumObj = (unwrapped as any)._def.values as Record<
      string,
      string | number
    >;
    const entries = Object.entries(enumObj).filter(
      ([, v]) => typeof v === "string" || typeof v === "number"
    );
    const spec: EnumFieldSpec = {
      kind: "enum",
      name,
      required,
      defaultValue,
      options: entries.map(([label, value]) => ({
        label,
        value: value as string | number,
      })),
    };
    return spec;
  }

  // For unions of literals (string) we can produce enum-like select
  if (unwrapped instanceof z.ZodUnion) {
    const options: { label: string; value: string | number }[] = [];
    let allLiterals = true;
    const inner = (unwrapped as any)._def.options as z.ZodTypeAny[];
    for (const opt of inner) {
      if ((opt as any)?._def?.typeName === "ZodLiteral") {
        const value = (opt as any)._def.value as string | number;
        options.push({ label: String(value), value });
      } else {
        allLiterals = false;
        break;
      }
    }
    if (allLiterals && options.length) {
      const spec: EnumFieldSpec = {
        kind: "enum",
        name,
        required,
        defaultValue,
        options,
      };
      return spec;
    }
  }

  return undefined; // unsupported type for now
}

/**
 * Introspect a Zod object schema into a record of field specs keyed by field name.
 */
export function introspectObjectSchema<Z extends z.ZodRawShape>(
  objectSchema: z.ZodObject<Z>
): Record<string, FieldSpec> {
  const shape = objectSchema.shape;
  const result: Record<string, FieldSpec> = {};
  for (const key of Object.keys(shape)) {
    const spec = introspectProperty(key, (shape as any)[key]);
    if (spec) result[key] = spec;
  }
  return result;
}

export type FieldComponentKind =
  | "input:text"
  | "input:email"
  | "input:url"
  | "input:number"
  | "input:password"
  | "textarea"
  | "select"
  | "switch"
  | "date";

export interface FieldComponentDescriptor {
  component: FieldComponentKind;
  /** base HTML input type if applicable */
  inputType?: string;
}

/**
 * Decide the UI component to render for a given FieldSpec (+ optional meta override).
 * This does not return actual JSX to keep it framework agnostic; caller maps to components.
 */
export function chooseFieldComponent(
  spec: FieldSpec,
  meta?: FormMeta[string]
): FieldComponentDescriptor {
  // meta.widget overrides
  if (meta?.widget) {
    switch (meta.widget) {
      case "select":
        return { component: "select" };
      case "radio":
        return { component: "select" }; // could differentiate later
      case "checkbox":
      case "switch":
        return { component: "switch" };
      case "number":
        return { component: "input:number", inputType: "number" };
      case "date":
        return { component: "date", inputType: "date" };
    }
  }

  switch (spec.kind) {
    case "string": {
      if (spec.format === "email")
        return { component: "input:email", inputType: "email" };
      if (spec.format === "url")
        return { component: "input:url", inputType: "url" };
      if (spec.format === "password")
        return { component: "input:password", inputType: "password" };
      if (spec.format === "textarea") return { component: "textarea" };
      return { component: "input:text", inputType: "text" };
    }
    case "number":
      return { component: "input:number", inputType: "number" };
    case "boolean":
      return { component: "switch" };
    case "enum":
      return { component: "select" };
    case "date":
      return { component: "date", inputType: "date" };
  }
}

/** Convenience to go straight from schema + meta to UI mapping */
export function buildFormModel(
  schema: z.ZodObject<any>,
  meta?: FormMeta
): Array<{
  spec: FieldSpec;
  ui: FieldComponentDescriptor;
  meta?: FormMeta[string];
}> {
  const specs = introspectObjectSchema(schema);
  return Object.keys(specs)
    .map((name) => {
      const spec = specs[name];
      const m = meta?.[name];
      return { spec, ui: chooseFieldComponent(spec, m), meta: m };
    })
    .sort((a, b) => (a.meta?.order ?? 999) - (b.meta?.order ?? 999));
}
