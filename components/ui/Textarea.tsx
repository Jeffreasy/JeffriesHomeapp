import type { ComponentPropsWithRef } from "react";
import { controlVariants } from "@/lib/ui/controlStyles";
import { cn } from "@/lib/utils";

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  invalid?: boolean;
  density?: "default" | "compact";
}

export function Textarea({
  className,
  invalid = false,
  density,
  "aria-invalid": ariaInvalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(
        controlVariants({ invalid, density }),
        "min-h-28 resize-y py-3 leading-6",
        className,
      )}
    />
  );
}
