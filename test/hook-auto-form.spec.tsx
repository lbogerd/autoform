import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { HookAutoForm } from "../src/components/autoform/hook-auto-form";

beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  if (typeof globalThis.ResizeObserver === "undefined") {
    // @ts-expect-error - jsdom does not provide ResizeObserver in the test environment
    globalThis.ResizeObserver = MockResizeObserver;
  }
});

afterEach(() => {
  cleanup();
});

describe("HookAutoForm", () => {
  it("resolves $ref entries before rendering inputs", () => {
    render(
      <HookAutoForm
        schema={{
          type: "object",
          $defs: {
            Email: { type: "string", format: "email" },
          },
          properties: {
            contact: { $ref: "#/$defs/Email" },
          },
        }}
      />
    );

    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("submits collected values via react-hook-form", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <HookAutoForm
        onSubmit={handleSubmit}
        schema={{
          type: "object",
          properties: {
            name: { type: "string" },
            optIn: { type: "boolean" },
          },
          required: ["name", "optIn"],
        }}
      />
    );

    await user.type(screen.getByLabelText(/name/i), "Alice");
    await user.click(screen.getByLabelText(/optIn/i));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({ name: "Alice", optIn: true });
  });

  it("allows adding and removing array items", async () => {
    const user = userEvent.setup();

    render(
      <HookAutoForm
        schema={{
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        }}
      />
    );

    const addButton = screen.getByRole("button", { name: /add item/i });

    await user.click(addButton);
    let textboxes = screen.getAllByRole("textbox");
    expect(textboxes).toHaveLength(1);

    await user.type(textboxes[0], "first");

    await user.click(addButton);
    textboxes = screen.getAllByRole("textbox");
    expect(textboxes).toHaveLength(2);

    await user.type(textboxes[1], "second");

    const removeButtons = screen.getAllByRole("button", { name: "Remove" });
    await user.click(removeButtons[0]);

    const remaining = screen.getAllByRole("textbox");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toHaveValue("second");
  });

  it("resets the form back to provided default values", async () => {
    const user = userEvent.setup();

    render(
      <HookAutoForm
        schema={{
          type: "object",
          properties: {
            name: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        }}
        defaultValues={{
          name: "Initial",
          tags: ["existing"],
        }}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveValue("Initial");

    const existingTagInput = screen.getByDisplayValue("existing");

    await user.clear(nameInput);
    await user.type(nameInput, "Changed");

    await user.clear(existingTagInput);
    await user.type(existingTagInput, "override");

    await user.click(screen.getByRole("button", { name: /add item/i }));
    const newTagInput = screen.getAllByRole("textbox").at(-1);
    expect(newTagInput).not.toBe(existingTagInput);
    await user.type(newTagInput!, "another");

    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText(/name/i)).toHaveValue("Initial");
    expect(screen.getByDisplayValue("existing")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("override")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("another")).not.toBeInTheDocument();
  });
});
