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

describe("AutoForm validation error message tests", () => {
  // it("displays an error message for all fields except valid ones", async () => {
  //   const user = userEvent.setup();

  //   render(<AutoForm schema={KitchenSink} />);

  //   await user.click(screen.getByRole("button", { name: "Submit" }));

  //   expect(screen.getAllByTestId("validation-error").length).toBe(48);
  // });

  it("displays custom error messages", async () => {
    const user = userEvent.setup();
    const schema = z.object({
      name: z.string().min(2, { error: "Name must be at least 2 characters" }),
      age: z.number().min(18, { error: "You must be at least 18 years old" }),
    });

    render(<AutoForm schema={schema} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, "A");

    const ageInput = screen.getByLabelText(/age/i);
    await user.type(ageInput, "16");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      screen.getByText("Name must be at least 2 characters")
    ).toBeInTheDocument();
    expect(
      screen.getByText("You must be at least 18 years old")
    ).toBeInTheDocument();
  });

  it("displays error messages for invalid string based fields", async () => {
    const user = userEvent.setup();

    const schema = {
      email: z.email({ error: "invalid email error" }),
      url: z.url({ error: "invalid url error" }),
      urlWithPattern: z
        .url({ error: "invalid urlWithPattern error" })
        .regex(/^https:\/\/.*$/, {
          message: "url must start with https://",
        }),
      uuid: z.uuid({ error: "invalid uuid error" }),
      guid: z.guid({ error: "invalid guid error" }),
      ipv4: z.ipv4({ error: "invalid ipv4 error" }),
      ipv6: z.ipv6({ error: "invalid ipv6 error" }),
    };

    render(<AutoForm schema={z.object(schema)} />);

    for (const field of Object.keys(schema)) {
      const input = screen.getByLabelText(`${field}*`);
      await user.type(input, "invalid");
    }

    await user.click(screen.getByRole("button", { name: "Submit" }));

    for (const field of Object.keys(schema)) {
      expect(screen.getByText(`invalid ${field} error`)).toBeInTheDocument();
    }
  });

  it("displays errors for enum fields", async () => {
    const user = userEvent.setup();

    const schema = z.object({
      color: z.enum(["red", "green", "blue"], { error: "invalid color error" }),
    });

    render(<AutoForm schema={schema} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("invalid color error")).toBeInTheDocument();
  });

  it("displays errors object fields", async () => {
    const user = userEvent.setup();

    const schema = z.object({
      profile: z.object(
        {
          username: z
            .string()
            .min(3, { error: "Username must be at least 3 characters" }),
          bio: z
            .string()
            .max(50, { error: "Bio must be at most 50 characters" })
            .optional(),
        },
        { error: "Profile is required" }
      ),
    });

    render(<AutoForm schema={schema} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(screen.getByText("Profile is required")).toBeInTheDocument();

    const usernameInput = screen.getByLabelText(/username/i);
    await user.type(usernameInput, "ab");

    const bioInput = screen.getByLabelText(/bio/i);
    await user.type(
      bioInput,
      "This bio is way too long and should trigger a validation error because it exceeds the maximum length."
    );

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      screen.getByText("Username must be at least 3 characters")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Bio must be at most 50 characters")
    ).toBeInTheDocument();
  });
});
