import { AutoForm } from "@/components/AutoForm";
import * as z from "zod";
import type { FormMeta } from "./core/types";

// schema with all field types and constraints, including nested objects and arrays
const ComplexUserSchema = z.object({
  // Basic string fields with various formats
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .describe("Your given name"),
  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .describe("Your family name"),
  email: z
    .email("Please enter a valid email address")
    .describe("Your email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .describe("Choose a strong password"),
  website: z
    .url("Please enter a valid URL")
    .optional()
    .describe("Your personal website"),
  bio: z
    .string()
    .max(500, "Bio must be less than 500 characters")
    .optional()
    .describe("Tell us about yourself"),

  // Number fields
  age: z
    .number()
    .min(13, "Must be at least 13 years old")
    .max(120, "Must be less than 120 years old")
    .describe("Your age"),
  salary: z
    .number()
    .min(0, "Salary must be positive")
    .optional()
    .describe("Annual salary in USD"),

  // Boolean field
  agreeToTerms: z
    .boolean()
    .refine((val) => val === true, "You must agree to the terms")
    .describe("Agree to terms and conditions"),
  newsletter: z
    .boolean()
    .default(false)
    .describe("Subscribe to our newsletter"),
  marketingEmails: z
    .boolean()
    .default(false)
    .describe("Receive marketing emails"),

  // Date field
  birthDate: z
    .date()
    .max(new Date(), "Birth date cannot be in the future")
    .describe("Your date of birth"),

  // Enum field
  role: z
    .enum(["user", "admin", "moderator"])
    .describe("Your role in the system"),

  // Another enum for testing different widgets
  priority: z
    .enum(["low", "medium", "high"])
    .default("medium")
    .describe("Priority level"),

  // Nested object
  address: z
    .object({
      street: z
        .string()
        .min(1, "Street is required")
        .describe("Street address"),
      city: z.string().min(1, "City is required").describe("City"),
      state: z
        .string()
        .length(2, "State must be 2 characters")
        .describe("State abbreviation"),
      zipCode: z
        .string()
        .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code format")
        .describe("ZIP code"),
      country: z.string().default("US").describe("Country"),
    })
    .describe("Your mailing address"),

  // Array of simple values
  skills: z
    .array(z.string().min(1, "Skill name cannot be empty"))
    .min(1, "At least one skill is required")
    .describe("Your technical skills"),

  // Array of objects
  experiences: z
    .array(
      z.object({
        company: z
          .string()
          .min(1, "Company name is required")
          .describe("Company name"),
        position: z
          .string()
          .min(1, "Position is required")
          .describe("Job title"),
        startDate: z.date().describe("Start date"),
        endDate: z
          .date()
          .optional()
          .describe("End date (leave empty if current)"),
        description: z.string().optional().describe("Job description"),
      })
    )
    .optional()
    .describe("Work experience"),

  // Optional fields to test different scenarios
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format")
    .optional()
    .describe("Your phone number"),
  linkedinProfile: z
    .url("Please enter a valid LinkedIn URL")
    .optional()
    .describe("LinkedIn profile URL"),
});

// meta for the schema
const ComplexUserMetaSchema: FormMeta = {
  firstName: {
    placeholder: "Enter your first name",
    width: "half",
    order: 1,
  },
  lastName: {
    placeholder: "Enter your last name",
    width: "half",
    order: 2,
  },
  email: {
    placeholder: "you@example.com",
    width: "full",
    order: 3,
  },
  password: {
    widget: "password",
    placeholder: "Choose a secure password",
    width: "half",
    order: 4,
  },
  website: {
    placeholder: "https://yoursite.com",
    width: "half",
    order: 5,
  },
  bio: {
    widget: "textarea",
    placeholder: "Tell us about yourself...",
    width: "full",
    order: 6,
  },
  age: {
    placeholder: "25",
    width: "half",
    order: 7,
  },
  salary: {
    placeholder: "50000",
    width: "half",
    order: 8,
  },
  agreeToTerms: {
    widget: "checkbox",
    width: "full",
    order: 15,
  },
  newsletter: {
    widget: "switch",
    width: "full",
    order: 16,
  },
  marketingEmails: {
    widget: "checkbox",
    width: "full",
    order: 17,
  },
  birthDate: {
    width: "half",
    order: 9,
  },
  role: {
    widget: "select",
    width: "half",
    order: 10,
    options: [
      { label: "Regular User", value: "user" },
      { label: "Administrator", value: "admin" },
      { label: "Content Moderator", value: "moderator" },
    ],
  },
  priority: {
    widget: "radio",
    width: "full",
    order: 11,
    options: [
      { label: "Low Priority", value: "low" },
      { label: "Medium Priority", value: "medium" },
      { label: "High Priority", value: "high" },
    ],
  },
  phoneNumber: {
    placeholder: "+1 (555) 123-4567",
    width: "half",
    order: 12,
  },
  linkedinProfile: {
    placeholder: "https://linkedin.com/in/yourprofile",
    width: "half",
    order: 13,
  },
  // Address object fields
  "address.street": {
    placeholder: "123 Main St",
    width: "full",
  },
  "address.city": {
    placeholder: "New York",
    width: "half",
  },
  "address.state": {
    placeholder: "NY",
    width: "half",
  },
  "address.zipCode": {
    placeholder: "10001",
    width: "half",
  },
  "address.country": {
    placeholder: "US",
    width: "half",
  },
};

function App() {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AutoForm Demo</h1>
      <p className="text-gray-600 mb-8">
        This form demonstrates all the features of the AutoForm component,
        including various field types, validation, nested objects, arrays, and
        custom meta configurations.
      </p>

      <AutoForm
        schema={ComplexUserSchema}
        meta={ComplexUserMetaSchema}
        submitLabel="Create user"
        showErrorSummary={true}
        onSubmit={async (values) => {
          // values typed as z.infer<typeof ComplexUserSchema>
          console.log("Form submitted with values:", values);

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000));

          alert(
            "User created successfully! Check the console for the submitted values."
          );
        }}
      />
    </div>
  );
}

export default App;
