import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline';
    loading?: boolean;
}

export function Button({
    children,
    variant = 'primary',
    loading,
    className = '',
    ...props
}: ButtonProps) {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md",
        secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
        outline: "border-2 border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-600"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading ? (
                <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {children}
        </button>
    );
}
