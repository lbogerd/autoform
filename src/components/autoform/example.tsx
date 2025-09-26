import { asJsonSchema } from "../../../test/kitchen-sink-schema";
import { AutoForm } from "./auto-form";
import { ZodAutoForm } from "./zod-auto-form";
import { z } from "zod";

const MeetingSchema = z.object({
  topic: z.string().min(1),
  startsAt: z.date(),
  followUpOn: z.date().optional(),
});

export const Example = () => {
  const input = asJsonSchema;

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">AutoForm</h2>
      <AutoForm schema={input} />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">ZodAutoForm</h2>
        <ZodAutoForm
          schema={MeetingSchema}
          defaultValues={{
            topic: "Quarterly sync",
            startsAt: new Date(),
          }}
        />
      </div>
    </div>
  );
};
