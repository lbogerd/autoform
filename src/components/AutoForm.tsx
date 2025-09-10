import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  type FieldErrors,
} from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { FieldSpec, FormMeta } from "@/core/types";
import { unwrap, zodObjectToFieldSpecs } from "@/core/zodIntrospect";
import { cn } from "@/lib/utils";

function fieldId(name: string) {
  return `field-${name}`;
}

function errorList(
  errors: FieldErrors
): Array<{ name: string; message: string }> {
  const out: Array<{ name: string; message: string }> = [];

  const visited = new WeakSet();

  function isDomNode(x: any) {
    if (!x || typeof x !== "object") return false;
    // Skip if running in a DOM environment and node is a Node
    try {
      // eslint-disable-next-line no-undef
      if (typeof Node !== "undefined" && x instanceof Node) return true;
    } catch {
      // ignore
    }
    // Basic guard: elements often have nodeType
    if (typeof x.nodeType === "number") return true;
    return false;
  }

  function walk(prefix: string | undefined, node: any) {
    if (!node) return;
    if (visited.has(node)) return;
    if (isDomNode(node)) return;
    visited.add(node);

    // If this node has a direct message, report it
    if (typeof node.message === "string") {
      out.push({ name: prefix ?? "", message: node.message });
      return; // no need to traverse deeper for this node
    }

    // If it's an array-like error (from field array), iterate indices
    if (Array.isArray(node)) {
      node.forEach((child, idx) =>
        walk(prefix ? `${prefix}.${idx}` : String(idx), child)
      );
      return;
    }

    // If it's a plain object, traverse its keys
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (k === "message") continue;
        const name = prefix ? `${prefix}.${k}` : k;
        walk(name, v as any);
      }
    }
  }

  walk(undefined, errors as any);
  return out;
}

