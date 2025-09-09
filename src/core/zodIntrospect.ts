/* eslint-disable @typescript-eslint/no-explicit-any */
// this file contains a lot of `any` due to Zod internals being used
// `any`s are therefore unavoidable

// core/zodIntrospect.ts
import * as z from "zod";
import type {
  ArrayFieldSpec,
  DateFieldSpec,
  EnumFieldSpec,
  FieldSpec,
  FormMeta,
  NumberFieldSpec,
  ObjectFieldSpec,
  StringFieldSpec,
  UnionFieldSpec,
} from "./types";

/** Humanize a key like "firstName" -> "First name" */
function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
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

/** Peel wrappers: optional/nullable/default/pipe/catch/readonly */
function unwrap(schema: z.ZodTypeAny): UnwrapResult {
  let s: z.ZodTypeAny = schema;
  let optional = false;
  let nullable = false;
  let hasDefault = false;
  let defaultValue: unknown = undefined;

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
    // ZodPipe (v4) – unwrap to OUT type
    if ((z as any).ZodPipe && s instanceof (z as any).ZodPipe) {
      // @ts-expect-error internal
      s = s.def?.out ?? s;
      continue;
    }
    // Legacy ZodPipeline guard by name (just in case)
    // @ts-expect-error typeName is internal
    if (s?.def?.typeName === "ZodPipeline" && s.def?.out) {
      // @ts-expect-error internal
      s = s.def.out;
      continue;
    }
    // ZodCatch – unwrap inner
    if ((z as any).ZodCatch && s instanceof (z as any).ZodCatch) {
      // @ts-expect-error internal
      s = s.def?.innerType ?? s;
      continue;
    }
    // ZodReadonly – unwrap inner
    if ((z as any).ZodReadonly && s instanceof (z as any).ZodReadonly) {
      // @ts-expect-error internal
      s = s.def?.innerType ?? s;
      continue;
    }
    break;
  }
  return { type: s, optional, nullable, hasDefault, defaultValue };
}

