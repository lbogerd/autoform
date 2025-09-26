# AutoForm (JSON Schema prototype)

AutoForm is an experiment that renders a very small set of UI controls directly from a JSON Schema document. The current focus is
feeding it with the output of [`z.toJSONSchema`](https://zod.dev/?id=json-schema) from **Zod v4**, so we can preview large schemas
(such as the "kitchen sink" test schema) without hand-coding every field.

---

## Overview

- **Input:** a JSON Schema object. Internally the component resolves `$ref` values defined in `$defs` so that reused fields become
directly renderable (`replaceRefs` in [`auto-form.tsx`](src/components/autoform/auto-form.tsx)).
- **Renderer:** [`AutoField`](src/components/autoform/auto-field.tsx) picks a basic control for each property based on its `type`,
`format`, and helpers like `enum`, `anyOf`, and `additionalProperties`.
- **Hook-based Form:** [`HookAutoForm`](src/components/autoform/hook-auto-form.tsx) integrates with React Hook Form and, as of this
update, visually marks required fields based on the JSON Schema `required` array (part 1 of the required/validation feature).
- **Status:** intentionally lightweight – there is no React Hook Form integration yet, and validation/submission wiring is out of
scope for this prototype.

---

## What currently renders

The renderer covers the pieces of JSON Schema that fall out of the Zod v4 conversion:

- Strings map to text inputs and honour formats: `email`, `uri`, `date-time` (`<DatePicker /> + time input`), `date`, and `time`.
- Numbers and integers share a numeric input.
- Booleans render as checkboxes.
- Enumerations become a Radix `Select` listing the available options.
- Arrays display the schema for the first item (tuples pick the first entry, homogeneous arrays reuse the item schema).
- Objects with explicit `properties` render nested lists; record-like objects that use `additionalProperties` show a key/value row
and respect any `propertyNames.pattern` constraint for the key field.
- `anyOf` chooses the first option for now (future work could surface all variants).
- The literal `null` type renders as a static "null" placeholder.

### Required fields (HookAutoForm)

When using `HookAutoForm`:

- Top-level required fields are determined from the schema's `required` array and are marked in the UI with an asterisk next to the
  generated label.
- The `aria-required` attribute is set to `true` on the underlying control for accessibility (inputs, checkboxes, and the Select
  trigger).
- For nested objects, the inner object's own `required` array is respected as well. Each nested field that is required gets the same
  visual and ARIA treatment.
- Array fields marked as required display the asterisk on the array property's label (per schema), while individual items continue to
  render according to their item schema.

The [`test/kitchen-sink-schema.ts`](test/kitchen-sink-schema.ts) fixture exercises most of these cases and provides the example
schema used by the local demo page.

---

## Usage

### 1. Produce JSON Schema (Zod v4 example)

```ts
import { z } from "zod";

const User = z.object({
  name: z.string().min(1),
  email: z.email(),
  website: z.string().url().optional(),
  tags: z.array(z.string()).min(1),
  role: z.enum(["admin", "editor", "viewer"]),
});

const userJsonSchema = z.toJSONSchema(User, { reused: "ref" });
```

`z.toJSONSchema` is optional; any JSON Schema object with the shapes listed above will work.

### 2. Render the form

```tsx
import { AutoForm } from "@/components/autoform/auto-form";

export function UserPreview() {
  return (
    <div className="max-w-xl space-y-4">
      <AutoForm schema={userJsonSchema} />
    </div>
  );
}
```

The component automatically resolves `$ref` definitions before rendering, so schemas that reuse components (e.g. addresses) will
show fully inlined fields.

### Validation with Zod

`HookAutoForm` can now accept a matching Zod schema via the optional `zodSchema` prop. When provided, the form validates through
`react-hook-form`'s `zodResolver`, displays the first error message beneath each field, and marks invalid controls with
`aria-invalid`/`aria-describedby`. Submit handlers receive the parsed Zod output (including any coercions or refinements), while the
fallback behaviour without `zodSchema` remains unchanged.

```tsx
import { z } from "zod";

const User = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().int().min(0, "Age must be ≥ 0"),
});

<HookAutoForm
  schema={userJsonSchema}
  zodSchema={User}
  validationMode="onChange"
  onSubmit={(values) => console.log(values)}
/>;
```

Required markers are derived from the Zod object shape when available (falling back to the JSON Schema `required` array otherwise),
so stars and `aria-required` match the validation source of truth.

---

## Limitations & next steps

This is a prototype; important gaps remain:

- Only the first branch of an `anyOf` is displayed.
- Arrays are rendered as a single set of controls (no add/remove UI yet).
- AutoForm (non-hook) does not currently mark required fields. The required-field UI applies to HookAutoForm.
- Validation now honours optional `zodSchema` definitions via React Hook Form; when omitted, the form remains unvalidated beyond the
  existing JSON Schema hints.
- Formats beyond the ones listed above fall back to plain inputs.
- Complex widgets (files, discriminated unions, recursive data) need dedicated UX.

Despite the limitations, the component is already useful for quickly visualising the overall shape of large schemas while we iterate
on richer form-generation features.
