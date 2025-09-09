import { describe, expect, it } from "vitest";
import * as z from "zod";
import type {
  BooleanFieldSpec,
  DateFieldSpec,
  EnumFieldSpec,
  FieldSpec,
  FormMeta,
  NumberFieldSpec,
  StringFieldSpec,
} from "../src/core/types";
import { zodObjectToFieldSpecs } from "../src/core/zodIntrospect";

function byName<T extends FieldSpec>(fields: FieldSpec[], name: string) {
  const f = fields.find((x) => x.name === name);
  if (!f) throw new Error(`Missing field ${name}`);
  return f as T;
}

describe("zodObjectToFieldSpecs (Zod v4)", () => {
  it("parses basic primitives and constraints", () => {
    const Schema = z.object({
      s: z.string().min(2).max(5).regex(/abc/),
      email: z.email(),
      url: z.url(),
      n: z.number().min(1).max(10).multipleOf(2),
      b: z.boolean(),
      d: z.date().min(new Date("2020-01-01")).max(new Date("2030-01-01")),
      role: z.enum(["admin", "user"]).default("user"),
    });

    const fields = zodObjectToFieldSpecs(Schema);

    const s = byName<StringFieldSpec>(fields, "s");
    expect(s.kind).toBe("string");
    expect(s.required).toBe(true);
    expect(s.minLength).toBe(2);
    expect(s.maxLength).toBe(5);
    expect(s.pattern).toBe("abc");

    const e = byName<StringFieldSpec>(fields, "email");
    expect(e.format).toBe("email");

    const u = byName<StringFieldSpec>(fields, "url");
    expect(u.format).toBe("url");

    const n = byName<NumberFieldSpec>(fields, "n");
    expect(n.min).toBe(1);
    expect(n.max).toBe(10);
    expect(n.step).toBe(2);

    const b = byName<BooleanFieldSpec>(fields, "b");
    expect(b.kind).toBe("boolean");

    const d = byName<DateFieldSpec>(fields, "d");
    expect(d.kind).toBe("date");
    expect(d.min instanceof Date || typeof d.min === "string").toBe(true);
    expect(d.max instanceof Date || typeof d.max === "string").toBe(true);

    const role = byName<EnumFieldSpec>(fields, "role");
    expect(role.kind).toBe("enum");
    expect(role.defaultValue).toBe("user");
    expect(role.options?.map((o) => o.value)).toEqual(["admin", "user"]);
  });

  it("honors optional, default, and nullable wrappers", () => {
    const Schema = z.object({
      a: z.string().optional(),
      b: z.number().default(3),
      c: z.boolean().nullable().default(false),
      d: z.date().nullable().optional(),
    });

    const fields = zodObjectToFieldSpecs(Schema);

    const a = byName<StringFieldSpec>(fields, "a");
    expect(a.required).toBe(false);

    const b = byName<NumberFieldSpec>(fields, "b");
    expect(b.required).toBe(false);
    expect(b.defaultValue).toBe(3);

    const c = byName<BooleanFieldSpec>(fields, "c");
    expect(c.required).toBe(false);

    const d = byName<DateFieldSpec>(fields, "d");
    expect(d.required).toBe(false);
  });

  it("treats literal as single-option enum", () => {
    const Schema = z.object({
      state: z.literal("fixed"),
    });

    const fields = zodObjectToFieldSpecs(Schema);
    const state = byName<EnumFieldSpec>(fields, "state");
    expect(state.kind).toBe("enum");
    expect(state.options?.[0]?.value).toBe("fixed");
    expect(state.defaultValue).toBe("fixed");
  });

  it("applies FormMeta label/help/order and preserves order when same", () => {
    const Schema = z.object({
      first: z.string(),
      second: z.string(),
      third: z.string(),
    });
    const meta: FormMeta = {
      third: { order: 1, label: "Third label", help: "Third help" },
      first: { order: 2 },
    };

    const fields = zodObjectToFieldSpecs(Schema, meta);

    expect(fields[0].name).toBe("third");
    expect(fields[0].label).toBe("Third label");
    expect(fields[0].description).toBe("Third help");
    expect(fields[1].name).toBe("first");
    expect(fields[2].name).toBe("second");
  });

  it("throws on unsupported complex types", () => {
    const WithTuple = z.object({ coords: z.tuple([z.number(), z.number()]) });
    const WithRecord = z.object({ mapping: z.record(z.string(), z.string()) });
    const WithMap = z.object({ cache: z.map(z.string(), z.number()) });

    expect(() => zodObjectToFieldSpecs(WithTuple)).toThrow(
      /tuples are not supported/
    );
    expect(() => zodObjectToFieldSpecs(WithRecord)).toThrow(
      /records are not supported/
    );
    expect(() => zodObjectToFieldSpecs(WithMap)).toThrow(
      /maps\/sets are not supported/
    );
  });
});
