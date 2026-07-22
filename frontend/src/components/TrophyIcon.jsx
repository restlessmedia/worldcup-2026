const TITLES = {
  gold: "1st place trophy",
  silver: "2nd place trophy",
  bronze: "3rd place trophy",
  fourth: "4th place trophy",
  spoon: "Wooden spoon",
  fairplay: "Fair play award",
};

export function TrophyIcon({ variant, className = "" }) {
  const title = TITLES[variant] || "Trophy";
  return (
    <svg
      className={`trophy-icon trophy-icon--${variant} ${className}`.trim()}
      viewBox="0 0 48 48"
      width="36"
      height="36"
      aria-hidden="true"
      focusable="false"
    >
      <title>{title}</title>
      {variant === "spoon" ? (
        <>
          <ellipse cx="24" cy="14" rx="10" ry="8" fill="currentColor" opacity="0.92" />
          <rect x="21.5" y="20" width="5" height="18" rx="2" fill="currentColor" />
          <rect x="17" y="36" width="14" height="4" rx="2" fill="currentColor" opacity="0.75" />
        </>
      ) : variant === "fairplay" ? (
        <>
          <path
            d="M24 6l3.2 9.8H38l-8.4 6.1 3.2 9.8L24 25.6 15.2 31.7l3.2-9.8L10 15.8h10.8L24 6z"
            fill="currentColor"
          />
        </>
      ) : (
        <>
          <path
            d="M14 10h20v4c0 6.6-4.5 12-10 12S14 20.6 14 14v-4z"
            fill="currentColor"
          />
          <path d="M14 12c-3 1-5 4-5 7 0 3 2 5 5 5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M34 12c3 1 5 4 5 7 0 3-2 5-5 5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <rect x="22" y="26" width="4" height="8" fill="currentColor" />
          <rect x="16" y="34" width="16" height="5" rx="2" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
