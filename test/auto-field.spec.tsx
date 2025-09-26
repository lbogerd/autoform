import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AutoField } from "../src/components/autoform/auto-field";

// The AutoField component contains a lot of conditional rendering paths based on
// the JSON schema passed to it. These tests are intentionally focused on the
// pieces of behaviour that are currently implemented so that future refactors
// can lean on them for safety. Each test uses comments to describe the
// expectations and the reasoning behind the chosen fixture data.

afterEach(() => {
  cleanup();
});

describe("AutoField", () => {
  it("renders a fallback message when the provided schema is not an object", () => {
    // The component guards against malformed schemas by checking the runtime
    // shape. Passing a primitive should exercise that branch.
    render(<AutoField jsonProperty={"not-a-schema"} />);

    expect(
      screen.getByText(/Invalid property schema: "not-a-schema"/i)
    ).toBeInTheDocument();
  });

  it("uses the first entry from anyOf definitions", () => {
    // anyOf currently renders the first schema option. We pass two options to
    // make the intention explicit and assert that the first one is honoured.
    render(
      <AutoField
        jsonProperty={{
          anyOf: [{ type: "string" }, { type: "number" }],
        }}
      />
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("renders specialised inputs for well-known string formats", () => {
    // Email format maps to an <input type="email" />. Using a format the
    // component already knows ensures we are asserting the present behaviour.
    render(<AutoField jsonProperty={{ type: "string", format: "email" }} />);

    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("renders enum properties using a select dropdown", () => {
    // Enumerations are rendered through the custom Select component. Because
    // Radix Select portals its menu we assert against the trigger text which
    // stays in the document.
    render(
      <AutoField
        jsonProperty={{
          type: "string",
          enum: ["alpha", "beta"],
        }}
      />
    );

    expect(screen.getByText("Select value...")).toBeInTheDocument();
  });

  it("supports tuple-style arrays by delegating to the first item schema", () => {
    // The implementation selects the first schema entry when an array of items
    // (tuple) is provided. Using a boolean schema lets us assert against the
    // checkbox input being rendered.
    render(
      <AutoField
        jsonProperty={{
          type: "array",
          items: [{ type: "boolean" }],
        }}
      />
    );

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("renders nested object properties as a list", () => {
    // Objects with explicit properties should be rendered as a nested list with
    // headings. We check for the heading text to confirm the structure.
    render(
      <AutoField
        jsonProperty={{
          type: "object",
          properties: {
            title: { type: "string" },
          },
        }}
      />
    );

    expect(screen.getByText(/title/i)).toBeInTheDocument();
  });

  it("renders key/value inputs when additionalProperties is allowed", () => {
    // The additionalProperties branch renders a generic key/value pair when
    // explicit properties are absent. We assert that the key input honours the
    // pattern attribute when provided.
    render(
      <AutoField
        jsonProperty={{
          type: "object",
          additionalProperties: { type: "string" },
          propertyNames: { pattern: "^[a-z]+$" },
        }}
      />
    );

    expect(screen.getByPlaceholderText("key")).toHaveAttribute(
      "pattern",
      "^[a-z]+$"
    );
  });

  it("renders tabs for anyOf and switches content when selecting a tab", async () => {
    const user = await (
      await import("@testing-library/user-event")
    ).default.setup();

    render(
      <AutoField
        jsonProperty={{
          anyOf: [
            { type: "string", title: "Text" },
            { type: "number", title: "Number" },
          ],
        }}
      />
    );

    // Tabs are rendered with proper roles
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    const textTab = screen.getByRole("tab", { name: /text/i });
    const numberTab = screen.getByRole("tab", { name: /number/i });

    // First option is active by default
    expect(textTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");

    // Switch to Number and assert input changes
    await user.click(numberTab);
    expect(numberTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("uses default labels when anyOf options have no title (falls back to type)", () => {
    render(
      <AutoField
        jsonProperty={{
          anyOf: [{ type: "string" }, { type: "number" }],
        }}
      />
    );

    expect(screen.getByRole("tab", { name: /string/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /number/i })).toBeInTheDocument();
  });
});
