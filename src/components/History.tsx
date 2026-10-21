import { useEffect, useState } from "react";
import { Download, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getRecentActivity,
  deleteActivity,
  type ActivityEntry,
} from "../utils/recentActivity";
import { downloadFile } from "../utils/pdfHelpers";
export default function History() {
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getRecentActivity(50)
      .then(setItems)
      .catch(() => toast.error("Could not read local history."))
      .finally(() => setLoading(false));
  }, []);
  return (
    <article className="reading-page">
      <div className="eyebrow">ON THIS DEVICE ONLY</div>
      <h1>Your recent handiwork.</h1>
      <p className="reading-lead">Saved locally. Ready for another download.</p>
      {loading ? (
        <p role="status">Opening local history…</p>
      ) : !items.length ? (
        <div className="empty-state">
          <FileText size={42} />
          <h2>A fresh start.</h2>
          <p>Your completed files will appear here.</p>
        </div>
      ) : (
        <div className="history-list">
          {items.map((item) => (
            <div className="history-row" key={item.id}>
              <FileText size={24} />
              <div>
                <h3>{item.name}</h3>
                <p>
                  {item.tool} · {new Date(item.timestamp).toLocaleDateString()}
                </p>
              </div>
              {item.buffer && (
                <button
                  aria-label={`Download ${item.name}`}
                  onClick={async () => {
                    try {
                      await downloadFile(
                        item.buffer!,
                        item.name,
                        item.name.endsWith(".zip")
                          ? "application/zip"
                          : "application/pdf",
                      );
                    } catch {
                      toast.error("Could not download this file.");
                    }
                  }}
                >
                  <Download size={20} />
                </button>
              )}
              <button
                aria-label={`Delete ${item.name}`}
                onClick={async () => {
                  try {
                    await deleteActivity(item.id);
                    setItems((prev) => prev.filter((i) => i.id !== item.id));
                  } catch {
                    toast.error("Could not delete this entry.");
                  }
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
