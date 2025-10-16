import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import type { FieldProps } from "../logic/types";
import { ErrorText } from "./error-text";
import { FieldLabel } from "./field-label";
import { Input } from "@/components/ui/input";

// TODO: replace with a proper date-time picker component
export const DateTimeField: FC<FieldProps> = ({ node, register, errors }) => {
  const inputTestId = getNodeTestId(node);
  return (
    <div>
      <FieldLabel title={node.title ?? node.path} htmlFor={inputTestId} />

      <Input
        id={inputTestId}
        type="text"
        placeholder={node.ui?.placeholder ?? "YYYY-MM-DDTHH:MM:SSZ"}
        data-testid={inputTestId}
        {...register(node.path)}
      />

      <ErrorText path={node.path} errors={errors} />
    </div>
  );
};
