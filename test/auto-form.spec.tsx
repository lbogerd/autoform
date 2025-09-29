import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { AutoForm } from "../src/components/autoform/auto-form";
import { z, type ZodTypeAny } from "zod";

const anyOf = (...options: [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]) =>
  z.preprocess((raw) => {
    if (
      raw &&
      typeof raw === "object" &&
      Array.isArray((raw as { __anyOf?: unknown }).__anyOf)
    ) {
      const { __anyOf, __anyOfIndex } = raw as {
        __anyOf: unknown[];
        __anyOfIndex?: unknown;
      };
      const idx =
        typeof __anyOfIndex === "string"
          ? parseInt(__anyOfIndex, 10)
          : typeof __anyOfIndex === "number"
          ? __anyOfIndex
          : 0;
      return __anyOf[idx] ?? __anyOf[0];
    }

    return raw;
  }, z.union(options));

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

describe("HookAutoForm", () => {
  it("resolves $ref entries before rendering inputs", () => {
    const Email = z.email();

    render(<AutoForm schema={z.object({ contact: Email })} />);

    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("submits collected values via react-hook-form", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <AutoForm
        onSubmit={handleSubmit}
        schema={z.object({
          name: z.string(),
          optIn: z.boolean(),
        })}
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
      <AutoForm
        schema={z.object({
          tags: z.array(z.string()),
        })}
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
      <AutoForm
        schema={z.object({
          name: z.string(),
          tags: z.array(z.string()),
        })}
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

  it("renders anyOf options as tabs and switches active schema", async () => {
    const user = userEvent.setup();

    render(
      <AutoForm
        schema={z.object({
          choice: anyOf(
            z.string().meta({ title: "Text" }),
            z.boolean().meta({ title: "Flag" })
          ),
        })}
      />
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
        schema={z.object({
          value: anyOf(
            z.string().meta({ title: "Text" }),
            z.number().meta({ title: "Number" })
          ),
        })}
      />
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
        schema={z.object({
          choice: anyOf(
            z.string().meta({ title: "Text" }),
            z.boolean().meta({ title: "Flag" })
          ),
        })}
      />
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
        schema={z.object({
          person: z.object({
            contact: anyOf(
              z.email().meta({ title: "Email" }),
              z.number().meta({ title: "ID" })
            ),
          }),
        })}
      />
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
});
