import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AutoForm } from "../src/components/autoform/auto-form";

beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = MockResizeObserver;
  }
});

afterEach(() => {
  cleanup();
});

describe("AutoForm", () => {
  it("resolves $ref entries before rendering inputs", () => {
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

  it("submits collected values via react-hook-form", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <AutoForm
        onSubmit={handleSubmit}
        schema={{
          type: "object",
          properties: {
            name: { type: "string" },
            optIn: { type: "boolean" },
          },
          required: ["name", "optIn"],
        }}
      />,
    );

    await user.type(screen.getByLabelText(/name/i), "Alice");
    await user.click(screen.getByLabelText(/optIn/i));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({ name: "Alice", optIn: true });
  });

  it("uses schema defaults as initial values", () => {
    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            name: { type: "string", default: "Alice" },
            newsletter: { type: "boolean", default: true },
            settings: {
              type: "object",
              properties: {
                timezone: { type: "string", default: "UTC" },
                count: { type: "integer", default: 3 },
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Alice");
    expect(screen.getByLabelText(/newsletter/i)).toBeChecked();
    expect(screen.getByLabelText(/timezone/i)).toHaveValue("UTC");
    expect(screen.getByLabelText(/count/i)).toHaveValue(3);
  });

  it("prefers explicit defaultValues over schema defaults", () => {
    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            name: { type: "string", default: "Alice" },
            newsletter: { type: "boolean", default: true },
            settings: {
              type: "object",
              properties: {
                timezone: { type: "string", default: "UTC" },
                count: { type: "integer", default: 3 },
              },
            },
          },
        }}
        defaultValues={{
          name: "Override",
          settings: { count: 10 },
        }}
      />,
    );

    expect(screen.getByLabelText(/name/i)).toHaveValue("Override");
    expect(screen.getByLabelText(/newsletter/i)).toBeChecked();
    expect(screen.getByLabelText(/timezone/i)).toHaveValue("UTC");
    expect(screen.getByLabelText(/count/i)).toHaveValue(10);
  });

  it("allows adding and removing array items", async () => {
    const user = userEvent.setup();

    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
            },
          },
        }}
      />,
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
      <AutoForm
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
      />,
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

  it("renders anyOf options as tabs and switches active schema", async () => {
    const user = userEvent.setup();

    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            choice: {
              anyOf: [
                { type: "string", title: "Text" },
                { type: "boolean", title: "Flag" },
              ],
            },
          },
        }}
      />,
    );

    // Tabs and default selection
    const tablist = screen.getByRole("tablist");
    expect(tablist).toBeInTheDocument();
    const textTab = screen.getByRole("tab", { name: /text/i });
    const flagTab = screen.getByRole("tab", { name: /flag/i });
    expect(textTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    // Switch to boolean
    await user.click(flagTab);
    expect(flagTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("preserves field state per anyOf option when switching tabs", async () => {
    const user = userEvent.setup();

    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            value: {
              anyOf: [
                { type: "string", title: "Text" },
                { type: "number", title: "Number" },
              ],
            },
          },
        }}
      />,
    );

    await user.type(screen.getByLabelText(/value/i), "hello");
    await user.click(screen.getByRole("tab", { name: /number/i }));
    await user.type(screen.getByLabelText(/value/i), "42");
    await user.click(screen.getByRole("tab", { name: /text/i }));

    // Text value should remain
    expect(screen.getByLabelText(/value/i)).toHaveValue("hello");
  });

  it("submits only the active anyOf option value for a top-level field", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <AutoForm
        onSubmit={handleSubmit}
        schema={{
          type: "object",
          properties: {
            choice: {
              anyOf: [
                { type: "string", title: "Text" },
                { type: "boolean", title: "Flag" },
              ],
            },
          },
          required: ["choice"],
        }}
      />,
    );

    // Enter text, then switch to boolean and check it, then submit
    await user.type(screen.getByLabelText(/choice/i), "hello");
    await user.click(screen.getByRole("tab", { name: /flag/i }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenLastCalledWith({ choice: true });
  });

  it("normalizes nested anyOf within an object to match schema shape", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <AutoForm
        onSubmit={handleSubmit}
        schema={{
          type: "object",
          properties: {
            person: {
              type: "object",
              properties: {
                contact: {
                  anyOf: [
                    { type: "string", title: "Email", format: "email" },
                    { type: "number", title: "ID" },
                  ],
                },
              },
              required: ["contact"],
            },
          },
          required: ["person"],
        }}
      />,
    );

    // Default is Email tab; enter email, switch to ID and type a number, then back to Email
    await user.type(screen.getByLabelText(/contact/i), "bob@example.com");
    await user.click(screen.getByRole("tab", { name: /id/i }));
    await user.type(screen.getByLabelText(/contact/i), "42");
    await user.click(screen.getByRole("tab", { name: /email/i }));

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenLastCalledWith({
      person: { contact: "bob@example.com" },
    });
  });

  it("shows validation messages for required fields and clears once corrected", async () => {
    const user = userEvent.setup();

    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            name: { type: "string" },
          },
          required: ["name"],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("This field is required.")).toBeVisible();

    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.type(input, "Ada");

    await waitFor(() => {
      expect(
        screen.queryByText("This field is required."),
      ).not.toBeInTheDocument();
    });

    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("renders validation messages for multiple invalid fields simultaneously", async () => {
    const user = userEvent.setup();

    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string", format: "email" },
          },
          required: ["name", "email"],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    const messages = await screen.findAllByText("This field is required.");
    expect(messages).toHaveLength(2);

    expect(screen.getByLabelText(/name/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText(/email/i)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("applies custom validation message options when provided", async () => {
    const user = userEvent.setup();

    render(
      <AutoForm
        schema={{
          type: "object",
          properties: {
            username: { type: "string" },
          },
          required: ["username"],
        }}
        validationMessageProps={{
          className: "text-indigo-500",
          icon: <span data-testid="custom-validation-icon">!</span>,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveClass("text-indigo-500");
    expect(screen.getAllByTestId("custom-validation-icon")).toHaveLength(1);
  });
});
