import "@testing-library/jest-dom/vitest";

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import { AutoForm } from "../src/components/auto-form/auto-form";
import { FormSchema } from "../src/lib/auto-form/schemas";

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

  describe("react-hook-form integration", () => {
    test("submits primitive field values", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema = {
        fields: {
          fullName: {
            type: "string",
            title: "Full name",
            required: true,
          },
          age: {
            type: "number",
            title: "Age",
            required: true,
          },
          subscribe: {
            type: "boolean",
            title: "Subscribe to newsletter",
            default: false,
          },
        },
      } satisfies z.infer<typeof FormSchema>;

      const { container } = render(
        <AutoForm schema={schema} onSubmit={handleSubmit} />
      );

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, "Ada Lovelace");

      const ageInput = screen.getByLabelText(/age/i);
      await user.clear(ageInput);
      await user.type(ageInput, "37");

      const subscribeCheckbox = screen.getByRole("checkbox", {
        name: /subscribe to newsletter/i,
      });
      await user.click(subscribeCheckbox);

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenLastCalledWith({
        fullName: "Ada Lovelace",
        age: 37,
        subscribe: true,
      });
    });

    test("submits nested object and array values", async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      const schema = {
        fields: {
          profile: {
            type: "object",
            title: "Profile",
            properties: {
              bio: {
                type: "string",
                title: "Bio",
                required: true,
              },
              location: {
                type: "string",
                title: "Location",
              },
            },
          },
          tags: {
            type: "array",
            title: "Tags",
            testId: "tags-field",
            itemType: {
              type: "string",
              title: "Tag",
            },
          },
        },
      } satisfies z.infer<typeof FormSchema>;

      const { container } = render(
        <AutoForm schema={schema} onSubmit={handleSubmit} />
      );

      const bioInput = screen.getByLabelText(/bio/i);
      await user.type(bioInput, "Loves categories");

      const locationInput = screen.getByLabelText(/location/i);
      await user.type(locationInput, "London");

      await user.click(screen.getByRole("button", { name: /add item/i }));

      const tagsContainer = screen.getByTestId("tags-field");
      const tagInputs = within(tagsContainer).getAllByRole("textbox");
      await user.type(tagInputs[0], "math");

      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      expect(handleSubmit).toHaveBeenLastCalledWith({
        profile: {
          bio: "Loves categories",
          location: "London",
        },
        tags: ["math"],
      });
    });
  });

  test("submits date, time, and datetime values", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    const schema = {
      fields: {
        startDate: {
          type: "date",
          title: "Start date",
          required: true,
        },
        startTime: {
          type: "time",
          title: "Start time",
          required: true,
        },
        meeting: {
          type: "datetime",
          title: "Meeting time",
          required: true,
        },
      },
    } satisfies z.infer<typeof FormSchema>;

    const { container } = render(
      <AutoForm schema={schema} onSubmit={handleSubmit} />
    );

    const startDateInput = screen.getByRole("textbox", { name: /start date/i });
    fireEvent.change(startDateInput, { target: { value: "2025-05-17" } });

    const startTimeInput = screen.getByLabelText(/start time/i);
    await user.type(startTimeInput, "14:45");

    const meetingDateInput = screen.getByRole("textbox", {
      name: /meeting time/i,
    });
    fireEvent.change(meetingDateInput, { target: { value: "2025-05-17" } });

    const meetingTimeInput = screen.getByLabelText(/meeting time/i, {
      selector: "input[type='time']",
    });
    await user.type(meetingTimeInput, "14:45");

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    expect(handleSubmit).toHaveBeenLastCalledWith({
      startDate: "2025-05-17",
      startTime: "14:45",
      meeting: "2025-05-17T14:45",
    });
  });

  test("submits union field with tab switching", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    const schema = {
      fields: {
        contactMethod: {
          type: "union",
          title: "Preferred contact",
          testId: "contact-method",
          anyOf: [
            {
              type: "string",
              title: "Email",
              required: true,
            },
            {
              type: "string",
              title: "Phone",
            },
          ],
        },
      },
    } satisfies z.infer<typeof FormSchema>;

    const { container } = render(
      <AutoForm schema={schema} onSubmit={handleSubmit} />
    );

    await user.click(screen.getByRole("tab", { name: /phone/i }));
    const methodContainer = screen.getByTestId("contact-method");
    await user.type(
      within(methodContainer).getByRole("textbox", { name: /phone/i }),
      "5551234"
    );

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = handleSubmit.mock.lastCall?.[0] as {
      contactMethod: { selected: number; options: unknown[] };
    };

    expect(submitted.contactMethod.selected).toBe(1);
    expect(submitted.contactMethod.options[1]).toBe("5551234");
  });

  test("submits record field entries", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    const schema = {
      fields: {
        metadata: {
          type: "record",
          title: "Metadata",
          testId: "metadata-field",
          keyType: "string",
          valueType: {
            type: "string",
            title: "Value",
          },
        },
      },
    } satisfies z.infer<typeof FormSchema>;

    const { container } = render(
      <AutoForm schema={schema} onSubmit={handleSubmit} />
    );

    await user.click(screen.getByRole("button", { name: /add entry/i }));

    const metadataContainer = screen.getByTestId("metadata-field");
    await user.type(within(metadataContainer).getByLabelText(/key/i), "role");
    await user.type(
      within(metadataContainer).getByLabelText(/value/i),
      "admin"
    );

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    expect(handleSubmit).toHaveBeenLastCalledWith({
      metadata: { role: "admin" },
    });
  });

  test("prevents submit when required fields are empty", async () => {
    const handleSubmit = vi.fn();

    const schema = {
      fields: {
        fullName: {
          type: "string",
          title: "Full name",
          required: true,
          errorMessage: "Full name is required",
        },
      },
    } satisfies z.infer<typeof FormSchema>;

    const { container } = render(
      <AutoForm schema={schema} onSubmit={handleSubmit} />
    );

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });
});
