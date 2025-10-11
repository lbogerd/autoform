# Validation & Normalization Rework

## Objectives

- Replace the current post-submit normalization pipeline with schema-driven validation that produces already-normalized data.
- Reduce bespoke branching in `parseDateValue`, `formatDateForInput`, `extractTimeValue`, and `normalizeFieldValue` by unifying date/time handling.
- Improve developer ergonomics by having a single source of truth for how default values, form state, and submitted data are shaped.
- Lay the groundwork for richer validation feedback (field-level issues, union option errors) without additional normalization passes.

## Current Pain Points

- **Dual shape problem**: `buildDefaultValue` crafts UI-friendly objects (e.g. `{ date, time }` for datetime), and `normalizeFieldValue` later flattens them. Validation needs to understand both shapes, creating complexity.
- **Implicit coercions**: `normalizeFieldValue` silently coerces strings/numbers/dates; failed coercions often devolve into empty strings, hiding real validation errors from users.
- **Union bookkeeping**: `UnionOptionsValue` (`{ selected, options }`) leaks into validation and submission layers, forcing manual synchronization.
- **Record editing**: records use `[ { key, value }, ... ]` in the form but `{ key: value }` on submit; normalization must inspect keys for emptiness, leading to bug-prone code.
- **Date/time utilities**: logic is duplicated between default building and normalization, and native `Date` parsing leads to timezone surprises.

## Guiding Principles

- **Schema is the contract**: the zod schema (or schema-like metadata) should describe the final data shape. Form-specific projections should be derived views that can round-trip without manual normalization.
- **Validation produces canonical data**: successful validation returns values already in consumer shape; the form layer adapts to that shape instead of the other way around.
- **Explicit coercion**: define targeted coercers (e.g. `coerceDate`, `coerceNumber`) that either return `{ value, issues }` or throw typed errors, ensuring invalid data propagates as errors, not silent fallbacks.
- **Composable field adapters**: each field type owns how it maps between form inputs and final data, minimizing shared branching.

## Proposed Architecture

### 1. Schema-Centric Validation Layer

- Introduce a `createValidator(fields)` helper that builds a zod schema tree mirroring `FieldSchema`.
- Reuse zod's `superRefine` / custom transformers to produce final shapes while capturing issues.
- Replace `normalizeFormValues` with `validator.parse` (or `safeParse`) outputs.

### 2. Field Adapters

- Define per-type adapters (e.g. `stringAdapter`, `dateAdapter`, `unionAdapter`). Each adapter exposes:
  - `getDefault(field): unknown`
  - `toInput(value): unknown` (optional; derived from default when value missing)
  - `coerce(input): { value: unknown; issues?: Issue[] }`
- `buildDefaultValues` delegates to `adapter.getDefault`.
- Validation pipeline invokes `adapter.coerce`, collecting `issues` into a structured error bag.

### 3. Date/Time Handling

- Replace native parsing with `date-fns` or `luxon` (evaluate bundle size) to avoid timezone quirks.
- Standardize on ISO strings for storage/validation; forms receive `{ date: YYYY-MM-DD, time: HH:mm }` via adapter projections.
- Implement `coerceDate` that accepts `Date`, ISO string, `{ date, time }`, and returns ISO date (or datetime) string; invalid inputs surface as validation errors.

### 4. Union & Record Simplification

- Union fields store `{ selectedIndex, selections }` internally but expose only the selected value to consumers.
- During validation, only evaluate the active branch; adapters ensure inactive branches maintain defaults without appearing in submission payloads.
- Record fields manage `{ key, value }` rows in the UI. Validation drops entries with empty keys _before_ coercion and reports duplicate key errors explicitly.

### 5. Error Modeling

- Standardize error objects: `{ path: string[], message: string, code: string }`.
- Field adapters return structured issues; validator aggregates them into React Hook Form-compatible error maps.
- Support inline union option errors by prefixing paths with the selected index (e.g. `unionField.options[1].fieldName`).

## Implementation Steps

1. **Adapter Interface**: create `src/lib/auto-form/adapters/base.ts` defining the adapter contract and helper types.
2. **Per-Type Adapters**: implement adapters for primitives, dates/times, arrays, objects, unions, and records.
3. **Default Value Rewrite**: update `buildDefaultValue`/`buildDefaultValues` to delegate to adapters, ensuring output matches current UI expectations.
4. **Validation Pipeline**: add `validateFormValues(values, fields)` leveraging adapters + zod to coerce and validate simultaneously.
5. **Normalization Removal**: remove or repurpose `normalizeFieldValue`/`normalizeFormValues`; consumers rely on validator output instead.
6. **React Hook Form Integration**: update form components to call the new validator on submit; ensure error mapping aligns with `setError` shape.
7. **Tests**: expand `test/auto-form*.spec.tsx` to cover adapters and validator behavior, including edge cases (invalid dates, duplicate record keys, union switching).
8. **Docs & Migration**: document the new validation flow, adapter contract, and guidance for extending field types.

## Testing Strategy

- Unit tests for each adapter's `getDefault`, `toInput`, and `coerce` functions.
- Integration tests for form submission covering:
  - Primitive coercion (string, number, boolean).
  - Date/datetime/time combos, including invalid inputs.
  - Unions with nested objects.
  - Records with missing/duplicate keys.
- Snapshot or contract tests ensuring validator output equals old `normalizeFormValues` output for valid submissions (backwards compatibility checkpoint).

## Decisions & Follow-Up

- **Runtime typing**: stick with the full zod dependency—no lightweight runtime type is required right now.
- **Async validation hooks**: not needed for this iteration; defer until concrete async validation scenarios appear.
- **Adapter customization**: no immediate action; we'll revisit once external customization requirements surface.

## Current Status

- ✅ Adapter layer scaffolded in `src/lib/auto-form/adapters`, covering primitives, composites, unions, and records.
- ✅ Date helpers extracted to `src/lib/auto-form/date-utils` and re-exported to keep `utils` API stable.
- ✅ `buildDefaultValues`, `normalizeFormValues`, and related helpers now delegate to adapters; regression tests (`test/auto-form.utils.spec.ts`) are passing.
- ⏳ Validator rewrite not started—`validateFormValues`/React Hook Form integration still pending.
- ⏳ No adapter-specific unit specs beyond the utility coverage yet; plan to add focused tests alongside validation work.
