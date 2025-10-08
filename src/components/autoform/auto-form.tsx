import { useState } from "react";
import * as z from "zod";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  ArrayFieldSchema,
  FieldSchema,
  FormSchema,
  UnionFieldSchema,
  RecordFieldSchema,
} from "./schemas";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

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
          <Input
            type="text"
            required={field.required}
            id={field.title}
            data-testid={field.testId}
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
          />
        </WithErrorMessage>
      );

    case "boolean":
      return (
        <WithErrorMessage errorMessage={field.errorMessage}>
          <div className="flex items-center gap-2">
            <Checkbox
              defaultChecked={field.default as boolean}
              required={field.required}
              id={field.title}
              data-testid={field.testId}
            />
            <LabelWithRequired
              htmlFor={field.title}
              required={field.required || false}
            >
              {field.title}
            </LabelWithRequired>
          </div>
        </WithErrorMessage>
      );

    case "object":
      return (
        <div data-testid={field.testId}>
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
      return <ArrayField field={field} />;

    case "union":
      return <UnionField field={field} />;

    case "record":
      return <RecordField field={field} />;

    default:
      return null;
  }
};

const WithErrorMessage = ({
  children,
  errorMessage,
  testId,
}: {
  children: React.ReactNode;
  errorMessage: z.infer<typeof FieldSchema>["errorMessage"];
  testId?: string;
}) => (
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

const ArrayField = ({ field }: { field: z.infer<typeof ArrayFieldSchema> }) => {
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
      // find the next available id by getting the max current id and adding 1
      const nextId = prev.reduce((max, item) => Math.max(max, item.id), -1) + 1;
      return [...prev, { id: nextId, defaultValue: undefined }];
    });
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
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
        {items.map((item) => {
          const itemField = {
            ...field.itemType,
            // override the default value with the item's defaultValue if present
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

const UnionField = ({ field }: { field: z.infer<typeof UnionFieldSchema> }) => {
  return (
    <WithErrorMessage errorMessage={field.errorMessage} testId={field.testId}>
      <Tabs defaultValue={field.anyOf[0]?.title}>
        <TabsList>
          {field.anyOf.map((option) => (
            <TabsTrigger key={option.title} value={option.title}>
              {option.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          {field.anyOf.map((option) => (
            <TabsContent key={option.title} value={option.title}>
              <AutoField field={option} />
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </WithErrorMessage>
  );
};

const RecordField = ({
  field,
}: {
  field: z.infer<typeof RecordFieldSchema>;
}) => {
  const [keyValuePairs, setKeyValuePairs] = useState<
    Array<{ id: number; key: string; value: unknown }>
  >(() =>
    Object.entries(field.default || {}).map(([key, value], index) => ({
      id: index,
      key,
      value,
    }))
  );

  const addKeyValuePair = () => {
    setKeyValuePairs((prev) => {
      const nextId = prev.reduce((max, pair) => Math.max(max, pair.id), -1) + 1;
      return [
        ...prev,
        {
          id: nextId,
          key: "",
          value: (field.valueType as { default?: unknown }).default,
        },
      ];
    });
  };

  const removeKeyValuePair = (id: number) => {
    setKeyValuePairs((prev) => prev.filter((pair) => pair.id !== id));
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
        {keyValuePairs.map((pair) => {
          const valueField = {
            ...field.valueType,
            default:
              pair.value ?? (field.valueType as { default?: unknown }).default,
          } as z.infer<typeof FieldSchema>;

          return (
            <div key={pair.id} className="flex gap-2">
              <div className="flex-1">
                <Input
                  type={field.keyType === "number" ? "number" : "text"}
                  value={pair.key}
                  onChange={(e) =>
                    setKeyValuePairs((prev) =>
                      prev.map((p) =>
                        p.id === pair.id ? { ...p, key: e.target.value } : p
                      )
                    )
                  }
                  placeholder={
                    field.keyType === "number" ? "Numeric key" : "Key"
                  }
                />
              </div>
              <div className="flex-1">
                <AutoField field={valueField} showTitle={false} />
              </div>
              <Button
                type="button"
                onClick={() => removeKeyValuePair(pair.id)}
                variant={"ghost"}
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

      <Button type="button" variant={"outline"} onClick={addKeyValuePair}>
        Add entry
      </Button>
    </WithErrorMessage>
  );
};
