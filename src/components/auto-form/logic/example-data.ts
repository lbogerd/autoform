import { z } from "zod";
import type { JSONSchemaNode } from "../logic/types";

const phoneRegex = /^\+?[0-9 ()-]{7,}$/;

const Contact = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("email"),
    email: z.email("Please enter a valid email address").meta({
      title: "Email Address",
    }),
  }),
  z.object({
    kind: z.literal("phone"),
    phone: z
      .string()
      .regex(phoneRegex, "Please enter a valid phone number")
      .meta({
        title: "Phone Number",
      }),
  }),
]);

export const FormSchema = z.object({
  name: z
    .string()
    .min(1, "Required")
    .default("")
    .meta({
      title: "Name",
      "x-ui": { placeholder: "Your name" },
    }),
  age: z.number().int().min(18).max(25).default(18).meta({
    title: "Age",
  }),
  gpa: z.number().multipleOf(0.1).min(0).max(4).default(3.5).meta({
    title: "GPA",
  }),
  favouriteColor: z.enum(["red", "green", "blue"]).default("green").meta({
    title: "Favourite Color",
  }),
  contact: Contact.default({ kind: "email", email: "fake@invalid" }).meta({
    title: "Preferred Contact",
  }),
  address: z
    .object({
      street: z.string().min(1, "Street is required").meta({
        title: "Street",
      }),
      city: z.string().min(1, "City is required").meta({
        title: "City",
      }),
      coordinates: z.object({
        lat: z
          .number()
          .min(-90, "Latitude must be ≥ -90")
          .max(90, "Latitude must be ≤ 90")
          .meta({
            title: "Latitude",
          }),
        lng: z
          .number()
          .min(-180, "Longitude must be ≥ -180")
          .max(180, "Longitude must be ≤ 180")
          .meta({
            title: "Longitude",
          }),
      }),
    })
    .default({
      street: "123 Example Ave",
      city: "Metropolis",
      coordinates: { lat: 51.5074, lng: -0.1278 },
    })
    .meta({
      title: "Address",
    }),
  workEmail: z
    .email("Please provide a valid work email")
    .default("dev@example.com")
    .meta({
      title: "Work Email",
    }),
  website: z
    .url("Please provide a valid URL")
    .default("https://example.com")
    .meta({
      title: "Website",
    }),
  eventDate: z.iso.date().default("2025-01-01").meta({
    title: "Event Date",
  }),
  eventTime: z.iso.time().default("09:00:00").meta({
    title: "Event Time",
  }),
  eventTimestamp: z.iso.datetime().default("2025-01-01T09:00:00Z").meta({
    title: "Event Timestamp",
  }),
  metadata: z
    .record(
      z.string().min(1, "Key is required").meta({ title: "Key" }),
      z.string().min(1, "Please enter a value").meta({ title: "Value" })
    )
    .default({ role: "Developer" })
    .meta({
      title: "Metadata",
    }),
  skills: z
    .array(z.string().min(1, "Skill cannot be empty").meta({ title: "Skill" }))
    .min(1, "Add at least one skill")
    .default(["React"])
    .meta({
      title: "Skills",
    }),
});

export const jsonSchema = z.toJSONSchema(FormSchema) as JSONSchemaNode;

console.log("JSON Schema:", JSON.stringify(jsonSchema, null, 2));
