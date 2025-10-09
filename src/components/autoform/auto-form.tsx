import { useEffect, useMemo } from "react";
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
} from "react-hook-form";
import * as z from "zod";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DatePicker } from "../ui/date-picker";
import {
  ArrayFieldSchema,
  FieldSchema,
  FormSchema,
  RecordFieldSchema,
  UnionFieldSchema,
} from "./schemas";

const parseDateValue = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return undefined;
};

const extractTimeValue = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toTimeString().slice(0, 5);
  }

  if (typeof value === "string") {
    if (value.includes("T")) {
      const [, timePart] = value.split("T");
      if (timePart) {
        return timePart.slice(0, 5);
      }
    }

    if (/^\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 5);
    }
  }

  return undefined;
};

type AnyField = z.infer<typeof FieldSchema>;
type FormValues = Record<string, unknown>;

type UnionOptionsValue = {
  selected: number;
  options: unknown[];
};

const isValueMatchingField = (value: unknown, field: AnyField): boolean => {
  switch (field.type) {
    case "string":
    case "email":
    case "password":
    case "url":
    case "time":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
    case "date":
    case "datetime":
      return typeof value === "string" || value instanceof Date;
    case "array":
      return Array.isArray(value);
    case "object":
      return (
        Boolean(value) && typeof value === "object" && !Array.isArray(value)
      );
    case "union":
      return Boolean(value);
    case "record":
      return (
        Boolean(value) && typeof value === "object" && !Array.isArray(value)
      );
    default:
      return false;
  }
};

const buildDefaultValue = (field: AnyField, override?: unknown): unknown => {
  const fallback = override ?? ("default" in field ? field.default : undefined);

  switch (field.type) {
    case "string":
    case "email":
    case "password":
    case "url":
    case "time":
      return typeof fallback === "string" ? fallback : "";
    case "number": {
      if (typeof fallback === "number") {
        return fallback;
      }

      if (typeof fallback === "string" && fallback.trim() !== "") {
        const parsed = Number(fallback);
        return Number.isNaN(parsed) ? undefined : parsed;
      }

      return undefined;
    }
    case "boolean":
      return typeof fallback === "boolean" ? fallback : false;
    case "date":
      return parseDateValue(fallback);
    case "datetime":
      return {
        date: parseDateValue(fallback),
        time: extractTimeValue(fallback) ?? "",
      } satisfies { date?: Date; time?: string };
    case "object": {
      const defaultObject =
        (fallback && typeof fallback === "object" && !Array.isArray(fallback)
          ? (fallback as Record<string, unknown>)
          : {}) ?? {};

      return Object.entries(field.properties).reduce<Record<string, unknown>>(
        (acc, [key, subField]) => {
          acc[key] = buildDefaultValue(subField, defaultObject[key]);
          return acc;
        },
        {},
      );
    }
    case "array": {
      const source = Array.isArray(fallback)
        ? fallback
        : Array.isArray(field.default)
          ? field.default
          : [];
      return source.map((item) => buildDefaultValue(field.itemType, item));
    }
    case "record": {
      const source =
        (fallback && typeof fallback === "object" && !Array.isArray(fallback)
          ? (fallback as Record<string | number, unknown>)
          : field.default) ?? {};

      return Object.entries(source).map(([key, value]) => ({
        key,
        value: buildDefaultValue(field.valueType, value),
      }));
    }
    case "union": {
      const defaultOptions = field.anyOf.map((option) =>
        buildDefaultValue(option),
      );
      const result: UnionOptionsValue = {
        selected: 0,
        options: defaultOptions,
      };

      if (fallback !== undefined) {
        const matchedIndex = field.anyOf.findIndex((option) =>
          isValueMatchingField(fallback, option),
        );

        if (matchedIndex >= 0) {
          result.selected = matchedIndex;
          result.options[matchedIndex] = buildDefaultValue(
            field.anyOf[matchedIndex],
            fallback,
          );
        }
      }

      return result;
    }
    default:
      return undefined;
  }
};

const buildDefaultValues = (
  fields: Record<string, z.infer<typeof FieldSchema>>,
): FormValues => {
  return Object.entries(fields).reduce<FormValues>((acc, [key, field]) => {
    acc[key] = buildDefaultValue(field);
    return acc;
  }, {});
};

