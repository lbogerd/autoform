import { useMemo, useState } from "react";
import {
  FormProvider,
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";

import { Button } from "../ui/button";
import { HookAutoField } from "./hook-auto-field";
import { replaceRefs } from "../../lib/autoform/refs";
import type { JsonSchema } from "./types";
import {
  getFieldErrorMessage,
  sanitizeErrorId,
  type FieldErrorLike,
} from "./error-utils";

export type HookAutoFormProps = {
  schema: JsonSchema;
  defaultValues?: FieldValues;
  onSubmit?: (values: FieldValues) => void;
  zodSchema?: ZodTypeAny;
  validationMode?: UseFormProps<FieldValues>["mode"];
};

export const HookAutoForm = ({
  schema,
  defaultValues,
  onSubmit,
  zodSchema,
  validationMode = "onSubmit",
}: HookAutoFormProps) => {
  const resolvedSchema = replaceRefs(schema);
  const resolver = useMemo<Resolver<FieldValues> | undefined>(() => {
    if (!zodSchema) {
      return undefined;
    }
    const baseResolver = zodResolver(
      zodSchema as never
    ) as Resolver<FieldValues>;
    return withAnyOfNormalization(baseResolver);
  }, [zodSchema]);

  const form = useForm<FieldValues>({
    defaultValues,
    resolver,
    mode: validationMode,
  });
  const [lastSubmittedValues, setLastSubmittedValues] =
    useState<FieldValues | null>(null);

  const handleSubmit = form.handleSubmit((values) => {
    const outgoing = zodSchema
      ? (values as FieldValues)
      : (normalizeAnyOfValues(values) as FieldValues);
    setLastSubmittedValues(outgoing);
    onSubmit?.(outgoing);
  });

  const currentValues = form.watch();
  const zodRequired = useMemo(
    () => inferRequiredFromZod(zodSchema),
    [zodSchema]
  );
  const requiredFields = new Set(
    zodRequired && zodRequired.length > 0
      ? zodRequired
      : resolvedSchema.required ?? []
  );

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
                {renderFormField({
                  name: key,
                  jsonProperty: value,
                  required: requiredFields.has(key),
                  errors: form.formState.errors,
                })}
              </li>
            )
          )}
        </ul>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Submit
          </Button>
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

type JsonPropertyValue = NonNullable<JsonSchema["properties"]>[string];

type RenderFieldArgs = {
  name: string;
  jsonProperty: JsonPropertyValue;
  required: boolean;
  errors: Record<string, unknown>;
};

function renderFormField({
  name,
  jsonProperty,
  required,
  errors,
}: RenderFieldArgs) {
  const fieldError = (errors as Record<string, FieldErrorLike | undefined>)[
    name
  ] as FieldErrorLike;
  const message = getFieldErrorMessage(fieldError);
  const errorId = message ? sanitizeErrorId(name) : undefined;

  return (
    <>
      <HookAutoField
        name={name}
        jsonProperty={jsonProperty}
        required={required}
        error={fieldError}
        errorId={errorId}
        showInlineError={false}
      />
      {message ? (
        <p id={errorId} className="text-xs text-destructive">
          {message}
        </p>
      ) : null}
    </>
  );
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

    // If child is an anyOf container rendered via HookAnyOfTabs, we expect
    // a structure like v = { __anyOf: [...], __anyOfIndex: ... } or an object containing it.
    out[k] = normalizeAnyOfValues(v);
  }

  // Special case: if this object contains only an __anyOf subobject under some key
  // handled by recursion above, the child recursion will have collapsed it already.
  return out;
}

function withAnyOfNormalization<T extends FieldValues>(
  inner: Resolver<T>
): Resolver<T> {
  return async (values, context, options) => {
    const normalized = normalizeAnyOfValues(values) as T;
    return inner(normalized, context, options);
  };
}

function inferRequiredFromZod(zodSchema?: ZodTypeAny): string[] {
  if (!zodSchema) {
    return [];
  }

  let current: ZodTypeAny | undefined = zodSchema;
  const safeguard = 10;
  for (let depth = 0; depth < safeguard && current; depth += 1) {
    const meta = ((current as unknown as { def?: unknown }).def ??
      (current as unknown as { _def?: unknown })._def) as
      | {
          type?: string;
          shape?: unknown;
          innerType?: ZodTypeAny;
          getter?: () => ZodTypeAny;
          upstream?: ZodTypeAny;
        }
      | undefined;
    if (!meta || typeof meta !== "object") {
      return [];
    }

    const type = meta.type;
    if (type === "object") {
      const shapeRaw = meta.shape;
      const shape =
        typeof shapeRaw === "function"
          ? (shapeRaw as () => Record<string, unknown>)()
          : (shapeRaw as Record<string, unknown> | undefined);
      if (!shape || typeof shape !== "object") {
        return [];
      }

      const optionalMarkers = new Set([
        "optional",
        "default",
        "catch",
        "prefault",
      ]);
      const required: string[] = [];
      for (const [key, value] of Object.entries(shape)) {
        const childMeta = (
          ((value as { def?: unknown }).def ??
            (value as { _def?: unknown })._def) as { type?: string } | undefined
        )?.type;
        const childType = childMeta;
        if (!optionalMarkers.has(childType ?? "")) {
          required.push(key);
        }
      }
      return required;
    }

    if (
      type === "optional" ||
      type === "default" ||
      type === "catch" ||
      type === "prefault" ||
      type === "readonly"
    ) {
      current = meta.innerType;
      continue;
    }

    if (type === "pipeline") {
      current = meta.upstream;
      continue;
    }

    if (type === "transform") {
      current = meta.innerType;
      continue;
    }

    if (type === "lazy" && typeof meta.getter === "function") {
      current = meta.getter();
      continue;
    }

    if (type === "pipe" && meta.innerType) {
      current = meta.innerType;
      continue;
    }

    return [];
  }

  return [];
}
