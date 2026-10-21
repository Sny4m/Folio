import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Search,
  LockKeyhole,
  WifiOff,
  Infinity as InfinityIcon,
  X,
  Sparkles,
} from "lucide-react";
import type { Tool } from "../types";
import FileIllustration from "./FileIllustration";
const imagePaths = ["/image-to-pdf", "/pdf-to-image", "/extract-images"];
function ToolCard({ tool, index }: { tool: Tool; index: number }) {
  return (
    <Link className="tool-card" to={tool.path!}>
      <div className="card-top">
        <span className={`tool-icon icon-shape-${index % 3}`}>
          <tool.icon size={27} strokeWidth={1.7} />
        </span>
        <ArrowUpRight className="card-arrow" size={19} />
      </div>
      <h3>{tool.title}</h3>
      <p>{tool.desc}</p>
      <span className="card-meta">
        {tool.category} <span>↗</span>
      </span>
    </Link>
  );
}
export default function WebView({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("");
  const [params] = useSearchParams();
  const section = params.get("section") || "all";
  useEffect(() => {
    if (params.has("section"))
      requestAnimationFrame(() =>
        document
          .getElementById("tools")
          ?.scrollIntoView({ behavior: "smooth" }),
      );
  }, [params]);
  const filtered = tools.filter(
    (t) =>
      t.implemented &&
      t.path &&
      `${t.title} ${t.desc}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pdf = filtered.filter((t) => !imagePaths.includes(t.path!));
  const images = filtered.filter((t) => imagePaths.includes(t.path!));
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="status-dot" /> SMALL TOOLS. BIG FILE ENERGY.
          </div>
          <h1>
            Your files.
            <br />
            Your{" "}
            <span className="rules-word">
              rules.
              <svg viewBox="0 0 250 14" aria-hidden="true">
                <path
                  d="M3 9Q120-3 244 6M31 13Q151 4 227 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </h1>
          <p>
            All the PDF and image tools you need.
            <br className="desktop-break" /> Right in your browser. No uploads,
            no accounts,
            <br className="desktop-break" /> no nonsense.
          </p>
          <div className="hero-actions">
            <button
              className="button primary"
              onClick={() =>
                document
                  .getElementById("tools")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore Tools <ArrowDown size={17} />
            </button>
            <button
              className="button secondary"
              onClick={() =>
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              How It Works <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="hero-note">
            <LockKeyhole size={13} /> Your files never leave your device.
          </div>
        </div>
        <div className="hero-art">
          <FileIllustration />
          <span className="art-caption">
            a safe little space for your files. ↖
          </span>
        </div>
      </section>
      <div className="trust-strip">
        <span>
          <LockKeyhole />
          100% local processing
        </span>
        <span>
          <WifiOff />
          No uploads. Ever.
        </span>
        <span>
          <InfinityIcon />
          Free to use. Yours to keep.
        </span>
        <span className="trust-last">LESS FRICTION. MORE FOLIO. ✳</span>
      </div>
      <section id="tools" className="tool-catalog">
        <div className="catalog-heading">
          <div>
            <div className="eyebrow">
              THE TOOLBOX / {String(tools.length).padStart(2, "0")} LITTLE
              SUPERPOWERS
            </div>
            <h2>Let’s make light work.</h2>
            <p>Pick a tool. Bring a file. Do your thing.</p>
          </div>
          <label className="tool-search">
            <Search size={18} />
            <input
              aria-label="Search tools"
              placeholder="Find your tool…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={16} />
              </button>
            )}
          </label>
        </div>
        <div className="catalog-filters">
          <Link
            className={section === "all" ? "selected" : ""}
            to="/?section=all"
          >
            All tools <span>{tools.length}</span>
          </Link>
          <Link
            className={section === "pdf" ? "selected" : ""}
            to="/?section=pdf"
          >
            PDF tools
          </Link>
          <Link
            className={section === "image" ? "selected" : ""}
            to="/?section=image"
          >
            Image tools
          </Link>
          <span className="catalog-aside">
            NO SIGN-UP. JUST GET STUFF DONE.
          </span>
        </div>
        {section !== "image" && pdf.length > 0 && (
          <div className="playground">
            <div className="section-label">
              <h3>
                <span>01 /</span> PDF Playground
              </h3>
              <span>GOOD THINGS COME IN .PDF</span>
            </div>
            <div className="tool-grid">
              {pdf.map((tool, index) => (
                <ToolCard key={tool.path} tool={tool} index={index} />
              ))}
            </div>
          </div>
        )}
        {section !== "pdf" && images.length > 0 && (
          <div className="playground">
            <div className="section-label">
              <h3>
                <span>02 /</span> Image Playground
              </h3>
              <span>PIXELS, MEET POSSIBILITIES.</span>
            </div>
            <div className="tool-grid image-grid">
              {images.map((tool, index) => (
                <ToolCard key={tool.path} tool={tool} index={index} />
              ))}
            </div>
            <p className="catalog-footnote">
              Images ↔ PDFs, without the round trip to a server. JPG, PNG, and
              WebP welcome.
            </p>
          </div>
        )}
        {(section === "pdf" ? pdf : section === "image" ? images : filtered)
          .length === 0 && (
          <div className="empty-state">
            <Search size={36} />
            <h3>No tools found. No big deal.</h3>
            <p>Try “merge”, “image”, or “pages”.</p>
            <button className="button secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        )}
      </section>
      <section id="how-it-works" className="how-section">
        <div className="eyebrow">NO MANUAL REQUIRED</div>
        <h2>Three steps. Zero fuss.</h2>
        <div className="steps-grid">
          {[
            [
              "01",
              "Bring your file.",
              "Pick a tool and drop in your PDF or image. It stays right here, on your device.",
            ],
            [
              "02",
              "Make it yours.",
              "Merge, tweak, convert. You’re in control; your browser does the heavy lifting.",
            ],
            [
              "03",
              "Take it with you.",
              "Download the result. No email address, no waiting room, no strings attached.",
            ],
          ].map(([n, title, body]) => (
            <div key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="privacy-banner">
        <div className="privacy-mark">
          <LockKeyhole size={35} />
        </div>
        <div>
          <div className="eyebrow">PRIVATE BY DESIGN. NOT BY PROMISE.</div>
          <h2>Your business stays your business.</h2>
          <p>
            Files are processed in your browser. No file servers. No analytics.
            <br />
            Local history and workspaces stay on this device, too.
          </p>
          <Link to="/privacy">
            The plain-English privacy story <ArrowRight size={16} />
          </Link>
        </div>
        <Sparkles className="privacy-spark" size={52} />
      </section>
      <div className="home-signoff">
        A little less hassle. A little more happy.{" "}
        <span>Crafted with care by Sanyam. ✳</span>
      </div>
    </div>
  );
}
