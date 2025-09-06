import * as z from "zod";
import { BaseFieldSpec } from "../src/core/types";

const getDefaultValue = (zodProp: z.ZodType) => {
  if (zodProp instanceof z.ZodDefault === false) {
    return undefined;
  }

  const defaultValue = zodProp.def.defaultValue;

  if (typeof defaultValue === "function") {
    return defaultValue();
  }

  return defaultValue;
};

const isRequired = (zodProp: z.ZodType) => {
  const isNullable = zodProp.safeParse(null).success;
  const isOptional = zodProp.safeParse(undefined).success;

  return !(isNullable && isOptional);
};

// z.object({ ... }).optional().unwrap().shape;
// z.object({ ... }).nullable().unwrap().shape;
// z.object({ ... }).readonly().unwrap().shape;

const getInnerKind = (zodProp: z.ZodType) => {
  if (zodProp instanceof z.ZodOptional || zodProp instanceof z.ZodDefault) {
    return getInnerKind(zodProp.def.innerType);
  }

  return zodProp;
};

const schemaExample = z.object({
  basicString: z.string(),
  optionalMinNumber: z.number().min(0).optional(),
  email: z.email(),
  url: z.url(),
  enum: z.enum(["first", "second", "third"]).default("second"),
});

const shape = schemaExample.shape;

const toFieldSpec: Omit<BaseFieldSpec, "name"> = (zodType: z.ZodType) => {
  if (zodType instanceof z.ZodString) {
    return {
      kind: "string",
      required: isRequired(zodType),
      defaultValue: getDefaultValue(zodType),
    };
  }

  if (zodType instanceof z.ZodEmail) {
    return {
      kind: "string",
      required: isRequired(zodType),
      defaultValue: getDefaultValue(zodType),
    };
  }

  if (zodType instanceof z.ZodNumber) {
    return {
      kind: "number",
      required: isRequired(zodType),
      defaultValue: getDefaultValue(zodType),
    };
  }

  if (zodType instanceof z.ZodEnum) {
    return {
      kind: "enum",
      required: isRequired(zodType),
      defaultValue: getDefaultValue(zodType),
    };
  }

  return {
    kind: "unknown",
    required: false,
  };
};

const toFieldSpecsMap = (zodObject: z.ZodObject) => {
  const fieldSpecs = new Map<string, Omit<BaseFieldSpec, "name">>();

  const shape = zodObject.shape;

  for (const key in shape) {
    const prop = shape[key] as z.ZodType;
  }
};
