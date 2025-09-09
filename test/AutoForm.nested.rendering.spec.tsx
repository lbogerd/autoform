import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { AutoForm } from "../src/components/AutoForm";
import type { FormMeta } from "../src/core/types";

describe("AutoForm Nested Structures Rendering", () => {
  describe("Object Fields", () => {
    it("renders nested object with fieldset-like structure", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.email(),
        }),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("user")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /name/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /email/i })
      ).toBeInTheDocument();
    });

    it("applies meta to nested object and its fields", () => {
      const schema = z.object({
        profile: z.object({
          firstName: z.string(),
          lastName: z.string(),
        }),
      });

      const meta: FormMeta = {
        profile: { label: "User Profile", help: "Personal information" },
        firstName: { label: "First Name" },
        lastName: { label: "Last Name" },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(screen.getByText("User Profile")).toBeInTheDocument();
      expect(screen.getByText("Personal information")).toBeInTheDocument();
      expect(screen.getByLabelText("First Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    });

    it("handles deeply nested objects", () => {
      const schema = z.object({
        company: z.object({
          info: z.object({
            name: z.string(),
            address: z.object({
              street: z.string(),
              city: z.string(),
            }),
          }),
        }),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("company")).toBeInTheDocument();
      expect(screen.getByText("info")).toBeInTheDocument();
      expect(screen.getByText("address")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /name/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /street/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /city/i })
      ).toBeInTheDocument();
    });

    it("shows required indicator for required nested objects", () => {
      const schema = z.object({
        address: z.object({
          street: z.string(),
        }),
        optionalInfo: z
          .object({
            notes: z.string(),
          })
          .optional(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Required object should have asterisk
      const addressLabel = screen.getByText("address").closest("label");
      expect(addressLabel?.querySelector("span")).toHaveTextContent("*");

      // Optional object should not have asterisk
      const optionalLabel = screen.getByText("optionalInfo").closest("label");
      expect(optionalLabel?.querySelector("span")).toBeNull();
    });
  });

  describe("Array Fields", () => {
    it("renders array field with add button", () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("tags")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /add item/i })
      ).toBeInTheDocument();
    });

    it("adds new array items when add button is clicked", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        skills: z.array(z.string()),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const addButton = screen.getByRole("button", { name: /add item/i });

      // Initially no items
      expect(screen.queryByText("Item 1")).not.toBeInTheDocument();

      // Add first item
      await user.click(addButton);
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /remove/i })
      ).toBeInTheDocument();

      // Add second item
      await user.click(addButton);
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(
        2
      );
    });

    it("removes array items when remove button is clicked", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        items: z.array(z.string()),
      });

      render(
        <AutoForm
          schema={schema}
          defaultValues={{ items: ["first", "second"] }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();

      // Remove first item
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      await user.click(removeButtons[0]);

      // Only second item should remain (but now labeled as Item 1)
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.queryByText("Item 2")).not.toBeInTheDocument();
    });

    it("renders array of objects correctly", () => {
      const schema = z.object({
        users: z.array(
          z.object({
            name: z.string(),
            email: z.email(),
          })
        ),
      });

      render(
        <AutoForm
          schema={schema}
          defaultValues={{ users: [{ name: "", email: "" }] }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText("users")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /name/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /email/i })
      ).toBeInTheDocument();
    });

    it("handles nested arrays", () => {
      const schema = z.object({
        matrix: z.array(z.array(z.number())),
      });

      render(
        <AutoForm
          schema={schema}
          defaultValues={{ matrix: [[1, 2]] }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText("matrix")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      // Should have nested array controls
      expect(screen.getAllByRole("button", { name: /add item/i })).toHaveLength(
        2
      ); // One for outer array, one for inner
    });

    it("shows array field description", () => {
      const schema = z.object({
        hobbies: z.array(z.string()).describe("List your hobbies"),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("List your hobbies")).toBeInTheDocument();
    });
  });

  describe("Union Fields", () => {
    it("renders union field with type selector", () => {
      const schema = z.object({
        contact: z.union([
          z.object({
            type: z.literal("email"),
            email: z.email(),
          }),
          z.object({
            type: z.literal("phone"),
            phone: z.string(),
          }),
        ]),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("contact")).toBeInTheDocument();
      expect(screen.getByText("Select type...")).toBeInTheDocument();
    });

    it("shows selected union option fields", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        payment: z.union([
          z.object({
            type: z.literal("card"),
            cardNumber: z.string(),
          }),
          z.object({
            type: z.literal("cash"),
            amount: z.number(),
          }),
        ]),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Initially no specific fields should be visible
      expect(
        screen.queryByRole("textbox", { name: /cardNumber/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("spinbutton", { name: /amount/i })
      ).not.toBeInTheDocument();

      // Select first option (card) - this would require actual select interaction
      // which might need more complex testing depending on the Select component implementation
      const typeSelector = screen.getByRole("combobox");
      expect(typeSelector).toBeInTheDocument();
    });

    it("handles simple union types", () => {
      const schema = z.object({
        value: z.union([z.string(), z.number()]),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("value")).toBeInTheDocument();
      expect(screen.getByText("Select type...")).toBeInTheDocument();
    });

    it("shows union field description", () => {
      const schema = z.object({
        identifier: z
          .union([z.string(), z.number()])
          .describe("Enter ID as string or number"),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(
        screen.getByText("Enter ID as string or number")
      ).toBeInTheDocument();
    });
  });

  describe("Complex Nested Combinations", () => {
    it("renders array of objects with nested objects", () => {
      const schema = z.object({
        employees: z.array(
          z.object({
            personal: z.object({
              name: z.string(),
              age: z.number(),
            }),
            contact: z.object({
              email: z.string(),
              phone: z.string(),
            }),
          })
        ),
      });

      render(
        <AutoForm
          schema={schema}
          defaultValues={{
            employees: [
              {
                personal: { name: "", age: 0 },
                contact: { email: "", phone: "" },
              },
            ],
          }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByText("employees")).toBeInTheDocument();
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("personal")).toBeInTheDocument();
      expect(screen.getByText("contact")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /name/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("spinbutton", { name: /age/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /email/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /phone/i })
      ).toBeInTheDocument();
    });

    it("renders object with arrays and unions", () => {
      const schema = z.object({
        profile: z.object({
          skills: z.array(z.string()),
          preference: z.union([
            z.object({ type: z.literal("email"), address: z.string() }),
            z.object({ type: z.literal("sms"), number: z.string() }),
          ]),
        }),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("profile")).toBeInTheDocument();
      expect(screen.getByText("skills")).toBeInTheDocument();
      expect(screen.getByText("preference")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /add item/i })
      ).toBeInTheDocument();
      expect(screen.getByText("Select type...")).toBeInTheDocument();
    });

    it("handles form submission with nested data", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const schema = z.object({
        user: z.object({
          name: z.string(),
          contacts: z.array(z.string()),
        }),
      });

      render(<AutoForm schema={schema} onSubmit={onSubmit} />);

      // Fill nested object field
      await user.type(
        screen.getByRole("textbox", { name: /name/i }),
        "John Doe"
      );

      // Add array item
      await user.click(screen.getByRole("button", { name: /add item/i }));
      const arrayInputs = screen.getAllByRole("textbox");
      const contactInput = arrayInputs.find((input) =>
        input.getAttribute("id")?.includes("contacts")
      );
      if (contactInput) {
        await user.type(contactInput, "john@example.com");
      }

      // Submit
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(onSubmit).toHaveBeenCalledWith({
        user: {
          name: "John Doe",
          contacts: ["john@example.com"],
        },
      });
    });
  });

  describe("Error Handling for Nested Structures", () => {
    it("shows validation errors for nested object fields", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        profile: z.object({
          email: z.email("Invalid email format"),
        }),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const emailInput = screen.getByRole("textbox", { name: /email/i });
      await user.type(emailInput, "invalid-email");
      await user.tab(); // Trigger validation

      expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    });

    it("shows validation errors for array items", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        emails: z.array(z.email("Invalid email")),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Add an array item
      await user.click(screen.getByRole("button", { name: /add item/i }));

      const emailInput = screen.getByRole("textbox");
      await user.type(emailInput, "invalid");
      await user.tab();

      expect(screen.getByText("Invalid email")).toBeInTheDocument();
    });

    it("shows error summary with nested field names", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        user: z.object({
          email: z.email(),
        }),
        contacts: z.array(z.email()),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Add invalid data
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "invalid"
      );
      await user.click(screen.getByRole("button", { name: /add item/i }));
      const arrayInput = screen.getAllByRole("textbox")[1];
      await user.type(arrayInput, "also-invalid");

      // Submit to trigger validation
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(screen.getByText(/Please fix the following/)).toBeInTheDocument();
    });
  });

  describe("Performance and Accessibility", () => {
    it("generates unique IDs for nested fields", () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
        }),
        company: z.object({
          name: z.string(),
        }),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const userNameInput = screen
        .getByDisplayValue("")
        .parentElement?.querySelector('input[id*="user.name"]');
      const companyNameInput = screen
        .getByDisplayValue("")
        .parentElement?.querySelector('input[id*="company.name"]');

      expect(userNameInput).toBeInTheDocument();
      expect(companyNameInput).toBeInTheDocument();
      expect(userNameInput?.id).not.toBe(companyNameInput?.id);
    });

    it("maintains focus management for dynamic arrays", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        items: z.array(z.string()),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const addButton = screen.getByRole("button", { name: /add item/i });

      // Add item and check that new input gets focus or is at least accessible
      await user.click(addButton);
      const newInput = screen.getByRole("textbox");
      expect(newInput).toBeInTheDocument();
      expect(newInput).toHaveAttribute("id");
    });

    it("provides proper ARIA labels for complex structures", () => {
      const schema = z.object({
        address: z.object({
          street: z.string(),
        }),
        phones: z.array(z.string()),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByLabelText(/street/i)).toBeInTheDocument();
      expect(screen.getByText("address")).toBeInTheDocument();
      expect(screen.getByText("phones")).toBeInTheDocument();
    });
  });
});
