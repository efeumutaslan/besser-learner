"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        "bg-brand-600 hover:bg-brand-700 text-white shadow-sm active:bg-brand-800",
      secondary:
        "bg-gray-100 hover:bg-gray-200 text-gray-900 active:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100",
      outline:
        "border-2 border-gray-300 hover:border-brand-500 text-gray-700 hover:text-brand-600 bg-white dark:border-gray-600 dark:text-gray-200 dark:bg-gray-800",
      ghost: "hover:bg-gray-100 text-gray-700 active:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-200",
      danger: "bg-red-500 hover:bg-red-600 text-white active:bg-red-700",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm rounded-lg",
      md: "px-4 py-2.5 text-sm rounded-xl",
      lg: "px-6 py-3 text-base rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:scale-[0.98]",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
