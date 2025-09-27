import { describe, expect, it } from "vitest";
import { asJsonSchema, KitchenSink } from "./kitchen-sink-schema";
import { replaceRefs } from "../src/lib/autoform/refs";
import z from "zod";

describe("Base tests", () => {
  it("should parse the kitchen sink to json schema", () => {
    const jsonSchema = z.toJSONSchema(KitchenSink);
    expect(jsonSchema).toEqual(asJsonSchema);
  });

  it("should resolve refs correctly", () => {
    const FakeAddress = z.object({
      street: z.string(),
      city: z.string(),
      country: z.string(),
    });
    const FakeUser = z.object({
      id: z.uuid(),
      name: z.string(),
      email: z.email(),
      homeAddress: FakeAddress,
      workAddress: FakeAddress,
    });

    const jsonSchemaWithRefs = z.toJSONSchema(FakeUser, { reused: "ref" });

    const resolvedSchema = replaceRefs(jsonSchemaWithRefs);

    expect(resolvedSchema.properties).toEqual(
      z.toJSONSchema(FakeUser, { reused: "inline" }).properties,
    );
  });
});
