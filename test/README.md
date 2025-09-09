# Test Suite Overview

## zodIntrospect.spec.ts
Tests for flat (non-nested) Zod schemas including:
- Basic primitives (string, number, boolean, date)
- Constraints and validations
- Optional, default, and nullable wrappers
- Enum and literal types
- FormMeta application (labels, help, ordering)
- Error cases for truly unsupported types (tuples, records, maps)

## zodIntrospect.nested.spec.ts
Tests for nested Zod schemas including:

### Objects
- Nested object structures
- Meta application to nested fields
- Deeply nested objects (3+ levels)

### Arrays
- Arrays of primitives with constraints (min/max length)
- Arrays of objects
- Nested arrays (arrays of arrays)
- Arrays with default values

### Unions
- Simple union types (string | number)
- Union of objects
- Discriminated unions with type field
- Nested unions within other structures

### Complex Structures
- Arrays of objects containing unions
- Objects with arrays of unions
- Combined nested structures with meta application

### Error Cases
- Unsupported types (tuples, records, maps, sets)
- Empty objects and arrays

Both test suites validate that the `zodObjectToFieldSpecs` function correctly converts Zod schemas into the internal `FieldSpec` format used by the AutoForm component.
