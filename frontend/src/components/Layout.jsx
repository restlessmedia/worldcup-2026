import "../styles/global.css";

export function Layout({ title, tagline, activeNav, children, footer }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <h1>{title}</h1>
          {tagline ? <p className="tagline">{tagline}</p> : null}
          <nav className="site-nav" aria-label="Site sections">
            <a href="index.html" className={activeNav === "houses" ? "active" : ""}>
              Houses
            </a>
            <a href="spoon.html" className={activeNav === "spoon" ? "active" : ""}>
              Wooden spoon
            </a>
            <a href="info.html" className={activeNav === "info" ? "active" : ""}>
              Prizes & rules
            </a>
          </nav>
        </div>
      </header>

      <div className="layout">
        {children}
        {footer ? <footer className="footer">{footer}</footer> : null}
      </div>
    </>
  );
}

export function Card({ title, hint, children, link }) {
  return (
    <section className="card">
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
