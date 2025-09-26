import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  FormProvider,
  useForm,
  type FieldValues,
} from "react-hook-form";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { AutoField } from "../src/components/autoform/auto-field";

type AutoFieldProps = Parameters<typeof AutoField>[0];

type HarnessProps = {
  schema: AutoFieldProps["jsonProperty"];
  name?: string;
  required?: boolean;
  defaultValues?: FieldValues;
};

const renderAutoField = ({
  schema,
  name = "field",
  required,
  defaultValues,
}: HarnessProps) => {
  const Harness = () => {
    const methods = useForm<FieldValues>({
      defaultValues: defaultValues ?? {},
      mode: "onChange",
      reValidateMode: "onChange",
      criteriaMode: "all",
    });

    return (
      <FormProvider {...methods}>
        <form>
          <AutoField name={name} jsonProperty={schema} required={required} />
        </form>
      </FormProvider>
    );
  };

  return render(<Harness />);
};

beforeAll(() => {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === "undefined") {
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver =
      MockResizeObserver as unknown as typeof ResizeObserver;
  }
});

afterEach(() => {
  cleanup();
});

describe("AutoField", () => {
  it("renders a fallback message when the provided schema is not an object", () => {
    renderAutoField({ schema: "not-a-schema" as unknown as AutoFieldProps["jsonProperty"] });

    expect(
      screen.getByText(/Invalid property schema: "not-a-schema"/i)
    ).toBeInTheDocument();
  });

  it("uses the first entry from anyOf definitions", () => {
    renderAutoField({
      schema: {
        anyOf: [{ type: "string" }, { type: "number" }],
      },
    });

    expect(screen.getByRole("tab", { name: /string/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("renders specialised inputs for well-known string formats", () => {
    renderAutoField({ schema: { type: "string", format: "email" } });

    expect(screen.getByRole("textbox")).toHaveAttribute("type", "email");
  });

  it("renders enum properties using a select dropdown", () => {
    renderAutoField({
      schema: {
        type: "string",
        enum: ["alpha", "beta"],
      },
    });

    expect(screen.getByText("Select value...")).toBeInTheDocument();
  });

  it("supports tuple-style arrays by delegating to the first item schema", async () => {
    const user = userEvent.setup();

    renderAutoField({
      schema: {
        type: "array",
        items: [{ type: "boolean" }],
      },
    });

    await user.click(screen.getByRole("button", { name: /add item/i }));

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("renders nested object properties as a list", () => {
    renderAutoField({
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
        },
      },
    });

    expect(screen.getByText(/title/i, { selector: "label" })).toBeInTheDocument();
  });

  it("shows a placeholder message for record-style objects", () => {
    renderAutoField({
      schema: {
        type: "object",
        additionalProperties: { type: "string" },
      },
    });

    expect(
      screen.getByText(/Record-style objects are not yet supported/i)
    ).toBeInTheDocument();
  });

  it("renders tabs for anyOf and switches content when selecting a tab", async () => {
    const user = userEvent.setup();

    renderAutoField({
      schema: {
        anyOf: [
          { type: "string", title: "Text" },
          { type: "number", title: "Number" },
        ],
      },
    });

    const numberTab = screen.getByRole("tab", { name: /number/i });

    await user.click(numberTab);

    expect(numberTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("uses default labels when anyOf options have no title", () => {
    renderAutoField({
      schema: {
        anyOf: [{ type: "string" }, { type: "number" }],
      },
    });

    expect(screen.getByRole("tab", { name: /string/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /number/i })).toBeInTheDocument();
  });
});
