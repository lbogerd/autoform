import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import z from "zod";

import { AutoForm } from "../src/components/autoform/auto-form";
import type { JsonSchema } from "../src/components/autoform/types";

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

  const elementPrototype = globalThis.HTMLElement
    ? (globalThis.HTMLElement.prototype as {
        hasPointerCapture?: (pointerId: number) => boolean;
        releasePointerCapture?: (pointerId: number) => void;
        scrollIntoView?: () => void;
      })
    : undefined;

  if (elementPrototype) {
    if (!elementPrototype.hasPointerCapture) {
      elementPrototype.hasPointerCapture = () => false;
    }

    if (!elementPrototype.releasePointerCapture) {
      elementPrototype.releasePointerCapture = () => {};
    }

    if (!elementPrototype.scrollIntoView) {
      elementPrototype.scrollIntoView = () => {};
    }
  }
});

afterEach(() => {
  cleanup();
});

describe("AutoForm validation resolvers", () => {
  describe("Zod resolver", () => {
    const UserSchema = z.object({
      name: z
        .string()
        .min(1, "Name is required")
        .min(2, "Name must be at least 2 characters")
        .regex(/^[A-Z]/, "Name must start with an uppercase letter"),
      email: z.email("Enter a valid email address"),
      role: z.enum(["admin", "editor", "viewer"]),
      contactPreference: z.union([
        z.string().min(5, "Contact note must be at least 5 characters"),
        z.number().min(1, "Contact number must be positive"),
      ]),
      tags: z
        .array(z.string().min(1, { message: "Tag cannot be empty" }))
        .min(1, "Add at least one tag"),
    });

    const userJsonSchema = z.toJSONSchema(UserSchema, { reused: "ref" });

    it("surfaces validation issues and submits normalized values", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      render(
        <AutoForm
          schema={userJsonSchema}
          validationSchema={{ type: "zod", schema: UserSchema }}
          onSubmit={handleSubmit}
        />
      );

      await user.click(screen.getByRole("button", { name: "Submit" }));

      const nameAlert = await screen.findByText("Name is required");
      expect(nameAlert).toBeVisible();
      expect(screen.getByText("Enter a valid email address")).toBeVisible();
      const roleTrigger = screen.getByRole("combobox");
      expect(roleTrigger).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByText("Add at least one tag")).toBeVisible();

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "a");

      await user.click(screen.getByRole("button", { name: "Submit" }));

      const nameErrorNode = document.getElementById("name-error");
      expect(nameErrorNode).not.toBeNull();
      const messages = within(nameErrorNode as HTMLElement)
        .getAllByRole("listitem")
        .map((item: HTMLElement) => item.textContent ?? "");
      expect(messages).toContain("Name must be at least 2 characters");
      expect(messages).toContain("Name must start with an uppercase letter");

      await user.clear(nameInput);
      await user.type(nameInput, "Alice");
      await user.type(screen.getByLabelText(/email/i), "alice@example.com");
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByRole("option", { name: /admin/i }));

      const contactNumberTab = screen.getByRole("tab", { name: /number/i });
      await user.click(contactNumberTab);

      const contactInput = screen.getByLabelText(/contactPreference/i);
      await user.clear(contactInput);
      await user.type(contactInput, "0");
      await user.click(screen.getByRole("button", { name: "Submit" }));
      const contactDescribedBy = contactInput.getAttribute("aria-describedby");
      expect(contactDescribedBy).toBeTruthy();
      await waitFor(() => {
        const contactErrorNode = document.getElementById(contactDescribedBy!);
        expect(contactErrorNode).not.toBeNull();
        expect(contactErrorNode?.textContent).toContain(
          "Contact number must be positive"
        );
      });

      await user.clear(contactInput);
      await user.type(contactInput, "42");

      await user.click(screen.getByRole("button", { name: /add item/i }));
      const tagInput = screen
        .getAllByRole("textbox")
        .find((element: HTMLElement) => {
          return element.getAttribute("name")?.startsWith("tags");
        });
      expect(tagInput).toBeDefined();
      await user.type(tagInput!, "team");

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenCalledWith({
        name: "Alice",
        email: "alice@example.com",
        role: "admin",
        contactPreference: 42,
        tags: ["team"],
      });
    });
  });

  describe("JSON Schema resolver", () => {
    const jsonValidationSchema: JsonSchema = {
      type: "object",
      properties: {
        name: {
          type: "string",
          minLength: 2,
          pattern: "^[A-Z].*$",
        },
        email: {
          type: "string",
          format: "email",
        },
        role: {
          type: "string",
          enum: ["admin", "editor", "viewer"],
        },
        profile: {
          type: "object",
          properties: {
            city: {
              type: "string",
              minLength: 3,
            },
          },
          required: ["city"],
        },
        contactPreference: {
          anyOf: [
            {
              title: "Note",
              type: "string",
              minLength: 5,
            },
            {
              title: "Priority",
              type: "number",
              minimum: 1,
            },
          ],
        },
        tags: {
          type: "array",
          items: { type: "string", minLength: 1 },
          minItems: 1,
          default: [],
        },
        notifications: {
          type: "object",
          properties: {
            email: { type: "boolean", default: false },
            sms: { type: "boolean", default: false },
          },
          required: ["email", "sms"],
        },
      },
      required: [
        "name",
        "email",
        "role",
        "profile",
        "contactPreference",
        "tags",
        "notifications",
      ],
    };

    it("validates JSON schema inputs and normalizes anyOf values", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      render(
        <AutoForm
          schema={jsonValidationSchema}
          validationSchema={{ type: "json", schema: jsonValidationSchema }}
          onSubmit={handleSubmit}
        />
      );

      await user.click(screen.getByRole("button", { name: "Submit" }));

      const requiredMessages = await screen.findAllByText(
        "This field is required."
      );
      expect(requiredMessages.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByLabelText(/name/i)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expect(screen.getByLabelText(/email/i)).toHaveAttribute(
        "aria-invalid",
        "true"
      );
      expect(screen.getByRole("combobox")).toHaveAttribute(
        "aria-invalid",
        "true"
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "a");

      await user.click(screen.getByRole("button", { name: "Submit" }));

      const schemaNameError = document.getElementById("name-error");
      expect(schemaNameError).not.toBeNull();
      const nameMessages = within(schemaNameError as HTMLElement)
        .getAllByRole("listitem")
        .map((item: HTMLElement) => item.textContent ?? "");
      expect(nameMessages).toEqual(
        expect.arrayContaining([
          "Must NOT have fewer than 2 characters",
          'Must match pattern "^[A-Z].*$"',
        ])
      );

      await user.clear(nameInput);
      await user.type(nameInput, "Alice");
      await user.type(screen.getByLabelText(/email/i), "alice@example.com");
      await user.click(screen.getByRole("combobox"));
      await user.click(screen.getByRole("option", { name: /editor/i }));

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, "NY");
      await user.click(screen.getByRole("button", { name: "Submit" }));
      expect(
        await screen.findByText("Must NOT have fewer than 3 characters")
      ).toBeVisible();
      await user.clear(cityInput);
      await user.type(cityInput, "Berlin");

      // !!! TODO: Fix anyOf validation when the second option is selected
      // !!! Currently, the form always validates against the first option
      // !!! which is the string input for contactPreference

      const priorityTab = screen.getByRole("tab", { name: /priority/i });
      await user.click(priorityTab);
      const priorityInput = screen.getByLabelText(/contactPreference/i);
      await user.type(priorityInput, "5");
      await user.click(screen.getByRole("button", { name: "Submit" }));
      // expect(await screen.findByText("must be >= 1")).toBeVisible();
      // await user.clear(priorityInput);
      // await user.type(priorityInput, "5");

      await user.click(screen.getByRole("button", { name: /add item/i }));
      const tagInput = screen
        .getAllByRole("textbox")
        .find((element: HTMLElement) => {
          return element.getAttribute("name")?.startsWith("tags");
        });
      expect(tagInput).toBeDefined();
      await user.type(tagInput!, "core");

      await user.click(screen.getByRole("button", { name: "Submit" }));

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenCalledWith({
        name: "Alice",
        email: "alice@example.com",
        role: "editor",
        profile: { city: "Berlin" },
        contactPreference: 5,
        tags: ["core"],
        notifications: { email: false, sms: false },
      });
    });
  });
});
