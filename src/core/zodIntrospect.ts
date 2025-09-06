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
    defaultValue = current._zod.def.defaultValue;
    current = current._zod.def.innerType as z.ZodAny;
    required = false; // has a default
  }

  // optional
  if (current instanceof z.ZodOptional) {
    required = false;
    current = current._zod.def.innerType as z.ZodAny;
  }

  // nullable doesn't affect required from a form perspective – still required unless optional/default.
  if (current instanceof z.ZodNullable) {
    current = current._zod.def.innerType as z.ZodAny;
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
    const checks: any[] = unwrapped._zod.def.checks || [];
    const spec: StringFieldSpec = {
      kind: "string",
      name,
      required,
      defaultValue,
      format: "default",
    };
    for (const c of checks) {
      // Zod v3 exposed string checks with a simple { kind, value } shape.
      // Zod v4 (as of 4.1.x) wraps checks in classes whose .def carries metadata.
      // We attempt to read both shapes defensively so this code works across versions.
      const kind = c.kind || c.def?.format || c.def?.check;
      switch (kind) {
        case "min": // v3 style
        case "min_length": // v4 internal check id
          if (c.value !== undefined) spec.minLength = c.value;
          else if (typeof c.def?.minLength === "number")
            spec.minLength = c.def.minLength;
          break;
        case "max":
        case "max_length":
          if (c.value !== undefined) spec.maxLength = c.value;
          else if (typeof c.def?.maxLength === "number")
            spec.maxLength = c.def.maxLength;
          break;
        case "email": // v3 provided kind
          spec.format = "email";
          break;
        case "url":
          spec.format = "url";
          break;
        case "string_format":
          // v4 uses check: 'string_format' alongside def.format specifying which
          if (c.def?.format === "email") spec.format = "email";
          else if (c.def?.format === "url") spec.format = "url";
          break;
        case "regex":
          spec.pattern = c.regex?.source;
          break;
        default:
          // As a final fallback, if the check object exposes def.format directly (v4) and we
          // haven't captured a more specific case yet, map known formats.
          if (spec.format === "default" && c.def?.format) {
            if (c.def.format === "email") spec.format = "email";
            else if (c.def.format === "url") spec.format = "url";
          }
      }
    }
    return spec;
  }

  // NUMBER -------------------------------------------------------------
  if (unwrapped instanceof z.ZodNumber) {
    const checks: any[] = unwrapped._zod.def.checks || [];
    const spec: NumberFieldSpec = {
      kind: "number",
      name,
      required,
      defaultValue,
    };
    for (const c of checks) {
      // Zod v3 used { kind, value }. Zod v4 uses opaque classes; we infer from constructor names.
      const innerDef = c._zod?.def || c.def; // v4 nested def
      const kind =
        c.kind || innerDef?.check || c.def?.check || c.constructor?.name;
      switch (kind) {
        case "min":
        case "greater_than":
        case "$ZodCheckGreaterThan":
        case "ZodCheckGreaterThan":
          if (c.value !== undefined) spec.min = c.value;
          else if (typeof innerDef?.min === "number") spec.min = innerDef.min;
          else if (typeof innerDef?.value === "number")
            spec.min = innerDef.value;
          break;
        case "max":
        case "less_than":
        case "$ZodCheckLessThan":
        case "ZodCheckLessThan":
          if (c.value !== undefined) spec.max = c.value;
          else if (typeof innerDef?.max === "number") spec.max = innerDef.max;
          else if (typeof innerDef?.value === "number")
            spec.max = innerDef.value;
          break;
        case "multipleOf":
        case "multiple_of":
          if (c.value !== undefined) spec.step = c.value;
          else if (typeof innerDef?.value === "number")
            spec.step = innerDef.value;
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
    const values: string[] = unwrapped.options as string[];
    const spec: EnumFieldSpec = {
      kind: "enum",
      name,
      required,
      defaultValue,
      options: values.map((v) => ({ label: v, value: v })),
    };
    return spec;
  }

  // native enum: we approximate by reading _zod.def.values (runtime shape subject to change across versions)
  if (unwrapped?._zod.def?.type === "enum") {
    const enumObj = (unwrapped._zod.def as any).values as Record<
      string,
      string | number
    >;
    const values = Object.values(enumObj).filter(
      (v) => typeof v === "string" || typeof v === "number"
    ) as (string | number)[];
    const spec: EnumFieldSpec = {
      kind: "enum",
      name,
      required,
      defaultValue,
      options: values.map((v) => ({ label: String(v), value: v })),
    };
    return spec;
  }

  // For unions of literals (string) we can produce enum-like select
  if (unwrapped instanceof z.ZodUnion) {
    const options: { label: string; value: string | number }[] = [];
    let allLiterals = true;
    const inner = (unwrapped._zod.def as any).options as z.ZodTypeAny[];
    for (const opt of inner) {
      if (opt?._zod.def?.type === "literal") {
        const value = (opt._zod.def as any).options as string | number;
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
    const spec = introspectProperty(key, shape[key] as z.ZodAny);
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
