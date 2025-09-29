import { useState } from "react";
import {
  FormProvider,
  useForm,
  type FieldErrors,
  type FieldValues,
} from "react-hook-form";

import { Button } from "../ui/button";
import { AutoField } from "./auto-field";
import { replaceRefs } from "../../lib/autoform/refs";
import { z, type ZodObject } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export type AutoFormProps = {
  schema: ZodObject;
  defaultValues?: FieldValues;
  onSubmit?: (values: FieldValues) => void;
};

export const AutoForm = ({
  schema,
  defaultValues,
  onSubmit,
}: AutoFormProps) => {
  const form = useForm<FieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const schemaAsJson = z.toJSONSchema(schema);
  const resolvedSchema = replaceRefs(schemaAsJson);

  const [lastSubmittedValues, setLastSubmittedValues] =
    useState<FieldValues | null>(null);

  const handleSubmit = form.handleSubmit((values) => {
    const normalized = normalizeAnyOfValues(values) as FieldValues;
    setLastSubmittedValues(normalized);
    onSubmit?.(normalized);
  });

  const currentValues = form.watch();
  const requiredFields = new Set(resolvedSchema.required ?? []);
  const serializedErrors = safeJson(form.formState.errors);

  return (
    <FormProvider {...form}>
      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
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
                  validationError={
                    form.formState.errors[key]?.message as string
                  }
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

        <div>
          <h3 className="text-sm font-semibold">Validation Errors</h3>
          <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
            {serializedErrors}
          </pre>
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

function safeJson(errors: FieldErrors<FieldValues>, space = 2): string {
  try {
    const serializable = toSerializable(errors);
    const result = JSON.stringify(serializable, null, space);
    return result ?? "null";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "Unknown error");
    return `"Serialization failed: ${message}"`;
  }
}

function toSerializable(
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): unknown {
  if (value === null) return null;

  if (typeof value === "function") {
    return value.name ? `[Function ${value.name}]` : "[Function]";
  }

  if (typeof value !== "object") {
    return value;
  }

  const objectValue = value as Record<string, unknown>;

  if (seen.has(objectValue)) {
    return "[Circular]";
  }
  seen.add(objectValue);

  if (Array.isArray(value)) {
    return value.map((item) => toSerializable(item, seen));
  }

  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(objectValue)) {
    if (key === "ref") continue;

    if (key === "_f" && val && typeof val === "object") {
      const withoutRef = { ...(val as Record<string, unknown>) };
      delete withoutRef.ref;
      result[key] = toSerializable(withoutRef, seen);
      continue;
    }

    result[key] = toSerializable(val, seen);
  }

  return result;
}

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
