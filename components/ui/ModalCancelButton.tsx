"use client";

import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { useModalRequestClose } from "@/components/ui/Modal";

export interface ModalCancelButtonProps
  extends Omit<ButtonProps, "children" | "onClick"> {
  children?: ReactNode;
  onFallback?: () => void;
}

export function ModalCancelButton({
  children = "Annuleren",
  onFallback,
  variant = "secondary",
  ...props
}: ModalCancelButtonProps) {
  const requestClose = useModalRequestClose();

  return (
    <Button
      {...props}
      variant={variant}
      onClick={requestClose ?? onFallback}
    >
      {children}
    </Button>
  );
}
