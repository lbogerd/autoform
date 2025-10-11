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
} from "../../lib/auto-form/schemas";
import {
  buildDefaultValues,
  normalizeFormValues,
  validateFormValues,
  buildControlId,
  createArrayItemDefault,
  createRecordEntryDefault,
} from "../../lib/auto-form/utils";

type AutoFormProps = {
  schema: z.infer<typeof FormSchema>;
  onSubmit?: (values: Record<string, unknown>) => void;
  children?: React.ReactNode;
};

/**
 * High-level form generator that renders inputs based on a declarative schema.
 *
 * @param schema - Zod-backed description of the form fields.
 * @param onSubmit - Optional callback invoked with normalized field values.
 */
export const AutoForm = ({ schema, onSubmit, children }: AutoFormProps) => {
  const defaultValues = useMemo(
    () => buildDefaultValues(schema.fields),
    [schema.fields]
  );
  const form = useForm({
    defaultValues,
    mode: "onSubmit",
    shouldUnregister: false,
  });

  const submitWithValidation = form.handleSubmit((values) => {
    const normalizedValues = normalizeFormValues(values, schema.fields);

    const issues = validateFormValues(normalizedValues, schema.fields);

    if (issues.length > 0) {
      issues.forEach((issue) => {
        const fieldName = issue.path.join(".");
        form.setError(fieldName as never, {
          type: "manual",
          message: issue.message,
        });
      });
      return;
    }

    if (onSubmit) {
      onSubmit(normalizedValues);
    } else {
      // Having a default side-effect keeps the form ergonomic without forcing consumers to provide a handler.
      console.info("AutoForm submission", normalizedValues);
    }
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    form.clearErrors();
    return submitWithValidation(event);
  };

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {schema.title && <h1>{schema.title}</h1>}
        {schema.description && <p>{schema.description}</p>}
        <div className="flex flex-col gap-4">
          {Object.entries(schema.fields).map(([key, field]) => (
            <AutoField key={key} field={field} name={key} />
          ))}
        </div>

        {children}
      </form>
    </FormProvider>
  );
};

type AutoFieldProps = {
  field: z.infer<typeof FieldSchema>;
  name: string;
  showTitle?: boolean;
};

