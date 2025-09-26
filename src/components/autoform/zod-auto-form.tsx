import { useMemo } from "react";
import { z } from "zod";

import { AutoForm, type AutoFormProps } from "./auto-form";
import type { JsonSchema } from "./types";

type ToJSONSchemaParams = Parameters<typeof z.toJSONSchema>[1];

type ZodAutoFormProps<TSchema extends z.ZodTypeAny> = Omit<
  AutoFormProps,
  "schema"
> & {
  schema: TSchema;
  toJSONSchemaOptions?: ToJSONSchemaParams;
};

const AUTOFORM_NATIVE_TYPE_KEY = "x-autoform-nativeType" as const;

export const ZodAutoForm = <TSchema extends z.ZodTypeAny>({
  schema,
  toJSONSchemaOptions,
  ...rest
}: ZodAutoFormProps<TSchema>) => {
  const jsonSchema = useMemo(() => {
    const userOptions = toJSONSchemaOptions ?? {};
    const userOverride = userOptions.override;

    const mergedOptions: ToJSONSchemaParams = {
      ...userOptions,
      reused: userOptions.reused ?? "ref",
      override: (ctx) => {
        applyNativeDateOverride(ctx);
        userOverride?.(ctx);
      },
    };

    try {
      return z.toJSONSchema(schema, mergedOptions) as JsonSchema;
    } catch (error) {
      if (isDateUnrepresentableError(error)) {
        return z.toJSONSchema(schema, {
          ...mergedOptions,
          unrepresentable: "any",
        }) as JsonSchema;
      }
      throw error;
    }
  }, [schema, toJSONSchemaOptions]);

  return <AutoForm {...rest} schema={jsonSchema} />;
};

type OverrideContext = NonNullable<ToJSONSchemaParams>["override"] extends (
  ctx: infer C
) => void
  ? C
  : never;

const isDateUnrepresentableError = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.includes("Date cannot be represented in JSON Schema");

const applyNativeDateOverride = (ctx: OverrideContext) => {
  const { zodSchema, jsonSchema } = ctx;
  if (!zodSchema || typeof zodSchema !== "object") return;

  const internals = (zodSchema as { _zod?: { def?: { type?: string }; bag?: unknown } })
    ._zod;
  if (!internals) return;

  if (internals.def?.type !== "date") return;

  const target = jsonSchema as Record<string, unknown>;
  target.type = "string";
  target.format = "date-time";
  target[AUTOFORM_NATIVE_TYPE_KEY] = "date";

  const bag = internals.bag as
    | {
        minimum?: Date;
        maximum?: Date;
      }
    | undefined;

  if (bag?.minimum instanceof Date) {
    target.formatMinimum = bag.minimum.toISOString();
  }

  if (bag?.maximum instanceof Date) {
    target.formatMaximum = bag.maximum.toISOString();
  }
};

export type { ZodAutoFormProps };
