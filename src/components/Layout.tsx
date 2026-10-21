import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Menu, X, LockKeyhole, Upload } from "lucide-react";
import FolioLogo from "./Logo";
export default function Layout({
  children,
  onFileDrop,
}: {
  children: ReactNode;
  onFileDrop: (files: File[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  return (
    <div
      className="folio-app"
      onDragEnter={(e) => {
        if (
          location.pathname === "/" &&
          e.dataTransfer.types.includes("Files")
        ) {
          e.preventDefault();
          depth.current++;
          setDragging(true);
        }
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (location.pathname === "/")
          onFileDrop(Array.from(e.dataTransfer.files));
      }}
    >
      <a
        href="#main-content"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <Link to="/" className="wordmark" aria-label="Folio home">
          <FolioLogo />
          folio<span className="wordmark-dot">✳</span>
        </Link>
        <nav
          id="main-navigation"
          className={open ? "main-nav is-open" : "main-nav"}
          aria-label="Main navigation"
        >
          <Link to="/?section=pdf">PDF Tools</Link>
          <Link to="/?section=image">Image Tools</Link>
          <Link to="/?section=all">All Tools</Link>
          <Link to="/about">About</Link>
          <span className="mobile-signature">Made by Sanyam ✳</span>
        </nav>
        <Link to="/about" className="creator-signature">
          Made by <strong>Sanyam</strong>
          <ArrowUpRight size={14} />
        </Link>
        <button
          className="menu-button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-controls="main-navigation"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div>
          <Link to="/" className="wordmark">
            <FolioLogo size={28} />
            folio
          </Link>
          <p>Your files. Your device.</p>
        </div>
        <div className="footer-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/history">Local history</Link>
          <Link to="/settings">Settings</Link>
          <Link to="/about">About & credits</Link>
        </div>
        <div className="footer-credit">
          <span>Made by Sanyam ✳</span>
          <p>
            <LockKeyhole size={12} /> A little toolkit. All yours.
          </p>
        </div>
      </footer>
      {dragging && (
        <div className="global-drop">
          <Upload size={60} />
          <h2>Drop it like it’s yours.</h2>
          <p>PDFs and images stay on this device.</p>
        </div>
      )}
    </div>
  );
}
