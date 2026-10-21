import { Link } from "react-router-dom";
export default function PrivacyPolicy() {
  return (
    <article className="reading-page">
      <div className="eyebrow">THE PLAIN-ENGLISH VERSION</div>
      <h1>Private by design.</h1>
      <p className="reading-lead">Your files. Your device. Made by Sanyam.</p>
      <h2>Files stay with you.</h2>
      <p>
        PDF and image processing happens locally in your browser, using
        JavaScript, WebAssembly, and browser workers. Folio does not send
        document or image contents to a server. Downloads are generated on your
        device.
      </p>
      <h2>What the browser remembers.</h2>
      <p>
        Recent activity can include filenames and generated files up to 25 MB
        each, stored in this browser’s IndexedDB. Some tools also save
        workspaces so you can pick up where you left off. Signatures and
        preferences are stored locally. Closing a tab does not necessarily erase
        these records.
      </p>
      <p>
        You can clear saved history, workspaces, and signatures in{" "}
        <Link to="/settings">Settings</Link>. Downloaded files remain wherever
        you saved them. On a shared device, clear local data when you finish.
      </p>
      <h2>What needs a connection.</h2>
      <p>
        Your browser downloads the app, bundled fonts, and processing engines
        from the site host. OCR uses locally served English language data. Files
        are never included in those requests. An internet connection may be
        needed to load these assets; Folio does not promise that every tool is
        available offline before it has loaded.
      </p>
      <h2>No tracking, no account.</h2>
      <p>
        Folio has no analytics, advertising trackers, or account system. The
        site host may keep ordinary access logs such as IP addresses and
        requested URLs. External links open other sites with their own privacy
        practices. Sharing a result uses your device’s share interface only when
        you choose Share.
      </p>
      <Link className="button secondary" to="/settings">
        Manage local data ↗
      </Link>
    </article>
  );
}
