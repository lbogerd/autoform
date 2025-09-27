import { AlertCircle } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import {
  useFormContext,
  useFormState,
  type FieldError,
  type FieldErrorsImpl,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";

type RenderBaseContext<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  id: string;
  name: TName;
  messages: string[];
  invalid: boolean;
};

type RenderContext<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = RenderBaseContext<TFieldValues, TName> & {
  icon: ReactNode | null;
};

type IconProp<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> =
  | null
  | false
  | ReactNode
  | ((context: RenderBaseContext<TFieldValues, TName>) => ReactNode);

export type ValidationMessageProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = React.HTMLAttributes<HTMLDivElement> & {
  name: TName;
  id?: string;
  icon?: IconProp<TFieldValues, TName>;
  render?: (context: RenderContext<TFieldValues, TName>) => ReactNode;
  transformMessages?: (
    messages: string[],
    context: RenderBaseContext<TFieldValues, TName>
  ) => string[];
};

const sanitizeId = (value: string): string =>
  value.replace(/[^a-zA-Z0-9_-]+/g, "-");

const PLAIN_OBJECT_TAG = "[object Object]";

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") return false;
  return Object.prototype.toString.call(value) === PLAIN_OBJECT_TAG;
};

const collectErrorMessages = (error: unknown): string[] => {
  const messages = new Set<string>();

  const visit = (err: unknown) => {
    if (!err) return;

    if (typeof err === "string") {
      const trimmed = err.trim();
      if (trimmed) messages.add(trimmed);
      return;
    }

    if (Array.isArray(err)) {
      err.forEach(visit);
      return;
    }

    if (!isPlainObject(err)) {
      return;
    }

    const record = err as Record<string, unknown>;

    const rawMessage = record.message;
    if (typeof rawMessage === "string" && rawMessage.trim()) {
      messages.add(rawMessage.trim());
    }

    const types = record.types;
    if (types && typeof types === "object") {
      Object.values(types as Record<string, unknown>).forEach(visit);
    }

    const SKIP_KEYS = new Set([
      "message",
      "types",
      "type",
      "ref",
      "root",
      "name",
      "_f",
    ]);

    for (const [key, value] of Object.entries(record)) {
      if (SKIP_KEYS.has(key)) continue;
      if (typeof value === "function") continue;
      visit(value);
    }
  };

  visit(error);

  return Array.from(messages);
};

export const ValidationMessage = forwardRef<
  HTMLDivElement,
  ValidationMessageProps
>(({ name, className, id, icon, render, transformMessages, ...rest }, ref) => {
  const { getFieldState } = useFormContext<FieldValues>();
  const formState = useFormState({ name });
  const fieldState = getFieldState(name, formState);
  const { error, invalid, isTouched, isDirty } = fieldState;

  const isManualError =
    error &&
    typeof error === "object" &&
    !Array.isArray(error) &&
    "type" in (error as Record<string, unknown>) &&
    (error as FieldError).type === "manual";

  const shouldDisplay = Boolean(
    !!error &&
      (isTouched ||
        isDirty ||
        formState.isSubmitted ||
        formState.submitCount > 0 ||
        isManualError)
  );

  if (!shouldDisplay) {
    return null;
  }

  const messages = collectErrorMessages(
    error as FieldError | FieldErrorsImpl<FieldValues>
  );

  if (messages.length === 0) {
    return null;
  }

  const fallbackId = sanitizeId(`${name}-validation-message`);
  const messageId = id ?? fallbackId;

  const baseContextBeforeTransform: RenderBaseContext = {
    id: messageId,
    name,
    messages,
    invalid: Boolean(invalid),
  };

  const transformedMessages = transformMessages
    ? transformMessages(messages, baseContextBeforeTransform)
    : messages;

  if (!transformedMessages || transformedMessages.length === 0) {
    return null;
  }

  const baseContext: RenderBaseContext = {
    ...baseContextBeforeTransform,
    messages: transformedMessages,
  };

  const resolvedIcon =
    icon === false || icon === null
      ? null
      : typeof icon === "function"
      ? icon(baseContext)
      : icon ?? <AlertCircle className="size-4" aria-hidden="true" />;

  const renderContext: RenderContext = {
    ...baseContext,
    icon: resolvedIcon ?? null,
  };

  if (render) {
    const custom = render(renderContext);
    return custom ?? null;
  }

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      id={messageId}
      data-slot="validation-message"
      className={cn(
        "mt-1 flex items-start gap-2 text-sm text-destructive",
        className
      )}
      {...rest}
    >
      {resolvedIcon ? (
        <span
          data-slot="validation-icon"
          className="mt-0.5 flex size-4 items-center justify-center"
          aria-hidden="true"
        >
          {resolvedIcon}
        </span>
      ) : null}
      {transformedMessages.length === 1 ? (
        <span data-slot="validation-text">{transformedMessages[0]}</span>
      ) : (
        <ul data-slot="validation-list" className="space-y-1">
          {transformedMessages.map((message, index) => (
            <li key={`${message}-${index}`} data-slot="validation-list-item">
              {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

ValidationMessage.displayName = "ValidationMessage";
