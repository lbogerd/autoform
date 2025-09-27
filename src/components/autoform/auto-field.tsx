import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useFormState,
  useWatch,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import type { _JSONSchema } from "node_modules/zod/v4/core/json-schema.d.cts";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  ValidationMessage,
  type ValidationMessageProps,
} from "../ui/validation-message";
import type { JsonProperty } from "./types";

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
      />,
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
          <span className="text-muted-foreground">[]</span>,
        );
      }

      if (Array.isArray(items)) {
        return appendValidationMessage(
          <ArrayField
            name={name}
            itemSchema={items[0] ?? {}}
            validationMessageProps={validationMessageProps}
          />,
        );
      }

      if (items === true) {
        return appendValidationMessage(
          <ArrayField
            name={name}
            itemSchema={{ type: "string" }}
            validationMessageProps={validationMessageProps}
          />,
        );
      }

      return appendValidationMessage(
        <ArrayField
          name={name}
          itemSchema={items}
          validationMessageProps={validationMessageProps}
        />,
      );
    }

    case "object": {
      const objectSchema = schema as {
        properties?: Record<string, JsonProperty | _JSONSchema>;
        required?: string[];
        additionalProperties?: JsonProperty | _JSONSchema | boolean;
      };
      const propertyEntries = Object.entries(objectSchema.properties ?? {});
      const propertyKeys = propertyEntries.map(([key]) => key);
      const hasStaticProps = propertyEntries.length > 0;
      const requiredKeys = new Set(objectSchema.required ?? []);
      const additionalSchema =
        objectSchema.additionalProperties === undefined ||
        objectSchema.additionalProperties === false
          ? undefined
          : objectSchema.additionalProperties === true
            ? { type: "string" }
            : objectSchema.additionalProperties;

      if (!hasStaticProps && !additionalSchema) {
        return appendValidationMessage(
          <span className="text-muted-foreground">{`{ }`}</span>,
        );
      }

      return appendValidationMessage(
        <div className="space-y-3 rounded-md border p-4">
          {hasStaticProps ? (
            <ul className="space-y-3">
              {propertyEntries.map(([key, value]) => (
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
          ) : null}
          {additionalSchema ? (
            <AdditionalPropertiesField
              parentName={name}
              schema={additionalSchema as JsonProperty | _JSONSchema}
              reservedKeys={propertyKeys}
              validationMessageProps={validationMessageProps}
            />
          ) : null}
        </div>,
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
            />,
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
            />,
          );
        case "date-time":
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="datetime-local"
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />,
          );
        case "date":
          return appendValidationMessage(
            <Input
              id={inputId ?? name}
              type="date"
              aria-required={required}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register(fieldName, validationRules)}
            />,
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
            />,
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
            />,
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
        />,
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
        />,
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

function AdditionalPropertiesField({
  parentName,
  schema,
  reservedKeys,
  validationMessageProps,
}: {
  parentName: string;
  schema: JsonProperty | _JSONSchema;
  reservedKeys: string[];
  validationMessageProps?: Partial<Omit<ValidationMessageProps, "name" | "id">>;
}) {
  const [newKey, setNewKey] = useState("");
  const resolvedSchema = useMemo(() => resolveSchema(schema), [schema]);
  const { getValues, setValue } = useFormContext<FieldValues>();
  const watchedValue = useWatch({ name: parentName });
  const addInputId = useMemo(
    () => `${parentName}.__newKey`.replace(/[^a-zA-Z0-9_-]+/g, "-"),
    [parentName],
  );

  useEffect(() => {
    if (
      watchedValue == null ||
      typeof watchedValue !== "object" ||
      Array.isArray(watchedValue)
    ) {
      setValue(parentName, {}, { shouldDirty: false, shouldTouch: false });
    }
  }, [parentName, setValue, watchedValue]);

  const reservedSet = useMemo(() => new Set(reservedKeys), [reservedKeys]);

  const dynamicKeys = useMemo(() => {
    if (!watchedValue || typeof watchedValue !== "object") return [];
    return Object.keys(watchedValue as Record<string, unknown>).filter(
      (key) => !reservedSet.has(key) && !key.startsWith("__"),
    );
  }, [reservedSet, watchedValue]);

  const existingKeySet = useMemo(() => {
    const set = new Set(reservedKeys);
    for (const key of dynamicKeys) set.add(key);
    return set;
  }, [reservedKeys, dynamicKeys]);

  const trimmedKey = newKey.trim();
  const keyInvalid =
    trimmedKey.length === 0 ||
    /[.[\]]/.test(trimmedKey) ||
    trimmedKey.startsWith("__") ||
    existingKeySet.has(trimmedKey);

  const handleAdd = () => {
    if (keyInvalid) return;
    const current =
      (getValues(parentName) as Record<string, unknown> | undefined) ?? {};
    const next = {
      ...current,
      [trimmedKey]: getDefaultValueForSchema(resolvedSchema),
    };
    setValue(parentName, next, { shouldDirty: true, shouldTouch: false });
    setNewKey("");
  };

  const handleRemove = (key: string) => {
    const current =
      (getValues(parentName) as Record<string, unknown> | undefined) ?? {};
    if (!(key in current)) return;
    const { [key]: _removed, ...rest } = current;
    setValue(parentName, rest, { shouldDirty: true, shouldTouch: true });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor={addInputId} className="text-sm font-medium">
            Add property
          </label>
          <Input
            id={addInputId}
            value={newKey}
            placeholder="Key name"
            onChange={(event) => setNewKey(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAdd}
          disabled={keyInvalid}
        >
          Add
        </Button>
      </div>
      {dynamicKeys.length > 0 ? (
        <ul className="space-y-3">
          {dynamicKeys.map((key) => (
            <li key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`${parentName}.${key}`}
                  className="text-sm font-medium"
                >
                  {key}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleRemove(key)}
                >
                  Remove
                </Button>
              </div>
              <AutoField
                name={`${parentName}.${key}`}
                jsonProperty={schema}
                inputId={`${parentName}.${key}`}
                validationMessageProps={validationMessageProps}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
