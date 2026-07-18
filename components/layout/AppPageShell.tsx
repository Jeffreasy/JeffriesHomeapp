import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppPageWidth = "narrow" | "standard" | "wide";

const PAGE_WIDTH_CLASSES: Record<AppPageWidth, string> = {
  narrow: "app-page-shell--narrow",
  standard: "app-page-shell--standard",
  wide: "app-page-shell--wide",
};

export interface AppPageShellProps extends HTMLAttributes<HTMLDivElement> {
  width?: AppPageWidth;
}

/**
 * Route-level content boundary. ClientShell owns the main landmark, navigation
 * offsets and mobile clearance; pages only select a deliberate content width.
 */
export function AppPageShell({
  width = "standard",
  className,
  children,
  ...props
}: AppPageShellProps) {
  return (
    <div
      data-app-page=""
      data-page-width={width}
      className={cn("app-page-shell", PAGE_WIDTH_CLASSES[width], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface AppPageHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
}

export function AppPageHeader({
  title,
  description,
  eyebrow,
  leading,
  actions,
  className,
  ...props
}: AppPageHeaderProps) {
  return (
    <header className={cn("app-page-header", className)} {...props}>
      <div className="app-page-header__identity">
        {leading ? <div className="app-page-header__leading">{leading}</div> : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="app-page-header__eyebrow">{eyebrow}</p>
          ) : null}
          <h1 className="app-page-header__title">{title}</h1>
          {description ? (
            <p className="app-page-header__description">{description}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="app-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export interface PageToolbarProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  sticky?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
}

/** A compositional control row; it deliberately avoids toolbar role semantics. */
export function PageToolbar({
  label,
  sticky = false,
  leading,
  trailing,
  className,
  children,
  ...props
}: PageToolbarProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "app-page-toolbar",
        sticky && "app-page-toolbar--sticky",
        className,
      )}
      {...props}
    >
      {leading ? <div className="app-page-toolbar__leading">{leading}</div> : null}
      {children ? <div className="app-page-toolbar__content">{children}</div> : null}
      {trailing ? <div className="app-page-toolbar__trailing">{trailing}</div> : null}
    </div>
  );
}
