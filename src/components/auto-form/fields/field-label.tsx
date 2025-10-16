import { Label } from "@/components/ui/label";
import type { FC } from "react";

export const FieldLabel: FC<{
  title?: string;
  required?: boolean;
  htmlFor?: string;
}> = ({ title, required, htmlFor }) => (
  <Label htmlFor={htmlFor}>
    {title}
    {required ? <span className="text-red-500">*</span> : null}
  </Label>
);
