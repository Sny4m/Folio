import { Link } from "react-router-dom";
import FileIllustration from "./FileIllustration";
export default function About() {
  return (
    <article className="reading-page">
      <div className="eyebrow">INDEPENDENT SOFTWARE. A LITTLE PERSONALITY.</div>
      <h1>
        A little toolkit.
        <br />A lot of care.
      </h1>
      <p className="reading-lead">
        Folio — Made by Sanyam. Built around a simple idea: your files are your
        business.
      </p>
      <div className="about-illustration">
        <FileIllustration />
      </div>
      <h2>Your files. Your device.</h2>
      <p>
        Every tool runs in your browser. Merge a stack of PDFs, rescue a
        sideways page, or turn your images into a document. No account to
        create. No files to upload. Just useful software that gets out of your
        way.
      </p>
      <p>
        Folio combines a playful monochrome interface with proven open-source
        document tools. It is free to use, with no analytics or advertising
        trackers.
      </p>
      <Link className="button primary" to="/?section=all">
        Meet the tools ↗
      </Link>
      <h2>Built on good foundations.</h2>
      <p>
        Folio is a derivative of PaperKnife, copyright © 2026 potatameister,
        licensed under the GNU Affero General Public License, version 3 or
        later. Upstream copyright and license notices are preserved. Interface
        redesign and Folio branding by Sanyam.
      </p>
      <p>
        The toolkit uses pdf-lib, PDF.js, qpdf, Tesseract.js, JSZip, and Lucide.
        Thank you to their maintainers and contributors.
      </p>
      <div className="text-links">
        <a
          href={`${import.meta.env.BASE_URL}LICENSE`}
          target="_blank"
          rel="noreferrer"
        >
          License ↗
        </a>
        <a
          href="https://github.com/potatameister/PaperKnife"
          target="_blank"
          rel="noreferrer"
        >
          Upstream source ↗
        </a>
        <Link to="/privacy">Privacy story ↗</Link>
      </div>
    </article>
  );
}
