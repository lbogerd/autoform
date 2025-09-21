import { describe, expect, it } from "vitest";
import { asJsonSchema, KitchenSink } from "./kitchen-sink-schema";
import z from "zod";

describe("Base tests", () => {
  it("should parse the kitchen sink to json schema", () => {
    const jsonSchema = z.toJSONSchema(KitchenSink);
    expect(jsonSchema).toEqual(asJsonSchema);
  });
});
