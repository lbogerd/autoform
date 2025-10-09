import { describe, expect, test } from "vitest";

import { FormSchema } from "../src/lib/auto-form/schemas";
import { fromJsonSchema } from "../src/lib/auto-form/from-json-schema";

const exampleSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  properties: {
    firstName: {
      testId: "first-name-input",
      default: "",
      type: "string",
    },
    age: {
      testId: "age-input",
      default: 22,
      type: "number",
    },
    isStudent: {
      testId: "is-student-checkbox",
      type: "boolean",
    },
    address: {
      testId: "address-input",
      type: "object",
      properties: {
        street: {
          testId: "street-input",
          type: "string",
        },
        city: {
          testId: "city-input",
          type: "string",
        },
        zipCode: {
          testId: "zip-code-input",
          type: "number",
        },
        coordinates: {
          testId: "coordinates-input",
          type: "object",
          properties: {
            latitude: {
              testId: "latitude-input",
              type: "number",
            },
            longitude: {
              testId: "longitude-input",
              type: "number",
            },
          },
          additionalProperties: false,
        },
      },
      required: ["street", "city"],
      additionalProperties: false,
    },
    hobbies: {
      type: "array",
      items: {
        testId: "hobby-input",
        type: "string",
      },
    },
    contactMethod: {
      testId: "contact-method-input",
      anyOf: [
        {
          testId: "email-input",
          type: "string",
        },
        {
          testId: "phone-input",
          type: "object",
          properties: {
            phoneNumber: {
              testId: "phone-number-input",
              type: "string",
            },
          },
          required: ["phoneNumber"],
          additionalProperties: false,
        },
      ],
    },
    metadata: {
      testId: "metadata-input",
      type: "object",
      properties: {
        key: {
          testId: "metadata-key-input",
          type: "string",
        },
        value: {
          testId: "metadata-value-input",
          type: "string",
        },
      },
      required: ["key", "value"],
      additionalProperties: false,
    },
    birthDate: {
      testId: "birth-date-input",
      type: "string",
      format: "date",
      pattern:
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$",
    },
    preferredContactTime: {
      testId: "preferred-time-input",
      default: "09:00",
      type: "string",
      format: "time",
      pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?$",
    },
    nextAppointment: {
      testId: "next-appointment-field",
      default: "2025-01-15T14:30",
      type: "string",
      format: "date-time",
      pattern:
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    },
  },
  required: [
    "firstName",
    "age",
    "address",
    "contactMethod",
    "birthDate",
    "preferredContactTime",
    "nextAppointment",
  ],
  additionalProperties: false,
} as const;

describe("fromJsonSchema", () => {
  test("maps primitive types, defaults, and required flags", () => {
    const formSchema = fromJsonSchema(exampleSchema);
    const parsed = FormSchema.parse(formSchema);

    expect(parsed.fields.firstName).toEqual(
      expect.objectContaining({
        type: "string",
        title: "First Name",
        required: true,
        default: "",
        testId: "first-name-input",
      })
    );

    expect(parsed.fields.age).toEqual(
      expect.objectContaining({
        type: "number",
        title: "Age",
        required: true,
        default: 22,
        testId: "age-input",
      })
    );

    expect(parsed.fields.isStudent).toEqual(
      expect.objectContaining({
        type: "boolean",
        title: "Is Student",
        required: false,
        testId: "is-student-checkbox",
      })
    );
  });

  test("recursively maps nested object structures", () => {
    const formSchema = FormSchema.parse(fromJsonSchema(exampleSchema));
    const address = formSchema.fields.address;

    if (address.type !== "object") {
      throw new Error("address field should be an object");
    }

    expect(address).toMatchObject({
      type: "object",
      title: "Address",
      required: true,
      testId: "address-input",
    });

    expect(address.properties.street).toMatchObject({
      type: "string",
      title: "Street",
      required: true,
      testId: "street-input",
    });

    expect(address.properties.city).toMatchObject({
      type: "string",
      title: "City",
      required: true,
      testId: "city-input",
    });

    expect(address.properties.zipCode).toMatchObject({
      type: "number",
      title: "Zip Code",
      required: false,
      testId: "zip-code-input",
    });

    const coordinates = address.properties.coordinates;

    if (coordinates.type !== "object") {
      throw new Error("coordinates field should be an object");
    }

    expect(coordinates).toMatchObject({
      type: "object",
      title: "Coordinates",
      required: false,
      testId: "coordinates-input",
    });

    expect(coordinates.properties.latitude).toMatchObject({
      type: "number",
      title: "Latitude",
      required: false,
      testId: "latitude-input",
    });

    expect(coordinates.properties.longitude).toMatchObject({
      type: "number",
      title: "Longitude",
      required: false,
      testId: "longitude-input",
    });
  });

  test("supports array fields and preserves item metadata", () => {
    const formSchema = FormSchema.parse(fromJsonSchema(exampleSchema));
    const hobbies = formSchema.fields.hobbies;

    expect(hobbies).toMatchObject({
      type: "array",
      title: "Hobbies",
      required: false,
      itemType: {
        type: "string",
        title: "Hobby",
        required: false,
        testId: "hobby-input",
      },
    });
  });

  test("builds union fields from anyOf definitions", () => {
    const formSchema = FormSchema.parse(fromJsonSchema(exampleSchema));
    const contactMethod = formSchema.fields.contactMethod;

    if (contactMethod.type !== "union") {
      throw new Error("contact method field should be a union");
    }

    expect(contactMethod).toMatchObject({
      type: "union",
      title: "Contact Method",
      required: true,
      testId: "contact-method-input",
    });

    expect(contactMethod.anyOf[0]).toMatchObject({
      type: "string",
      title: "Email",
      required: false,
      testId: "email-input",
    });

    const phoneField = contactMethod.anyOf[1];

    if (phoneField.type !== "object") {
      throw new Error("phone option should be an object");
    }

    expect(phoneField).toMatchObject({
      type: "object",
      title: "Phone",
      required: false,
      testId: "phone-input",
    });

    expect(phoneField.properties.phoneNumber).toMatchObject({
      type: "string",
      title: "Phone Number",
      required: true,
      testId: "phone-number-input",
    });
  });

  test("maps string formats to specialized date/time field types", () => {
    const formSchema = FormSchema.parse(fromJsonSchema(exampleSchema));

    expect(formSchema.fields.birthDate).toMatchObject({
      type: "date",
      title: "Birth Date",
      required: true,
      testId: "birth-date-input",
    });

    expect(formSchema.fields.preferredContactTime).toMatchObject({
      type: "time",
      title: "Preferred Contact Time",
      required: true,
      default: "09:00",
      testId: "preferred-time-input",
    });

    expect(formSchema.fields.nextAppointment).toMatchObject({
      type: "datetime",
      title: "Next Appointment",
      required: true,
      default: "2025-01-15T14:30",
      testId: "next-appointment-field",
    });
  });
});
