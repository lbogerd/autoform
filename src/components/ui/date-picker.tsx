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
  defaultValue?: Date;
  onChange?: (value: Date | undefined) => void;
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
  defaultValue,
  onChange,
  required,
  placeholder = "Select date",
  testId,
  ariaLabel,
  ariaLabelledBy,
  containerClassName,
  buttonClassName,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(defaultValue);

  React.useEffect(() => {
    setDate(defaultValue);
  }, [defaultValue]);

  const handleSelect = (nextDate?: Date) => {
    setDate(nextDate);
    onChange?.(nextDate);
    setOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-2", containerClassName)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            data-testid={testId}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-required={required ? "true" : undefined}
            className={cn(
              "w-full justify-between font-normal",
              buttonClassName
            )}
          >
            {date ? date.toLocaleDateString() : placeholder}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
