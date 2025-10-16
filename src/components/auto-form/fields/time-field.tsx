import { Input } from "@/components/ui/input";
import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import type { FieldProps } from "../logic/types";
import { ErrorText } from "./error-text";
import { FieldLabel } from "./field-label";

export const TimeField: FC<FieldProps> = ({ node, register, errors }) => {
  const inputTestId = getNodeTestId(node);

  return (
    <div>
      <FieldLabel title={node.title} htmlFor={inputTestId} />

      <Input
        id={inputTestId}
        type="time"
        placeholder={node.ui?.placeholder}
        step={1}
        data-testid={inputTestId}
        {...register(node.path)}
      />

      <ErrorText errors={errors} path={node.path} />
    </div>
  );
};
