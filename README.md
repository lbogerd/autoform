# AutoForm (Zod-only)

Generate fully-featured forms from a **flat** `z.object({ ... })` Zod schema.
Built with **React**, **react-hook-form** (RHF) + `zodResolver`, and **shadcn/ui**.

---

## Overview

* **What it does:** turns a *simple* Zod object schema into a typed `FieldSpec[]`, then renders a complete form (labels, placeholders, validation, errors, defaults).
* **Scope (for now):** flat forms only — no unions, arrays, or nested objects to keep it simple.
* **Why:** this library will be used in a Storybook-like project to auto-generate forms for component previews.

---

## What we have so far

* **Zod-only introspection** (`core/zodIntrospect.ts`)

  * Unwraps `.optional()`, `.nullable()`, `.default()`, `ZodEffects`.
  * Extracts constraints:
    * `string` → `min/max/regex`, heuristics for `email/url/password/textarea`.
    * `number` → `min/max/multipleOf → step`.
    * `boolean` → switch/checkbox ready.
    * `enum` & `nativeEnum` → options (with numeric enum reverse-map handling).
    * `date` → `min/max`.
  * Reads `z.describe()` for descriptions; **`meta`** overrides everything.

* **Renderer** (`components/AutoForm.tsx`)
  * RHF + `@hookform/resolvers/zod` for validation.
  * shadcn/ui inputs (Input, Textarea, Switch, Select, RadioGroup).
  * Inline field errors **and** optional top error summary.
  * Defaults from schema `.default()` are respected; can be merged with `defaultValues`.
  * Simple responsive layout (`width: 'full' | 'half'`).

* **Metadata** (`core/types.ts`)
  * `FormMeta` for label, placeholder, help, order, width, widget, options (enum labels).

---

## Quick start

```bash
# peer deps (adjust to your setup)
pnpm i zod react-hook-form @hookform/resolvers
# warning: shadcn/ui should already be set up in your project (for now)
```

```tsx
import * as z from "zod";
import { AutoForm } from "@/components/AutoForm";
import type { FormMeta } from "@/core/types";

const UserSchema = z.object({
  firstName: z.string().min(2).describe("Your given name"),
  email: z.string().email(), // WARNING: z.string().email() deprecated, we'll change to the preferred z.email() soon
  age: z.number().min(13).default(18),
  newsletter: z.boolean().default(true),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
  birthday: z.date().optional(),
});

const meta: FormMeta = {
  firstName: { order: 1, placeholder: "Ada", width: "half" },
  email: { order: 2, placeholder: "ada@example.com" },
  age: { order: 3, width: "half" },
  newsletter: { order: 4, help: "Occasional product emails", width: "half" },
  role: { order: 5, widget: "select" },
  birthday: { order: 6, widget: "date" },
};

export default function Page() {
  return (
    <AutoForm
      schema={UserSchema}
      meta={meta}
      submitLabel="Create user"
      onSubmit={(values) => console.log(values)}
    />
  );
}
```

---

## API

### `<AutoForm />` props

| prop                 | type                                | required | notes                                                   |
| -------------------- | ----------------------------------- | -------- | ------------------------------------------------------- |
| `schema`             | `z.ZodObject<any>`                  | ✅        | Flat object only                                        |
| `meta`               | `FormMeta`                          |          | Labels, placeholders, order, width, widget, enum labels |
| `onSubmit`           | `(values) => void \| Promise<void>` | ✅        | RHF `handleSubmit` wrapper                              |
| `submitLabel`        | `string`                            |          | Button text (default: `"Save"`)                         |
| `defaultValues`      | `Partial<Infer<schema>>`            |          | Merged over schema `.default()`s                        |
| `showErrorSummary`   | `boolean`                           |          | Top summary (default: `true`)                           |
| `renderFooterExtras` | `React.ReactNode`                   |          | Extra actions near the submit button                    |

### `FormMeta` (snippet)

```ts
type FormMeta = {
  [field: string]: {
    label?: string;
    placeholder?: string;
    help?: string;
    order?: number;
    width?: "full" | "half" | "auto";
    widget?: "select" | "radio" | "checkbox" | "switch" | "number" | "date";
    options?: { label: string; value: string | number }[];
  };
};
```

---

## Supported Zod types (flat)

* `z.string()` (+ `.min/.max/.regex/.email/.url`)
* `z.number()` (+ `.min/.max/.multipleOf`, `int` respected via constraints)
* `z.boolean()`
* `z.enum([...])`, `z.nativeEnum(Enum)`
* `z.date()` (+ `.min/.max`)
* `z.literal()` → treated as single-option enum
* Wrappers: `.optional()`, `.nullable()`, `.default()`, `ZodEffects` (unwrapped for UI)

**Not supported (by design for this version):** arrays, unions, nested objects, records, tuples, maps/sets.

---

## Roadmap / What’s next

* **Support for more Zod types**: add support for arrays, unions, nested objects, records, tuples, maps/sets.
* **TypeScript support**: improve type inference and error messages.
* **JSON Schema input**: optional path to support non-Zod vendors (Valibot, Effect, ArkType) via a single mapping layer.
* **Custom primitives**: pluggable widget registry (e.g. phone, currency, slider, code editor) + per-field formatter/parser.
* **TanStack Form**: alternate renderer layer with the same `FieldSpec[]` core.
* Extras we _might_ add:
  * i18n for labels/help (e.g. `labelKey` in `meta`).
  * Field-level `readOnly/disabled/hidden` in `meta`.
  * Error message customization per field.

---

## Limitations & notes

* Uses some **Zod internals** (`def`) for checks; pinned to common Zod patterns. If Zod changes internals, the introspector may require adjustments.
* Dates are stored as `Date` in form state; `<input type="date">` converts to/from local midnight.
* Enum UI defaults to Select; set `meta[field].widget = "radio"` for radio groups.
