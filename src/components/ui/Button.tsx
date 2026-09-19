import React from "react";
import "../../styles/button.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "secondary",
      size = "md",
      fullWidth = false,
      icon,
      children,
      className = "",
      type = "button",
      ...rest
    },
    ref
  ) => {
    const classNames = [
      "btn",
      `btn-${variant}`,
      `btn-size-${size}`,
      fullWidth ? "btn-full-width" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} type={type} className={classNames} {...rest}>
        {icon && (
          <span className="btn-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
