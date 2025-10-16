import { getNodeTestId } from "@/lib/utils";
import { type FC, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { getDefaultValueForNode } from "../logic/default-values";
import { rebase } from "../logic/rebase";
import type { FieldProps } from "../logic/types";
import { ErrorText } from "./error-text";
import { FieldLabel } from "./field-label";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "lucide-react";

/**
 * Handles dynamic key/value collections by allowing users to add or remove
 * entries backed by an object in form state.
 */
export const RecordField: FC<FieldProps> = ({ node, render, errors }) => {
  const form = useFormContext();
  const control = form.control;
  const watched = useWatch({ control, name: node.path }) as Record<
    string,
    unknown
  > | null;
  const entries = Object.entries(watched ?? {});
  const [newKey, setNewKey] = useState("");
  const recordTestId = getNodeTestId(node);

  /**
   * Adds a new entry to the record when the proposed key is unique and
   * non-empty.
   */
  const addEntry = () => {
    const key = newKey.trim();

    if (!key) return;
    if (entries.some(([existing]) => existing === key)) return;

    const next = { ...(watched ?? {}) } as Record<string, unknown>;

    next[key] = getDefaultValueForNode(node.item);
    form.setValue(node.path, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setNewKey("");
  };

  /**
   * Removes the specified key from the record and unregisters its form fields.
   */
  const removeEntry = (key: string) => {
    const next = { ...(watched ?? {}) } as Record<string, unknown>;
    delete next[key];
    form.unregister(`${node.path}.${key}`);
    form.setValue(node.path, next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  /**
   * Determines if the "Add" button should be enabled based on whether the
   * proposed key is non-empty and unique.
   */
  const canAdd =
    Boolean(newKey.trim()) &&
    !entries.some(([existing]) => existing === newKey.trim());

  return (
    <div data-testid={recordTestId}>
      <FieldLabel title={node.title ?? node.path} />

      {entries.length === 0 ? (
        <div className="text-muted">No entries yet.</div>
      ) : null}

      {entries.map(([key]) => {
        // rebase the child node to the current key path so that nested fields
        // render correctly
        const child = node.item
          ? rebase(node.item, `${node.path}.${key}`)
          : null;

        return (
          <div key={key} className="flex gap-2 items-end">
            <div className="basis-1/3">
              <Label className="text-sm font-medium text-gray-700 uppercase">
                Key
              </Label>
              <Input
                type="text"
                value={key}
                readOnly
                data-testid={getNodeTestId(node, `key-${key}`)}
                className="p-2 w-full bg-gray-100"
              />
            </div>

            <div className="flex-grow">{child ? render(child) : null}</div>

            <Button
              type="button"
              variant="destructive"
              onClick={() => removeEntry(key)}
              aria-label={`Remove ${key}`}
              data-testid={getNodeTestId(node, `remove-${key}`)}
            >
              <XIcon size={16} />
            </Button>
          </div>
        );
      })}

      <div className="flex gap-2">
        <Input
          type="text"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="New key"
          data-testid={getNodeTestId(node, "new-key")}
          className="flex-grow"
        />

        <Button
          type="button"
          onClick={addEntry}
          disabled={!canAdd}
          data-testid={getNodeTestId(node, "add")}
        >
          <PlusIcon size={16} /> Add
        </Button>
      </div>

      <ErrorText path={node.path} errors={errors} />
    </div>
  );
};
