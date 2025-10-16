import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import type { FieldProps } from "../logic/types";

/**
 * Wraps child nodes in a fieldset when the schema node represents an object
 * group.
 */
export const GroupField: FC<FieldProps> = ({ node, render }) => {
  const groupTestId = getNodeTestId(node);
  return (
    <fieldset
      data-testid={groupTestId}
      className="border border-gray-200 rounded-md p-4 mb-4"
    >
      {node.title && (
        <legend className="font-semibold py-2">{node.title}</legend>
      )}
      {(node.properties ?? []).map(render)}
    </fieldset>
  );
};
