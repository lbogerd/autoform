import { getNodeTestId } from "@/lib/utils";
import type { FC } from "react";
import { useFormContext } from "react-hook-form";
import type { FieldProps } from "../logic/types";
import { FieldLabel } from "./field-label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Renders a discriminated union selector, showing only the branch matching the
 * currently active discriminator value.
 */
export const UnionField: FC<FieldProps> = ({ node, render }) => {
  const discriminatorProperty = node.discriminator?.propertyName ?? "kind";
  const form = useFormContext();
  const pathToKind = node.path
    ? `${node.path}.${discriminatorProperty}`
    : discriminatorProperty;

  // Determine active from form state or default to first alt's const
  const active: string | undefined =
    form.watch(pathToKind) ??
    node.oneOf?.[0]?.schema?.properties?.[discriminatorProperty]?.const;

  const options: string[] =
    node.oneOf?.map((alt) =>
      String(alt.schema?.properties?.[discriminatorProperty]?.const)
    ) ?? [];
  const unionTestId = getNodeTestId(node);

  /**
   * Updates the active discriminator value and clears previously selected
   * branch values to keep the form state consistent.
   */
  const setActive = (k: string) => {
    form.setValue(pathToKind, k, { shouldValidate: true, shouldDirty: true });

    // Optional: clear other branch fields if switching
    for (const alt of node.oneOf ?? []) {
      const thisKind = String(
        alt.schema?.properties?.[discriminatorProperty]?.const
      );

      if (thisKind === k) continue;

      // Clear fields of non-active branch (except discriminator)
      for (const child of alt.properties ?? []) {
        if (child.path.endsWith(`.${discriminatorProperty}`)) continue;

        form.setValue(child.path, undefined, {
          shouldDirty: true,
          shouldValidate: false,
        });
      }
    }
  };

  return (
    <div data-testid={unionTestId}>
      <FieldLabel title={node.title ?? node.path} />

      <Tabs
        className="inline-flex border border-gray-300 rounded-md overflow-hidden"
        defaultValue={active}
      >
        <TabsList>
          {options.map((opt) => (
            <TabsTrigger
              key={opt}
              onClick={() => setActive(opt)}
              data-testid={getNodeTestId(node, `option-${opt}`)}
              value={opt}
            >
              {opt}
            </TabsTrigger>
          ))}
        </TabsList>

        {node.oneOf?.map((alt) => {
          const kindConst = String(
            alt.schema?.properties?.[discriminatorProperty]?.const
          );
          if (kindConst !== active) return null;
          const props = (alt.properties ?? []).filter(
            (p) => !p.path.endsWith(`.${discriminatorProperty}`)
          );

          return (
            <TabsContent value={kindConst} key={kindConst} className="p-2">
              {props.map(render)}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};
