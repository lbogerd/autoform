// core/zodIntrospect.ts
import * as z from "zod";
import type {
  FieldSpec,
  FormMeta,
  StringFieldSpec,
  NumberFieldSpec,
  EnumFieldSpec,
  BooleanFieldSpec,
  DateFieldSpec,
} from "./types";

/** Humanize a key like "firstName" -> "First name" */
function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

type UnwrapResult = {
  type: z.ZodTypeAny;
  optional: boolean;
  nullable: boolean;
  hasDefault: boolean;
  defaultValue?: unknown;
};

/** Peel wrappers: optional/nullable/default/effects/pipeline/catch */
function unwrap(schema: z.ZodTypeAny): UnwrapResult {
  let s: z.ZodTypeAny = schema;
  let optional = false;
  let nullable = false;
  let hasDefault = false;
  let defaultValue: unknown = undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (s instanceof z.ZodOptional) {
      optional = true;
      // @ts-expect-error def is internal but stable in practice
      s = s.def.innerType;
      continue;
    }
    if (s instanceof z.ZodNullable) {
      nullable = true;
      // @ts-expect-error def is internal but stable in practice
      s = s.def.innerType;
      continue;
    }
    if (s instanceof z.ZodDefault) {
      hasDefault = true;
      const def = s.def;
      try {
        defaultValue =
          typeof def.defaultValue === "function"
            ? def.defaultValue()
            : def.defaultValue;
      } catch {
        // ignore default computation errors
      }
      // @ts-expect-error def is internal but stable in practice
      s = def.innerType;
      continue;
    }
    // ZodPipeline (rare) – unwrap to OUT type
    // @ts-expect-error def may exist in some Zod versions
    if (s?.def?.typeName === "ZodPipeline") {
      // @ts-expect-error internal
      s = s.def.out;
      continue;
    }
    // ZodCatch – unwrap inner
    if (s.constructor?.name === "ZodCatch") {
      // @ts-expect-error internal
      s = s.def.innerType;
      continue;
    }
    break;
  }
  return { type: s, optional, nullable, hasDefault, defaultValue };
}

/** Extract ZodString info */
function buildStringSpec(
  name: string,
  zstr: z.ZodString,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): StringFieldSpec {
  // internal but widely used; checks: { kind: 'min'|'max'|'email'|'url'|'regex'|'datetime' ... }
  const checks: Array<any> = zstr.def?.checks ?? [];
  let minLength: number | undefined;
  let maxLength: number | undefined;
  let pattern: string | undefined;
  let format: StringFieldSpec["format"] = "default";

  for (const c of checks) {
    if (c.kind === "min") minLength = c.value ?? minLength;
    if (c.kind === "max") maxLength = c.value ?? maxLength;
    if (c.kind === "regex") pattern = c.regex?.source ?? pattern;
    if (c.kind === "email") format = "email";
    if (c.kind === "url") format = "url";
    if (c.kind === "datetime") {
      // Treat as date-like; the renderer can map format to a date input if desired.
      // You can choose to convert this to kind: 'date' instead if you prefer.
      // Here we keep it as string with implied format unless overridden via meta.widget.
      // no-op here; leave format 'default' unless you want a special handling
    }
  }

  // meta.widget can force a widget (e.g., password/textarea)
  const w = meta?.[name]?.widget;
  if (
    w === "number" ||
    w === "date" ||
    w === "checkbox" ||
    w === "switch" ||
    w === "select" ||
    w === "radio"
  ) {
    // ignore: those widgets are for other kinds; string keeps its own format
  }
  // Heuristic: if key includes "password", prefer password format unless meta overrides
  if (format === "default" && /password/i.test(name)) {
    format = "password";
  }
  // Allow explicit override via meta.widget for string-only choices
  if (meta?.[name]?.widget === "radio" || meta?.[name]?.widget === "select") {
    // leave format; renderer will map widget
  }
  if (
    ["password", "textarea", "email", "url"].includes(
      String(meta?.[name]?.widget)
    )
  ) {
    // narrow allowed values
    format = meta?.[name]?.widget as any;
  }

  return {
    name,
    kind: "string",
    required,
    label: meta?.[name]?.label ?? humanizeKey(name),
    description: meta?.[name]?.help ?? zstr.description ?? description,
    defaultValue,
    minLength,
    maxLength,
    pattern,
    format,
  };
}

/** Extract ZodNumber info */
function buildNumberSpec(
  name: string,
  znum: z.ZodNumber,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): NumberFieldSpec {
  // internal checks: { kind: 'min'|'max'|'multipleOf'|'int' ... }
  const checks: Array<any> = znum.def?.checks ?? [];
  let min: number | undefined;
  let max: number | undefined;
  let step: number | undefined;

  for (const c of checks) {
    if (c.kind === "min") min = c.value ?? min;
    if (c.kind === "max") max = c.value ?? max;
    if (c.kind === "multipleOf") step = c.value ?? step;
  }

  return {
    name,
    kind: "number",
    required,
    label: meta?.[name]?.label ?? humanizeKey(name),
    description: meta?.[name]?.help ?? znum.description ?? description,
    defaultValue,
    min,
    max,
    step,
  };
}

