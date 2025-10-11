# Auto Form Normalizers

Documenting the normalization flow prevents future refactors from re-introducing
hidden coupling between form state and validation.

The helpers in this folder mirror the Auto Form schema and produce the payload
shape consumed by submission handlers. Each file focuses on a single field
family so new contributors can zero in on the logic they need without paging
through unrelated branches.

- `object.ts`, `array.ts`, `record.ts`, and `union.ts` delegate to one another to
  recursively normalize complex structures.
- `primitive.ts` guards primitive values against loosely typed inputs such as
  `Date` instances.
- `index.ts` exposes `normalizeValue`, the orchestrator used by higher level form
  helpers.
- `types.ts` centralizes shared types, giving later phases a stable location to
  grow the normalization context and union option helpers.

Future phases will layer validation on top of this normalization pass. Keeping
this folder cohesive reduces the surface area that follow-up work needs to
understand.
