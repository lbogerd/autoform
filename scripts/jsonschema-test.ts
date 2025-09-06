import z, { nullable, optional } from "zod";

const subSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
});

const exampleSchema = z.object({
  simpleString: z.string().min(2).max(5).regex(/abc/),
  email: z.email(),
  url: z.url(),
  number: z.number().min(1).max(10).multipleOf(2),
  boolean: z.boolean(),
  date: z.date().min(new Date("2020-01-01")).max(new Date("2030-01-01")),
  role: z.enum(["admin", "user"]).default("user"),
  nullableString: z.string().nullable(),
  optionalString: z.string().optional(),
  emojiString: z.emoji(),
  enum: z
    .enum(["red", "green", "blue"])
    .describe("An enum of colors")
    .default("red"),
  union: z.union([z.string(), z.number()]),
  intersection: z.intersection(
    z.object({ a: z.string() }),
    z.object({ b: z.number() })
  ),
  array: z.array(z.number().min(0).max(100)).min(1).max(5),
  subSchema,
  record: z.record(z.string(), z.number()),
});

console.log(
  JSON.stringify(
    z.toJSONSchema(exampleSchema, {
      unrepresentable: "any",
      override: (ctx) => {
        const def = ctx.zodSchema._zod.def;

        // convert dates to date strings
        if (def.type === "date") {
          ctx.jsonSchema.type = "string";
          ctx.jsonSchema.format = "date-time";
        }
      },
    }),
    null,
    2
  )
);
// expected output:
// {
//   "$schema": "https://json-schema.org/draft/2020-12/schema",
//   "type": "object",
//   "properties": {
//     "simpleString": {
//       "type": "string",
//       "minLength": 2,
//       "maxLength": 5,
//       "pattern": "abc"
//     },
//     "email": {
//       "type": "string",
//       "format": "email",
//       "pattern": "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
//     },
//     "url": {
//       "type": "string",
//       "format": "uri"
//     },
//     "number": {
//       "type": "number",
//       "minimum": 1,
//       "maximum": 10,
//       "multipleOf": 2
//     },
//     "boolean": {
//       "type": "boolean"
//     },
//     "date": {
//       "type": "string",
//       "format": "date-time"
//     },
//     "role": {
//       "default": "user",
//       "type": "string",
//       "enum": [
//         "admin",
//         "user"
//       ]
//     },
//     "nullableString": {
//       "anyOf": [
//         {
//           "type": "string"
//         },
//         {
//           "type": "null"
//         }
//       ]
//     },
//     "optionalString": {
//       "type": "string"
//     },
//     "emojiString": {
//       "type": "string",
//       "format": "emoji",
//       "pattern": "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$"
//     },
//     "enum": {
//       "default": "red",
//       "description": "An enum of colors",
//       "type": "string",
//       "enum": [
//         "red",
//         "green",
//         "blue"
//       ]
//     },
//     "union": {
//       "anyOf": [
//         {
//           "type": "string"
//         },
//         {
//           "type": "number"
//         }
//       ]
//     },
//     "intersection": {
//       "allOf": [
//         {
//           "type": "object",
//           "properties": {
//             "a": {
//               "type": "string"
//             }
//           },
//           "required": [
//             "a"
//           ],
//           "additionalProperties": false
//         },
//         {
//           "type": "object",
//           "properties": {
//             "b": {
//               "type": "number"
//             }
//           },
//           "required": [
//             "b"
//           ],
//           "additionalProperties": false
//         }
//       ]
//     },
//     "array": {
//       "minItems": 1,
//       "maxItems": 5,
//       "type": "array",
//       "items": {
//         "type": "number",
//         "minimum": 0,
//         "maximum": 100
//       }
//     },
//     "subSchema": {
//       "type": "object",
//       "properties": {
//         "id": {
//           "type": "string",
//           "format": "uuid",
//           "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
//         },
//         "name": {
//           "type": "string"
//         }
//       },
//       "required": [
//         "id"
//       ],
//       "additionalProperties": false
//     },
//     "record": {
//       "type": "object",
//       "propertyNames": {
//         "type": "string"
//       },
//       "additionalProperties": {
//         "type": "number"
//       }
//     }
//   },
//   "required": [
//     "simpleString",
//     "email",
//     "url",
//     "number",
//     "boolean",
//     "date",
//     "role",
//     "nullableString",
//     "emojiString",
//     "enum",
//     "union",
//     "intersection",
//     "array",
//     "subSchema",
//     "record"
//   ],
//   "additionalProperties": false
// }
