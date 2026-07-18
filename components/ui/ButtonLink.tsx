import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithRef } from "react";
import { buttonVariants, type ButtonProps } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ButtonLinkProps
  extends LinkProps,
    Omit<ComponentPropsWithRef<"a">, "href"> {
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  fullWidth?: ButtonProps["fullWidth"];
}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
