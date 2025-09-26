# AutoForm (JSON Schema prototype)

AutoForm is an experiment that renders a very small set of UI controls directly from a JSON Schema document. The current focus is
feeding it with the output of [`z.toJSONSchema`](https://zod.dev/?id=json-schema) from **Zod v4**, so we can preview large schemas
(such as the "kitchen sink" test schema) without hand-coding every field. If you would rather skip the manual conversion step, you
can use the companion `ZodAutoForm` wrapper to generate the JSON Schema under the hood (with first-class support for native `Date`
values).

---

## Overview

- **Input:** a JSON Schema object. Internally the component resolves `$ref` values defined in `$defs` so that reused fields become
directly renderable (`replaceRefs` in [`auto-form.tsx`](src/components/autoform/auto-form.tsx)).
- **Renderer:** [`AutoField`](src/components/autoform/auto-field.tsx) picks a basic control for each property based on its `type`,
`format`, and helpers like `enum`, `anyOf`, and `additionalProperties`.
- **Form wiring:** [`AutoForm`](src/components/autoform/auto-form.tsx) integrates with React Hook Form, visually marks required
fields based on the JSON Schema `required` array, and exposes submission/reset hooks for consumers.
- **Status:** intentionally lightweight – validation/submission beyond the provided wiring is still evolving for this prototype.

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

### Required fields

When using `AutoForm`:

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

### Option A — Provide JSON Schema directly

If you already have a JSON Schema definition (or you want to control the conversion yourself), pass it straight into `AutoForm`.

```tsx
import { AutoForm } from "@/components/autoform/auto-form";

export function UserPreview({ userJsonSchema }: { userJsonSchema: JsonSchema }) {
  return (
    <div className="max-w-xl space-y-4">
      <AutoForm schema={userJsonSchema} />
    </div>
  );
}
```

The component automatically resolves `$ref` definitions before rendering, so schemas that reuse components (e.g. addresses) will
show fully inlined fields.

### Option B — Use `ZodAutoForm` with a Zod v4 schema

```tsx
import { ZodAutoForm } from "@/components/autoform/zod-auto-form";
import { z } from "zod";

const Appointment = z.object({
  topic: z.string().min(1),
  startsAt: z.date(),
  followUpOn: z.date().optional(),
});

export function AppointmentPreview() {
  return (
    <div className="max-w-xl space-y-4">
      <ZodAutoForm
        schema={Appointment}
        defaultValues={{
          topic: "Quarterly sync",
          startsAt: new Date(),
        }}
      />
    </div>
  );
}
```

`ZodAutoForm` converts the schema with `z.toJSONSchema` for you (defaulting to `{ reused: "ref" }`) and augments `z.date()` fields
so that the generated form reads and writes native `Date` instances automatically.

---

## Limitations & next steps

This is a prototype; important gaps remain:

- Only the first branch of an `anyOf` is displayed.
- Arrays are rendered as a single set of controls (no add/remove UI yet).
- There is no validation for required fields yet (this is part 2). This update only covers visual indication and ARIA attributes.
- Formats beyond the ones listed above fall back to plain inputs.
- Complex widgets (files, discriminated unions, recursive data) need dedicated UX.

Despite the limitations, the component is already useful for quickly visualising the overall shape of large schemas while we iterate
on richer form-generation features.
