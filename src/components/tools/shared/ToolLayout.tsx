import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import ToolHeader from "./ToolHeader";
interface Props {
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  busy?: boolean;
}
export const ToolLayout = ({
  title,
  description,
  children,
  actions,
  busy,
}: Props) => {
  const workspace = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    workspace.current
      ?.querySelectorAll<HTMLElement>("div.border-dashed")
      .forEach((el) => {
        el.setAttribute("role", "button");
        el.tabIndex = 0;
        el.setAttribute("aria-label", "Choose files or drop them here");
      });
  });
  return (
    <div
      className={`tool-workspace${dragging ? " drop-active" : ""}`}
      ref={workspace}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.matches("div.border-dashed") &&
          (e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          target.click();
        }
      }}
      onChangeCapture={(e) => {
        const input = e.target as HTMLInputElement;
        if (input.type !== "file" || !input.files?.length) return;
        const images = input.accept.includes("image");
        if (
          Array.from(input.files).some((f) =>
            images
              ? !/^image\/(png|jpeg|webp)$/.test(f.type)
              : !/\.pdf$/i.test(f.name),
          )
        ) {
          e.stopPropagation();
          input.value = "";
          toast.error(
            images
              ? "Choose JPG, PNG, or WebP images."
              : "Choose a PDF file to get started.",
          );
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setDragging(false);
      }}
      onDrop={(e) => {
        setDragging(false);
        if (busy) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (e.defaultPrevented) return;
        e.preventDefault();
        e.stopPropagation();
        const input =
          workspace.current?.querySelector<HTMLInputElement>(
            'input[type="file"]',
          );
        if (input && e.dataTransfer.files.length) {
          const transfer = new DataTransfer();
          Array.from(e.dataTransfer.files)
            .slice(0, input.multiple ? undefined : 1)
            .forEach((f) => transfer.items.add(f));
          input.files = transfer.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }}
    >
      <ToolHeader title={title} description={description} />
      {busy && (
        <div className="processing-status" role="status">
          <span /> Working on your device…
        </div>
      )}
      <div className="workspace-content" aria-busy={busy}>
        {children}
      </div>
      {actions && <div className="tool-actions">{actions}</div>}
      <p className="workspace-note">
        ✳ No uploads. No accounts. Just you and your files.
      </p>
    </div>
  );
};
