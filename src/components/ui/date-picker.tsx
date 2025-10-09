"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  value?: string;
  name?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  required?: boolean;
  placeholder?: string;
  testId?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  containerClassName?: string;
  buttonClassName?: string;
};

export function DatePicker({
  id,
  value,
  name,
  onChange,
  onBlur,
  inputRef,
  required,
  placeholder = "Select date",
  testId,
  ariaLabel,
  ariaLabelledBy,
  containerClassName,
  buttonClassName,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value ?? "");

  const parsedDate = React.useMemo(() => {
    if (!inputValue) {
      return undefined;
    }

    const nextDate = new Date(inputValue);
    return Number.isNaN(nextDate.getTime()) ? undefined : nextDate;
  }, [inputValue]);

  React.useEffect(() => {
    setInputValue(value ?? "");
  }, [value]);

  const formatDate = React.useCallback((date?: Date) => {
    if (!date) {
      return "";
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");

    return `${year}-${month}-${day}`;
  }, []);

  const handleSelect = (nextDate?: Date) => {
    const nextValue = formatDate(nextDate);
    setInputValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    onChange?.(nextValue);
  };

  const triggerId = id ? `${id}-trigger` : undefined;

  return (
    <div className={cn("flex flex-col gap-2", containerClassName)}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={onBlur}
        onFocus={() => setOpen(true)}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        required={required}
        data-testid={testId ? `${testId}-input` : undefined}
        className="sr-only"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={triggerId}
            data-testid={testId}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-required={required ? "true" : undefined}
            className={cn(
              "w-full justify-between font-normal",
              buttonClassName
            )}
          >
            {parsedDate ? parsedDate.toLocaleDateString() : placeholder}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            captionLayout="dropdown"
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
