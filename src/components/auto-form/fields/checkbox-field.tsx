import { Checkbox } from "@/components/ui/checkbox";
import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import type { FieldProps } from "../logic/types";
import { ErrorText } from "./error-text";
import { FieldLabel } from "./field-label";

export const CheckboxField: FC<FieldProps> = ({ node, register, errors }) => {
  const required = false;

  const inputTestId = getNodeTestId(node);

  return (
    <div>
      <FieldLabel
        title={node.title}
        required={required}
        htmlFor={inputTestId}
      />

      <div className="flex items-center space-x-2">
        <Checkbox
          id={inputTestId}
          data-testid={inputTestId}
          {...register(node.path)}
        />

        {node.ui?.placeholder && <span>{node.ui?.placeholder}</span>}
      </div>

      <ErrorText errors={errors} path={node.path} />
    </div>
  );
};