const createArrayItemDefault = (field: AnyField, override?: unknown) =>
  buildDefaultValue(field, override);

const createRecordEntryDefault = (
  field: z.infer<typeof RecordFieldSchema>,
): { key: string; value: unknown } => ({
  key: "",
  value: buildDefaultValue(field.valueType),
});

type AutoFormProps = {
  schema: z.infer<typeof FormSchema>;
  onSubmit?: (values: Record<string, unknown>) => void;
};

export const AutoForm = ({ schema, onSubmit }: AutoFormProps) => {
  const defaultValues = useMemo(
    () => buildDefaultValues(schema.fields),
    [schema.fields],
  );
  const form = useForm({
    defaultValues,
    mode: "onSubmit",
    shouldUnregister: false,
  });

  const handleSubmit = form.handleSubmit((values) => {
    if (onSubmit) {
      onSubmit(values);
    } else {
      // Having a default side-effect keeps the form ergonomic without forcing consumers to provide a handler.
      console.info("AutoForm submission", values);
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {schema.title && <h1>{schema.title}</h1>}
        {schema.description && <p>{schema.description}</p>}
        <div className="flex flex-col gap-4">
          {Object.entries(schema.fields).map(([key, field]) => (
            <AutoField key={key} field={field} name={key} />
          ))}
        </div>
      </form>
    </FormProvider>
  );
};

type AutoFieldProps = {
  field: z.infer<typeof FieldSchema>;
  name: string;
  showTitle?: boolean;
};

export const AutoField = ({
  field,
  name,
  showTitle = true,
}: AutoFieldProps) => {
  const { register, control, setValue, watch } = useFormContext();

  switch (field.type) {
    case "string":
    case "email":
    case "password":
    case "url":
      return (
        <WithErrorMessage errorMessage={field.errorMessage}>
          {showTitle && (
            <LabelWithRequired
              htmlFor={field.title}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          )}
          <Input
            type={field.type === "string" ? "text" : field.type}
            required={field.required}
            id={field.title}
            data-testid={field.testId}
            {...register(name, { required: field.required })}
          />
        </WithErrorMessage>
      );

    case "number":
      return (
        <WithErrorMessage errorMessage={field.errorMessage}>
          <LabelWithRequired
            htmlFor={field.title}
            required={field.required || false}
          >
            {field.title}
          </LabelWithRequired>
          <Input
            type="number"
            required={field.required}
            id={field.title}
            data-testid={field.testId}
            {...register(name, {
              required: field.required,
              setValueAs: (value) =>
                value === "" || value === null || value === undefined
                  ? undefined
                  : Number(value),
            })}
          />
        </WithErrorMessage>
      );

    case "date": {
      const controlId = `${field.title}-date`;
      const labelId = showTitle ? `${controlId}-label` : undefined;

      return (
        <WithErrorMessage errorMessage={field.errorMessage}>
          {showTitle && (
            <LabelWithRequired
              id={labelId}
              htmlFor={controlId}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          )}
          <Controller
            name={name}
            control={control}
            rules={{ required: field.required }}
            render={({ field: controllerField }) => (
              <DatePicker
                id={controlId}
                testId={field.testId}
                ariaLabel={!showTitle ? field.title : undefined}
                ariaLabelledBy={labelId}
                required={field.required}
                defaultValue={parseDateValue(controllerField.value)}
                onChange={(value) => controllerField.onChange(value)}
              />
            )}
          />
        </WithErrorMessage>
      );
    }

    case "time": {
      const controlId = field.title;

      return (
        <WithErrorMessage errorMessage={field.errorMessage}>
          {showTitle && (
            <LabelWithRequired
              htmlFor={controlId}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          )}
          <Input
            type="time"
            required={field.required}
            id={controlId}
            data-testid={field.testId}
            aria-label={!showTitle ? field.title : undefined}
            {...register(name, {
              required: field.required,
            })}
          />
        </WithErrorMessage>
      );
    }

    case "datetime": {
      const baseId = field.title;
      const dateControlId = `${baseId}-date`;
      const timeControlId = `${baseId}-time`;
      const labelId = showTitle ? `${baseId}-label` : undefined;

      return (
        <WithErrorMessage errorMessage={field.errorMessage}>
          {showTitle && (
            <LabelWithRequired
              id={labelId}
              htmlFor={dateControlId}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          )}
          <div className="flex flex-col gap-2 md:flex-row">
            <Controller
              name={`${name}.date`}
              control={control}
              rules={{ required: field.required }}
              render={({ field: controllerField }) => (
                <DatePicker
                  id={dateControlId}
                  testId={field.testId ? `${field.testId}-date` : undefined}
                  ariaLabel={!showTitle ? `${field.title} date` : undefined}
                  ariaLabelledBy={labelId}
                  required={field.required}
                  defaultValue={parseDateValue(controllerField.value)}
                  onChange={(value) => controllerField.onChange(value)}
                />
              )}
            />
            <Input
              type="time"
              required={field.required}
              id={timeControlId}
              data-testid={field.testId}
              aria-label={!showTitle ? `${field.title} time` : undefined}
              aria-labelledby={showTitle ? labelId : undefined}
              {...register(`${name}.time`, {
                required: field.required,
              })}
            />
          </div>
        </WithErrorMessage>
      );
    }

    case "boolean": {
      const controlId = field.title;

      return (
        <WithErrorMessage errorMessage={field.errorMessage}>
          <div className="flex items-center gap-2">
            <Controller
              name={name}
              control={control}
              rules={{ required: field.required }}
              render={({ field: controllerField }) => (
                <Checkbox
                  id={controlId}
                  data-testid={field.testId}
                  required={field.required}
                  checked={Boolean(controllerField.value)}
                  onCheckedChange={(next) =>
                    controllerField.onChange(Boolean(next))
                  }
                />
              )}
            />
            <LabelWithRequired
              htmlFor={controlId}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          </div>
        </WithErrorMessage>
      );
    }

    case "object":
      return (
        <div data-testid={field.testId} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            {field.title}{" "}
            {field.required && <RequiredIndicator required={field.required} />}
          </h2>
          {Object.entries(field.properties).map(([key, subField]) => (
            <div key={key} className="mb-1.5">
              <AutoField field={subField} name={`${name}.${key}`} />
            </div>
          ))}
        </div>
      );

    case "array":
      return <ArrayField name={name} field={field} />;

    case "union":
      return (
        <UnionField
          name={name}
          field={field}
          setValue={setValue}
          watch={watch}
        />
      );

    case "record":
      return <RecordField name={name} field={field} />;

    default:
      console.error("Reached default case in AutoField with field:", field);
      throw new Error(
        `Unsupported field type: ${(field as { type: string }).type}`,
      );
  }
};

type WithErrorMessageProps = {
  children: React.ReactNode;
  errorMessage: z.infer<typeof FieldSchema>["errorMessage"];
  testId?: string;
};

const WithErrorMessage = ({
  children,
  errorMessage,
  testId,
}: WithErrorMessageProps) => (
  <div className="flex flex-col gap-1.5" data-testid={testId}>
    {children}
    {errorMessage && <span className="text-red-500">{errorMessage}</span>}
  </div>
);

const LabelWithRequired = ({
  required,
  children,
  ...props
}: React.ComponentProps<typeof Label> & { required: boolean }) => (
  <Label className="flex items-center gap-1" {...props}>
    {children}
    {required && <RequiredIndicator required={required} />}
  </Label>
);

const RequiredIndicator = ({ required }: { required: boolean }) =>
  required ? <span className="text-red-500">*</span> : null;

type ArrayFieldProps = {
  field: z.infer<typeof ArrayFieldSchema>;
  name: string;
};

const ArrayField = ({ field, name }: ArrayFieldProps) => {
  const { control, watch } = useFormContext();
  const {
    fields: arrayFields,
    append,
    remove,
    replace,
  } = useFieldArray({ control, name });
  const watchedItems = watch(name) as unknown[] | undefined;

  useEffect(() => {
    if (arrayFields.length > 0) {
      return;
    }

    if (Array.isArray(watchedItems) && watchedItems.length > 0) {
      replace(watchedItems);
      return;
    }

    if (Array.isArray(field.default) && field.default.length > 0) {
      replace(
        field.default.map((item) =>
          createArrayItemDefault(field.itemType, item),
        ),
      );
    }
  }, [
    arrayFields.length,
    field.default,
    field.itemType,
    replace,
    watchedItems,
  ]);

  const addItem = () => {
    append(createArrayItemDefault(field.itemType));
  };

  return (
    <WithErrorMessage errorMessage={field.errorMessage} testId={field.testId}>
      <LabelWithRequired
        htmlFor={field.title}
        required={field.required || false}
      >
        {field.title}
      </LabelWithRequired>

      <div className="flex flex-col gap-1">
        {arrayFields.map((item, index) => (
          <div key={item.id} className="flex gap-2">
            <div className="flex-1">
              <AutoField
                field={field.itemType as z.infer<typeof FieldSchema>}
                name={`${name}.${index}`}
                showTitle={false}
              />
            </div>
            <Button
              type="button"
              onClick={() => remove(index)}
              variant="ghost"
              className="mt-auto hover:bg-destructive/90 hover:text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            >
              Remove
            </Button>
          </div>
        ))}

        {arrayFields.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No items yet. Use "Add item" to create one.
          </span>
        )}
      </div>

      <Button type="button" variant="outline" onClick={addItem}>
        Add item
      </Button>
    </WithErrorMessage>
  );
};

type UnionFieldProps = {
  field: z.infer<typeof UnionFieldSchema>;
  name: string;
  setValue: ReturnType<typeof useFormContext>["setValue"];
  watch: ReturnType<typeof useFormContext>["watch"];
};

const UnionField = ({ field, name, setValue, watch }: UnionFieldProps) => {
  const selectedIndex = watch(`${name}.selected`) ?? 0;
  const activeIndex =
    typeof selectedIndex === "number" ? selectedIndex : Number(selectedIndex);
  const tabValue = activeIndex.toString();

  return (
    <WithErrorMessage errorMessage={field.errorMessage} testId={field.testId}>
      <Tabs
        defaultValue={tabValue}
        value={tabValue}
        onValueChange={(value) => setValue(`${name}.selected`, Number(value))}
      >
        <TabsList>
          {field.anyOf.map((option, index) => (
            <TabsTrigger key={option.title} value={index.toString()}>
              {option.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          {field.anyOf.map((option, index) => (
            <TabsContent key={option.title} value={index.toString()}>
              <AutoField field={option} name={`${name}.options.${index}`} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </WithErrorMessage>
  );
};

type RecordFieldProps = {
  field: z.infer<typeof RecordFieldSchema>;
  name: string;
};

const RecordField = ({ field, name }: RecordFieldProps) => {
  const { control, register } = useFormContext();
  const {
    fields: keyValuePairs,
    append,
    remove,
  } = useFieldArray({ name, control });

  const addKeyValuePair = () => {
    append(createRecordEntryDefault(field));
  };

  return (
    <WithErrorMessage errorMessage={field.errorMessage} testId={field.testId}>
      <LabelWithRequired
        htmlFor={field.title}
        required={field.required || false}
      >
        {field.title}
      </LabelWithRequired>

      <div className="flex flex-col gap-1">
        {keyValuePairs.map((pair, index) => (
          <div key={pair.id} className="flex gap-2">
            <div className="flex-1">
              <Input
                type={field.keyType === "number" ? "number" : "text"}
                {...register(`${name}.${index}.key`, {
                  setValueAs: (value) =>
                    field.keyType === "number"
                      ? value === "" || value === undefined
                        ? ""
                        : value
                      : value,
                })}
                placeholder={field.keyType === "number" ? "Numeric key" : "Key"}
              />
            </div>
            <div className="flex-1">
              <AutoField
                field={field.valueType}
                name={`${name}.${index}.value`}
                showTitle={false}
              />
            </div>
            <Button
              type="button"
              onClick={() => remove(index)}
              variant="ghost"
              className="mt-auto hover:bg-destructive/90 hover:text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            >
              Remove
            </Button>
          </div>
        ))}

        {keyValuePairs.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No entries yet. Use "Add entry" to create one.
          </span>
        )}
      </div>

      <Button type="button" variant="outline" onClick={addKeyValuePair}>
        Add entry
      </Button>
    </WithErrorMessage>
  );
};