/**
 * Renders a single field component appropriate for the provided schema definition.
 *
 * This component delegates to more specialized renderers for composite field types.
 */
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
    case "url": {
      const controlId = buildControlId(name);

      return (
        <WithErrorMessage name={name} errorMessage={field.errorMessage}>
          {showTitle && (
            <LabelWithRequired
              htmlFor={controlId}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          )}
          <Input
            type={field.type === "string" ? "text" : field.type}
            required={field.required}
            id={controlId}
            data-testid={field.testId}
            {...register(name, { required: field.required })}
          />
        </WithErrorMessage>
      );
    }

    case "number": {
      const controlId = buildControlId(name);

      return (
        <WithErrorMessage name={name} errorMessage={field.errorMessage}>
          <LabelWithRequired
            htmlFor={controlId}
            required={field.required || false}
          >
            {field.title}
          </LabelWithRequired>
          <Input
            type="number"
            required={field.required}
            id={controlId}
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
    }

    case "date": {
      const controlId = buildControlId(name);
      const labelId = showTitle ? `${controlId}-label` : undefined;

      return (
        <WithErrorMessage name={name} errorMessage={field.errorMessage}>
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
                value={(controllerField.value as string | undefined) ?? ""}
                name={controllerField.name}
                onBlur={controllerField.onBlur}
                inputRef={controllerField.ref}
                onChange={(value) => controllerField.onChange(value)}
              />
            )}
          />
        </WithErrorMessage>
      );
    }

    case "time": {
      const controlId = buildControlId(name);

      return (
        <WithErrorMessage name={name} errorMessage={field.errorMessage}>
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
      const baseId = buildControlId(name);
      const dateControlId = `${baseId}-date`;
      const timeControlId = `${baseId}-time`;
      const labelId = showTitle ? `${baseId}-label` : undefined;

      return (
        <WithErrorMessage name={name} errorMessage={field.errorMessage}>
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
                  value={(controllerField.value as string | undefined) ?? ""}
                  name={controllerField.name}
                  onBlur={controllerField.onBlur}
                  inputRef={controllerField.ref}
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
      const controlId = buildControlId(name);

      return (
        <WithErrorMessage name={name} errorMessage={field.errorMessage}>
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
        `Unsupported field type: ${(field as { type: string }).type}`
      );
  }
};

type WithErrorMessageProps = {
  children: React.ReactNode;
  errorMessage: z.infer<typeof FieldSchema>["errorMessage"];
  name?: string;
  testId?: string;
};

const getErrorMessageForField = (
  errors: Record<string, unknown>,
  name?: string
): string | undefined => {
  if (!name) {
    return undefined;
  }

  const segments = name.split(".");
  let current: unknown = errors;

  for (const segment of segments) {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (Number.isNaN(index)) {
        return undefined;
      }

      current = current[index];
      continue;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (!current || typeof current !== "object") {
    return undefined;
  }

  const message = (current as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
};

/**
 * Wrapper that consistently displays validation messages beneath form controls.
 */
const WithErrorMessage = ({
  children,
  errorMessage,
  name,
  testId,
}: WithErrorMessageProps) => {
  const { formState } = useFormContext();
  const resolvedMessage =
    getErrorMessageForField(formState.errors as Record<string, unknown>, name) ??
    errorMessage;

  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      {children}
      {resolvedMessage && (
        <span className="text-red-500">{resolvedMessage}</span>
      )}
    </div>
  );
};

/**
 * Combines a standard label with an optional required indicator.
 */
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

/**
 * Visual indicator appended to labels when a field is required.
 */
const RequiredIndicator = ({ required }: { required: boolean }) =>
  required ? <span className="text-red-500">*</span> : null;

type ArrayFieldProps = {
  field: z.infer<typeof ArrayFieldSchema>;
  name: string;
};

/**
 * Handles rendering and state management for repeating fields (arrays).
 */
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
    // Ensure array fields have at least their default entries when the form initializes.
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
          createArrayItemDefault(field.itemType, item)
        )
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
    <WithErrorMessage
      name={name}
      errorMessage={field.errorMessage}
      testId={field.testId}
    >
      <LabelWithRequired required={field.required || false}>
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

/**
 * Renders a union as a tab list, allowing the user to switch between alternatives.
 */
const UnionField = ({ field, name, setValue, watch }: UnionFieldProps) => {
  const selectedIndex = watch(`${name}.selected`) ?? 0;
  const activeIndex =
    typeof selectedIndex === "number" ? selectedIndex : Number(selectedIndex);
  const tabValue = activeIndex.toString();
  const activeErrorPath = `${name}.options.${activeIndex}`;

  return (
    <WithErrorMessage
      name={activeErrorPath}
      errorMessage={field.errorMessage}
      testId={field.testId}
    >
      <Tabs
        defaultValue={tabValue}
        value={tabValue}
        // Sync the selected tab back into the form state so only the active option is submitted.
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

/**
 * Renders a key/value collection while maintaining compatibility with React Hook Form.
 */
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
    <WithErrorMessage
      name={name}
      errorMessage={field.errorMessage}
      testId={field.testId}
    >
      <LabelWithRequired required={field.required || false}>
        {field.title}
      </LabelWithRequired>

      <div className="flex flex-col gap-1">
        {keyValuePairs.map((pair, index) => {
          const keyControlId = buildControlId(`${name}.${index}.key`);

          return (
            <div key={pair.id} className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1.5">
                <Label htmlFor={keyControlId}>Key</Label>
                <Input
                  id={keyControlId}
                  type={field.keyType === "number" ? "number" : "text"}
                  {...register(`${name}.${index}.key`, {
                    setValueAs: (value) =>
                      field.keyType === "number"
                        ? value === "" || value === undefined
                          ? ""
                          : value
                        : value,
                  })}
                  placeholder={
                    field.keyType === "number" ? "Numeric key" : "Key"
                  }
                />
              </div>
              <div className="flex-1">
                <AutoField
                  field={field.valueType}
                  name={`${name}.${index}.value`}
                  showTitle={true}
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
          );
        })}

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
