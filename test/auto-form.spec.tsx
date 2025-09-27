import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it } from "vitest";

import { AutoForm } from "../src/components/autoform/auto-form";

// replaceRefs is currently invoked as part of rendering AutoForm. These tests
// focus on documenting how $ref entries are handled so future schema changes
// keep the same behaviour unless intentionally updated.
afterEach(() => {
  cleanup();
});

describe("AutoForm $ref handling", () => {
  it("replaces known refs using the corresponding $defs entry", () => {
    // When the schema contains a $ref pointing to an entry under $defs the
    // implementation swaps the reference for the full schema before passing it
    // to AutoField. Using an email schema ensures we can assert against the
    // specialised input that AutoField renders for string/email pairs.
    render(
      <AutoForm
        schema={{
          type: "object",
          $defs: {
            Email: { type: "string", format: "email" },
          },
          properties: {
            contact: { $ref: "#/$defs/Email" },
          },
        }}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("falls back to AutoField's error branch when the ref cannot be resolved", () => {
    // If a property references an unknown definition the original value is
    // preserved which means AutoField receives an object without a type field.
    // AutoField currently renders a helpful message in that scenario; this test
    // protects that behaviour.
    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            missing: { $ref: "#/$defs/Nope" },
          },
        }}
      />,
    );

    expect(
      screen.getByText('No type found: {"$ref":"#/$defs/Nope"}'),
    ).toBeInTheDocument();
  });
});
