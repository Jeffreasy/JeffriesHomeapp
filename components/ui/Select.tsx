import type { ComponentPropsWithRef } from "react";
import { controlVariants } from "@/lib/ui/controlStyles";
import { cn } from "@/lib/utils";

export interface SelectProps extends ComponentPropsWithRef<"select"> {
  invalid?: boolean;
  density?: "default" | "compact";
}

export function Select({
  className,
  invalid = false,
  density,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) {
  return (
    <select
      {...props}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(controlVariants({ invalid, density }), "cursor-pointer pr-9", className)}
    />
  );
}
