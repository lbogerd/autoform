import { useState } from "react";
import * as z from "zod";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FieldSchema, FormSchema } from "./schemas";

export const AutoForm = ({
  schema,
}: {
  schema: z.infer<typeof FormSchema>;
}) => {
  return (
    <form>
      {schema.title && <h1>{schema.title}</h1>}
      {schema.description && <p>{schema.description}</p>}
      <div className="flex flex-col gap-4">
        {Object.entries(schema.fields).map(([key, field]) => (
          <AutoField key={key} field={field} />
        ))}
      </div>
    </form>
  );
};

export const AutoField = ({
  field,
  showTitle = true,
}: {
  field: z.infer<typeof FieldSchema>;
  showTitle?: boolean;
}) => {
  switch (field.type) {
    case "string":
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
          <Input type="text" required={field.required} id={field.title} />
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
          <Input type="number" required={field.required} id={field.title} />
        </WithErrorMessage>
      );

    case "boolean":
      return (
        <div>
          <div className="flex items-center gap-2">
            <Checkbox
              defaultChecked={field.default as boolean}
              required={field.required}
              id={field.title}
            />
            <LabelWithRequired
              htmlFor={field.title}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          </div>
          {field.errorMessage && (
            <span className="text-red-500">{field.errorMessage}</span>
          )}
        </div>
      );

    case "object":
      return (
        <div>
          <h2>
            {field.title}{" "}
            {field.required && <RequiredIndicator required={field.required} />}
          </h2>
          {Object.entries(field.properties).map(([key, subField]) => (
            <div key={key} className="mb-1.5">
              <AutoField field={subField} />
            </div>
          ))}
        </div>
      );

    case "array":
      return <ArrayFieldRenderer field={field} />;

    default:
      return <div>Unsupported field type: {field.type}</div>;
  }
};

const WithErrorMessage = ({
  children,
  errorMessage,
}: {
  children: React.ReactNode;
  errorMessage: z.infer<typeof FieldSchema>["errorMessage"];
}) => (
  <div className="flex flex-col gap-1.5">
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

type ArrayField = Extract<z.infer<typeof FieldSchema>, { type: "array" }>;

const ArrayFieldRenderer = ({ field }: { field: ArrayField }) => {
  const [items, setItems] = useState<
    Array<{ id: number; defaultValue: unknown }>
  >(() =>
    Array.isArray(field.default)
      ? field.default.map((value, index) => ({
          id: index,
          defaultValue: value,
        }))
      : []
  );

  const addItem = () => {
    setItems((prev) => {
      const nextId = prev.reduce((max, item) => Math.max(max, item.id), -1) + 1;
      return [...prev, { id: nextId, defaultValue: undefined }];
    });
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <WithErrorMessage errorMessage={field.errorMessage}>
      <LabelWithRequired
        htmlFor={field.title}
        required={field.required || false}
      >
        {field.title}
      </LabelWithRequired>

      <div className="flex flex-col gap-1">
        {items.map((item) => {
          const itemField = {
            ...field.itemType,
            default:
              item.defaultValue ??
              (field.itemType as { default?: unknown }).default,
          } as z.infer<typeof FieldSchema>;

          return (
            <div key={item.id} className="flex gap-2">
              <div className="flex-1">
                <AutoField field={itemField} showTitle={false} />
              </div>
              <Button
                type="button"
                onClick={() => removeItem(item.id)}
                variant={"ghost"}
                className="mt-auto hover:bg-destructive/90 hover:text-white focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
              >
                Remove
              </Button>
            </div>
          );
        })}

        {items.length === 0 && (
          <span className="text-sm text-muted-foreground">
            No items yet. Use "Add item" to create one.
          </span>
        )}
      </div>

      <Button type="button" variant={"outline"} onClick={addItem}>
        Add item
      </Button>
    </WithErrorMessage>
  );
};
