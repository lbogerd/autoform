import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useFormState,
  type FieldPath,
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
import {
  ValidationMessage,
  type ValidationMessageProps,
} from "../ui/validation-message";
import type { JsonProperty } from "./types";
import type { _JSONSchema } from "node_modules/zod/v4/core/json-schema.d.cts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

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

const ArrayField = ({
  name,
  itemSchema,
  validationMessageProps,
}: {
  name: string;
  itemSchema: JsonProperty | _JSONSchema;
  validationMessageProps?: Partial<Omit<ValidationMessageProps, "name" | "id">>;
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
              <AutoField
                name={`${name}.${index}`}
                jsonProperty={resolvedItemSchema}
                validationMessageProps={validationMessageProps}
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

export const AutoField = ({
  name,
  jsonProperty,
  required,
  inputId,
  validationMessageProps,
}: {
  name: string;
  jsonProperty: JsonProperty | _JSONSchema;
  required?: boolean;
  inputId?: string;
  validationMessageProps?: Partial<Omit<ValidationMessageProps, "name" | "id">>;
}) => {
  const { control, register, getFieldState } = useFormContext<FieldValues>();
  const formState = useFormState({ name });
  const fieldName = name as FieldPath<FieldValues>;
  const fieldState = getFieldState(fieldName, formState);
  const { error, invalid } = fieldState;

  const baseId = inputId ?? name;
  const sanitizedId = baseId.replace(/[^a-zA-Z0-9_-]+/g, "-");
  const messageId = `${sanitizedId}-error`;
  const describedBy = error ? messageId : undefined;

  const validationRules = useMemo(() => {
    if (!required) return undefined;
    return { required: "This field is required." } as const;
  }, [required]);

  // Handle anyOf BEFORE resolving the schema to first option
  if (
    typeof jsonProperty === "object" &&
    jsonProperty !== null &&
    "anyOf" in jsonProperty &&
    Array.isArray(jsonProperty.anyOf) &&
    jsonProperty.anyOf.length > 0
  ) {
    return (
      <AnyOfTabs
        parentName={name}
        options={jsonProperty.anyOf}
        required={required}
        validationMessageProps={validationMessageProps}
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

  const isNativeDate =
    typeof schema === "object" &&
    schema !== null &&
    "x-autoform-nativeType" in schema &&
    (schema as { "x-autoform-nativeType"?: unknown })[
      "x-autoform-nativeType"
    ] === "date";

  const appendValidationMessage = (node: ReactNode) => (
    <>
      {node}
      <ValidationMessage
        name={fieldName}
        id={messageId}
        {...validationMessageProps}
      />
    </>
  );

  if (
    "enum" in schema &&
    Array.isArray(schema.enum) &&
    schema.enum.length > 0
  ) {
    const options = schema.enum.map((option) => ({
      key: String(option),
      value: option,
    }));

    return appendValidationMessage(
      <Controller
        control={control}
        name={name}
        rules={validationRules}
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
                aria-invalid={invalid || undefined}
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
        return appendValidationMessage(
          <span className="text-muted-foreground">[]</span>
        );
      }

      if (Array.isArray(items)) {
        return appendValidationMessage(
          <ArrayField
            name={name}
            itemSchema={items[0] ?? {}}
            validationMessageProps={validationMessageProps}
          />
        );
      }

      if (items === true) {
        return appendValidationMessage(
          <ArrayField
            name={name}
            itemSchema={{ type: "string" }}
            validationMessageProps={validationMessageProps}
          />
        );
      }

      return appendValidationMessage(
        <ArrayField
          name={name}
          itemSchema={items}
          validationMessageProps={validationMessageProps}
        />
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
        return appendValidationMessage(
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
                <AutoField
                  name={`${name}.${key}`}
                  jsonProperty={value}
                  required={requiredKeys.has(key)}
                  validationMessageProps={validationMessageProps}
                />
            </li>
          ))}
        </ul>
      );
      }

      if ("additionalProperties" in schema) {
        return appendValidationMessage(
          <span className="text-muted-foreground">
            Record-style objects are not yet supported in AutoForm.
          </span>
        );
      }

      return appendValidationMessage(
        <span className="text-muted-foreground">{`{ }`}</span>
      );
    }

    case "string": {
      const format = Object.prototype.hasOwnProperty.call(schema, "format")
        ? (schema as { format?: string }).format
        : undefined;

      switch (format) {
        case "email":
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="email"
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />
          );
        case "uri":
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="url"
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />
          );
        case "date-time":
          if (isNativeDate) {
            return appendValidationMessage(
              <Controller
                control={control}
                name={name}
                rules={validationRules}
                render={({ field }) => (
                  <Input
                    id={inputId ?? name}
                    type="datetime-local"
                    value={formatDateTimeLocal(field.value)}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) {
                        field.onChange(undefined);
                        return;
                      }
                      field.onChange(parseDateTimeLocal(value));
                    }}
                    onBlur={field.onBlur}
                    aria-required={required}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              />
            );
          }
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="datetime-local"
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />
          );
        case "date":
          if (isNativeDate) {
            return appendValidationMessage(
              <Controller
                control={control}
                name={name}
                rules={validationRules}
                render={({ field }) => (
                  <Input
                    id={inputId ?? name}
                    type="date"
                    value={formatDateOnly(field.value)}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) {
                        field.onChange(undefined);
                        return;
                      }
                      field.onChange(parseDateOnly(value));
                    }}
                    onBlur={field.onBlur}
                    aria-required={required}
                    aria-invalid={invalid || undefined}
                    aria-describedby={describedBy}
                  />
                )}
              />
            );
          }
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="date"
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />
          );
        case "time":
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="time"
              step={1}
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />
          );
        default:
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="text"
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />
          );
      }
    }

    case "number":
    case "integer":
      return appendValidationMessage(
        <Input
          id={inputId ?? name}
          type="number"
          aria-required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          {...register(fieldName, {
            valueAsNumber: true,
            ...(validationRules ?? {}),
          })}
        />
      );

    case "boolean":
      return appendValidationMessage(
        <Controller
          control={control}
          name={name}
          rules={validationRules}
          render={({ field }) => (
            <Checkbox
              id={inputId ?? name}
              checked={Boolean(field.value)}
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
            />
          )}
        />
      );

    case "null":
      return appendValidationMessage(<span className="font-mono">null</span>);

    default:
      return <span>Unsupported field type: {JSON.stringify(schema)}</span>;
  }
};

