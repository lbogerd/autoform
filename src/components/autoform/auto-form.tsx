import { useMemo, useState } from "react";
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
} from "react-hook-form";

import { replaceRefs } from "../../lib/autoform/refs";
import { Button } from "../ui/button";
import type { ValidationMessageProps } from "../ui/validation-message";
import { AutoField } from "./auto-field";
import type {
  AutoFormInputFromValidation,
  AutoFormSubmitValues,
  AutoFormValidationSchema,
  JsonSchema,
} from "./types";

export type AutoFormProps<
  TValidation extends AutoFormValidationSchema | undefined = undefined,
  TRawValues extends FieldValues = AutoFormInputFromValidation<TValidation>,
  TSubmitValues extends FieldValues = AutoFormSubmitValues<TValidation>
> = {
  schema: JsonSchema;
  defaultValues?: DefaultValues<TRawValues>;
  validationSchema?: TValidation;
  onSubmit?: (values: TSubmitValues) => void;
  validationMessageProps?: Partial<Omit<ValidationMessageProps, "name" | "id">>;
};

export const AutoForm = <
  TValidation extends AutoFormValidationSchema | undefined = undefined,
  TRawValues extends FieldValues = AutoFormInputFromValidation<TValidation>,
  TSubmitValues extends FieldValues = AutoFormSubmitValues<TValidation>
>({
  schema,
  defaultValues,
  validationSchema,
  onSubmit,
  validationMessageProps,
}: AutoFormProps<TValidation, TRawValues, TSubmitValues>) => {
  const resolvedSchema = replaceRefs(schema);

  const schemaDefaultValues = useMemo<
    DefaultValues<TRawValues> | undefined
  >(() => {
    const extracted = extractDefaultsFromSchema(resolvedSchema);
    return isPlainObject(extracted)
      ? (extracted as DefaultValues<TRawValues>)
      : undefined;
  }, [resolvedSchema]);

  const initialDefaultValues = useMemo<DefaultValues<TRawValues> | undefined>(
    () => mergeDefaultValues(schemaDefaultValues, defaultValues),
    [schemaDefaultValues, defaultValues]
  );

  const resolver = useMemo<
    Resolver<TRawValues, unknown, TSubmitValues> | undefined
  >(() => {
    if (!validationSchema) return undefined;
    return undefined;
  }, [validationSchema]);

  const form = useForm<TRawValues, unknown, TSubmitValues>({
    defaultValues: initialDefaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "all",
    resolver,
  });

  const [lastSubmittedValues, setLastSubmittedValues] =
    useState<TSubmitValues | null>(null);

  const handleSubmit = form.handleSubmit((values) => {
    const normalized = normalizeAnyOfValues(values);
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
            )
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
      extractDefaultsFromSchema(option)
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

const mergeDefaultValues = <TValues extends FieldValues>(
  schemaDefaults: DefaultValues<TValues> | undefined,
  providedDefaults: DefaultValues<TValues> | undefined
): DefaultValues<TValues> | undefined => {
  if (!schemaDefaults && !providedDefaults) return undefined;
  if (!schemaDefaults)
    return cloneJsonCompatible(providedDefaults) as DefaultValues<TValues>;
  if (!providedDefaults)
    return cloneJsonCompatible(schemaDefaults) as DefaultValues<TValues>;

  if (!isPlainObject(schemaDefaults) || !isPlainObject(providedDefaults)) {
    return cloneJsonCompatible(providedDefaults) as DefaultValues<TValues>;
  }

  return mergeDeep(
    cloneJsonCompatible(schemaDefaults) as Record<string, unknown>,
    providedDefaults as Record<string, unknown>
  ) as DefaultValues<TValues>;
};

const mergeDeep = (
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> => {
  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    const existing = result[key];

    if (isPlainObject(existing) && isPlainObject(value)) {
      result[key] = mergeDeep(
        existing as Record<string, unknown>,
        value as Record<string, unknown>
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

function normalizeAnyOfValues<T>(values: T): T {
  if (values == null || typeof values !== "object") return values;

  if (Array.isArray(values)) {
    return values.map((v) => normalizeAnyOfValues(v)) as unknown as T;
  }

  const obj = values as Record<string, unknown>;

  if ("__anyOf" in obj && Array.isArray(obj.__anyOf)) {
    const idxRaw = obj.__anyOfIndex;
    const idx =
      typeof idxRaw === "string" ? parseInt(idxRaw, 10) : Number(idxRaw ?? 0);
    const chosen = obj.__anyOf[idx] ?? obj.__anyOf[0];
    return normalizeAnyOfValues(chosen) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__anyOf" || k === "__anyOfIndex") continue;

    out[k] = normalizeAnyOfValues(v);
  }

  return out as unknown as T;
}
