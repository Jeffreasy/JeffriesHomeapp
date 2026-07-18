import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FormControlAccessibilityProps {
  id: string;
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-invalid"?: true;
}

export interface FormFieldProps extends Omit<ComponentPropsWithRef<"div">, "children" | "id"> {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  visuallyHiddenLabel?: boolean;
  children:
    | ReactNode
    | ((controlProps: FormControlAccessibilityProps) => ReactNode);
}

export function FormField({
  id,
  label,
  description,
  error,
  optional = false,
  visuallyHiddenLabel = false,
  className,
  children,
  ...props
}: FormFieldProps) {
  const descriptionId = description ? id + "-description" : undefined;
  const errorId = error ? id + "-error" : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const controlProps: FormControlAccessibilityProps = {
    id,
    "aria-describedby": describedBy,
    "aria-errormessage": errorId,
    "aria-invalid": error ? true : undefined,
  };

  return (
    <div className={cn("grid min-w-0 gap-1.5", className)} {...props}>
      <div className={cn("flex min-w-0 items-baseline justify-between gap-3", visuallyHiddenLabel && "sr-only")}>
        <label htmlFor={id} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        {optional ? (
          <span className="text-xs text-[var(--color-text-subtle)]">Optioneel</span>
        ) : null}
      </div>
      {description ? (
        <p id={descriptionId} className="text-xs leading-5 text-[var(--color-text-muted)]">
          {description}
        </p>
      ) : null}
      {typeof children === "function" ? children(controlProps) : children}
      {error ? (
        <p id={errorId} role="alert" className="text-xs leading-5 text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
