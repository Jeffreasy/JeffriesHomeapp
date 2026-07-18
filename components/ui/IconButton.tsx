import type { ComponentPropsWithRef, ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface IconButtonProps
  extends Omit<ComponentPropsWithRef<"button">, "aria-label" | "children"> {
  label: string;
  icon: ReactNode;
  variant?: ButtonProps["variant"];
  loading?: boolean;
}

export function IconButton({
  label,
  icon,
  title,
  className,
  variant = "ghost",
  loading = false,
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      aria-label={label}
      title={title ?? label}
      size="icon"
      variant={variant}
      loading={loading}
      loadingLabel=""
      className={cn("shrink-0", className)}
    >
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
}
