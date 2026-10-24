import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "accent"
  | "ghost"
  | "danger"
  | "dark"
  | "glass";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
  children?: ReactNode;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    asChild?: false;
    href?: never;
  };

type ButtonAsLink = CommonProps & {
  asChild: true;
  href: string;
  prefetch?: boolean;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function buttonClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return cn(
    "button",
    `button--${variant}`,
    size !== "md" && `button--${size}`,
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = "primary",
      size = "md",
      loading = false,
      className,
      children,
    } = props;

    if (props.asChild) {
      return (
        <Link
          href={props.href}
          prefetch={props.prefetch}
          className={buttonClasses(variant, size, className)}
          aria-disabled={loading || undefined}
        >
          {loading ? <span className="opacity-70">…</span> : null}
          {children}
        </Link>
      );
    }

    const {
      variant: _v,
      size: _s,
      loading: _loading,
      className: _c,
      children: _ch,
      asChild: _asChild,
      href: _href,
      disabled,
      ...rest
    } = props as ButtonAsButton & {
      asChild?: boolean;
      href?: string;
    };

    void _v;
    void _s;
    void _loading;
    void _c;
    void _ch;
    void _asChild;
    void _href;

    return (
      <button
        ref={ref}
        className={buttonClasses(variant, size, className)}
        disabled={Boolean(disabled) || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? <span aria-hidden>…</span> : null}
        {children}
      </button>
    );
  },
);
