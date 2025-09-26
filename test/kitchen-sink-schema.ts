import type { JsonSchema } from "@/components/autoform/types";
import * as z from "zod";

/** Reused primitives (to test `reused: "ref"` extraction) */
const Name = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[\p{L}\p{M}\p{Nd}\p{Pc}\s'.-]+$/u)
  .meta({
    title: "Person name",
    description: "Unicode letters, spaces, and - . ' _",
  });

const Email = z
  .email()
  .meta({ title: "Email", description: "RFC 5322-style email" });
const URL = z.url();
const UUID = z.uuid();
const IPV4 = z.ipv4();
const IPV6 = z.ipv6();

/** Pattern-based string formats (become `pattern`) */
const Base64Url = z.base64url();
const Cuid = z.cuid();
const Cuid2 = z.cuid2();
const Ulid = z.ulid();
const Nanoid = z.nanoid();
const Emoji = z.emoji();
const CIDRv4 = z.cidrv4();
const CIDRv6 = z.cidrv6();

/** File schema with size + MIME */
const ImageFile = z
  .file()
  .min(1)
  .max(1024 * 1024)
  .mime("image/png");

/** Numeric variants */
const Float32 = z.float32(); // number with exclusive bounds to 32-bit
const Float64 = z.float64(); // number with exclusive bounds to 64-bit
const NumberGeneral = z.number().min(-100).max(100).multipleOf(0.25);
const Int = z.int().gte(-1000).lte(1000);
const Int32 = z.int32();

/** Enums */
const Color = z.enum(["red", "green", "blue"]).meta({ title: "Color enum" });
const RoleEnum = z.enum(["admin", "staff", "user"]);

/** Tuple (fixed) + rest */
const PositionTuple = z.tuple([z.number(), z.number()]).rest(z.number());

/** Records (string-keyed maps) */
const StringNumberRecord = z.record(z.string(), z.number().int());
const SlugIntRecord = z.record(z.string().regex(/^[a-z0-9-]+$/), z.int());

/** Discriminated union */
const Shape = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("circle"), radius: z.number().positive() }),
  z.object({ kind: z.literal("square"), side: z.number().positive() }),
  z.object({
    kind: z.literal("rect"),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
]);

/** Plain union & nullable/optional combos */
const StringOrNumber = z.union([z.string(), z.number()]);
const NullableString = z.string().nullable();
const OptionalString = z.string().optional();
const OptionalNullableString = z.string().nullable().optional();

/** Unknown & Any (→ `{}` in JSON Schema) */
const UnknownBlob = z.unknown();
const AnyBlob = z.any();

/** Arrays */
const StringList = z.array(z.string()).min(1).max(5);
const UniqueUUIDList = z.array(UUID).min(1); // uniqueness is not enforced by JSON Schema but fine for UI

/** Object variants with additionalProperties behaviors */
const DefaultObject = z.object({
  firstName: Name,
  lastName: Name,
}); // additionalProperties: false (output mode)

const LooseObject = z.looseObject({
  extraA: z.string(),
}); // never sets additionalProperties: false

const StrictObject = z.strictObject({
  exactly: z.string(),
}); // always sets additionalProperties: false

/** Recursive type to exercise $ref and cycles */
const Category: z.ZodObject = z.object({
  id: UUID,
  name: Name,
  children: z.array(z.lazy(() => Category)).default([]),
});

/** Example of defaults & coerced inputs (output type is representable) */
const AgeWithDefault = z.coerce.number().int().min(0).max(130).default(30);

/** ISO “format” strings */
const IsoDateTime = z.iso.datetime();
const IsoDate = z.iso.date();
const IsoTime = z.iso.time();
const IsoDuration = z.iso.duration();

/** Base64 via contentEncoding */
const Base64String = z.base64();

/** URL with pattern override example (query must include ?id=...) */
const URLWithPattern = URL.regex(/\?id=\w+$/);

