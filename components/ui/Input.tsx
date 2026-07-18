import type { ComponentPropsWithRef } from "react";
import { controlVariants } from "@/lib/ui/controlStyles";
import { cn } from "@/lib/utils";

export interface InputProps extends ComponentPropsWithRef<"input"> {
  invalid?: boolean;
  density?: "default" | "compact";
}

export function Input({
  className,
  invalid = false,
  density,
  "aria-invalid": ariaInvalid,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(controlVariants({ invalid, density }), className)}
    />
  );
}
