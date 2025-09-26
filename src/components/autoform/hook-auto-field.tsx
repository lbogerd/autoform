import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  type FieldError,
  type FieldValues,
} from "react-hook-form";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import type { JsonProperty } from "./types";
import type { _JSONSchema } from "node_modules/zod/v4/core/json-schema.d.cts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  getChildError,
  getFieldErrorMessage,
  sanitizeErrorId,
  type FieldErrorLike,
} from "./error-utils";

const resolveSchema = (
  schema: JsonProperty | _JSONSchema
): JsonProperty | _JSONSchema => {
  if (
    typeof schema === "object" &&
    schema !== null &&
    "anyOf" in schema &&
    Array.isArray(schema.anyOf) &&
    schema.anyOf.length > 0
  ) {
    return schema.anyOf[0];
  }

  return schema;
};

const getDefaultValueForSchema = (
  schema: JsonProperty | _JSONSchema
): unknown => {
  if (typeof schema !== "object" || schema === null) {
    return null;
  }

  if (
    "default" in schema &&
    (schema as { default?: unknown }).default !== undefined
  ) {
    return (schema as { default?: unknown }).default;
  }

  if ("type" in schema && typeof schema.type === "string") {
    switch (schema.type) {
      case "string":
        return "";
      case "number":
      case "integer":
        return null;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        return {};
      case "null":
        return null;
      default:
        return null;
    }
  }

  return null;
};

