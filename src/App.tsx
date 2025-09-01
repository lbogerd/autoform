import * as z from "zod";
import type { FormMeta } from "./core/types";
import { AutoForm } from "@/components/AutoForm";

const UserSchema = z.object({
  firstName: z.string().min(2).describe("Your given name"),
  lastName: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(13).max(120).default(18),
  newsletter: z.boolean().default(true),
  birthday: z.date().optional(),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

const meta: FormMeta = {
  firstName: { order: 1, placeholder: "Ada", width: "half" },
  lastName: { order: 2, placeholder: "Lovelace", width: "half" },
  email: { order: 3, placeholder: "ada@example.com" },
  age: { order: 4, width: "half" },
  newsletter: { order: 5, help: "Occasional product emails" },
  birthday: { order: 6, widget: "date" },
  role: {
    order: 7,
    widget: "select",
    options: [
      { label: "Administrator", value: "admin" },
      { label: "Editor", value: "editor" },
      { label: "Viewer", value: "viewer" },
    ],
  },
};

function App() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <AutoForm
        schema={UserSchema}
        meta={meta}
        submitLabel="Create user"
        onSubmit={async (values) => {
          // values typed as z.infer<typeof UserSchema>
          console.log(values);
        }}
      />
    </div>
  );
}

export default App;
