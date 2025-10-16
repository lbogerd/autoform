import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import { useFieldArray } from "react-hook-form";
import { getDefaultValueForNode } from "../logic/default-values";
import { rebase } from "../logic/rebase";
import type { FieldProps } from "../logic/types";
import { FieldLabel } from "./field-label";
import { Button } from "@/components/ui/button";
import { Plus, XIcon } from "lucide-react";

/**
 * Manages an array of child nodes with add/remove controls, leveraging
 * react-hook-form's `useFieldArray` helper.
 */
export const ArrayField: FC<FieldProps> = ({ node, control, render }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: node.path,
  });
  const arrayTestId = getNodeTestId(node);

  return (
    <div data-testid={arrayTestId}>
      <FieldLabel title={node.title ?? node.path} />

      {fields.map((field, i) => (
        <div key={field.id} className="flex gap-2 items-center mb-2">
          <div className="flex-1">
            {render(rebase(node.item!, `${node.path}.${i}`))}
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => remove(i)}
            aria-label="Remove"
            data-testid={getNodeTestId(node, `remove-${i}`)}
          >
            <XIcon size={16} />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => append(getDefaultValueForNode(node.item))}
        data-testid={getNodeTestId(node, "add")}
      >
        <Plus size={16} className="mr-2" />
        Add Item
      </Button>
    </div>
  );
};
