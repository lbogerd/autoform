import { describe, it, expect } from "vitest";
import * as z from "zod";
import {
  introspectObjectSchema,
  chooseFieldComponent,
  buildFormModel,
} from "../src/core/zodIntrospect";
import type { FormMeta } from "../src/core/types";

describe("introspectObjectSchema", () => {
  const Schema = z.object({
    name: z.string().min(2),
    email: z.email(),
    age: z.number().min(0).max(120).default(18),
    admin: z.boolean().default(false),
    status: z.enum(["active", "pending", "disabled"]).default("active"),
    role: z.union([z.literal("user"), z.literal("owner"), z.literal("guest")]),
    birthday: z.date().optional(),
  });

  it("generates specs for supported fields", () => {
    const specs = introspectObjectSchema(Schema);
    expect(Object.keys(specs)).toContain("name");
    expect(specs.email.kind).toBe("string");
    expect(specs.age).toMatchObject({
      kind: "number",
      min: 0,
      max: 120,
      required: false,
      defaultValue: 18,
    });
    expect(specs.admin).toMatchObject({ kind: "boolean" });
    expect(specs.status).toMatchObject({ kind: "enum" });
    expect(specs.role).toMatchObject({ kind: "enum" });
    expect(specs.birthday).toMatchObject({ kind: "date", required: false });
  });

  it("chooses correct UI component kinds", () => {
    const specs = introspectObjectSchema(Schema);
    expect(chooseFieldComponent(specs.name).component).toBe("input:text");
    expect(chooseFieldComponent(specs.email).component).toBe("input:email");
    expect(chooseFieldComponent(specs.age).component).toBe("input:number");
    expect(chooseFieldComponent(specs.admin).component).toBe("switch");
    expect(chooseFieldComponent(specs.status).component).toBe("select");
    expect(chooseFieldComponent(specs.birthday).component).toBe("date");
  });

  it("respects meta widget overrides", () => {
    const meta: FormMeta = {
      name: { widget: "select", options: [{ label: "A", value: "A" }] },
      admin: { widget: "switch" },
    };
    const specs = introspectObjectSchema(Schema);
    expect(chooseFieldComponent(specs.name, meta.name).component).toBe(
      "select"
    );
  });

  it("builds ordered form model", () => {
    const meta: FormMeta = {
      age: { order: 3 },
      name: { order: 1 },
      email: { order: 2 },
    };
    const model = buildFormModel(Schema, meta);
    expect(model.map((m) => m.spec.name).slice(0, 3)).toEqual([
      "name",
      "email",
      "age",
    ]);
  });
});
