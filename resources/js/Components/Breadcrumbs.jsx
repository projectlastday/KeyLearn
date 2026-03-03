import { Link } from '@inertiajs/react';

export default function Breadcrumbs({ items, className = '' }) {
    if (!items || items.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className={`flex items-center space-x-2 ${className}`}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <div key={index} className="flex items-center space-x-2">
                        {isLast ? (
                            <span
                                className="font-semibold text-gray-800"
                                aria-current="page"
                            >
                                {item.label}
                            </span>
                        ) : (
                            <div className="flex items-center space-x-2">
                                {item.onClick ? (
                                    <button
                                        onClick={item.onClick}
                                        className="text-sm text-gray-500 transition-colors hover:text-gray-900 focus:outline-none rounded-sm"
                                    >
                                        {item.label}
                                    </button>
                                ) : item.href ? (
                                    <Link
                                        href={item.href}
                                        className="text-sm text-gray-500 transition-colors hover:text-gray-900 focus:outline-none rounded-sm"
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span className="text-sm text-gray-500">{item.label}</span>
                                )}
                                <svg
                                    className="h-3.5 w-3.5 shrink-0 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2.5"
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
