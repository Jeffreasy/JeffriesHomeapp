import { Search, X } from "lucide-react";
import type { ChangeEventHandler } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Input, type InputProps } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface SearchFieldProps
  extends Omit<
    InputProps,
    "aria-label" | "defaultValue" | "onChange" | "type" | "value"
  > {
  label: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onClear?: () => void;
  wrapperClassName?: string;
}

export function SearchField({
  label,
  onClear,
  wrapperClassName,
  className,
  value,
  onChange,
  ...props
}: SearchFieldProps) {
  const hasValue = value.length > 0;

  return (
    <div className={cn("relative min-w-0", wrapperClassName)}>
      <Search
        size={17}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
      />
      <Input
        {...props}
        type="search"
        aria-label={label}
        value={value}
        onChange={onChange}
        className={cn("pl-10", onClear && "pr-12", className)}
      />
      {onClear && hasValue ? (
        <IconButton
          label={label + " wissen"}
          icon={<X size={16} />}
          onClick={onClear}
          className="absolute right-0 top-0 border-transparent bg-transparent"
        />
      ) : null}
    </div>
  );
}
