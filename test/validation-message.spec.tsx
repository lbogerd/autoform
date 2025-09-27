import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEffect } from "react";
import {
  FormProvider,
  useForm,
  type FieldError,
  type FieldValues,
} from "react-hook-form";

import {
  ValidationMessage,
  type ValidationMessageProps,
} from "../src/components/ui/validation-message";

const Harness = ({
  error,
  validationMessageProps,
}: {
  error?: {
    message?: string;
    types?: Record<string, string>;
  };
  validationMessageProps?: Partial<Omit<ValidationMessageProps, "name" | "id">>;
}) => {
  const methods = useForm<FieldValues>({
    defaultValues: { field: "" },
    mode: "onChange",
    reValidateMode: "onChange",
    criteriaMode: "all",
  });

  useEffect(() => {
    if (error) {
      methods.setError("field", {
        type: "manual",
        message: error.message,
        types: error.types,
      } as FieldError);
      const currentValue = methods.getValues("field");
      methods.setValue("field", currentValue, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    } else {
      methods.clearErrors("field");
    }
  }, [error, methods]);

  return (
    <FormProvider {...methods}>
      <form>
        <input aria-label="Field" {...methods.register("field")} />
        <ValidationMessage name="field" {...validationMessageProps} />
      </form>
    </FormProvider>
  );
};

describe("ValidationMessage", () => {
  it("renders nothing when the field has no errors", () => {
    render(<Harness />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("displays a single error message with default icon", async () => {
    render(<Harness error={{ message: "Something went wrong" }} />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByRole("alert").querySelector('[data-slot="validation-icon"]'),
    ).not.toBeNull();
  });

  it("merges custom class names and icon", async () => {
    render(
      <Harness
        error={{ message: "Customizable" }}
        validationMessageProps={{
          className: "text-sky-500",
          icon: <span data-testid="custom-icon">!</span>,
        }}
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveClass("text-sky-500");
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders all messages when multiple validation issues exist", async () => {
    render(
      <Harness
        error={{
          message: "Primary error",
          types: {
            minLength: "Must be at least 3 characters",
            pattern: "Only letters are allowed",
          },
        }}
      />,
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();

    const messages = screen.getAllByRole("listitem");
    const textContent = messages.map((item) => item.textContent);
    expect(textContent).toContain("Primary error");
    expect(textContent).toContain("Must be at least 3 characters");
    expect(textContent).toContain("Only letters are allowed");
  });

  it("hides the message once the error is cleared", async () => {
    const { rerender } = render(<Harness error={{ message: "Transient" }} />);

    expect(await screen.findByText("Transient")).toBeInTheDocument();

    rerender(<Harness />);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("supports custom render logic", async () => {
    render(
      <Harness
        error={{ message: "Custom render" }}
        validationMessageProps={{
          render: ({ messages }: { messages: string[] }) => (
            <div role="alert" data-testid="custom-render">
              {messages.join(" / ")}
            </div>
          ),
        }}
      />,
    );

    expect(await screen.findByTestId("custom-render")).toHaveTextContent(
      "Custom render",
    );
  });
});
