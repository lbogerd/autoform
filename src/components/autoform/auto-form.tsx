import { useMemo, useState } from "react";
import { FormProvider, useForm, type FieldValues } from "react-hook-form";

import { Button } from "../ui/button";
import { AutoField } from "./auto-field";
import { replaceRefs } from "../../lib/autoform/refs";
import type { JsonSchema } from "./types";
import type { ValidationMessageProps } from "../ui/validation-message";

export type AutoFormProps = {
  schema: JsonSchema;
  defaultValues?: FieldValues;
  onSubmit?: (values: FieldValues) => void;
  validationMessageProps?: Partial<Omit<ValidationMessageProps, "name" | "id">>;
};

export const AutoForm = ({
  schema,
  defaultValues,
  onSubmit,
  validationMessageProps,
}: AutoFormProps) => {
  const resolvedSchema = replaceRefs(schema);
  const schemaDefaultValues = useMemo(() => {
    const extracted = extractDefaultsFromSchema(resolvedSchema);
    return isPlainObject(extracted) ? (extracted as FieldValues) : undefined;
  }, [resolvedSchema]);
  const initialDefaultValues = useMemo(
    () => mergeDefaultValues(schemaDefaultValues, defaultValues),
    [schemaDefaultValues, defaultValues],
  );
  const form = useForm<FieldValues>({
    defaultValues: initialDefaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "all",
  });
  const [lastSubmittedValues, setLastSubmittedValues] =
    useState<FieldValues | null>(null);

  const handleSubmit = form.handleSubmit((values) => {
    const normalized = normalizeAnyOfValues(values) as FieldValues;
    setLastSubmittedValues(normalized);
    onSubmit?.(normalized);
  });

  const currentValues = form.watch();
  const requiredFields = new Set(resolvedSchema.required ?? []);

  return (
    <FormProvider {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <ul className="space-y-4">
          {Object.entries(resolvedSchema.properties ?? {}).map(
            ([key, value]) => (
              <li key={key} className="space-y-2">
                <label className="text-sm font-medium" htmlFor={key}>
                  {key}
                  {requiredFields.has(key) ? (
                    <span className="text-destructive ml-1">*</span>
                  ) : null}
                </label>
                <AutoField
                  name={key}
                  jsonProperty={value}
                  required={requiredFields.has(key)}
                  validationMessageProps={validationMessageProps}
                />
              </li>
            ),
          )}
        </ul>

        <div className="flex items-center gap-3">
          <Button type="submit">Submit</Button>
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Live values</h3>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(currentValues, null, 2)}
            </pre>
          </div>
          {lastSubmittedValues ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Last submitted values</h3>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(lastSubmittedValues, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
};

const extractDefaultsFromSchema = (schema: unknown): unknown => {
  if (!isPlainObject(schema)) return undefined;

  const node = schema as Record<string, unknown>;
  const hasDefault = Object.prototype.hasOwnProperty.call(node, "default");
  const defaultValue = hasDefault
    ? cloneJsonCompatible(node.default)
    : undefined;

  const anyOf = Array.isArray(node.anyOf) ? node.anyOf : undefined;
  if (anyOf && anyOf.length > 0) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    const optionDefaults = anyOf.map((option) =>
      extractDefaultsFromSchema(option),
    );
    if (optionDefaults.some((value) => value !== undefined)) {
      return {
        __anyOf: optionDefaults,
        __anyOfIndex: "0",
      } satisfies Record<string, unknown>;
    }

    return undefined;
  }

  const rawType = node.type;
  if (rawType === "object") {
    const properties = isPlainObject(node.properties)
      ? (node.properties as Record<string, unknown>)
      : undefined;

    let result: Record<string, unknown> | undefined;

    if (defaultValue !== undefined) {
      if (!isPlainObject(defaultValue)) {
        return defaultValue;
      }
      result = cloneJsonCompatible(defaultValue) as Record<string, unknown>;
    }

    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        const childDefault = extractDefaultsFromSchema(value);
        if (childDefault !== undefined) {
          if (!result) {
            result = {};
          }
          if (result[key] === undefined) {
            result[key] = childDefault;
          }
        }
      }
    }

    return result;
  }

  return defaultValue;
};

const mergeDefaultValues = (
  schemaDefaults: FieldValues | undefined,
  providedDefaults: FieldValues | undefined,
): FieldValues | undefined => {
  if (!schemaDefaults && !providedDefaults) return undefined;
  if (!schemaDefaults)
    return cloneJsonCompatible(providedDefaults) as FieldValues;
  if (!providedDefaults)
    return cloneJsonCompatible(schemaDefaults) as FieldValues;

  return mergeDeep(
    cloneJsonCompatible(schemaDefaults) as Record<string, unknown>,
    providedDefaults as Record<string, unknown>,
  ) as FieldValues;
};

const mergeDeep = (
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];

    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = mergeDeep(
        existing as Record<string, unknown>,
        value as Record<string, unknown>,
      );
      continue;
    }

    result[key] = value;
  }

  return result;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cloneJsonCompatible = <T,>(value: T): T => {
  if (value === undefined || value === null) {
    return value;
  }

  const structuredCloneImpl = (
    globalThis as {
      structuredClone?: <U>(input: U) => U;
    }
  ).structuredClone;

  if (typeof structuredCloneImpl === "function") {
    return structuredCloneImpl(value);
  }

  if (typeof value === "object") {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  return value;
};

function normalizeAnyOfValues(values: unknown): unknown {
  if (values == null || typeof values !== "object") return values;

  if (Array.isArray(values)) {
    return values.map((v) => normalizeAnyOfValues(v));
  }

  const obj = values as Record<string, unknown>;

  // Handle leaf anyOf container pattern: { __anyOf: [...], __anyOfIndex: "i" }
  if ("__anyOf" in obj && Array.isArray(obj.__anyOf)) {
    const idxRaw = obj.__anyOfIndex;
    const idx =
      typeof idxRaw === "string" ? parseInt(idxRaw, 10) : Number(idxRaw ?? 0);
    const chosen = obj.__anyOf[idx] ?? obj.__anyOf[0];
    return normalizeAnyOfValues(chosen);
  }

  // Recurse into children, and collapse nested anyOf values
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__anyOf" || k === "__anyOfIndex") continue;

    // If child is an anyOf container rendered via AnyOfTabs, we expect
    // a structure like v = { __anyOf: [...], __anyOfIndex: ... } or an object containing it.
    out[k] = normalizeAnyOfValues(v);
  }

  // Special case: if this object contains only an __anyOf subobject under some key
  // handled by recursion above, the child recursion will have collapsed it already.
  return out;
}
