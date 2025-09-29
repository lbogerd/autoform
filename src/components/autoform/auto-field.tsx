import { useEffect, useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AlertOctagonIcon } from "lucide-react";

const ValidationErrorMessage = ({ message }: { message?: string }) => {
  if (!message) return null;

  return (
    <div
      className="rounded-md bg-red-50 p-4 flex gap-2 mt-1 items-center"
      data-testid="validation-error"
    >
      <AlertOctagonIcon className="h-5 w-5 text-red-400" />
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
};

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
  validationError,
}: {
  name: string;
  itemSchema: JsonProperty | _JSONSchema;
  validationError?: string;
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
                validationError={validationError}
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
  validationError,
}: {
  name: string;
  jsonProperty: JsonProperty | _JSONSchema;
  required?: boolean;
  inputId?: string;
  validationError?: string;
}) => {
  const { control, register } = useFormContext<FieldValues>();

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
        validationError={validationError}
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

    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selected = options.find((option) =>
            Object.is(option.value, field.value)
          );

          return (
            <>
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
              <ValidationErrorMessage message={validationError} />
            </>
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
        return <span className="text-muted-foreground">[]</span>;
      }

      if (Array.isArray(items)) {
        return (
          <ArrayField
            name={name}
            itemSchema={items[0] ?? {}}
            validationError={validationError}
          />
        );
      }

      if (items === true) {
        return (
          <ArrayField
            name={name}
            itemSchema={{ type: "string" }}
            validationError={validationError}
          />
        );
      }

      return (
        <ArrayField
          name={name}
          itemSchema={items}
          validationError={validationError}
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
                <AutoField
                  name={`${name}.${key}`}
                  jsonProperty={value}
                  required={requiredKeys.has(key)}
                  validationError={validationError}
                />
              </li>
            ))}
          </ul>
        );
      }

      if ("additionalProperties" in schema) {
        return (
          <span className="text-muted-foreground">
            Record-style objects are not yet supported in AutoForm.
          </span>
        );
      }

      return <span className="text-muted-foreground">{`{ }`}</span>;
    }

    case "string": {
      const format = Object.prototype.hasOwnProperty.call(schema, "format")
        ? (schema as { format?: string }).format
        : undefined;

      switch (format) {
        case "email":
          return (
            <>
              <Input
                id={inputId ?? name}
                type="email"
                aria-required={required}
                {...register(name)}
              />
              <ValidationErrorMessage message={validationError} />
            </>
          );
        case "uri":
          return (
            <>
              <Input
                id={inputId ?? name}
                type="url"
                aria-required={required}
                {...register(name)}
              />
              <ValidationErrorMessage message={validationError} />
            </>
          );
        case "date-time":
          return (
            <>
              <Input
                id={inputId ?? name}
                type="datetime-local"
                aria-required={required}
                {...register(name)}
              />
              <ValidationErrorMessage message={validationError} />
            </>
          );
        case "date":
          return (
            <>
              <Input
                id={inputId ?? name}
                type="date"
                aria-required={required}
                {...register(name)}
              />
              <ValidationErrorMessage message={validationError} />
            </>
          );
        case "time":
          return (
            <>
              <Input
                id={inputId ?? name}
                type="time"
                step={1}
                aria-required={required}
                {...register(name)}
              />
              <ValidationErrorMessage message={validationError} />
            </>
          );
        default:
          return (
            <>
              <Input
                id={inputId ?? name}
                type="text"
                aria-required={required}
                {...register(name)}
              />
              <ValidationErrorMessage message={validationError} />
            </>
          );
      }
    }

    case "number":
    case "integer":
      return (
        <>
          <Input
            id={inputId ?? name}
            type="number"
            aria-required={required}
            {...register(name, { valueAsNumber: true })}
          />
          <ValidationErrorMessage message={validationError} />
        </>
      );

    case "boolean":
      return (
        <Controller
          control={control}
          name={name}
          render={({ field }) => (
            <>
              <Checkbox
                id={inputId ?? name}
                checked={Boolean(field.value)}
                aria-required={required}
                onCheckedChange={(checked) => field.onChange(Boolean(checked))}
              />
              <ValidationErrorMessage message={validationError} />
            </>
          )}
        />
      );

    case "null":
      return <span className="font-mono">null</span>;

    default:
      return <span>Unsupported field type: {JSON.stringify(schema)}</span>;
  }
};

function AnyOfTabs({
  parentName,
  options,
  required,
  validationError,
}: {
  parentName: string;
  options: Array<JsonProperty | _JSONSchema>;
  required?: boolean;
  validationError?: string;
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
            validationError={validationError}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