/** Extract ZodDate info */
function buildDateSpec(
  name: string,
  zdate: z.ZodDate,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): DateFieldSpec {
  // internal checks: { kind: 'min'|'max', value: Date }
  const checks: Array<any> = zdate.def?.checks ?? [];
  let min: Date | undefined;
  let max: Date | undefined;

  for (const c of checks) {
    if (c.kind === "min") min = c.value ?? min;
    if (c.kind === "max") max = c.value ?? max;
  }

  return {
    name,
    kind: "date",
    required,
    label: meta?.[name]?.label ?? humanizeKey(name),
    description: meta?.[name]?.help ?? zdate.description ?? description,
    defaultValue,
    min,
    max,
  };
}

/** Build Enum spec */
function buildEnumSpec(
  name: string,
  options: Array<string | number>,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): EnumFieldSpec {
  const overridden = meta?.[name]?.options;
  const opt =
    overridden ??
    options.map((v) => ({
      label: String(v),
      value: v,
    }));

  return {
    name,
    kind: "enum",
    required,
    label: meta?.[name]?.label ?? humanizeKey(name),
    description: meta?.[name]?.help ?? description,
    defaultValue,
    options: opt,
  };
}

/** Guard against unsupported nested/complex types for this "simple" scope */
function assertFlatSupported(name: string, t: z.ZodTypeAny) {
  if (t instanceof z.ZodArray)
    throw new Error(
      `Field "${name}": arrays are not supported in simple forms.`
    );
  if (t instanceof z.ZodUnion || t instanceof z.ZodDiscriminatedUnion)
    throw new Error(
      `Field "${name}": unions are not supported in simple forms.`
    );
  if (t instanceof z.ZodObject)
    throw new Error(
      `Field "${name}": nested objects are not supported in simple forms.`
    );
  if (t instanceof z.ZodTuple)
    throw new Error(
      `Field "${name}": tuples are not supported in simple forms.`
    );
  if (t instanceof z.ZodRecord)
    throw new Error(
      `Field "${name}": records are not supported in simple forms.`
    );
  if (t instanceof z.ZodMap || t instanceof z.ZodSet)
    throw new Error(
      `Field "${name}": maps/sets are not supported in simple forms.`
    );
}

/**
 * Convert a *flat* Zod object schema into FieldSpec[]
 * - Respects .optional(), .nullable(), .default()
 * - Reads labels/help from z.describe(), but meta overrides win
 * - Sorts by meta.order (ascending), otherwise by object shape order
 */
export function zodObjectToFieldSpecs<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  meta: FormMeta = {}
): FieldSpec[] {
  // both Zod v3/v4 expose .shape or .def.shape()
  const shape: Record<string, z.ZodTypeAny> =
    typeof (schema as any).shape === "function"
      ? (schema as any).shape()
      : (schema as any).shape ?? (schema as any).def?.shape();

  const entries = Object.entries(shape) as Array<[string, z.ZodTypeAny]>;
  const fields: FieldSpec[] = [];

  for (const [name, raw] of entries) {
    const { type: base, optional, hasDefault, defaultValue } = unwrap(raw);

    // Global description at field node level
    const baseDescription: string | undefined = (base as any).description;

    // enforce "simple" constraints
    assertFlatSupported(name, base);

    // STRING
    if (base instanceof z.ZodString) {
      fields.push(
        buildStringSpec(
          name,
          base,
          /* required */ !optional && !hasDefault,
          baseDescription,
          defaultValue,
          meta
        )
      );
      continue;
    }

    // NUMBER
    if (base instanceof z.ZodNumber) {
      fields.push(
        buildNumberSpec(
          name,
          base,
          !optional && !hasDefault,
          baseDescription,
          defaultValue,
          meta
        )
      );
      continue;
    }

    // BOOLEAN
    if (base instanceof z.ZodBoolean) {
      const spec: BooleanFieldSpec = {
        name,
        kind: "boolean",
        required: !optional && !hasDefault,
        label: meta?.[name]?.label ?? humanizeKey(name),
        description: meta?.[name]?.help ?? base.description ?? baseDescription,
        defaultValue,
      };
      fields.push(spec);
      continue;
    }

    // DATE
    if (base instanceof z.ZodDate) {
      fields.push(
        buildDateSpec(
          name,
          base,
          !optional && !hasDefault,
          baseDescription,
          defaultValue,
          meta
        )
      );
      continue;
    }

    // ENUM
    if (base instanceof z.ZodEnum) {
      // Zod's ZodEnum shape differs across versions; access options via any to avoid generic constraint issues
      const enumOptions = (base as any).options as
        | (string | number)[]
        | undefined;
      const optionsArray: (string | number)[] = enumOptions ?? [];
      fields.push(
        buildEnumSpec(
          name,
          optionsArray,
          !optional && !hasDefault,
          base.description ?? baseDescription,
          defaultValue,
          meta
        )
      );
      continue;
    }

    // LITERAL -> single-option enum
    if (base instanceof z.ZodLiteral) {
      // @ts-expect-error internal
      const lit = base.def?.value;
      fields.push(
        buildEnumSpec(
          name,
          [lit],
          !optional && !hasDefault,
          base.description ?? baseDescription,
          defaultValue ?? lit,
          meta
        )
      );
      continue;
    }

    // If we reached here, it's a type we don't handle in "simple" forms
    const tn =
      (base as any)?.def?.typeName ?? base.constructor?.name ?? "Unknown";
    throw new Error(
      `Field "${name}": unsupported Zod type "${tn}" in simple forms.`
    );
  }

  // sort by meta.order, preserve declaration order otherwise
  const order = new Map(entries.map(([k], i) => [k, i]));
  fields.sort((a, b) => {
    const ao = meta[a.name]?.order ?? Number.POSITIVE_INFINITY;
    const bo = meta[b.name]?.order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0);
  });

  return fields;
}
