import { replaceRefs } from "@/lib/autoform/refs";
import { AutoField } from "./auto-field";
import type { JsonSchema } from "./types";

export const AutoForm = ({ schema }: { schema: JsonSchema }) => {
  const resolvedSchema = replaceRefs(schema);

  return (
    <form action="">
      <ul className="space-y-4">
        {Object.entries(resolvedSchema.properties || {}).map(([key, value]) => (
          <li key={key}>
            <h2>{key}</h2>
            <AutoField jsonProperty={value} />
          </li>
        ))}
      </ul>
    </form>
  );
};
