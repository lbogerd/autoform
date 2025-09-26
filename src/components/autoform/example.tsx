import { asJsonSchema } from "../../../test/kitchen-sink-schema";
import { AutoForm } from "./auto-form";
import { HookAutoForm } from "./hook-auto-form";

export const Example = () => {
  const input = asJsonSchema;

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">AutoForm</h2>
        <AutoForm schema={input} />
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          HookAutoForm (react-hook-form)
        </h2>
        <HookAutoForm schema={input} />
      </section>
    </div>
  );
};
