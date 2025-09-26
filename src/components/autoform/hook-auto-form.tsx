import { useState } from "react";
import { FormProvider, useForm, type FieldValues } from "react-hook-form";

import { Button } from "../ui/button";
import { HookAutoField } from "./hook-auto-field";
import { replaceRefs } from "../../lib/autoform/refs";
import type { JsonSchema } from "./types";

export type HookAutoFormProps = {
  schema: JsonSchema;
  defaultValues?: FieldValues;
  onSubmit?: (values: FieldValues) => void;
};

export const HookAutoForm = ({
  schema,
  defaultValues,
  onSubmit,
}: HookAutoFormProps) => {
  const resolvedSchema = replaceRefs(schema);
  const form = useForm<FieldValues>({
    defaultValues,
  });
  const [lastSubmittedValues, setLastSubmittedValues] =
    useState<FieldValues | null>(null);

  const handleSubmit = form.handleSubmit((values) => {
    setLastSubmittedValues(values);
    onSubmit?.(values);
  });

  const currentValues = form.watch();
  const requiredFields = new Set(resolvedSchema.required ?? []);

  return (
    <FormProvider {...form}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <ul className="space-y-4">
          {Object.entries(resolvedSchema.properties ?? {}).map(
            ([key, value]) => (
              <li key={key} className="space-y-2">
                <label className="text-sm font-medium" htmlFor={key}>
                  {key}
                  {requiredFields.has(key) ? (
                    <span className="text-destructive ml-1">*</span>
                  ) : null}
                </label>
                <HookAutoField
                  name={key}
                  jsonProperty={value}
                  required={requiredFields.has(key)}
                />
              </li>
            )
          )}
        </ul>

        <div className="flex items-center gap-3">
          <Button type="submit">Submit</Button>
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Live values</h3>
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
              {JSON.stringify(currentValues, null, 2)}
            </pre>
          </div>
          {lastSubmittedValues ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Last submitted values</h3>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs">
                {JSON.stringify(lastSubmittedValues, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
};
