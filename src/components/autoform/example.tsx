import * as z from "zod";
import { AutoForm } from "./auto-form";
import type { FormSchema } from "../../lib/auto-form/schemas";

export const Example = () => {
  return (
    <>
      <div className="space-y-4 p-4 pb-12 max-w-xl m-auto">
        <AutoForm
          schema={
            {
              title: "User Form",
              description: "A simple user form example",
              fields: {
                firstName: {
                  type: "string",
                  title: "First Name",
                  description: "Enter your first name",
                  required: true,
                  default: "",
                  testId: "first-name-input",
                },
                age: {
                  type: "number",
                  title: "Age",
                  description: "Enter your age",
                  default: 22,
                  testId: "age-input",
                },
                isStudent: {
                  type: "boolean",
                  title: "Are you a student?",
                  description: "Check if you are currently a student",
                  testId: "is-student-checkbox",
                },
                address: {
                  type: "object",
                  title: "Address",
                  description: "Enter your address details",
                  required: true,
                  testId: "address-input",
                  properties: {
                    street: {
                      type: "string",
                      title: "Street",
                      required: true,
                      testId: "street-input",
                    },
                    city: {
                      type: "string",
                      title: "City",
                      required: true,
                      testId: "city-input",
                    },
                    zipCode: {
                      type: "number",
                      title: "Zip Code",
                      testId: "zip-code-input",
                    },
                    coordinates: {
                      type: "object",
                      title: "Coordinates",
                      testId: "coordinates-input",
                      properties: {
                        latitude: {
                          type: "number",
                          title: "Latitude",
                          testId: "latitude-input",
                        },
                        longitude: {
                          type: "number",
                          title: "Longitude",
                          testId: "longitude-input",
                        },
                      },
                    },
                  },
                },
                hobbies: {
                  type: "array",
                  title: "Hobbies",
                  description: "List your hobbies",
                  testId: "hobbies-input",
                  itemType: {
                    type: "string",
                    title: "Hobby",
                  },
                },
                contactMethod: {
                  type: "union",
                  title: "Preferred Contact Method",
                  description: "Select your preferred contact method",
                  testId: "contact-method-input",
                  anyOf: [
                    {
                      type: "string",
                      title: "Email",
                      testId: "email-input",
                    },
                    {
                      type: "object",
                      title: "Phone",
                      properties: {
                        phoneNumber: {
                          type: "string",
                          title: "Phone Number",
                          required: true,
                        },
                      },
                    },
                  ],
                },
                metadata: {
                  type: "record",
                  title: "Metadata",
                  description: "Key-value pairs for additional info",
                  keyType: "string",
                  testId: "metadata-input",
                  valueType: {
                    type: "string",
                    title: "Value",
                  },
                },
                birthDate: {
                  type: "date",
                  title: "Birth Date",
                  description: "Select your birth date",
                  required: true,
                  testId: "birth-date-picker",
                },
                preferredContactTime: {
                  type: "time",
                  title: "Preferred Contact Time",
                  description: "Choose the best time to contact you",
                  default: "09:00",
                  testId: "preferred-time-input",
                },
                nextAppointment: {
                  type: "datetime",
                  title: "Next Appointment",
                  description: "Schedule your next appointment",
                  default: "2025-01-15T14:30",
                  testId: "next-appointment-field",
                },
              },
            } satisfies z.infer<typeof FormSchema>
          }
        />
      </div>

      {/* <section className="space-y-4 p-4 pb-12 max-w-xl m-auto">
        <h2 className="text-lg font-semibold">AutoForm</h2>
        <AutoForm schema={KitchenSink} />
      </section> */}
    </>
  );
};
