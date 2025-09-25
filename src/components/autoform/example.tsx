import { asJsonSchema } from "../../../test/kitchen-sink-schema";
import { AutoForm } from "./auto-form";

export const Example = () => {
  const input = asJsonSchema;

  return (
    <div className="space-y-4">
      {/* @ts-ignore */}
      <AutoForm schema={input} />
    </div>
  );
};