function dateToInputValue(d?: Date | string): string | undefined {
  if (!d) return undefined;
  const date = typeof d === "string" ? new Date(d) : d;
  // format YYYY-MM-DD (local)
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inputValueToDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  // Create a Date at local midnight to avoid TZ drift in most cases
  const [y, m, d] = value.split("-").map((s) => parseInt(s, 10));
  if (!y || !m || !d) return undefined;
  const dt = new Date();
  dt.setFullYear(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function buildDefaultValuesFromFields(fields: FieldSpec[]) {
  const acc: Record<string, unknown> = {};
  for (const f of fields) {
    if (typeof f.defaultValue !== "undefined") {
      acc[f.name] =
        f.kind === "date"
          ? typeof f.defaultValue === "string" || f.defaultValue instanceof Date
            ? new Date(f.defaultValue as any)
            : f.defaultValue
          : f.defaultValue;
    } else if (f.kind === "object") {
      // For object fields, recursively build default values
      const objectSpec = f as any;
      if (objectSpec.fields) {
        acc[f.name] = buildDefaultValuesFromFields(objectSpec.fields);
      }
    } else if (f.kind === "array") {
      // For array fields, initialize as empty array
      acc[f.name] = [];
    }
  }
  return acc;
}

type FieldPropsBase = {
  spec: FieldSpec;
  placeholder?: string;
  control: ReturnType<typeof useForm<any>>["control"];
  register: ReturnType<typeof useForm<any>>["register"];
  error?: string;
  getError?: (path: string) => string | undefined;
  wrapperClass?: string;
};

function StringField({
  spec,
  placeholder,
  register,
  error,
  wrapperClass,
}: FieldPropsBase) {
  const format = (spec as any).format as
    | "default"
    | "email"
    | "url"
    | "password"
    | "textarea"
    | undefined;

  const common = register(spec.name, {
    required: spec.required ? `${spec.name} is required` : false,
    minLength: (spec as any).minLength,
    maxLength: (spec as any).maxLength,
    pattern: (spec as any).pattern
      ? {
          value: new RegExp((spec as any).pattern!),
          message:
            format === "email" ? "Invalid email format" : "Invalid format",
        }
      : format === "email"
      ? {
          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: "Invalid email format",
        }
      : undefined,
  });

  const inputType =
    format === "email"
      ? "email"
      : format === "url"
      ? "url"
      : format === "password"
      ? "password"
      : "text";

  return (
    <div className={cn(wrapperClass ?? "", "space-y-2")}>
      <div className="flex items-center gap-1">
        <Label htmlFor={fieldId(spec.name)} className="flex items-center gap-1">
          {spec.label ?? spec.name}
        </Label>
        {spec.required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </div>
      {format === "textarea" ? (
        <Textarea
          id={fieldId(spec.name)}
          placeholder={placeholder}
          aria-invalid={!!error}
          {...common}
        />
      ) : (
        <Input
          id={fieldId(spec.name)}
          type={inputType}
          placeholder={placeholder}
          aria-invalid={!!error}
          {...common}
        />
      )}
      {spec.description && (
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function NumberField({
  spec,
  placeholder,
  register,
  error,
  wrapperClass,
}: FieldPropsBase) {
  const { min, max, step } = spec as any;
  const common = register(spec.name, {
    required: spec.required ? `${spec.name} is required` : false,
    valueAsNumber: true,
    min:
      typeof min === "number" ? { value: min, message: `≥ ${min}` } : undefined,
    max:
      typeof max === "number" ? { value: max, message: `≤ ${max}` } : undefined,
  });

  return (
    <div className={cn(wrapperClass ?? "", "space-y-2")}>
      <div className="flex items-center gap-1">
        <Label htmlFor={fieldId(spec.name)} className="flex items-center gap-1">
          {spec.label ?? spec.name}
        </Label>
        {spec.required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </div>
      <Input
        id={fieldId(spec.name)}
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        aria-invalid={!!error}
        step={step ?? "any"}
        min={min as number | undefined}
        max={max as number | undefined}
        {...common}
      />
      {spec.description && (
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function BooleanField({
  spec,
  control,
  error,
  meta,
  wrapperClass,
}: FieldPropsBase & { meta?: FormMeta }) {
  const widget = meta?.[spec.name]?.widget;
  const useCheckbox = widget === "checkbox";

  return (
    <Controller
      name={spec.name}
      control={control}
      rules={{
        required: spec.required ? `${spec.name} is required` : false,
      }}
      render={({ field }) => (
        <div className={cn(wrapperClass ?? "", "space-y-2")}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <Label
                  htmlFor={fieldId(spec.name)}
                  className="flex items-center gap-1"
                >
                  {spec.label ?? spec.name}
                </Label>
                {spec.required && (
                  <span aria-hidden className="text-destructive">
                    *
                  </span>
                )}
              </div>
              {spec.description && (
                <p className="text-xs text-muted-foreground">
                  {spec.description}
                </p>
              )}
            </div>
            {useCheckbox ? (
              <Checkbox
                id={fieldId(spec.name)}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                aria-invalid={!!error}
              />
            ) : (
              <Switch
                id={fieldId(spec.name)}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                aria-invalid={!!error}
              />
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    />
  );
}

function EnumField({
  spec,
  control,
  error,
  placeholder,
  // @ts-ignore
  meta,
  wrapperClass,
}: FieldPropsBase & { meta?: FormMeta }) {
  const options = (spec as any).options ?? [];
  const widget = meta?.[spec.name]?.widget; // "select" | "radio" preferred
  const isRadio = widget === "radio";

  if (isRadio) {
    return (
      <Controller
        name={spec.name}
        control={control}
        rules={{
          required: spec.required ? `${spec.name} is required` : false,
        }}
        render={({ field }) => (
          <div className={cn(wrapperClass ?? "", "space-y-2")}>
            <div className="flex items-center gap-1">
              <Label className="flex items-center gap-1">
                {spec.label ?? spec.name}
              </Label>
              {spec.required && (
                <span aria-hidden className="text-destructive">
                  *
                </span>
              )}
            </div>
            <RadioGroup
              value={String(field.value ?? "")}
              onValueChange={(val) => {
                const found = options.find((o: any) => String(o.value) === val);
                field.onChange(found ? found.value : val);
              }}
              className="grid gap-2 md:grid-cols-2"
            >
              {options.map((opt: any) => (
                <div
                  key={String(opt.value)}
                  className="flex items-center space-x-2"
                >
                  <RadioGroupItem
                    id={`${fieldId(spec.name)}-${opt.value}`}
                    value={String(opt.value)}
                  />
                  <Label htmlFor={`${fieldId(spec.name)}-${opt.value}`}>
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {spec.description && (
              <p className="text-xs text-muted-foreground">
                {spec.description}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      />
    );
  }

  // default: Select
  return (
    <Controller
      name={spec.name}
      control={control}
      rules={{
        required: spec.required ? `${spec.name} is required` : false,
      }}
      render={({ field }) => (
        <div className={cn(wrapperClass ?? "", "space-y-2")}>
          <div className="flex items-center gap-1">
            <Label
              htmlFor={fieldId(spec.name)}
              className="flex items-center gap-1"
            >
              {spec.label ?? spec.name}
            </Label>
            {spec.required && (
              <span aria-hidden className="text-destructive">
                *
              </span>
            )}
          </div>
          <Select
            value={field.value !== undefined ? String(field.value) : ""}
            onValueChange={(val) => {
              const found = options.find((o: any) => String(o.value) === val);
              field.onChange(found ? found.value : val);
            }}
          >
            <SelectTrigger id={fieldId(spec.name)} aria-invalid={!!error}>
              <SelectValue placeholder={placeholder ?? "Select…"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt: any) => (
                <SelectItem key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {spec.description && (
            <p className="text-xs text-muted-foreground">{spec.description}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    />
  );
}

function DateField({ spec, control, error, wrapperClass }: FieldPropsBase) {
  // Native <input type="date"> with controller to keep Date in form state
  const { min, max } = spec as any;

  return (
    <Controller
      name={spec.name}
      control={control}
      rules={{
        required: spec.required ? `${spec.name} is required` : false,
      }}
      render={({ field }) => {
        const inputVal = dateToInputValue(field.value as any);
        return (
          <div className={cn(wrapperClass ?? "", "space-y-2")}>
            <Label
              htmlFor={fieldId(spec.name)}
              className="flex items-center gap-1"
            >
              {spec.label ?? spec.name}
            </Label>
            <Input
              id={fieldId(spec.name)}
              type="date"
              aria-invalid={!!error}
              value={inputVal ?? ""}
              min={min ? dateToInputValue(min as any) : undefined}
              max={max ? dateToInputValue(max as any) : undefined}
              onChange={(e) => field.onChange(inputValueToDate(e.target.value))}
            />
            {spec.description && (
              <p className="text-xs text-muted-foreground">
                {spec.description}
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      }}
    />
  );
}

function ObjectField({
  spec,
  control,
  error,
  meta,
  register,
  getError,
}: FieldPropsBase & { meta?: FormMeta }) {
  const objectSpec = spec as any; // ObjectFieldSpec

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1">
        <Label className="text-base font-medium">
          {spec.label ?? spec.name}
          {spec.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      </div>
      {spec.description && (
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      )}

      <div className="border rounded-lg p-4 space-y-4">
        {objectSpec.fields?.map((field: FieldSpec) => (
          <div key={field.name}>
            {renderFieldInternal(
              field,
              control,
              // use the register passed into this component via props
              register,
              meta,
              `${spec.name}.${field.name}`,
              getError ? getError(`${spec.name}.${field.name}`) : undefined
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ArrayField({
  spec,
  control,
  error,
  meta,
  register,
  getError,
}: FieldPropsBase & { meta?: FormMeta }) {
  const arraySpec = spec as any; // ArrayFieldSpec
  const { fields, append, remove } = useFieldArray({
    control,
    name: spec.name,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Label className="text-base font-medium">
            {spec.label ?? spec.name}
            {spec.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            // Append a reasonable empty value depending on element type
            const elem = arraySpec.elementSpec as any;
            if (elem.kind === "object") {
              // build empty object matching nested fields
              const emptyObj: Record<string, any> = {};
              if (elem.fields && Array.isArray(elem.fields)) {
                for (const f of elem.fields) {
                  if (typeof f.defaultValue !== "undefined") {
                    emptyObj[f.name] = f.defaultValue;
                  } else if (f.kind === "object") {
                    emptyObj[f.name] = {};
                  } else if (f.kind === "array") {
                    emptyObj[f.name] = [];
                  } else if (f.kind === "number") {
                    emptyObj[f.name] = 0;
                  } else if (f.kind === "boolean") {
                    emptyObj[f.name] = false;
                  } else {
                    emptyObj[f.name] = "";
                  }
                }
              }
              append(emptyObj);
            } else if (elem.kind === "array") {
              append([]);
            } else if (elem.kind === "number") {
              append(0);
            } else if (elem.kind === "boolean") {
              append(false);
            } else {
              append("");
            }
          }}
        >
          Add Item
        </Button>
      </div>

      {spec.description && (
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">{`Item ${index + 1}`}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            </div>
            {renderFieldInternal(
              arraySpec.elementSpec,
              control,
              register,
              meta,
              `${spec.name}.${index}`,
              getError ? getError(`${spec.name}.${index}`) : undefined
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function UnionField({
  spec,
  control,
  error,
  meta,
  register,
}: FieldPropsBase & { meta?: FormMeta }) {
  const unionSpec = spec as any; // UnionFieldSpec
  const [selectedOption, setSelectedOption] = React.useState<number>(-1);

  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">
        {spec.label ?? spec.name}
        {spec.required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {spec.description && (
        <p className="text-xs text-muted-foreground">{spec.description}</p>
      )}

      <div className="space-y-3">
        <Select
          value={selectedOption >= 0 ? selectedOption.toString() : ""}
          onValueChange={(value) => setSelectedOption(parseInt(value, 10))}
        >
          <SelectTrigger id={fieldId(spec.name)}>
            <SelectValue placeholder="Select type..." />
          </SelectTrigger>
          <SelectContent>
            {unionSpec.options?.map((option: FieldSpec, index: number) => (
              <SelectItem key={index} value={index.toString()}>
                {option.label ?? option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedOption >= 0 && unionSpec.options?.[selectedOption] && (
          <div className="border rounded-lg p-4">
            {renderFieldInternal(
              unionSpec.options[selectedOption],
              control,
              register,
              meta,
              spec.name
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// Helper function to render fields recursively
function renderFieldInternal(
  spec: FieldSpec,
  control: any,
  register: any,
  meta?: FormMeta,
  nameOverride?: string,
  error?: string,
  getError?: (path: string) => string | undefined
): React.ReactNode {
  const fieldName = nameOverride ?? spec.name;
  const fieldError = error; // You might need to handle nested errors differently

  // Use a shallow copy of the spec but with the overridden name so nested
  // renderers use the correct field ids and registration names.
  const specWithName = { ...spec, name: fieldName } as FieldSpec;

  const commonProps = {
    spec: specWithName,
    control,
    register,
    error: fieldError,
    getError,
    wrapperClass: undefined,
  };

  switch (spec.kind) {
    case "string":
      return <StringField {...commonProps} />;
    case "number":
      return <NumberField {...commonProps} />;
    case "boolean":
      return <BooleanField {...commonProps} />;
    case "enum":
      return <EnumField {...commonProps} meta={meta} />;
    case "date":
      return <DateField {...commonProps} />;
    case "object":
      return <ObjectField {...commonProps} meta={meta} />;
    case "array":
      return <ArrayField {...commonProps} meta={meta} />;
    case "union":
      return <UnionField {...commonProps} meta={meta} />;
    default:
      return <div>Unsupported field type: {(spec as any).kind}</div>;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export type AutoFormProps<TSchema extends z.ZodObject<any>> = {
  schema: TSchema;
  meta?: FormMeta;
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>;
  submitLabel?: string;
  className?: string;
  /** Optional override/merge for default values; schema .default() values are honored first. */
  defaultValues?: Partial<z.infer<TSchema>>;
  /** Show a top error summary listing fields with errors. */
  showErrorSummary?: boolean;
  /** Render extra actions next to the Submit button. */
  renderFooterExtras?: React.ReactNode;
};

export function AutoForm<TSchema extends z.ZodObject<any>>({
  schema,
  meta,
  onSubmit,
  submitLabel = "Save",
  className,
  defaultValues,
  showErrorSummary = true,
  renderFooterExtras,
}: AutoFormProps<TSchema>) {
  const fields = React.useMemo(
    () => zodObjectToFieldSpecs(schema, meta),
    [schema, meta]
  );

  // Build default values from FieldSpec.defaultValue, then let props override/merge
  const baseDefaults = React.useMemo(
    () => buildDefaultValuesFromFields(fields),
    [fields]
  );
  const mergedDefaults = {
    ...(baseDefaults as any),
    ...(defaultValues as any),
  };

  // Create enhanced schema that enforces required string minimums
  const enhancedSchema = React.useMemo(() => {
    const shape = schema.shape;
    const enhancedShape: Record<string, z.ZodTypeAny> = {};

    for (const [key, value] of Object.entries(shape)) {
      const fieldSpec = fields.find((f) => f.name === key);
      if (fieldSpec?.kind === "string" && fieldSpec.required) {
        // For required string fields, ensure they have minimum length validation
        const { type: unwrappedType } = unwrap(value as z.ZodTypeAny);
        if (unwrappedType instanceof z.ZodString) {
          const hasMinConstraint = (unwrappedType as any)._def?.checks?.some(
            (check: any) =>
              check.kind === "min" || check._zod?.def?.check === "min_length"
          );
          if (!hasMinConstraint) {
            enhancedShape[key] = (value as z.ZodString).min(
              1,
              `${key} is required`
            );
          } else {
            enhancedShape[key] = value as z.ZodTypeAny;
          }
        } else {
          enhancedShape[key] = value as z.ZodTypeAny;
        }
      } else {
        enhancedShape[key] = value as z.ZodTypeAny;
      }
    }

    return z.object(enhancedShape) as TSchema;
  }, [schema, fields]);

  const form = useForm<z.infer<TSchema>>({
    // @ts-expect-error TODO complains about generic types, fix later
    resolver: zodResolver(enhancedSchema),
    defaultValues: mergedDefaults as any,
    mode: "onBlur",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = form;

  // Reset form when defaultValues prop changes
  React.useEffect(() => {
    // use form.reset to apply new defaults
    try {
      form.reset(mergedDefaults as any);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(mergedDefaults)]);

  function renderField(spec: FieldSpec) {
    // Resolve nested error by path (supports dot notation for nested/array fields)
    function getErrorByPath(path: string): string | undefined {
      const parts = path.split(".");
      let cur: any = errors as any;
      for (const p of parts) {
        if (!cur) return undefined;
        cur = cur[p];
      }
      return cur?.message as string | undefined;
    }

    const err = getErrorByPath(spec.name) as string | undefined;
    const placeholder = meta?.[spec.name]?.placeholder;
    const width = meta?.[spec.name]?.width ?? "full";

    const wrapperClass = cn(
      width === "half"
        ? "md:col-span-1"
        : width === "auto"
        ? "w-auto"
        : "col-span-full",
      "space-y-1"
    );

    return (
      <div key={spec.name} className={wrapperClass}>
        {spec.kind === "string" && (
          <StringField
            spec={spec}
            placeholder={placeholder}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            wrapperClass={wrapperClass}
          />
        )}
        {spec.kind === "number" && (
          <NumberField
            spec={spec}
            placeholder={placeholder}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            wrapperClass={wrapperClass}
          />
        )}
        {spec.kind === "boolean" && (
          <BooleanField
            spec={spec}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            meta={meta}
            wrapperClass={wrapperClass}
          />
        )}
        {spec.kind === "enum" && (
          <EnumField
            spec={spec}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            placeholder={placeholder}
            meta={meta}
            wrapperClass={wrapperClass}
          />
        )}
        {spec.kind === "date" && (
          <DateField
            spec={spec}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            wrapperClass={wrapperClass}
          />
        )}
        {spec.kind === "object" && (
          <ObjectField
            spec={spec}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            meta={meta}
            wrapperClass={wrapperClass}
          />
        )}
        {spec.kind === "array" && (
          <ArrayField
            spec={spec}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            meta={meta}
            wrapperClass={wrapperClass}
          />
        )}
        {spec.kind === "union" && (
          <UnionField
            spec={spec}
            register={register}
            control={control}
            error={err}
            getError={(p: string) => getErrorByPath(p)}
            meta={meta}
            wrapperClass={wrapperClass}
          />
        )}
      </div>
    );
  }

  const summary = errorList(errors);

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data as z.infer<TSchema>))}
      className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}
      noValidate
    >
      {showErrorSummary && summary.length > 0 && (
        <div className="col-span-full rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="font-medium text-destructive mb-2">
            Please fix the following {summary.length} field
            {summary.length > 1 ? "s" : ""}:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            {summary.map(({ name, message }) => (
              <li key={name}>
                <a
                  href={`#${fieldId(name)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(fieldId(name));
                    el?.focus();
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="underline underline-offset-2"
                >
                  {name}
                </a>{" "}
                — {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fields */}
      {fields.map(renderField)}

      {/* Footer */}
      <div className="col-span-full flex items-center justify-end gap-3">
        {renderFooterExtras}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </Button>
      </div>

      {/* Optional success note (non-intrusive) */}
      {isSubmitSuccessful && (
        <p className="col-span-full text-sm text-muted-foreground">Saved.</p>
      )}
    </form>
  );
}