/** Top-level “kitchen sink” schema */
export const KitchenSink = z
  .object({
    /** Simple scalars & formats */
    email: Email,
    url: URL,
    urlWithPattern: URLWithPattern,
    uuid: UUID,
    guid: z.guid(), // alias for uuid
    ipv4: IPV4,
    ipv6: IPV6,

    /** ISO formats */
    isoDatetime: IsoDateTime,
    isoDate: IsoDate,
    isoTime: IsoTime,
    isoDuration: IsoDuration,

    /** Pattern-only string formats */
    base64url: Base64Url,
    cuid: Cuid,
    cuid2: Cuid2,
    ulid: Ulid,
    nanoid: Nanoid,
    emoji: Emoji,
    cidrv4: CIDRv4,
    cidrv6: CIDRv6,

    /** contentEncoding */
    base64: Base64String,

    /** Numbers */
    float32: Float32,
    float64: Float64,
    numberGeneral: NumberGeneral,
    int: Int,
    int32: Int32,

    /** Booleans & literals */
    active: z.boolean(),
    literalYes: z.literal("yes"),

    /** Enums */
    color: Color,
    role: RoleEnum,

    /** Tuples & arrays */
    position: PositionTuple,
    stringList: StringList,
    uuidList: UniqueUUIDList,

    /** Unions */
    stringOrNumber: StringOrNumber,
    shape: Shape,

    /** Nullability / optionality */
    nullableString: NullableString,
    optionalString: OptionalString,
    optionalNullableString: OptionalNullableString,
    nullType: z.null(),

    /** Records (maps) */
    stringNumberRecord: StringNumberRecord,
    slugIntRecord: SlugIntRecord,

    /** Objects with different additionalProperties behaviors */
    defaultObject: DefaultObject,
    looseObject: LooseObject,
    strictObject: StrictObject,

    /** Files */
    avatarPng: ImageFile,
    attachments: z.array(z.file()),

    /** Recursive */
    categoryTree: Category,

    /** Defaults & coercions */
    ageWithDefault: AgeWithDefault,

    /** Unknown/Any (render as freeform JSON editor) */
    unknownBlob: UnknownBlob.meta({ description: "Any JSON value allowed" }),
    anyBlob: AnyBlob.meta({ description: "Any JSON value allowed" }),
  })
  .meta({
    title: "Kitchen Sink — Zod v4 → JSON Schema",
    description:
      "A comprehensive schema for exercising JSON Schema conversion across most Zod constructs that have clear JSON Schema equivalents.",
    examples: [
      {
        email: "a@example.com",
        url: "https://example.com",
        urlWithPattern: "https://example.com/page?id=123",
        uuid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        guid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        ipv4: "192.168.0.1",
        ipv6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        isoDatetime: "2025-09-18T09:00:00Z",
        isoDate: "2025-09-18",
        isoTime: "09:00:00",
        isoDuration: "P3DT4H",
        base64url: "SGVsbG8", // (not padded)
        cuid: "cjy0c9e9p0000s8x9k6h8q0f7",
        cuid2: "ckv2mp5e7x1q9o0r",
        ulid: "01F8MECHZX3TBDSZ7XRADM79XV",
        nanoid: "V1StGXR8_Z5jdHi6B-myT",
        emoji: "🎉",
        cidrv4: "10.0.0.0/24",
        cidrv6: "2001:db8::/32",
        base64: "SGVsbG8gV29ybGQ=",
        float32: 3.5,
        float64: 3.1415926535,
        numberGeneral: 12.5,
        int: 7,
        int32: 2147483647,
        active: true,
        literalYes: "yes",
        color: "red",
        role: "user",
        position: [10, 20, 30, 40],
        stringList: ["a", "b"],
        uuidList: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
        stringOrNumber: "x",
        shape: { kind: "circle", radius: 5 },
        nullableString: null,
        optionalString: "maybe",
        optionalNullableString: null,
        nullType: null,
        undefinedType: null,
        stringNumberRecord: { apples: 3 },
        slugIntRecord: { "item-1": 42 },
        defaultObject: { firstName: "Ada", lastName: "Lovelace" },
        looseObject: { extraA: "ok", extraB: "also ok" },
        strictObject: { exactly: "only this" },
        // avatarPng: (binary), attachments: (binary array)
        categoryTree: {
          id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          name: "Root",
          children: [],
        },
        ageWithDefault: 30,
        unknownBlob: { free: ["form", 1, true] },
        anyBlob: "anything",
      },
    ],
  });