function AnyOfTabs({
  parentName,
  options,
  required,
  validationMessageProps,
}: {
  parentName: string;
  options: Array<JsonProperty | _JSONSchema>;
  required?: boolean;
  validationMessageProps?: Partial<Omit<ValidationMessageProps, "name" | "id">>;
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
          <AutoField
            name={`${parentName}.__anyOf.${i}`}
            jsonProperty={opt}
            required={required}
            inputId={parentName}
            validationMessageProps={validationMessageProps}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

const padNumber = (value: number, length = 2) =>
  value.toString().padStart(length, "0");

function formatDateTimeLocal(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = padNumber(value.getMonth() + 1);
    const day = padNumber(value.getDate());
    const hours = padNumber(value.getHours());
    const minutes = padNumber(value.getMinutes());
    const seconds = padNumber(value.getSeconds());
    const milliseconds = value.getMilliseconds();

    let formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
    if (seconds !== 0 || milliseconds !== 0) {
      formatted += `:${padNumber(seconds)}`;
      if (milliseconds !== 0) {
        formatted += `.${padNumber(milliseconds, 3)}`;
      }
    }

    return formatted;
  }

  if (typeof value === "string") return value;
  return "";
}

function parseDateTimeLocal(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateOnly(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = padNumber(value.getMonth() + 1);
    const day = padNumber(value.getDate());
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string") return value;
  return "";
}

function parseDateOnly(value: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
