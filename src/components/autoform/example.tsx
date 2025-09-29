import { asJsonSchema } from "../../../test/kitchen-sink-schema";
import { AutoForm } from "./auto-form";

export const Example = () => {
  const input = asJsonSchema;

  return (
    <section className="space-y-4 p-4 pb-12 max-w-xl m-auto">
      <h2 className="text-lg font-semibold">AutoForm</h2>
      <AutoForm schema={input} />
    </section>
  );
};
