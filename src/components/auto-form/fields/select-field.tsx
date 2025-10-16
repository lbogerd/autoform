import { Select, SelectItem, SelectTrigger } from "@/components/ui/select";
import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import type { FieldProps } from "../logic/types";
import { ErrorText } from "./error-text";
import { FieldLabel } from "./field-label";
import { SelectContent, SelectValue } from "@radix-ui/react-select";

export const SelectField: FC<FieldProps> = ({ node, register, errors }) => {
  const options = node.enum ?? node.ui?.options ?? [];
  const selectTestId = getNodeTestId(node);

  return (
    <div>
      <FieldLabel title={node.title ?? node.path} htmlFor={selectTestId} />

      <Select {...register(node.path)}>
        <SelectTrigger id={selectTestId} data-testid={selectTestId}>
          <SelectValue
            placeholder={node.ui?.placeholder ?? "Select an option"}
          />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={`${node.path}-${String(option)}`}
              value={String(option)}
            >
              {String(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ErrorText path={node.path} errors={errors} />
    </div>
  );
};
