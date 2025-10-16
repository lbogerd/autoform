import type { FC } from "react";
import type { NodeKind, FieldProps } from "../logic/types";
import { ArrayField } from "./array-field";
import { DateField } from "./date-field";
import { DateTimeField } from "./date-time-field";
import { GroupField } from "./group-field";
import { NumberField } from "./number-field";
import { RecordField } from "./record-field";
import { SelectField } from "./select-field";
import { TextField } from "./text-field";
import { TimeField } from "./time-field";
import { UnionField } from "./union-field";

/**
 * Default registry mapping normalized node kinds to their renderer components.
 */
export const registry: Record<NodeKind, FC<FieldProps>> = {
  string: TextField,
  email: TextField,
  url: TextField,
  number: NumberField,
  boolean: TextField, // minimal demo; you’d make a CheckboxField
  date: DateField,
  time: TimeField,
  dateTime: DateTimeField,
  select: SelectField,
  group: GroupField,
  record: RecordField,
  array: ArrayField,
  union: UnionField,
  unknown: TextField,
};
