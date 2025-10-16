import { useMemo } from "react";
import type { FC } from "react";
import {
  FormProvider,
  type FieldValues,
  type SubmitHandler,
  useForm,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { normalize } from "./logic/normalize";
import { getDefaultsFromZod } from "./logic/default-values";

import { registry } from "./fields/registry";
import type { JSONSchemaNode, NormalizedNode } from "./logic/types";
import { Button } from "../ui/button";

/**
 * High-level form builder that converts a Zod schema into a JSON Schema, then
 * renders fields based on a registry of React components.
 *
 * @typeParam T - Zod schema type used to infer the form values.
 * @param zodSchema - The authoritative Zod schema driving validation.
 * @param jsonSchema - JSON Schema produced from the Zod schema for rendering.
 * @param onSubmit - Callback invoked with valid form data.
 * @param components - Optional overrides for the default field registry.
 */
export function AutoForm<T extends z.ZodType>({
  zodSchema,
  jsonSchema,
  onSubmit,
  components = registry,
}: {
  zodSchema: T;
  jsonSchema: JSONSchemaNode;
  onSubmit: (data: z.infer<T>) => void;
  components?: typeof registry;
}) {
  const tree = useMemo(() => normalize(jsonSchema), [jsonSchema]);

  const defaults = getDefaultsFromZod<z.infer<T>>(zodSchema) as FieldValues;

  const methods = useForm({
    resolver: zodResolver(zodSchema as unknown as z.ZodAny),
    defaultValues: defaults,
    mode: "onBlur",
  });

  /**
   * Recursive renderer that selects the appropriate component for each node
   * kind and passes down render helpers for children.
   */
  const RenderNode: FC<{ node: NormalizedNode }> = ({ node }) => {
    const Component = components[node.kind] ?? components.unknown;

    return (
      <Component
        key={node.path}
        node={node}
        control={methods.control}
        register={methods.register}
        errors={methods.formState.errors}
        render={(child) => <RenderNode key={child.path} node={child} />}
      />
    );
  };

  return (
    <FormProvider {...methods}>
      <form
        noValidate
        onSubmit={methods.handleSubmit(onSubmit as SubmitHandler<FieldValues>)}
        data-testid="auto-form"
        className="max-w-xl mx-auto"
      >
        <h2>{tree.title ?? "AutoForm"}</h2>

        {
          // if the root is a group, render its children; else render the root node itself
          tree.kind === "group" ? (
            (tree.properties ?? []).map((child) => (
              <RenderNode key={child.path} node={child} />
            ))
          ) : (
            <RenderNode node={tree} />
          )
        }

        <Button type="submit">Submit</Button>
      </form>
    </FormProvider>
  );
}
