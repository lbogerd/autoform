import * as z from "zod";
import { AutoForm } from "./auto-form";
import { fromJsonSchema } from "@/lib/auto-form/from-json-schema";

const testSchema = z.object({
  firstName: z.string().default("").meta({
    testId: "first-name-input",
    title: "First Name",
    description: "Enter your first name",
  }),
  age: z
    .number()
    .default(22)
    .meta({ testId: "age-input", title: "Age", description: "Enter your age" }),
  isStudent: z.boolean().optional().meta({
    testId: "is-student-checkbox",
    title: "Are you a student?",
    description: "Check if you are currently a student",
  }),
  address: z
    .object({
      street: z.string().meta({ testId: "street-input", title: "Street" }),
      city: z.string().meta({ testId: "city-input", title: "City" }),
      zipCode: z
        .number()
        .optional()
        .meta({ testId: "zip-code-input", title: "Zip Code" }),
      coordinates: z
        .object({
          latitude: z
            .number()
            .optional()
            .meta({ testId: "latitude-input", title: "Latitude" }),
          longitude: z
            .number()
            .optional()
            .meta({ testId: "longitude-input", title: "Longitude" }),
        })
        .optional()
        .meta({
          testId: "coordinates-input",
          title: "Coordinates",
        }),
    })
    .meta({
      testId: "address-input",
      title: "Address",
      description: "Enter your address details",
    }),
  hobbies: z.array(z.string().meta({ testId: "hobby-input" })).optional(),
  contactMethod: z
    .union([
      z.string().meta({ testId: "email-input" }),
      z
        .object({
          phoneNumber: z.string().meta({ testId: "phone-number-input" }),
        })
        .meta({ testId: "phone-input" }),
    ])
    .meta({ testId: "contact-method-input" }),
  extraData: z
    .object({
      key: z.string().meta({ testId: "extra-data-key-input" }),
      value: z
        .string()
        .meta({ testId: "extra-data-value-input", title: "Value" }),
    })
    .optional()
    .meta({ testId: "extra-data-input", title: "Extra Data" }),
  birthDate: z.iso.date().meta({
    testId: "birth-date-input",
    title: "Birth Date",
    description: "Select your birth date",
  }),
  preferredContactTime: z.iso.time().default("09:00").meta({
    testId: "preferred-time-input",
    title: "Preferred Contact Time",
    description: "Choose the best time to contact you",
  }),
  nextAppointment: z.iso.datetime().default("2025-01-15T14:30").meta({
    testId: "next-appointment-field",
    title: "Next Appointment",
    description: "Schedule your next appointment",
  }),
});

const asJson = z.toJSONSchema(testSchema);

export const Example = () => {
  return (
    <>
      <div className="space-y-4 p-4 pb-12 max-w-xl m-auto">
        <AutoForm schema={fromJsonSchema(asJson)} />
      </div>
    </>
  );
};

// OLD CODE PLEASE IGNORE
// schema={
//   {
//     title: "User Form",
//     description: "A simple user form example",
//     fields: {
//       firstName: {
//         type: "string",
//         title: "First Name",
//         description: "Enter your first name",
//         required: true,
//         default: "",
//         testId: "first-name-input",
//       },
//       age: {
//         type: "number",
//         title: "Age",
//         description: "Enter your age",
//         default: 22,
//         testId: "age-input",
//       },
//       isStudent: {
//         type: "boolean",
//         title: "Are you a student?",
//         description: "Check if you are currently a student",
//         testId: "is-student-checkbox",
//       },
//       address: {
//         type: "object",
//         title: "Address",
//         description: "Enter your address details",
//         required: true,
//         testId: "address-input",
//         properties: {
//           street: {
//             type: "string",
//             title: "Street",
//             required: true,
//             testId: "street-input",
//           },
//           city: {
//             type: "string",
//             title: "City",
//             required: true,
//             testId: "city-input",
//           },
//           zipCode: {
//             type: "number",
//             title: "Zip Code",
//             testId: "zip-code-input",
//           },
//           coordinates: {
//             type: "object",
//             title: "Coordinates",
//             testId: "coordinates-input",
//             properties: {
//               latitude: {
//                 type: "number",
//                 title: "Latitude",
//                 testId: "latitude-input",
//               },
//               longitude: {
//                 type: "number",
//                 title: "Longitude",
//                 testId: "longitude-input",
//               },
//             },
//           },
//         },
//       },
//       hobbies: {
//         type: "array",
//         title: "Hobbies",
//         description: "List your hobbies",
//         testId: "hobbies-input",
//         itemType: {
//           type: "string",
//           title: "Hobby",
//         },
//       },
//       contactMethod: {
//         type: "union",
//         title: "Preferred Contact Method",
//         description: "Select your preferred contact method",
//         testId: "contact-method-input",
//         anyOf: [
//           {
//             type: "string",
//             title: "Email",
//             testId: "email-input",
//           },
//           {
//             type: "object",
//             title: "Phone",
//             properties: {
//               phoneNumber: {
//                 type: "string",
//                 title: "Phone Number",
//                 required: true,
//               },
//             },
//           },
//         ],
//       },
//       extraData: {
//         type: "record",
//         title: "Extra Data",
//         description: "Key-value pairs for additional info",
//         keyType: "string",
//         testId: "extra-data-input",
//         valueType: {
//           type: "string",
//           title: "Value",
//         },
//       },
//       birthDate: {
//         type: "date",
//         title: "Birth Date",
//         description: "Select your birth date",
//         required: true,
//         testId: "birth-date-picker",
//       },
//       preferredContactTime: {
//         type: "time",
//         title: "Preferred Contact Time",
//         description: "Choose the best time to contact you",
//         default: "09:00",
//         testId: "preferred-time-input",
//       },
//       nextAppointment: {
//         type: "datetime",
//         title: "Next Appointment",
//         description: "Schedule your next appointment",
//         default: "2025-01-15T14:30",
//         testId: "next-appointment-field",
//       },
//     },
//   } satisfies z.infer<typeof FormSchema>
// }
