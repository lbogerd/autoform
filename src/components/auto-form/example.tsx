import { AutoForm } from "./auto-form";
import { FormSchema, jsonSchema } from "./logic/example-data";

/**
 * Demo wrapper that mounts the `AutoForm` with the sample Zod schema and shows
 * submission output via an alert for quick experimentation.
 */
export function Example() {
  return (
    <AutoForm
      zodSchema={FormSchema}
      jsonSchema={jsonSchema}
      onSubmit={(data) => {
        console.log("SUBMIT", data);
        alert(JSON.stringify(data, null, 2));
      }}
    />
  );
}