/** Extract ZodString info */
function buildStringSpec(
  name: string,
  zodString: z.ZodTypeAny,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): StringFieldSpec {
  // v4 note: string formats like email/url are distinct classes.
  const isEmail =
    (z as any).ZodEmail && zodString instanceof (z as any).ZodEmail;
  const isURL = (z as any).ZodURL && zodString instanceof (z as any).ZodURL;

  // Extract string constraints
  // Prefer public API on v4 (_ZodString exposes minLength/maxLength props)
  let minLength: number | undefined = (zodString as any).minLength ?? undefined;
  let maxLength: number | undefined = (zodString as any).maxLength ?? undefined;
  let pattern: string | undefined;
  let format: StringFieldSpec["format"] = isEmail
    ? "email"
    : isURL
    ? "url"
    : "default";

  // Best-effort read of internals for regex/min/max (some builds expose checks)
  const checks: Array<{ kind: string; value?: any; regex?: RegExp }> =
    (zodString as any).def?.checks ?? [];
  if (Array.isArray(checks) && checks.length) {
    for (const c of checks) {
      const inner = (c as any)._zod?.def;
      // New v4 checks use { check: 'min_length'|'max_length'|'string_format', ... }
      if (inner?.check === "min_length") minLength = inner.minimum ?? minLength;
      if (inner?.check === "max_length") maxLength = inner.maximum ?? maxLength;
      if (inner?.check === "string_format" && inner?.format === "regex") {
        pattern = inner.pattern?.source ?? pattern;
      }
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
    description:
      meta?.[name]?.help ?? (zodString as any).description ?? description,
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
  const checks: Array<any> = (znum as any).def?.checks ?? [];
  let min: number | undefined;
  let max: number | undefined;
  let step: number | undefined;

  for (const c of checks) {
    const inner = (c as any)._zod?.def;
    if (inner?.check === "greater_than") min = inner.value ?? min;
    if (inner?.check === "less_than") max = inner.value ?? max;
    if (inner?.check === "multiple_of") step = inner.value ?? step;
    // Legacy guard
    if ((c as any).kind === "min") min = (c as any).value ?? min;
    if ((c as any).kind === "max") max = (c as any).value ?? max;
    if ((c as any).kind === "multipleOf") step = (c as any).value ?? step;
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
  const checks: Array<any> = (zdate as any).def?.checks ?? [];
  let min: Date | undefined;
  let max: Date | undefined;

  for (const c of checks) {
    const inner = (c as any)._zod?.def;
    if (inner?.check === "greater_than") min = inner.value ?? min;
    if (inner?.check === "less_than") max = inner.value ?? max;
    // Legacy guard
    if ((c as any).kind === "min") min = (c as any).value ?? min;
    if ((c as any).kind === "max") max = (c as any).value ?? max;
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

/** Build Object spec */
function buildObjectSpec(
  name: string,
  zobject: z.ZodObject<any>,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): ObjectFieldSpec {
  const nestedFields = zodObjectToFieldSpecs(zobject, meta);

  return {
    name,
    kind: "object",
    required,
    label: meta?.[name]?.label ?? humanizeKey(name),
    description: meta?.[name]?.help ?? zobject.description ?? description,
    defaultValue,
    fields: nestedFields,
  };
}

/** Build Array spec */
function buildArraySpec(
  name: string,
  zarray: z.ZodArray<any>,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): ArrayFieldSpec {
  // Extract array constraints
  let minItems: number | undefined = (zarray as any).minLength;
  let maxItems: number | undefined = (zarray as any).maxLength;

  // Best-effort read of internals for min/max (some builds expose checks)
  const checks: Array<any> = (zarray as any).def?.checks ?? [];
  if (Array.isArray(checks) && checks.length) {
    for (const c of checks) {
      const inner = (c as any)._zod?.def;
      // New v4 checks use { check: 'min_length'|'max_length'|'length_equals', ... }
      if (inner?.check === "min_length") minItems = inner.minimum ?? minItems;
      if (inner?.check === "max_length") maxItems = inner.maximum ?? maxItems;
      if (inner?.check === "length_equals") {
        minItems = inner.exact ?? minItems;
        maxItems = inner.exact ?? maxItems;
      }
      // Legacy checks
      if ((c as any).kind === "min") minItems = (c as any).value ?? minItems;
      if ((c as any).kind === "max") maxItems = (c as any).value ?? maxItems;
      if ((c as any).kind === "length") {
        minItems = (c as any).value ?? minItems;
        maxItems = (c as any).value ?? maxItems;
      }
    }
  }

  // Get the element type and convert to FieldSpec
  const elementType = (zarray as any)._def?.element ?? (zarray as any).element;
  const elementFieldSpec = zodTypeToFieldSpec(`element`, elementType, meta);

  return {
    name,
    kind: "array",
    required,
    label: meta?.[name]?.label ?? humanizeKey(name),
    description: meta?.[name]?.help ?? zarray.description ?? description,
    defaultValue,
    elementSpec: elementFieldSpec,
    minItems,
    maxItems,
  };
}

/** Build Union spec */
function buildUnionSpec(
  name: string,
  zunion: z.ZodUnion<any> | z.ZodDiscriminatedUnion<any, any>,
  required: boolean,
  description?: string,
  defaultValue?: unknown,
  meta?: FormMeta
): UnionFieldSpec {
  let options: FieldSpec[] = [];
  let discriminatorKey: string | undefined;

  if (zunion instanceof z.ZodDiscriminatedUnion) {
    // Handle discriminated union
    discriminatorKey = (zunion as any)._def?.discriminator;
    const optionsMap =
      (zunion as any)._def?.options ?? (zunion as any)._def?.optionsMap;

    if (optionsMap instanceof Map) {
      options = Array.from(optionsMap.values()).map(
        (option: z.ZodTypeAny, index: number) =>
          zodTypeToFieldSpec(`${name}_option_${index}`, option, meta)
      );
    } else if (Array.isArray(optionsMap)) {
      options = optionsMap.map((option: z.ZodTypeAny, index: number) =>
        zodTypeToFieldSpec(`${name}_option_${index}`, option, meta)
      );
    }
  } else {
    // Handle regular union
    const unionOptions = (zunion as any)._def?.options ?? [];
    options = unionOptions.map((option: z.ZodTypeAny, index: number) =>
      zodTypeToFieldSpec(`${name}_option_${index}`, option, meta)
    );
  }

  return {
    name,
    kind: "union",
    required,
    label: meta?.[name]?.label ?? humanizeKey(name),
    description: meta?.[name]?.help ?? zunion.description ?? description,
    defaultValue,
    options,
    discriminatorKey,
  };
}

/** Convert a single Zod type to FieldSpec (helper for nested types) */
function zodTypeToFieldSpec(
  name: string,
  zodType: z.ZodTypeAny,
  meta: FormMeta = {}
): FieldSpec {
  const { type: base, optional, hasDefault, defaultValue } = unwrap(zodType);
  const baseDescription: string | undefined = (base as any).description;
  const required = !optional && !hasDefault;

  // Check for unsupported types
  assertSupported(name, base);

  // STRING and string formats (Zod v4)
  if (
    base instanceof z.ZodString ||
    ((z as any).ZodStringFormat &&
      base instanceof (z as any).ZodStringFormat) ||
    ((z as any).ZodEmail && base instanceof (z as any).ZodEmail) ||
    ((z as any).ZodURL && base instanceof (z as any).ZodURL)
  ) {
    return buildStringSpec(
      name,
      base,
      required,
      baseDescription,
      defaultValue,
      meta
    );
  }

  // NUMBER
  if (base instanceof z.ZodNumber) {
    return buildNumberSpec(
      name,
      base,
      required,
      baseDescription,
      defaultValue,
      meta
    );
  }

  // BOOLEAN
  if (base instanceof z.ZodBoolean) {
    return {
      name,
      kind: "boolean",
      required,
      label: meta?.[name]?.label ?? humanizeKey(name),
      description: meta?.[name]?.help ?? base.description ?? baseDescription,
      defaultValue,
    };
  }

  // DATE
  if (base instanceof z.ZodDate) {
    return buildDateSpec(
      name,
      base,
      required,
      baseDescription,
      defaultValue,
      meta
    );
  }

  // ENUM
  if (base instanceof z.ZodEnum) {
    const enumOptions = (base as any).options as
      | (string | number)[]
      | undefined;
    const optionsArray: (string | number)[] = enumOptions ?? [];
    return buildEnumSpec(
      name,
      optionsArray,
      required,
      base.description ?? baseDescription,
      defaultValue,
      meta
    );
  }

  // LITERAL -> single-option enum
  if (base instanceof z.ZodLiteral) {
    const values = (base as any).def?.values ?? (base as any)._def?.values;
    const lit = Array.isArray(values)
      ? values[0]
      : values?.values?.next?.().value ??
        values?.[Symbol.iterator]?.().next?.().value;
    return buildEnumSpec(
      name,
      [lit],
      required,
      base.description ?? baseDescription,
      defaultValue ?? lit,
      meta
    );
  }

  // OBJECT
  if (base instanceof z.ZodObject) {
    return buildObjectSpec(
      name,
      base,
      required,
      baseDescription,
      defaultValue,
      meta
    );
  }

  // ARRAY
  if (base instanceof z.ZodArray) {
    return buildArraySpec(
      name,
      base,
      required,
      baseDescription,
      defaultValue,
      meta
    );
  }

  // UNION
  if (base instanceof z.ZodUnion || base instanceof z.ZodDiscriminatedUnion) {
    return buildUnionSpec(
      name,
      base,
      required,
      baseDescription,
      defaultValue,
      meta
    );
  }

  // If we reached here, it's a type we don't handle
  const tn =
    (base as any)?.def?.typeName ?? base.constructor?.name ?? "Unknown";
  throw new Error(`Field "${name}": unsupported Zod type "${tn}".`);
}

/** Guard against unsupported nested/complex types */
function assertSupported(name: string, t: z.ZodTypeAny) {
  // Allow: ZodObject, ZodArray, ZodUnion, ZodDiscriminatedUnion
  // Disallow: ZodTuple, ZodRecord, ZodMap, ZodSet
  if (t instanceof z.ZodTuple)
    throw new Error(`Field "${name}": tuples are not supported.`);
  if (t instanceof z.ZodRecord)
    throw new Error(`Field "${name}": records are not supported.`);
  if (t instanceof z.ZodMap || t instanceof z.ZodSet)
    throw new Error(`Field "${name}": maps/sets are not supported.`);
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
    const fieldSpec = zodTypeToFieldSpec(name, raw, meta);
    fields.push(fieldSpec);
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
