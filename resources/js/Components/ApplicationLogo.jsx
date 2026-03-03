export default function ApplicationLogo(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Base Fill */}
            <path d="M 50 5 L 43.4 54.2 L 15 40 L 27.1 69 L 38 95 L 42.6 61.2 L 50 57.5 L 57.4 61.2 L 62 95 L 72.9 69 L 85 40 L 56.6 54.2 Z" fill="#CD9B58" />

            {/* Outline & Intersections */}
            <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="50" y1="5" x2="38" y2="95" />
                <line x1="50" y1="5" x2="62" y2="95" />
                <line x1="15" y1="40" x2="38" y2="95" />
                <line x1="85" y1="40" x2="62" y2="95" />
                <line x1="15" y1="40" x2="85" y2="75" />
                <line x1="85" y1="40" x2="15" y2="75" />
            </g>
        </svg>
    );
}
