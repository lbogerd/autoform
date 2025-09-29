import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { AutoForm } from "../src/components/autoform/auto-form";
import { z } from "zod";

beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  if (
    typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver ===
    "undefined"
  ) {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
});

describe("AutoForm required field marking", () => {
  it("marks top-level required fields with an asterisk and sets aria-required on inputs", () => {
    render(
      <AutoForm
        schema={z.object({
          name: z.string(),
          age: z.number().int().optional(),
          website: z.url(),
        })}
      />
    );

    const nameLabel = screen.getByText(/name/i, { selector: "label" });
    expect(nameLabel).toHaveTextContent(/name\*/i);
    const nameInput = screen.getByLabelText(/name/i);
    expect(nameInput).toHaveAttribute("aria-required", "true");

    const ageLabel = screen.getByText(/age/i, { selector: "label" });
    expect(ageLabel).not.toHaveTextContent(/\*$/);
    const ageInput = screen.getByLabelText(/age/i);
    expect(ageInput).not.toHaveAttribute("aria-required", "true");

    const websiteLabel = screen.getByText(/website/i, { selector: "label" });
    expect(websiteLabel).toHaveTextContent(/website\*/i);
    const websiteInput = screen.getByLabelText(/website/i);
    expect(websiteInput).toHaveAttribute("aria-required", "true");
  });

  it("marks nested required object fields and propagates aria-required", async () => {
    render(
      <AutoForm
        schema={z.object({
          person: z.object({
            firstName: z.string(),
            lastName: z.string().optional(),
          }),
        })}
      />
    );

    // Top-level label for the object should indicate required
    const personLabel = screen.getByText(/person/i, { selector: "label" });
    expect(personLabel).toHaveTextContent(/person\*/i);

    // Inside the object, only firstName is required
    const firstNameLabel = screen.getByText(/firstName/i, {
      selector: "label",
    });
    expect(firstNameLabel).toHaveTextContent(/firstName\*/i);
    expect(screen.getByLabelText(/firstName/i)).toHaveAttribute(
      "aria-required",
      "true"
    );

    const lastNameLabel = screen.getByText(/lastName/i, { selector: "label" });
    expect(lastNameLabel).not.toHaveTextContent(/\*$/);
    expect(screen.getByLabelText(/lastName/i)).not.toHaveAttribute(
      "aria-required",
      "true"
    );
  });

  it("marks required array fields at the property label", async () => {
    const user = userEvent.setup();
    render(
      <AutoForm
        schema={z.object({
          tags: z.array(z.string()),
        })}
      />
    );

    const tagsLabel = screen.getByText(/tags/i, { selector: "label" });
    expect(tagsLabel).toHaveTextContent(/tags\*/i);

    // Add an item to ensure array controls still work with required marking
    await user.click(screen.getByRole("button", { name: /add item/i }));
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("adds aria-required to selects and checkboxes when required", async () => {
    render(
      <AutoForm
        schema={z.object({
          role: z.enum(["admin", "user"]),
          agree: z.boolean(),
        })}
      />
    );

    // SelectTrigger is the button role; check aria-required on it
    const roleLabel = screen.getByText(/role/i, { selector: "label" });
    expect(roleLabel).toHaveTextContent(/role\*/i);

    const roleTrigger = screen.getByRole("combobox");
    expect(roleTrigger).toHaveAttribute("aria-required", "true");

    const agreeLabel = screen.getByText(/agree/i, { selector: "label" });
    expect(agreeLabel).toHaveTextContent(/agree\*/i);

    const agreeCheckbox = screen.getByRole("checkbox");
    expect(agreeCheckbox).toHaveAttribute("aria-required", "true");
  });
});
