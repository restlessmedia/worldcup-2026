import "../styles/global.css";
import "../styles/motion.css";
import { formatDateTimeShort } from "../lib/format";
import { prefetchPageData } from "../lib/navPrefetch";

export function Layout({ title, tagline, updatedAt, activeNav, children, footer }) {
  const updatedLabel = formatDateTimeShort(updatedAt);

  return (
    <>
      <header className="topbar page-enter">
        <div className="topbar-inner">
          <div className="topbar-title-row">
            <h1>{title}</h1>
            {updatedLabel ? (
              <p className="topbar-updated">
                Updated{" "}
                <time dateTime={updatedAt}>{updatedLabel}</time>
              </p>
            ) : null}
          </div>
          {tagline ? <p className="tagline">{tagline}</p> : null}
          <div className="site-nav-scroll">
            <nav className="site-nav" aria-label="Site sections">
              <a
                href="index.html"
                className={activeNav === "houses" ? "active" : ""}
                onMouseEnter={() => prefetchPageData("index.html")}
                onFocus={() => prefetchPageData("index.html")}
              >
                Houses
              </a>
              <a
                href="fixtures.html"
                className={activeNav === "fixtures" ? "active" : ""}
                onMouseEnter={() => prefetchPageData("fixtures.html")}
                onFocus={() => prefetchPageData("fixtures.html")}
              >
                Fixtures
              </a>
              <a
                href="knockout.html"
                className={activeNav === "knockout" ? "active" : ""}
                onMouseEnter={() => prefetchPageData("knockout.html")}
                onFocus={() => prefetchPageData("knockout.html")}
              >
                Knockout
              </a>
              <a
                href="spoon.html"
                className={activeNav === "spoon" ? "active" : ""}
                onMouseEnter={() => prefetchPageData("spoon.html")}
                onFocus={() => prefetchPageData("spoon.html")}
              >
                Wooden spoon
              </a>
              <a
                href="info.html"
                className={activeNav === "info" ? "active" : ""}
                onMouseEnter={() => prefetchPageData("info.html")}
                onFocus={() => prefetchPageData("info.html")}
              >
                Prizes & rules
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="layout page-stagger">
        {children}
        {footer ? <footer className="footer">{footer}</footer> : null}
      </div>
    </>
  );
}

export function Card({ title, hint, children, link, className = "" }) {
  return (
    <section className={className ? `card ${className}` : "card"}>
      {title ? <h2>{title}</h2> : null}
      {hint ? <p className="hint">{hint}</p> : null}
      {children}
      {link}
    </section>
  );
}

export function ErrorMessage({ message }) {
  return (
    <div className="error">
      <strong>Could not load data.</strong> {message}
    </div>
  );
}

export function LoadingMessage() {
  return <p className="empty-note">Loading sweepstake data…</p>;
}
