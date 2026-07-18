import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils";

export type SkeletonProps = Omit<ComponentPropsWithRef<"div">, "aria-hidden">;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-[var(--color-surface-active)] motion-reduce:animate-none",
        className,
      )}
    />
  );
}
