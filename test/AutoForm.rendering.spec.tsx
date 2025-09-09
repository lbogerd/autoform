import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { AutoForm } from "../src/components/AutoForm";
import type { FormMeta } from "../src/core/types";

describe("AutoForm Component Rendering", () => {
  describe("String Fields", () => {
    it("renders basic string field with label and input", () => {
      const schema = z.object({
        name: z.string(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByLabelText("name")).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /name/i })
      ).toBeInTheDocument();
    });

    it("renders string field with custom label from meta", () => {
      const schema = z.object({
        firstName: z.string(),
      });

      const meta: FormMeta = {
        firstName: { label: "First Name" },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    });

    it("renders string field with placeholder", () => {
      const schema = z.object({
        email: z.string(),
      });

      const meta: FormMeta = {
        email: { placeholder: "Enter your email" },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(
        screen.getByPlaceholderText("Enter your email")
      ).toBeInTheDocument();
    });

    it("renders email field with correct input type", () => {
      const schema = z.object({
        email: z.email(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox", { name: /email/i });
      expect(input).toHaveAttribute("type", "email");
    });

    it("renders url field with correct input type", () => {
      const schema = z.object({
        website: z.url(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox", { name: /website/i });
      expect(input).toHaveAttribute("type", "url");
    });

    it("renders textarea when format is textarea", () => {
      const schema = z.object({
        bio: z.string(),
      });

      const meta: FormMeta = {
        bio: { widget: "textarea" },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(screen.getByRole("textbox", { name: /bio/i })).toHaveProperty(
        "tagName",
        "TEXTAREA"
      );
    });

    it("shows required asterisk for required fields", () => {
      const schema = z.object({
        name: z.string(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("shows field description when provided", () => {
      const schema = z.object({
        name: z.string().describe("Your full name"),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByText("Your full name")).toBeInTheDocument();
    });
  });

  describe("Number Fields", () => {
    it("renders number field with correct input type", () => {
      const schema = z.object({
        age: z.number(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("spinbutton", { name: /age/i });
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("inputMode", "decimal");
    });

    it("renders number field with min and max constraints", () => {
      const schema = z.object({
        score: z.number().min(0).max(100),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("spinbutton", { name: /score/i });
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
    });

    it("renders number field with step constraint", () => {
      const schema = z.object({
        rating: z.number().multipleOf(0.5),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("spinbutton", { name: /rating/i });
      expect(input).toHaveAttribute("step", "0.5");
    });
  });

  describe("Boolean Fields", () => {
    it("renders boolean field as switch by default", () => {
      const schema = z.object({
        active: z.boolean(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(
        screen.getByRole("switch", { name: /active/i })
      ).toBeInTheDocument();
    });

    it("renders boolean field as checkbox when specified in meta", () => {
      const schema = z.object({
        agree: z.boolean(),
      });

      const meta: FormMeta = {
        agree: { widget: "checkbox" },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(
        screen.getByRole("checkbox", { name: /agree/i })
      ).toBeInTheDocument();
    });
  });

  describe("Date Fields", () => {
    it("renders date field with correct input type", () => {
      const schema = z.object({
        birthDate: z.date(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByDisplayValue("");
      expect(input).toHaveAttribute("type", "date");
    });

    it("renders date field with min and max constraints", () => {
      const minDate = new Date("2000-01-01");
      const maxDate = new Date("2030-12-31");

      const schema = z.object({
        eventDate: z.date().min(minDate).max(maxDate),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByDisplayValue("");
      expect(input).toHaveAttribute("min", "2000-01-01");
      expect(input).toHaveAttribute("max", "2030-12-31");
    });
  });

  describe("Enum Fields", () => {
    it("renders enum field as select by default", () => {
      const schema = z.object({
        role: z.enum(["admin", "user", "guest"]),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(
        screen.getByRole("combobox", { name: /role/i })
      ).toBeInTheDocument();
    });

    it("renders enum field as radio group when specified in meta", () => {
      const schema = z.object({
        priority: z.enum(["low", "medium", "high"]),
      });

      const meta: FormMeta = {
        priority: { widget: "radio" },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /low/i })).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /medium/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /high/i })).toBeInTheDocument();
    });

    it("renders custom option labels from meta", () => {
      const schema = z.object({
        status: z.enum(["active", "inactive"]),
      });

      const meta: FormMeta = {
        status: {
          widget: "radio",
          options: [
            { label: "Currently Active", value: "active" },
            { label: "Currently Inactive", value: "inactive" },
          ],
        },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      expect(screen.getByText("Currently Active")).toBeInTheDocument();
      expect(screen.getByText("Currently Inactive")).toBeInTheDocument();
    });
  });

  describe("Form Layout and Structure", () => {
    it("renders submit button with default label", () => {
      const schema = z.object({
        name: z.string(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });

    it("renders submit button with custom label", () => {
      const schema = z.object({
        name: z.string(),
      });

      render(
        <AutoForm
          schema={schema}
          submitLabel="Create User"
          onSubmit={vi.fn()}
        />
      );

      expect(
        screen.getByRole("button", { name: "Create User" })
      ).toBeInTheDocument();
    });

    it("applies custom CSS class to form", () => {
      const schema = z.object({
        name: z.string(),
      });

      const { container } = render(
        <AutoForm
          schema={schema}
          className="custom-form-class"
          onSubmit={vi.fn()}
        />
      );

      expect(container.querySelector("form")).toHaveClass("custom-form-class");
    });

    it("shows error summary when there are validation errors", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        email: z.email(),
        age: z.number().min(18),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      // Submit form without filling required fields
      await user.click(screen.getByRole("button", { name: "Save" }));

      // Should show error summary
      expect(screen.getByText(/Please fix the following/)).toBeInTheDocument();
    });

    it("hides error summary when showErrorSummary is false", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        email: z.email(),
      });

      render(
        <AutoForm schema={schema} showErrorSummary={false} onSubmit={vi.fn()} />
      );

      // Submit form without filling required fields
      await user.click(screen.getByRole("button", { name: "Save" }));

      // Should not show error summary
      expect(
        screen.queryByText(/Please fix the following/)
      ).not.toBeInTheDocument();
    });
  });

  describe("Field Ordering and Width", () => {
    it("renders fields in specified order from meta", () => {
      const schema = z.object({
        first: z.string(),
        second: z.string(),
        third: z.string(),
      });

      const meta: FormMeta = {
        third: { order: 1 },
        first: { order: 2 },
        second: { order: 3 },
      };

      render(<AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />);

      const inputs = screen.getAllByRole("textbox");
      expect(inputs[0]).toHaveAttribute("id", "field-third");
      expect(inputs[1]).toHaveAttribute("id", "field-first");
      expect(inputs[2]).toHaveAttribute("id", "field-second");
    });

    it("applies width classes from meta", () => {
      const schema = z.object({
        fullWidth: z.string(),
        halfWidth: z.string(),
      });

      const meta: FormMeta = {
        fullWidth: { width: "full" },
        halfWidth: { width: "half" },
      };

      const { container } = render(
        <AutoForm schema={schema} meta={meta} onSubmit={vi.fn()} />
      );

      const fullWidthWrapper = container
        .querySelector('[id="field-fullWidth"]')
        ?.closest(".col-span-full");
      const halfWidthWrapper = container
        .querySelector('[id="field-halfWidth"]')
        ?.closest(".md\\:col-span-1");

      expect(fullWidthWrapper).toBeInTheDocument();
      expect(halfWidthWrapper).toBeInTheDocument();
    });
  });

  describe("Default Values", () => {
    it("displays default values from schema", () => {
      const schema = z.object({
        status: z.enum(["active", "inactive"]).default("active"),
        newsletter: z.boolean().default(true),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      expect(screen.getByDisplayValue("active")).toBeInTheDocument();
      expect(screen.getByRole("switch", { name: /newsletter/i })).toBeChecked();
    });

    it("merges default values from props with schema defaults", () => {
      const schema = z.object({
        name: z.string().default("John"),
        age: z.number().default(25),
      });

      render(
        <AutoForm
          schema={schema}
          defaultValues={{ name: "Jane" }}
          onSubmit={vi.fn()}
        />
      );

      expect(screen.getByDisplayValue("Jane")).toBeInTheDocument(); // props override
      expect(screen.getByDisplayValue("25")).toBeInTheDocument(); // schema default
    });
  });

  describe("Validation and Error Display", () => {
    it("shows field-level validation errors", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        email: z.email("Please enter a valid email"),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox", { name: /email/i });
      await user.type(input, "invalid-email");
      await user.tab(); // Trigger blur validation

      expect(
        screen.getByText("Please enter a valid email")
      ).toBeInTheDocument();
    });

    it("shows required field validation errors", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        name: z.string(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const submitButton = screen.getByRole("button", { name: "Save" });
      await user.click(submitButton);

      expect(screen.getByText("name is required")).toBeInTheDocument();
    });

    it("marks invalid fields with aria-invalid", async () => {
      const user = userEvent.setup();
      const schema = z.object({
        email: z.email(),
      });

      render(<AutoForm schema={schema} onSubmit={vi.fn()} />);

      const input = screen.getByRole("textbox", { name: /email/i });
      await user.type(input, "invalid");
      await user.tab();

      expect(input).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("Form Submission", () => {
    it("calls onSubmit with form values when valid", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      render(<AutoForm schema={schema} onSubmit={onSubmit} />);

      await user.type(
        screen.getByRole("textbox", { name: /name/i }),
        "John Doe"
      );
      await user.type(screen.getByRole("spinbutton", { name: /age/i }), "30");
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(onSubmit).toHaveBeenCalledWith({
        name: "John Doe",
        age: 30,
      });
    });

    it("does not call onSubmit when form is invalid", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const schema = z.object({
        email: z.email(),
      });

      render(<AutoForm schema={schema} onSubmit={onSubmit} />);

      await user.type(
        screen.getByRole("textbox", { name: /email/i }),
        "invalid-email"
      );
      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it("disables submit button while submitting", async () => {
      const user = userEvent.setup();
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

      const onSubmit = vi.fn(() => submitPromise);
      const schema = z.object({
        name: z.string(),
      });

      render(<AutoForm schema={schema} onSubmit={onSubmit} />);

      await user.type(screen.getByRole("textbox", { name: /name/i }), "John");
      const submitButton = screen.getByRole("button", { name: "Save" });

      await user.click(submitButton);

      expect(submitButton).toBeDisabled();

      resolveSubmit!();
    });
  });
});
