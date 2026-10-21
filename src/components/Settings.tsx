import { useState } from "react";
import { toast } from "sonner";
import { clearActivity } from "../utils/recentActivity";
import { clearAllWorkspaces } from "../utils/workspacePersistence";
import { usePWAInstall } from "../utils/pwa";
export default function Settings() {
  const { canInstall, isInstalled, promptInstall } = usePWAInstall();
  const [autoDownload, setAutoDownload] = useState(
    localStorage.getItem("autoDownload") === "true",
  );
  const [limit, setLimit] = useState(
    localStorage.getItem("historyLimit") || "10",
  );
  const [clearing, setClearing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const clear = async () => {
    setClearing(true);
    try {
      await clearActivity();
      await clearAllWorkspaces();
      localStorage.removeItem("folio-signatures");
      localStorage.removeItem("paperknife-signatures");
      toast.success("A clean slate. Saved files and signatures cleared.");
      setConfirm(false);
    } catch {
      toast.error("Could not clear local data. Try again.");
    } finally {
      setClearing(false);
    }
  };
  return (
    <article className="reading-page">
      <div className="eyebrow">MAKE YOURSELF AT HOME</div>
      <h1>Your preferences.</h1>
      <p className="reading-lead">
        A few little things, saved only in this browser.
      </p>
      {isInstalled ? (
        <div className="settings-row">
          <div>
            <h3>Progressive Web App</h3>
            <p>Folio is installed and running as a standalone app.</p>
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-500">
            Installed
          </span>
        </div>
      ) : canInstall ? (
        <div className="settings-row">
          <div>
            <h3>Install Folio App</h3>
            <p>Add Folio to your desktop or home screen for quick offline access.</p>
          </div>
          <button className="button secondary" onClick={promptInstall}>
            Install App
          </button>
        </div>
      ) : null}
      <div className="settings-row">
        <div>
          <h3>Automatic downloads</h3>
          <p>Save the output as soon as a tool finishes.</p>
        </div>
        <input
          aria-label="Automatic downloads"
          type="checkbox"
          checked={autoDownload}
          onChange={(e) => {
            setAutoDownload(e.target.checked);
            localStorage.setItem("autoDownload", String(e.target.checked));
          }}
        />
      </div>
      <label className="settings-row">
        <div>
          <h3>Recent activity</h3>
          <p>How many results to keep on this device.</p>
        </div>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(e.target.value);
            localStorage.setItem("historyLimit", e.target.value);
          }}
        >
          <option value="0">Don’t save</option>
          <option value="10">10 results</option>
          <option value="25">25 results</option>
          <option value="50">50 results</option>
        </select>
      </label>
      <div className="settings-panel">
        <h2>A clean slate.</h2>
        <p>
          Delete saved results, tool workspaces, and saved signatures from this
          browser. Downloads on your device are not affected. Open files remain
          in the current session until you close their tabs.
        </p>
        {confirm ? (
          <div className="hero-actions">
            <button
              className="button primary"
              disabled={clearing}
              onClick={clear}
            >
              {clearing ? "Clearing…" : "Yes, clear local data"}
            </button>
            <button
              className="button secondary"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button className="button secondary" onClick={() => setConfirm(true)}>
            Clear local data
          </button>
        )}
      </div>
      <p>Folio · Made by Sanyam</p>
    </article>
  );
}
