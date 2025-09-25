import { useEffect, useMemo } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
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

const resolveSchema = (
  schema: JsonProperty | _JSONSchema,
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
  schema: JsonProperty | _JSONSchema,
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
}: {
  name: string;
  itemSchema: JsonProperty | _JSONSchema;
}) => {
  const resolvedItemSchema = useMemo(
    () => resolveSchema(itemSchema),
    [itemSchema],
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
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => remove(index)}
            >
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
}: {
  name: string;
  jsonProperty: JsonProperty | _JSONSchema;
  required?: boolean;
}) => {
  const schema = resolveSchema(jsonProperty);
  const { control, register } = useFormContext<FieldValues>();

  if (typeof schema !== "object" || schema === null) {
    return <span>Invalid property schema: {JSON.stringify(schema)}</span>;
  }

  if (!("type" in schema)) {
    return <span>No type found: {JSON.stringify(schema)}</span>;
  }

  if ("enum" in schema && Array.isArray(schema.enum) && schema.enum.length > 0) {
    const options = schema.enum.map((option) => ({
      key: String(option),
      value: option,
    }));

    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selected = options.find((option) =>
            Object.is(option.value, field.value),
          );

          return (
            <Select
              value={selected?.key ?? ""}
              onValueChange={(value) => {
                const match = options.find((option) => option.key === value);
                field.onChange(match?.value ?? value);
              }}
            >
              <SelectTrigger aria-required={required}>
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
      const items = (schema as {
        items?: JsonProperty | JsonProperty[] | true;
      }).items;

      if (!items) {
        return <span className="text-muted-foreground">[]</span>;
      }

      if (Array.isArray(items)) {
        return <HookArrayField name={name} itemSchema={items[0] ?? {}} />;
      }

      if (items === true) {
        return <HookArrayField name={name} itemSchema={{ type: "string" }} />;
      }

      return <HookArrayField name={name} itemSchema={items} />;
    }

    case "object": {
      const properties = (schema as {
        properties?: Record<string, JsonProperty | _JSONSchema>;
        required?: string[];
        additionalProperties?: unknown;
      }).properties;
      const requiredKeys = new Set(
        (schema as { required?: string[] }).required ?? [],
      );

      if (properties && Object.keys(properties).length > 0) {
        return (
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
                />
              </li>
            ))}
          </ul>
        );
      }

      if ("additionalProperties" in schema) {
        return (
          <span className="text-muted-foreground">
            Record-style objects are not yet supported in HookAutoForm.
          </span>
        );
      }

      return <span className="text-muted-foreground">{`{ }`}</span>;
    }

    case "string": {
      const format =
        Object.prototype.hasOwnProperty.call(schema, "format")
          ? (schema as { format?: string }).format
          : undefined;

      switch (format) {
        case "email":
          return (
            <Input
              id={name}
              type="email"
              aria-required={required}
              {...register(name)}
            />
          );
        case "uri":
          return (
            <Input
              id={name}
              type="url"
              aria-required={required}
              {...register(name)}
            />
          );
        case "date-time":
          return (
            <Input
              id={name}
              type="datetime-local"
              aria-required={required}
              {...register(name)}
            />
          );
        case "date":
          return (
            <Input
              id={name}
              type="date"
              aria-required={required}
              {...register(name)}
            />
          );
        case "time":
          return (
            <Input
              id={name}
              type="time"
              step={1}
              aria-required={required}
              {...register(name)}
            />
          );
        default:
          return (
            <Input
              id={name}
              type="text"
              aria-required={required}
              {...register(name)}
            />
          );
      }
    }

    case "number":
    case "integer":
      return (
        <Input
          id={name}
          type="number"
          aria-required={required}
          {...register(name, { valueAsNumber: true })}
        />
      );

    case "boolean":
      return (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <Checkbox
              id={name}
              checked={Boolean(field.value)}
              aria-required={required}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
            />
          )}
        />
      );

    case "null":
      return <span className="font-mono">null</span>;

    default:
      return (
        <span>Unsupported field type: {JSON.stringify(schema)}</span>
      );
  }
};
