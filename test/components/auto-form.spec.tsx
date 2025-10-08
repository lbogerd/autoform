import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { AutoField, AutoForm } from "../../src/components/autoform/auto-form";
import {
  ArrayFieldSchema,
  FieldSchema,
  FormSchema,
  RecordFieldSchema,
  UnionFieldSchema,
} from "../../src/components/autoform/schemas";

describe("auto-form component suite", () => {
  beforeAll(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe("AutoForm", () => {
    test("renders form title, description, and child fields", () => {
      const schema = {
        title: "User Profile",
        description: "Provide basic account details",
        fields: {
          fullName: {
            type: "string",
            title: "Full name",
            required: true,
          },
          age: {
            type: "number",
            title: "Age",
          },
        },
      } satisfies z.infer<typeof FormSchema>;

      render(<AutoForm schema={schema} />);

      expect(
        screen.getByRole("heading", { level: 1, name: /user profile/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/provide basic account details/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeRequired();
      const ageInput = screen.getByLabelText(/age/i);
      expect(ageInput).toBeInTheDocument();
      expect(ageInput).not.toBeRequired();
    });
  });

  describe("AutoField", () => {
    test("renders string field with error handling and required indicator", () => {
      const field = {
        type: "string",
        title: "First Name",
        required: true,
        errorMessage: "First name is required",
      } satisfies z.infer<typeof FieldSchema>;

      render(<AutoField field={field} />);

      const input = screen.getByLabelText(/first name/i);
      expect(input).toBeRequired();
      expect(screen.getByText("First name is required")).toBeVisible();
      expect(screen.getByText("*")).toHaveClass("text-red-500");
    });

    test("renders number field without required indicator", () => {
      const field = {
        type: "number",
        title: "Years of experience",
      } satisfies z.infer<typeof FieldSchema>;

      const { container } = render(<AutoField field={field} />);

      const numberInput = screen.getByLabelText("Years of experience");
      expect(numberInput).toHaveAttribute("type", "number");
      expect(container.querySelector("span.text-red-500")).toBeNull();
    });

    test("renders boolean field with checkbox default value", () => {
      const field = {
        type: "boolean",
        title: "Accept terms",
        default: true,
        required: true,
      } satisfies z.infer<typeof FieldSchema>;

      render(<AutoField field={field} />);

      const checkbox = screen.getByRole("checkbox", { name: /accept terms/i });
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeRequired();
      expect(screen.getByText("*")).toBeInTheDocument();
    });

    test("renders object field and nested properties", () => {
      const field = {
        type: "object",
        title: "Address",
        required: true,
        properties: {
          street: {
            type: "string",
            title: "Street",
            required: true,
          },
        },
      } satisfies z.infer<typeof FieldSchema>;

      render(<AutoField field={field} />);

      expect(
        screen.getByRole("heading", { level: 2, name: /address \*/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/street/i)).toBeRequired();
    });

    test("handles array field interactions and test id", async () => {
      const user = userEvent.setup();
      const field = {
        type: "array",
        title: "Hobbies",
        testId: "array-field",
        itemType: {
          type: "string",
          title: "Hobby",
          required: true,
        },
      } satisfies z.infer<typeof ArrayFieldSchema>;

      render(<AutoField field={field} />);

      const container = screen.getByTestId("array-field");
      expect(container).toBeInTheDocument();
      expect(
        screen.getByText(/no items yet\. use "add item" to create one\./i)
      ).toBeVisible();

      await user.click(screen.getByRole("button", { name: /add item/i }));

      expect(
        screen.queryByText(/no items yet\. use "add item" to create one\./i)
      ).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.queryByText("Hobby")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /remove/i }));
      expect(
        screen.getByText(/no items yet\. use "add item" to create one\./i)
      ).toBeVisible();
    });

    test("pre-populates array field from default values and maintains ids", async () => {
      const user = userEvent.setup();
      const field = {
        type: "array",
        title: "Lucky numbers",
        itemType: {
          type: "number",
          title: "Lucky number",
        },
        default: [7],
      } satisfies z.infer<typeof ArrayFieldSchema>;

      render(<AutoField field={field} />);

      expect(screen.getAllByRole("button", { name: /remove/i }).length).toBe(1);

      await user.click(screen.getByRole("button", { name: /add item/i }));
      await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);

      expect(screen.getAllByRole("button", { name: /remove/i }).length).toBe(1);
    });

    test("renders union field with tab switching", async () => {
      const user = userEvent.setup();
      const field = {
        type: "union",
        title: "Contact preference",
        anyOf: [
          {
            type: "string",
            title: "Email",
            required: true,
          },
          {
            type: "number",
            title: "Phone",
            required: true,
          },
        ],
      } satisfies z.infer<typeof UnionFieldSchema>;

      render(<AutoField field={field} />);

      expect(
        screen.getByRole("textbox", { name: /email/i })
      ).toBeInTheDocument();
      const phoneTab = screen.getByRole("tab", { name: /phone/i });
      await user.click(phoneTab);

      expect(
        screen.getByRole("spinbutton", { name: /phone/i })
      ).toHaveAttribute("type", "number");
    });

    test("renders record field with default entries and supports edits", async () => {
      const user = userEvent.setup();
      const field = {
        type: "record",
        title: "Metadata",
        required: true,
        keyType: "string",
        valueType: {
          type: "string",
          title: "Value",
          required: true,
        },
        default: {
          source: "import",
        },
      } satisfies z.infer<typeof RecordFieldSchema>;

      render(<AutoField field={field} />);

      expect(screen.getByText(/metadata/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("source")).toBeInTheDocument();

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      expect(removeButtons.length).toBe(1);

      const addButton = screen.getByRole("button", { name: /add entry/i });
      await user.click(addButton);
      expect(screen.getAllByRole("button", { name: /remove/i }).length).toBe(2);

      const keyInput = screen.getAllByRole("textbox")[0];
      await user.clear(keyInput);
      await user.type(keyInput, "updated");
      expect(keyInput).toHaveValue("updated");

      await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);
      expect(screen.getAllByRole("button", { name: /remove/i }).length).toBe(1);
    });

    test("record field uses numeric key input when keyType is number", () => {
      const field = {
        type: "record",
        title: "Thresholds",
        keyType: "number",
        valueType: {
          type: "number",
          title: "Value",
        },
        default: {
          1: 10,
        },
      } satisfies z.infer<typeof RecordFieldSchema>;

      render(<AutoField field={field} />);

      const numericKeyInput = screen.getByDisplayValue("1");
      expect(numericKeyInput).toHaveAttribute("type", "number");
    });

    test("returns null for unsupported field types", () => {
      const field = {
        type: "mystery",
        title: "Mystery",
      } as unknown as z.infer<typeof FieldSchema>;

      const { container } = render(<AutoField field={field} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("WithErrorMessage", () => {
    test("omits error text when no message provided", () => {
      const field = {
        type: "string",
        title: "Nickname",
      } satisfies z.infer<typeof FieldSchema>;

      const { container } = render(<AutoField field={field} />);

      expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
      expect(container.querySelector("span.text-red-500")).toBeNull();
    });
  });
});