const HookArrayField = ({
  name,
  itemSchema,
  error,
}: {
  name: string;
  itemSchema: JsonProperty | _JSONSchema;
  error?: FieldErrorLike;
}) => {
  const resolvedItemSchema = useMemo(
    () => resolveSchema(itemSchema),
    [itemSchema]
  );

  const { control, getValues, setValue } = useFormContext<FieldValues>();

  useEffect(() => {
    const currentValue = getValues(name);
    if (typeof currentValue === "undefined") {
      setValue(name, []);
    }
  }, [getValues, name, setValue]);

  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {fields.map((field, index) => (
          <li key={field.id} className="flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <HookAutoField
                name={`${name}.${index}`}
                jsonProperty={resolvedItemSchema}
                error={getChildError(error, index)}
              />
            </div>
            <Button type="button" variant="ghost" onClick={() => remove(index)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        onClick={() => append(getDefaultValueForSchema(resolvedItemSchema))}
      >
        Add item
      </Button>
    </div>
  );
};

export const HookAutoField = ({
  name,
  jsonProperty,
  required,
  inputId,
  error,
  errorId,
  showInlineError = true,
}: {
  name: string;
  jsonProperty: JsonProperty | _JSONSchema;
  required?: boolean;
  inputId?: string;
  error?: FieldErrorLike;
  errorId?: string;
  showInlineError?: boolean;
}) => {
  const { control, register } = useFormContext<FieldValues>();
  const aggregatedMessage = getFieldErrorMessage(error);
  const ownMessage = getOwnErrorMessage(error);
  const inlineMessage = showInlineError ? ownMessage : undefined;
  const inlineErrorId =
    showInlineError && inlineMessage
      ? errorId ?? sanitizeErrorId(name)
      : errorId;
  const describedBy = inlineErrorId ?? undefined;
  const isInvalid = Boolean(aggregatedMessage);

  const wrapWithInlineError = (node: ReactNode) => {
    if (!showInlineError) {
      return node;
    }

    return (
      <>
        {node}
        {inlineMessage ? (
          <p id={inlineErrorId} className="text-xs text-destructive">
            {inlineMessage}
          </p>
        ) : null}
      </>
    );
  };

  // Handle anyOf BEFORE resolving the schema to first option
  if (
    typeof jsonProperty === "object" &&
    jsonProperty !== null &&
    "anyOf" in jsonProperty &&
    Array.isArray(jsonProperty.anyOf) &&
    jsonProperty.anyOf.length > 0
  ) {
    return (
      <HookAnyOfTabs
        parentName={name}
        options={jsonProperty.anyOf}
        required={required}
        error={error}
        errorId={inlineErrorId}
        showInlineError={showInlineError}
      />
    );
  }

  const schema = resolveSchema(jsonProperty);

  if (typeof schema !== "object" || schema === null) {
    return <span>Invalid property schema: {JSON.stringify(schema)}</span>;
  }

  if (!("type" in schema)) {
    return <span>No type found: {JSON.stringify(schema)}</span>;
  }

  // anyOf handled above

  if (
    "enum" in schema &&
    Array.isArray(schema.enum) &&
    schema.enum.length > 0
  ) {
    const options = schema.enum.map((option) => ({
      key: String(option),
      value: option,
    }));

    return wrapWithInlineError(
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selected = options.find((option) =>
            Object.is(option.value, field.value)
          );

          return (
            <Select
              value={selected?.key ?? ""}
              onValueChange={(value) => {
                const match = options.find((option) => option.key === value);
                field.onChange(match?.value ?? value);
              }}
            >
              <SelectTrigger
                aria-required={required}
                aria-invalid={isInvalid ? true : undefined}
                aria-describedby={describedBy}
              >
                <SelectValue placeholder="Select value..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {String(option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }}
      />
    );
  }

  const type = schema.type;

  switch (type) {
    case "array": {
      const items = (
        schema as {
          items?: JsonProperty | JsonProperty[] | true;
        }
      ).items;

      if (!items) {
        return wrapWithInlineError(
          <span className="text-muted-foreground">[]</span>
        );
      }

      if (Array.isArray(items)) {
        return wrapWithInlineError(
          <HookArrayField
            name={name}
            itemSchema={items[0] ?? {}}
            error={error}
          />
        );
      }

      if (items === true) {
        return wrapWithInlineError(
          <HookArrayField
            name={name}
            itemSchema={{ type: "string" }}
            error={error}
          />
        );
      }

      return wrapWithInlineError(
        <HookArrayField name={name} itemSchema={items} error={error} />
      );
    }

    case "object": {
      const properties = (
        schema as {
          properties?: Record<string, JsonProperty | _JSONSchema>;
          required?: string[];
          additionalProperties?: unknown;
        }
      ).properties;
      const requiredKeys = new Set(
        (schema as { required?: string[] }).required ?? []
      );

      if (properties && Object.keys(properties).length > 0) {
        return wrapWithInlineError(
          <ul className="space-y-3 rounded-md border p-4">
            {Object.entries(properties).map(([key, value]) => (
              <li key={key} className="space-y-2">
                <label
                  htmlFor={`${name}.${key}`}
                  className="text-sm font-medium"
                >
                  {key}
                  {requiredKeys.has(key) ? (
                    <span className="text-destructive ml-1">*</span>
                  ) : null}
                </label>
                <HookAutoField
                  name={`${name}.${key}`}
                  jsonProperty={value}
                  required={requiredKeys.has(key)}
                  error={getChildError(error, key)}
                />
              </li>
            ))}
          </ul>
        );
      }

      if ("additionalProperties" in schema) {
        return wrapWithInlineError(
          <span className="text-muted-foreground">
            Record-style objects are not yet supported in HookAutoForm.
          </span>
        );
      }

      return wrapWithInlineError(
        <span className="text-muted-foreground">{`{ }`}</span>
      );
    }

    case "string": {
      const format = Object.prototype.hasOwnProperty.call(schema, "format")
        ? (schema as { format?: string }).format
        : undefined;
      const stringRegistration = register(name);

      switch (format) {
        case "email":
          return wrapWithInlineError(
            <Input
              id={inputId ?? name}
              type="email"
              aria-required={required}
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={describedBy}
              {...stringRegistration}
            />
          );
        case "uri":
          return wrapWithInlineError(
            <Input
              id={inputId ?? name}
              type="url"
              aria-required={required}
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={describedBy}
              {...stringRegistration}
            />
          );
        case "date-time":
          return wrapWithInlineError(
            <Input
              id={inputId ?? name}
              type="datetime-local"
              aria-required={required}
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={describedBy}
              {...stringRegistration}
            />
          );
        case "date":
          return wrapWithInlineError(
            <Input
              id={inputId ?? name}
              type="date"
              aria-required={required}
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={describedBy}
              {...stringRegistration}
            />
          );
        case "time":
          return wrapWithInlineError(
            <Input
              id={inputId ?? name}
              type="time"
              step={1}
              aria-required={required}
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={describedBy}
              {...stringRegistration}
            />
          );
        default:
          return wrapWithInlineError(
            <Input
              id={inputId ?? name}
              type="text"
              aria-required={required}
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={describedBy}
              {...stringRegistration}
            />
          );
      }
    }

    case "number":
    case "integer":
      return wrapWithInlineError(
        <Input
          id={inputId ?? name}
          type="number"
          aria-required={required}
          aria-invalid={isInvalid ? true : undefined}
          aria-describedby={describedBy}
          {...register(name, { valueAsNumber: true })}
        />
      );

    case "boolean":
      return wrapWithInlineError(
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Checkbox
              id={inputId ?? name}
              checked={Boolean(field.value)}
              aria-required={required}
              aria-invalid={isInvalid ? true : undefined}
              aria-describedby={describedBy}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
            />
          )}
        />
      );

    case "null":
      return wrapWithInlineError(<span className="font-mono">null</span>);

    default:
      return wrapWithInlineError(
        <span>Unsupported field type: {JSON.stringify(schema)}</span>
      );
  }
};

function getOwnErrorMessage(error: FieldErrorLike): string | undefined {
  if (!error || Array.isArray(error) || typeof error !== "object") {
    return undefined;
  }

  if (
    Object.prototype.hasOwnProperty.call(error, "message") &&
    typeof (error as FieldError).message === "string" &&
    (error as FieldError).message
  ) {
    return (error as FieldError).message;
  }

  return undefined;
}

function HookAnyOfTabs({
  parentName,
  options,
  required,
  error,
  errorId,
  showInlineError = true,
}: {
  parentName: string;
  options: Array<JsonProperty | _JSONSchema>;
  required?: boolean;
  error?: FieldErrorLike;
  errorId?: string;
  showInlineError?: boolean;
}) {
  const [active, setActive] = useState("0");
  const { setValue, getValues } = useFormContext<FieldValues>();

  // Initialize and sync the active index into form state so submit can normalize values
  useEffect(() => {
    const indexPath = `${parentName}.__anyOfIndex`;
    const existing = getValues(indexPath);
    const initial = existing != null ? String(existing) : "0";
    setActive(initial);
    setValue(indexPath, initial, { shouldDirty: false, shouldTouch: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentName]);

  const handleChange = (val: string) => {
    setActive(val);
    setValue(`${parentName}.__anyOfIndex`, val, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const getLabel = (opt: unknown, idx: number): string => {
    if (opt && typeof opt === "object") {
      const t = (opt as { title?: unknown }).title;
      if (typeof t === "string" && t.trim()) return t;
      const tp = (opt as { type?: unknown }).type;
      if (typeof tp === "string" && tp) return tp;
    }
    return `Option ${idx + 1}`;
  };

  return (
    <Tabs value={active} onValueChange={handleChange}>
      <TabsList>
        {options.map((opt, i) => (
          <TabsTrigger key={i} value={String(i)}>
            {getLabel(opt, i)}
          </TabsTrigger>
        ))}
      </TabsList>
      {options.map((opt, i) => (
        <TabsContent key={i} value={String(i)}>
          {/* Keep id stable for the parent label, but scope RHF field names per option
              so switching doesn't clobber incompatible values. */}
          <HookAutoField
            name={`${parentName}.__anyOf.${i}`}
            jsonProperty={opt}
            required={required}
            inputId={parentName}
            error={error}
            errorId={errorId}
            showInlineError={showInlineError}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
