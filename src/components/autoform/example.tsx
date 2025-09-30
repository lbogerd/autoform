import { AutoForm } from "./auto-form";

export const Example = () => {
  return (
    <>
      <div className="space-y-4 p-4 pb-12 max-w-xl m-auto">
        <AutoForm
          schema={{
            title: "User Form",
            description: "A simple user form example",
            fields: {
              firstName: {
                type: "string",
                title: "First Name",
                description: "Enter your first name",
                required: true,
                default: "",
              },
              age: {
                type: "number",
                title: "Age",
                description: "Enter your age",
                default: 22,
              },
              isStudent: {
                type: "boolean",
                title: "Are you a student?",
                description: "Check if you are currently a student",
              },
              address: {
                type: "object",
                title: "Address",
                description: "Enter your address details",
                required: true,
                properties: {
                  street: {
                    type: "string",
                    title: "Street",
                    required: true,
                  },
                  city: {
                    type: "string",
                    title: "City",
                    required: true,
                  },
                  zipCode: {
                    type: "number",
                    title: "Zip Code",
                  },
                  coordinates: {
                    type: "object",
                    title: "Coordinates",
                    properties: {
                      latitude: {
                        type: "number",
                        title: "Latitude",
                      },
                      longitude: {
                        type: "number",
                        title: "Longitude",
                      },
                    },
                  },
                },
              },
              hobbies: {
                type: "array",
                title: "Hobbies",
                description: "List your hobbies",
                itemType: {
                  type: "string",
                  title: "Hobby",
                },
              },
            },
          }}
        />
      </div>

      {/* <section className="space-y-4 p-4 pb-12 max-w-xl m-auto">
        <h2 className="text-lg font-semibold">AutoForm</h2>
        <AutoForm schema={KitchenSink} />
      </section> */}
    </>
  );
};
