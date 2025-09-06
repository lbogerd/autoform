import type { required } from "node_modules/zod/v4/core/util.d.cts";
import * as z from "zod/v4/core";

type FieldSpec = {
  name: string;
  kind:
    | "string"
    | "number"
    | "boolean"
    | "undefined"
    | "object"
    | "default"
    | "date"
    | "null"
    | "array"
    | "union"
    | "intersection"
    | "tuple"
    | "record"
    | "enum"
    | "literal"
    | "optional"
    | "nullable"
    | "readonly"
    | "template_literal";
  required: boolean;
};

function fieldToSpec(field: z.$ZodTypes) {
  const fieldType = field._zod.def.type;

  switch (fieldType) {
    case "optional":
    case "nullable":
    case "default":
    case "readonly":
      return {
        kind: field._zod.def.innerType,
        required: false,
        defaultValue:
          fieldType === "default" ? field._zod.def.defaultValue : undefined,
      };
  }
}
``;
