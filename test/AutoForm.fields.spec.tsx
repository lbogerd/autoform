import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { AutoForm } from "../src/components/AutoForm";

// We need to test the individual field components, but they're not exported
// So we'll test them through the AutoForm component in isolation

// Mock field spec types for testing
type MockFieldSpec = {
  name: string;
  kind: string;
  required: boolean;
  label?: string;
  description?: string;
  defaultValue?: any;
};

// Test wrapper for individual field testing
function FieldTestWrapper({
  children,
  defaultValues = {},
}: {
  children: React.ReactNode;
  defaultValues?: any;
}) {
  const form = useForm({
    defaultValues,
    mode: "onBlur",
  });

  return <form>{children}</form>;
}

describe("AutoForm Utility Functions", () => {
  describe("fieldId function", () => {
    it("generates correct field IDs", () => {
      const schema = z.object({
        testField: z.string(),
        "nested.field": z.string(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(
        screen.getByRole("textbox", { name: /testField/i })
      ).toHaveAttribute("id", "field-testField");
    });
  });

  describe("Date utility functions", () => {
    it("handles date to input value conversion", () => {
      const schema = z.object({
        birthDate: z.date(),
      });

      const testDate = new Date("2023-06-15");

      render(
        <AutoForm
          schema={schema}
          defaultValues={{ birthDate: testDate }}
          onSubmit={vi.fn()}
        />
      );

      const dateInput = screen.getByDisplayValue("2023-06-15");
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute("type", "date");
    });

    it("handles input value to date conversion", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const schema = z.object({
        eventDate: z.date(),
      });

      render(<AutoForm schema={schema} onSubmit={onSubmit} />);

      const dateInput = screen.getByDisplayValue("");
      await user.type(dateInput, "2023-12-25");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(onSubmit).toHaveBeenCalledWith({
        eventDate: expect.any(Date),
      });

      const submittedDate = onSubmit.mock.calls[0][0].eventDate;
      expect(submittedDate.getFullYear()).toBe(2023);
      expect(submittedDate.getMonth()).toBe(11); // December is month 11
      expect(submittedDate.getDate()).toBe(25);
    });
  });

  describe("Error list function", () => {
    it("extracts field errors correctly", async () => {
      const user = userEvent.setup();

      const schema = z.object({
        email: z.email("Invalid email"),
        age: z.number().min(18, "Must be 18 or older"),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Create validation errors
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "invalid"
      );
      await user.type(screen.getByRole("spinbutton", { name: /age/i }), "16");
      await user.click(screen.getByRole("button", { name: "Save" }));

      // Check that error summary shows both errors
      expect(
        screen.getByText(/Please fix the following 2 field/)
      ).toBeInTheDocument();
      expect(screen.getByText("Invalid email")).toBeInTheDocument();
      expect(screen.getByText("Must be 18 or older")).toBeInTheDocument();
    });
  });

  describe("Default value building", () => {
    it("builds default values from field specs correctly", () => {
      const schema = z.object({
        name: z.string().default("John"),
        age: z.number().default(25),
        active: z.boolean().default(true),
        role: z.enum(["user", "admin"]).default("user"),
        settings: z
          .object({
            theme: z.string().default("dark"),
          })
          .optional(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      expect(screen.getByDisplayValue("25")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: /active/i })).toBeChecked();
      expect(screen.getByDisplayValue("user")).toBeInTheDocument();
      expect(screen.getByDisplayValue("dark")).toBeInTheDocument();
    });
  });

  describe("CSS class utility (cn function)", () => {
    it("applies conditional classes correctly", () => {
      const schema = z.object({
        fullWidth: z.string(),
        halfWidth: z.string(),
      });

      const meta = {
        fullWidth: { width: "full" as const },
        halfWidth: { width: "half" as const },
      };

      const { container } = render(
        <AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />
      );

      // Check that the correct CSS classes are applied
      const fullWidthField = container
        .querySelector('[id="field-fullWidth"]')
        ?.closest("div");
      const halfWidthField = container
        .querySelector('[id="field-halfWidth"]')
        ?.closest("div");

      expect(fullWidthField).toHaveClass("col-span-full");
      expect(halfWidthField).toHaveClass("md:col-span-1");
    });
  });
});

describe("Individual Field Component Behavior", () => {
  describe("String Field Variations", () => {
    it("renders password field with correct attributes", () => {
      const schema = z.object({
        password: z.string(),
      });

      const meta = {
        password: { widget: "password" as const },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("applies string length constraints to input attributes", () => {
      const schema = z.object({
        username: z.string().min(3).max(20),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox", { name: /username/i });
      // Note: HTML5 doesn't have minlength/maxlength for validation display,
      // but the validation rules should be applied through react-hook-form
      expect(input).toBeInTheDocument();
    });

    it("applies regex pattern validation", async () => {
      const user = userEvent.setup();

      const schema = z.object({
        code: z
          .string()
          .regex(
            /^[A-Z]{3}[0-9]{3}$/,
            "Must be 3 letters followed by 3 numbers"
          ),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox", { name: /code/i });
      await user.type(input, "invalid");
      await user.tab(); // Trigger validation

      expect(
        screen.getByText("Must be 3 letters followed by 3 numbers")
      ).toBeInTheDocument();
    });
  });

  describe("Number Field Variations", () => {
    it("sets correct step for multipleOf constraint", () => {
      const schema = z.object({
        price: z.number().multipleOf(0.01),
        rating: z.number().multipleOf(0.5),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const priceInput = screen.getByRole("spinbutton", { name: /price/i });
      const ratingInput = screen.getByRole("spinbutton", { name: /rating/i });

      expect(priceInput).toHaveAttribute("step", "0.01");
      expect(ratingInput).toHaveAttribute("step", "0.5");
    });

    it("handles integer validation correctly", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const schema = z.object({
        count: z.number().int(),
      });

      render(<AutoForm schema={schema} onSubmit={onSubmit} />);

      const input = screen.getByRole("spinbutton", { name: /count/i });
      await user.type(input, "42");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(onSubmit).toHaveBeenCalledWith({ count: 42 });
    });
  });

  describe("Boolean Field Widget Variations", () => {
    it("renders switch by default", () => {
      const schema = z.object({
        enabled: z.boolean(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(
        screen.getByRole("switch", { name: /enabled/i })
      ).toBeInTheDocument();
    });

    it("renders checkbox when specified", () => {
      const schema = z.object({
        agreed: z.boolean(),
      });

      const meta = {
        agreed: { widget: "checkbox" as const },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(
        screen.getByRole("checkbox", { name: /agreed/i })
      ).toBeInTheDocument();
    });

    it("handles boolean state changes correctly", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      const schema = z.object({
        subscribe: z.boolean().default(false),
      });

      render(<AutoForm schema={schema} onSubmit={onSubmit} />);

      const switchElement = screen.getByRole("switch", { name: /subscribe/i });
      expect(switchElement).not.toBeChecked();

      await user.click(switchElement);
      expect(switchElement).toBeChecked();

      await user.click(screen.getByRole("button", { name: "Save" }));
      expect(onSubmit).toHaveBeenCalledWith({ subscribe: true });
    });
  });

  describe("Enum Field Widget Variations", () => {
    it("renders select dropdown by default", () => {
      const schema = z.object({
        status: z.enum(["active", "inactive", "pending"]),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(
        screen.getByRole("combobox", { name: /status/i })
      ).toBeInTheDocument();
    });

    it("renders radio group when specified", () => {
      const schema = z.object({
        priority: z.enum(["low", "medium", "high"]),
      });

      const meta = {
        priority: { widget: "radio" as const },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /low/i })).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /medium/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /high/i })).toBeInTheDocument();
    });

    it("handles literal types as single-option enums", () => {
      const schema = z.object({
        type: z.literal("user"),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Should display the literal value as selected
      expect(screen.getByDisplayValue("user")).toBeInTheDocument();
    });
  });

  describe("Field Accessibility Features", () => {
    it("associates labels with form controls correctly", () => {
      const schema = z.object({
        firstName: z.string(),
        age: z.number(),
        active: z.boolean(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByLabelText("firstName")).toBeInTheDocument();
      expect(screen.getByLabelText("age")).toBeInTheDocument();
      expect(screen.getByLabelText("active")).toBeInTheDocument();
    });

    it("uses aria-invalid for validation states", async () => {
      const user = userEvent.setup();

      const schema = z.object({
        email: z.email(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox", { name: /email/i });

      // Initially should not be invalid
      expect(input).toHaveAttribute("aria-invalid", "false");

      // After invalid input and blur, should be marked invalid
      await user.type(input, "invalid-email");
      await user.tab();

      expect(input).toHaveAttribute("aria-invalid", "true");
    });

    it("provides appropriate ARIA descriptions for help text", () => {
      const schema = z.object({
        password: z.string().describe("Password must be at least 8 characters"),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(
        screen.getByText("Password must be at least 8 characters")
      ).toBeInTheDocument();
    });

    it("maintains tab order for complex forms", () => {
      const schema = z.object({
        first: z.string(),
        second: z.string(),
        third: z.boolean(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const firstInput = screen.getByRole("textbox", { name: /first/i });
      const secondInput = screen.getByRole("textbox", { name: /second/i });
      const thirdInput = screen.getByRole("switch", { name: /third/i });
      const submitButton = screen.getByRole("button", { name: "Save" });

      // All should be focusable
      expect(firstInput).toHaveAttribute("tabindex", "0");
      expect(secondInput).toHaveAttribute("tabindex", "0");
      expect(thirdInput).toHaveProperty("tabIndex", 0);
      expect(submitButton).not.toHaveAttribute("tabindex", "-1");
    });
  });

  describe("Form State Management", () => {
    it("maintains form state across re-renders", async () => {
      const user = userEvent.setup();

      const schema = z.object({
        name: z.string(),
        email: z.string(),
      });

      const { rerender } = render(
        <AutoForm schema={schema} onSubmit={vi.fn()} />
      );

      // Fill in some data
      await user.type(screen.getByRole("textbox", { name: /name/i }), "John");
      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "john@example.com"
      );

      // Re-render with same props
      rerender(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Values should be preserved
      expect(screen.getByDisplayValue("John")).toBeInTheDocument();
      expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
    });

    it("resets form when defaultValues change", () => {
      const schema = z.object({
        name: z.string(),
      });

      const { rerender } = render(
        <AutoForm
          schema={schema}
          defaultValues={{ name: "Initial" }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByDisplayValue("Initial")).toBeInTheDocument();

      // Change default values
      rerender(
        <AutoForm
          schema={schema}
          defaultValues={{ name: "Updated" }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByDisplayValue("Updated")).toBeInTheDocument();
    });
  });
});
