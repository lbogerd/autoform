import { asJsonSchema } from "../../../test/kitchen-sink-schema";
import { AutoForm } from "./auto-form";

export const Example = () => {
  const input = asJsonSchema;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">AutoForm</h2>
      <AutoForm schema={input} />
    </div>
  );
};
