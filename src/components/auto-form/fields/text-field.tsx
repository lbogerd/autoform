import type { FC, HTMLInputTypeAttribute } from "react";
import type { FieldProps } from "../logic/types";
import { getNodeTestId } from "@/lib/utils";
import { FieldLabel } from "./field-label";
import { Input } from "@/components/ui/input";
import { ErrorText } from "./error-text";

/**
 * Generic text input renderer for string schema nodes that rely on
 * react-hook-form's `register` helper.
 */
export const TextField: FC<
  FieldProps & {
    type?: Extract<HTMLInputTypeAttribute, "text" | "email" | "url">;
  }
> = ({ node, register, errors, type }) => {
  const required = false; // TODO: derive from schema
  const inputTestId = getNodeTestId(node);

  return (
    <div>
      <FieldLabel
        title={node.title}
        required={required}
        htmlFor={inputTestId}
      />

      <Input
        id={inputTestId}
        type={type}
        placeholder={node.ui?.placeholder}
        data-testid={inputTestId}
        {...register(node.path)}
      />

      <ErrorText errors={errors} path={node.path} />
    </div>
  );
};
