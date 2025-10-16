import type { FC } from "react";
import type { FieldProps } from "../logic/types";
import { getNodeTestId } from "@/lib/utils";
import { FieldLabel } from "./field-label";
import { Calendar } from "lucide-react";
import { ErrorText } from "./error-text";

export const DateField: FC<FieldProps> = ({ node, register, errors }) => {
  const inputTestId = getNodeTestId(node);

  return (
    <div>
      <FieldLabel title={node.title} required={false} htmlFor={inputTestId} />

      <Calendar
        id={inputTestId}
        data-testid={inputTestId}
        {...register(node.path)}
      />

      <ErrorText errors={errors} path={node.path} />
    </div>
  );
};