/** Helpful aliases for your generator */
export type KitchenSinkInput = z.input<typeof KitchenSink>;
export type KitchenSinkOutput = z.output<typeof KitchenSink>;

// Expected output
export const asJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "Kitchen Sink — Zod v4 → JSON Schema",
  description:
    "A comprehensive schema for exercising JSON Schema conversion across most Zod constructs that have clear JSON Schema equivalents.",
  examples: [
    {
      email: "a@example.com",
      url: "https://example.com",
      urlWithPattern: "https://example.com/page?id=123",
      uuid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      guid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      ipv4: "192.168.0.1",
      ipv6: "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
      isoDatetime: "2025-09-18T09:00:00Z",
      isoDate: "2025-09-18",
      isoTime: "09:00:00",
      isoDuration: "P3DT4H",
      base64url: "SGVsbG8",
      cuid: "cjy0c9e9p0000s8x9k6h8q0f7",
      cuid2: "ckv2mp5e7x1q9o0r",
      ulid: "01F8MECHZX3TBDSZ7XRADM79XV",
      nanoid: "V1StGXR8_Z5jdHi6B-myT",
      emoji: "🎉",
      cidrv4: "10.0.0.0/24",
      cidrv6: "2001:db8::/32",
      base64: "SGVsbG8gV29ybGQ=",
      float32: 3.5,
      float64: 3.1415926535,
      numberGeneral: 12.5,
      int: 7,
      int32: 2147483647,
      active: true,
      literalYes: "yes",
      color: "red",
      role: "user",
      position: [10, 20, 30, 40],
      stringList: ["a", "b"],
      uuidList: ["3fa85f64-5717-4562-b3fc-2c963f66afa6"],
      stringOrNumber: "x",
      shape: {
        kind: "circle",
        radius: 5,
      },
      nullableString: null,
      optionalString: "maybe",
      optionalNullableString: null,
      nullType: null,
      undefinedType: null,
      stringNumberRecord: {
        apples: 3,
      },
      slugIntRecord: {
        "item-1": 42,
      },
      defaultObject: {
        firstName: "Ada",
        lastName: "Lovelace",
      },
      looseObject: {
        extraA: "ok",
        extraB: "also ok",
      },
      strictObject: {
        exactly: "only this",
      },
      categoryTree: {
        id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        name: "Root",
        children: [],
      },
      ageWithDefault: 30,
      unknownBlob: {
        free: ["form", 1, true],
      },
      anyBlob: "anything",
    },
  ],
  type: "object",
  properties: {
    email: {
      title: "Email",
      description: "RFC 5322-style email",
      type: "string",
      format: "email",
      pattern:
        "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$",
    },
    url: {
      type: "string",
      format: "uri",
    },
    urlWithPattern: {
      type: "string",
      pattern: "\\?id=\\w+$",
    },
    uuid: {
      type: "string",
      format: "uuid",
      pattern:
        "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
    },
    guid: {
      type: "string",
      format: "uuid",
      pattern:
        "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$",
    },
    ipv4: {
      type: "string",
      format: "ipv4",
      pattern:
        "^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$",
    },
    ipv6: {
      type: "string",
      format: "ipv6",
      pattern:
        "^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$",
    },
    isoDatetime: {
      type: "string",
      format: "date-time",
      pattern:
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    },
    isoDate: {
      type: "string",
      format: "date",
      pattern:
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))$",
    },
    isoTime: {
      type: "string",
      format: "time",
      pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?$",
    },
    isoDuration: {
      type: "string",
      format: "duration",
      pattern:
        "^P(?:(\\d+W)|(?!.*W)(?=\\d|T\\d)(\\d+Y)?(\\d+M)?(\\d+D)?(T(?=\\d)(\\d+H)?(\\d+M)?(\\d+([.,]\\d+)?S)?)?)$",
    },
    base64url: {
      type: "string",
      format: "base64url",
      contentEncoding: "base64url",
      pattern: "^[A-Za-z0-9_-]*$",
    },
    cuid: {
      type: "string",
      format: "cuid",
      pattern: "^[cC][^\\s-]{8,}$",
    },
    cuid2: {
      type: "string",
      format: "cuid2",
      pattern: "^[0-9a-z]+$",
    },
    ulid: {
      type: "string",
      format: "ulid",
      pattern: "^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$",
    },
    nanoid: {
      type: "string",
      format: "nanoid",
      pattern: "^[a-zA-Z0-9_-]{21}$",
    },
    emoji: {
      type: "string",
      format: "emoji",
      pattern: "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$",
    },
    cidrv4: {
      type: "string",
      format: "cidrv4",
      pattern:
        "^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\/([0-9]|[1-2][0-9]|3[0-2])$",
    },
    cidrv6: {
      type: "string",
      format: "cidrv6",
      pattern:
        "^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$",
    },
    base64: {
      type: "string",
      format: "base64",
      contentEncoding: "base64",
      pattern:
        "^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$",
    },
    float32: {
      type: "number",
      minimum: -3.4028234663852886e38,
      maximum: 3.4028234663852886e38,
    },
    float64: {
      type: "number",
      minimum: -1.7976931348623157e308,
      maximum: 1.7976931348623157e308,
    },
    numberGeneral: {
      type: "number",
      minimum: -100,
      maximum: 100,
      multipleOf: 0.25,
    },
    int: {
      type: "integer",
      minimum: -1000,
      maximum: 1000,
    },
    int32: {
      type: "integer",
      minimum: -2147483648,
      maximum: 2147483647,
    },
    active: {
      type: "boolean",
    },
    literalYes: {
      type: "string",
      const: "yes",
    },
    color: {
      title: "Color enum",
      type: "string",
      enum: ["red", "green", "blue"],
    },
    role: {
      type: "string",
      enum: ["admin", "staff", "user"],
    },
    position: {
      type: "array",
      prefixItems: [
        {
          type: "number",
        },
        {
          type: "number",
        },
      ],
      items: {
        type: "number",
      },
    },
    stringList: {
      minItems: 1,
      maxItems: 5,
      type: "array",
      items: {
        type: "string",
      },
    },
    uuidList: {
      minItems: 1,
      type: "array",
      items: {
        type: "string",
        format: "uuid",
        pattern:
          "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
      },
    },
    stringOrNumber: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "number",
        },
      ],
    },
    shape: {
      anyOf: [
        {
          type: "object",
          properties: {
            kind: {
              type: "string",
              const: "circle",
            },
            radius: {
              type: "number",
              exclusiveMinimum: 0,
            },
          },
          required: ["kind", "radius"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            kind: {
              type: "string",
              const: "square",
            },
            side: {
              type: "number",
              exclusiveMinimum: 0,
            },
          },
          required: ["kind", "side"],
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            kind: {
              type: "string",
              const: "rect",
            },
            width: {
              type: "number",
              exclusiveMinimum: 0,
            },
            height: {
              type: "number",
              exclusiveMinimum: 0,
            },
          },
          required: ["kind", "width", "height"],
          additionalProperties: false,
        },
      ],
    },
    nullableString: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },
    optionalString: {
      type: "string",
    },
    optionalNullableString: {
      anyOf: [
        {
          type: "string",
        },
        {
          type: "null",
        },
      ],
    },
    nullType: {
      type: "null",
    },
    stringNumberRecord: {
      type: "object",
      propertyNames: {
        type: "string",
      },
      additionalProperties: {
        type: "integer",
        minimum: -9007199254740991,
        maximum: 9007199254740991,
      },
    },
    slugIntRecord: {
      type: "object",
      propertyNames: {
        type: "string",
        pattern: "^[a-z0-9-]+$",
      },
      additionalProperties: {
        type: "integer",
        minimum: -9007199254740991,
        maximum: 9007199254740991,
      },
    },
    defaultObject: {
      type: "object",
      properties: {
        firstName: {
          title: "Person name",
          description: "Unicode letters, spaces, and - . ' _",
          type: "string",
          minLength: 1,
          maxLength: 100,
          pattern: "^[\\p{L}\\p{M}\\p{Nd}\\p{Pc}\\s'.-]+$",
        },
        lastName: {
          title: "Person name",
          description: "Unicode letters, spaces, and - . ' _",
          type: "string",
          minLength: 1,
          maxLength: 100,
          pattern: "^[\\p{L}\\p{M}\\p{Nd}\\p{Pc}\\s'.-]+$",
        },
      },
      required: ["firstName", "lastName"],
      additionalProperties: false,
    },
    looseObject: {
      type: "object",
      properties: {
        extraA: {
          type: "string",
        },
      },
      required: ["extraA"],
      additionalProperties: {},
    },
    strictObject: {
      type: "object",
      properties: {
        exactly: {
          type: "string",
        },
      },
      required: ["exactly"],
      additionalProperties: false,
    },
    avatarPng: {
      type: "string",
      format: "binary",
      contentEncoding: "binary",
      minLength: 1,
      maxLength: 1048576,
      contentMediaType: "image/png",
    },
    attachments: {
      type: "array",
      items: {
        type: "string",
        format: "binary",
        contentEncoding: "binary",
      },
    },
    categoryTree: {
      $ref: "#/$defs/__schema0",
    },
    ageWithDefault: {
      default: 30,
      type: "integer",
      minimum: 0,
      maximum: 130,
    },
    unknownBlob: {
      description: "Any JSON value allowed",
    },
    anyBlob: {
      description: "Any JSON value allowed",
    },
  },
  required: [
    "email",
    "url",
    "urlWithPattern",
    "uuid",
    "guid",
    "ipv4",
    "ipv6",
    "isoDatetime",
    "isoDate",
    "isoTime",
    "isoDuration",
    "base64url",
    "cuid",
    "cuid2",
    "ulid",
    "nanoid",
    "emoji",
    "cidrv4",
    "cidrv6",
    "base64",
    "float32",
    "float64",
    "numberGeneral",
    "int",
    "int32",
    "active",
    "literalYes",
    "color",
    "role",
    "position",
    "stringList",
    "uuidList",
    "stringOrNumber",
    "shape",
    "nullableString",
    "nullType",
    "stringNumberRecord",
    "slugIntRecord",
    "defaultObject",
    "looseObject",
    "strictObject",
    "avatarPng",
    "attachments",
    "categoryTree",
    "ageWithDefault",
    "unknownBlob",
    "anyBlob",
  ],
  additionalProperties: false,
  $defs: {
    __schema0: {
      type: "object",
      properties: {
        id: {
          type: "string",
          format: "uuid",
          pattern:
            "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$",
        },
        name: {
          title: "Person name",
          description: "Unicode letters, spaces, and - . ' _",
          type: "string",
          minLength: 1,
          maxLength: 100,
          pattern: "^[\\p{L}\\p{M}\\p{Nd}\\p{Pc}\\s'.-]+$",
        },
        children: {
          default: [],
          type: "array",
          items: {
            $ref: "#/$defs/__schema0",
          },
        },
      },
      required: ["id", "name", "children"],
      additionalProperties: false,
    },
  },
} as JsonSchema;
