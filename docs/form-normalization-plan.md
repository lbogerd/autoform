# Form Normalization & Validation Simplification Plan

## Background
- The current `normalizeFieldValue` implementation mirrors `buildDefaultValue`, resulting in an intertwined flow that is difficult to follow.
- Validation rules are scattered between schema definitions and ad-hoc checks inside normalization, which blurs responsibilities.
- Complex field types (records, unions, nested objects) use nested reducers and type coercions that obscure intent, making maintenance risky.
- There are **no live customers** depending on existing quirks, so we can prioritize clarity over backward compatibility in the refactor.

## Goals
1. **Clarify responsibilities** between normalization (shaping user input) and validation (ensuring correctness).
2. **Prefer readability over cleverness**: choose straightforward control flow and explicit helper functions.
3. **Improve developer guidance** with in-line documentation and consistent naming.
4. **Support incremental adoption** so that the refactor can land in stages without breaking consumers.

## Proposed Architecture
1. **Introduce dedicated normalizer modules**
   - Create `src/lib/auto-form/normalizers/` with one file per field family (`object.ts`, `array.ts`, `record.ts`, `union.ts`, `primitive.ts`).
   - Each module exports a `normalize` function with a shared signature: `(field, value, context) => NormalizedValue`.
   - Provide a top-level `normalizeValue` orchestrator that delegates based on `field.type`.
   - Motivation: smaller files, cohesive logic, easier to test in isolation.

2. **Separate validation concerns**
   - Implement a lightweight validation pipeline in `src/lib/auto-form/validation/`.
   - Validation functions should **only** report issues (e.g., `ValidationIssue[]`) without mutating values.
   - Normalize first, then run validation on the normalized payload before submission.
   - Existing Zod schemas can still power type-level guarantees; runtime validation will focus on business rules (required keys, min/max, etc.).

3. **Shared context object**
   - Define a `NormalizationContext` that carries utilities required by both normalization and validation (e.g., date formatters, locale-specific helpers).
   - Document the contract in a dedicated `context.ts` file to prevent "mystery dependencies" creeping into helpers.

4. **Comment-driven guidance**
   - Prepend each normalizer with a `// WHY:` block summarizing the intent and edge cases it handles.
   - Document the public surface (function signatures, expected inputs/outputs) using TSDoc-style comments.
   - Add a README in the new `normalizers/` folder describing data flow at a high level.

5. **Reduce implicit coercions and default values**
   - Replace reducers with explicit loops for clarity, especially when building objects from records.
   - Extract helper functions such as `safeNumberKey` and `ensureArray` with descriptive names.
   - Emit `undefined` for empty field values (rather than empty strings or other sentinels) so downstream validation sees an explicit "unset" state.
   - During validation, flag coercion failures instead of silently dropping data (e.g., invalid number keys).

## Migration Strategy
1. **Phase 1: Extract normalizer orchestrator**
   - Move existing logic into new modules without changing external APIs.
   - Add unit tests per module to codify current behavior.

2. **Phase 2: Introduce validation pipeline**
   - Implement validation modules mirroring the normalization structure.
   - Update form submission flow to run `validate(normalizedValues)` and surface user-friendly errors.
   - If validation returns issues, block submission until the user resolves them.

3. **Phase 3: Clean up & document**
   - Remove legacy helper functions (`normalizeFieldValue`, record reducers, etc.).
   - Expand documentation and comments, ensuring developers can trace data flow from schema ➜ normalization ➜ validation.

## Open Questions
- None. With no external consumers, we can freely re-shape normalization defaults and validation semantics to favor clarity.

## Next Steps
- Align with stakeholders on the phased approach and confirm testing expectations.
- Schedule implementation tasks per phase, ensuring CI coverage for new helpers.
- Begin with Phase 1 extraction, emphasizing readable, well-commented code.
