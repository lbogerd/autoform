import z from "zod";
import { KitchenSink } from "../../../test/kitchen-sink-schema";
import { AutoForm } from "./auto-form";

export const Example = () => {
  return (
    <>
      <div>
        <AutoForm
          schema={z.object({
            profile: z.object(
              {
                username: z
                  .string()
                  .min(3, { error: "Username must be at least 3 characters" }),
                bio: z
                  .string()
                  .min(50, { error: "Bio must be at least 50 characters" }),
              },
              { error: "Profile is required" }
            ),
          })}
        />
      </div>

      {/* <section className="space-y-4 p-4 pb-12 max-w-xl m-auto">
        <h2 className="text-lg font-semibold">AutoForm</h2>
        <AutoForm schema={KitchenSink} />
      </section> */}
    </>
  );
};
