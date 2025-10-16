import { Input } from "@/components/ui/input";
import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import { Controller } from "react-hook-form";
import type { FieldProps } from "../logic/types";
import { ErrorText } from "./error-text";
import { FieldLabel } from "./field-label";

export const NumberField: FC<FieldProps> = ({ node, control, errors }) => {
  const schemaType: string | undefined = node.schema?.type;
  const multipleOf: unknown = node.schema?.multipleOf;
  const resolvedStep: number | "any" =
    typeof multipleOf === "number" &&
    Number.isFinite(multipleOf) &&
    multipleOf > 0
      ? multipleOf
      : schemaType === "integer"
      ? 1
      : "any";
  const inputMode = resolvedStep === 1 ? "numeric" : "decimal";
  const inputTestId = getNodeTestId(node);

  return (
    <div>
      <FieldLabel title={node.title ?? node.path} htmlFor={inputTestId} />

      <Controller
        name={node.path}
        control={control}
        render={({ field }) => {
          const { value, onChange, ...rest } = field;

          return (
            <Input
              id={inputTestId}
              type="number"
              step={resolvedStep}
              inputMode={inputMode}
              value={Number.isFinite(value) ? value : value ?? ""}
              onChange={(e) =>
                onChange(
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
              data-testid={inputTestId}
              {...rest}
            />
          );
        }}
      />

      <ErrorText path={node.path} errors={errors} />
    </div>
  );
};
