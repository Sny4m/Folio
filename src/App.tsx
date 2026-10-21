/**
 * PaperKnife - The Swiss Army Knife for PDFs
 * Copyright (C) 2026 potatameister
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { lazy, Suspense, useEffect, useState } from "react";
import {
  Layers,
  Scissors,
  Zap,
  Lock,
  Unlock,
  RotateCw,
  Type,
  Hash,
  Tags,
  FileText,
  ArrowUpDown,
  PenTool,
  Wrench,
  ImagePlus,
  FileImage,
  Palette,
  X,
  ChevronDown,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { Tool } from "./types";
import Layout from "./components/Layout";
import WebView from "./components/WebView";
import About from "./components/About";
import PrivacyPolicy from "./components/PrivacyPolicy";
import Settings from "./components/Settings";
const History = lazy(() => import("./components/History"));
const PdfPreview = lazy(() => import("./components/PdfPreview"));
import ScrollToTop from "./components/ScrollToTop";
import { PipelineProvider, usePipeline } from "./utils/pipelineContext";
const MergeTool = lazy(() => import("./components/tools/MergeTool"));
const SplitTool = lazy(() => import("./components/tools/SplitTool"));
const ProtectTool = lazy(() => import("./components/tools/ProtectTool"));
const CompressTool = lazy(() => import("./components/tools/CompressTool"));
const UnlockTool = lazy(() => import("./components/tools/UnlockTool"));
const PdfToImageTool = lazy(() => import("./components/tools/PdfToImageTool"));
const RotateTool = lazy(() => import("./components/tools/RotateTool"));
const PdfToTextTool = lazy(() => import("./components/tools/PdfToTextTool"));
const RearrangeTool = lazy(() => import("./components/tools/RearrangeTool"));
const WatermarkTool = lazy(() => import("./components/tools/WatermarkTool"));
const PageNumberTool = lazy(() => import("./components/tools/PageNumberTool"));
const MetadataTool = lazy(() => import("./components/tools/MetadataTool"));
const ImageToPdfTool = lazy(() => import("./components/tools/ImageToPdfTool"));
const SignatureTool = lazy(() => import("./components/tools/SignatureTool"));
const RepairTool = lazy(() => import("./components/tools/RepairTool"));
const ExtractImagesTool = lazy(
  () => import("./components/tools/ExtractImagesTool"),
);
const GrayscaleTool = lazy(() => import("./components/tools/GrayscaleTool"));
const DigitalSignTool = lazy(() => import("./components/tools/DigitalSignTool"));
const VerifySignatureTool = lazy(() => import("./components/tools/VerifySignatureTool"));

const tools: Tool[] = [
  {
    title: "Merge PDF",
    desc: "Combine multiple PDF files into one document.",
    icon: Layers,
    implemented: true,
    path: "/merge",
    category: "Edit",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Split PDF",
    desc: "Visually extract specific pages or ranges.",
    icon: Scissors,
    implemented: true,
    path: "/split",
    category: "Edit",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Compress PDF",
    desc: "Optimize your file size for easier sharing.",
    icon: Zap,
    implemented: true,
    path: "/compress",
    category: "Optimize",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Protect PDF",
    desc: "Secure your documents with strong encryption.",
    icon: Lock,
    implemented: true,
    path: "/protect",
    category: "Secure",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Unlock PDF",
    desc: "Remove passwords from your protected files.",
    icon: Unlock,
    implemented: true,
    path: "/unlock",
    category: "Secure",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Digitally Sign PDF",
    desc: "Cryptographically seal documents with standard digital certificates.",
    icon: ShieldCheck,
    implemented: true,
    path: "/digital-sign",
    category: "Secure",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Verify Digital Signature",
    desc: "Inspect digital certificates, signers, and tampering status.",
    icon: FileCheck,
    implemented: true,
    path: "/verify-signature",
    category: "Secure",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Rotate PDF",
    desc: "Fix page orientation permanently.",
    icon: RotateCw,
    implemented: true,
    path: "/rotate-pdf",
    category: "Edit",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Reorder Pages",
    desc: "Drag and drop pages to reorder them.",
    icon: ArrowUpDown,
    implemented: true,
    path: "/rearrange-pdf",
    category: "Edit",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Page Numbers",
    desc: "Add numbering to your documents automatically.",
    icon: Hash,
    implemented: true,
    path: "/page-numbers",
    category: "Edit",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Watermark",
    desc: "Overlay custom text for branding or security.",
    icon: Type,
    implemented: true,
    path: "/watermark",
    category: "Edit",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Metadata",
    desc: "Edit document properties for better privacy.",
    icon: Tags,
    implemented: true,
    path: "/metadata",
    category: "Secure",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Signature",
    desc: "Add your electronic signature to any document.",
    icon: PenTool,
    implemented: true,
    path: "/signature",
    category: "Edit",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Grayscale",
    desc: "Convert all document pages to black and white.",
    icon: Palette,
    implemented: true,
    path: "/grayscale",
    category: "Optimize",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "PDF to Image",
    desc: "Convert document pages into high-quality images.",
    icon: FileImage,
    implemented: true,
    path: "/pdf-to-image",
    category: "Convert",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Image to PDF",
    desc: "Convert JPG, PNG, and WebP into a professional PDF.",
    icon: ImagePlus,
    implemented: true,
    path: "/image-to-pdf",
    category: "Convert",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Extract Images",
    desc: "Pull out all original images embedded in a PDF.",
    icon: FileImage,
    implemented: true,
    path: "/extract-images",
    category: "Convert",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "PDF to Text",
    desc: "Extract plain text from your PDF documents.",
    icon: FileText,
    implemented: true,
    path: "/pdf-to-text",
    category: "Convert",
    color: "text-white",
    bg: "bg-zinc-800",
  },
  {
    title: "Repair PDF",
    desc: "Attempt to fix corrupted or unreadable documents.",
    icon: Wrench,
    implemented: true,
    path: "/repair",
    category: "Optimize",
    color: "text-white",
    bg: "bg-zinc-800",
  },
];

export const IS_OCR_DISABLED = import.meta.env.VITE_DISABLE_OCR === "true";
export const activeTools = IS_OCR_DISABLED
  ? tools.filter((t) => t.path !== "/pdf-to-text")
  : tools;

function QuickDropModal({
  file,
  onClear,
  onBack,
}: {
  file: File;
  onClear: () => void;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const { setPipelineFile } = usePipeline();
  const [showMore, setShowMore] = useState(false);

  const essentials = activeTools.slice(0, 4);
  const otherTools = activeTools.slice(4);

  const handleAction = async (path: string, title: string) => {
    toast.loading(`Importing ${file.name}...`, { id: "quick-load" });

    try {
      const buffer = await file.arrayBuffer();
      setPipelineFile({
        buffer: new Uint8Array(buffer),
        name: file.name,
        type:
          file.type ||
          (file.name.endsWith(".zip") ? "application/zip" : "application/pdf"),
      });

      onClear();
      navigate(path);
      toast.success(`Opened in ${title}`, { id: "quick-load" });
    } catch (err) {
      toast.error("Failed to process file", { id: "quick-load" });
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60  duration-300">
      <div className="w-full max-w-md bg-[#FAFAFA] dark:bg-zinc-950 rounded-t-[2.5rem] sm:rounded-[2.5rem]  overflow-hidden border-t border-x border-white/10 sm:border slide-in-from-bottom-full duration-500 ease-out">
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 text-gray-400 hover:text-zinc-500 transition-colors"
                >
                  <ChevronDown className="rotate-90" size={20} />
                </button>
              )}
              <div className="w-10 h-10 bg-white !text-black rounded-xl flex items-center justify-center  ">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-black dark:text-white truncate max-w-[200px] leading-none mb-1">
                  {file.name}
                </h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                </p>
              </div>
            </div>
            <button
              onClick={onClear}
              className="p-2 bg-gray-100 dark:bg-zinc-900 rounded-full text-gray-400 hover:text-zinc-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
          <div>
            <h4 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3 ml-1">
              Essentials
            </h4>
            <div className="grid grid-cols-2 gap-2.5">
              {essentials.map((tool) => (
                <button
                  key={tool.title}
                  onClick={() =>
                    tool.path && handleAction(tool.path, tool.title)
                  }
                  className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-zinc-800 active:scale-95 transition-all  group"
                >
                  <div
                    className={`p-2 rounded-xl ${tool.bg} ${tool.color} group-active:scale-110 transition-transform`}
                  >
                    <tool.icon size={18} strokeWidth={2.5} />
                  </div>
                  <span className="text-xs font-bold text-gray-900 dark:text-zinc-200">
                    {tool.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-zinc-500 transition-colors "
            >
              <span>Full Tool Catalog</span>
              <ChevronDown
                size={14}
                className={`transition-transform duration-300 ${showMore ? "rotate-180" : ""}`}
              />
            </button>

            {showMore && (
              <div className="grid grid-cols-2 gap-2.5 mt-3 slide-in-from-top-2 duration-300 pb-2">
                {otherTools.map((tool) => (
                  <button
                    key={tool.title}
                    onClick={() =>
                      tool.path && handleAction(tool.path, tool.title)
                    }
                    className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-white/5 active:bg-gray-50 dark:active:bg-zinc-800 active:scale-95 transition-all  group"
                  >
                    <div
                      className={`p-2 rounded-xl ${tool.bg} ${tool.color} group-active:scale-110 transition-transform`}
                    >
                      <tool.icon size={18} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-200">
                      {tool.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const { setPipelineFiles } = usePipeline();
  const [file, setFile] = useState<File | null>(null);
  const [quickDrop, setQuickDrop] = useState(false);
  useEffect(() => {
    const handle = (e: Event) => {
      setFile((e as CustomEvent<{ file: File }>).detail.file);
      setQuickDrop(true);
    };
    window.addEventListener("open-quick-drop", handle);
    return () => window.removeEventListener("open-quick-drop", handle);
  }, []);
  const onFileDrop = (files: File[]) => {
    if (files.length && files.every((f) => f.type.startsWith("image/"))) {
      setPipelineFiles(files);
      navigate("/image-to-pdf");
      return;
    }
    const pdf = files.find(
      (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name),
    );
    if (pdf) {
      setFile(pdf);
      setQuickDrop(false);
    } else toast.error("Choose a PDF, JPG, PNG, or WebP file.");
  };
  return (
    <Layout onFileDrop={onFileDrop}>
      <Toaster theme="dark" position="top-center" />
      <Suspense
        fallback={
          <div className="processing-status" role="status">
            Opening your file…
          </div>
        }
      >
        {file && (
          <PdfPreview
            file={file}
            onClose={() => {
              setFile(null);
              setQuickDrop(false);
            }}
            onProcess={() => setQuickDrop(true)}
          />
        )}
      </Suspense>
      {file && quickDrop && (
        <QuickDropModal
          file={file}
          onClear={() => {
            setFile(null);
            setQuickDrop(false);
          }}
          onBack={() => setQuickDrop(false)}
        />
      )}
      <Suspense
        fallback={
          <div className="empty-state" role="status">
            Opening your toolkit…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<WebView tools={activeTools} />} />
          <Route path="/merge" element={<MergeTool />} />
          <Route path="/split" element={<SplitTool />} />
          <Route path="/protect" element={<ProtectTool />} />
          <Route path="/unlock" element={<UnlockTool />} />
          <Route path="/compress" element={<CompressTool />} />
          <Route path="/pdf-to-image" element={<PdfToImageTool />} />
          <Route path="/rotate-pdf" element={<RotateTool />} />
          {!IS_OCR_DISABLED && (
            <Route path="/pdf-to-text" element={<PdfToTextTool />} />
          )}
          <Route path="/rearrange-pdf" element={<RearrangeTool />} />
          <Route path="/watermark" element={<WatermarkTool />} />
          <Route path="/page-numbers" element={<PageNumberTool />} />
          <Route path="/metadata" element={<MetadataTool />} />
          <Route path="/image-to-pdf" element={<ImageToPdfTool />} />
          <Route path="/signature" element={<SignatureTool />} />
          <Route path="/digital-sign" element={<DigitalSignTool />} />
          <Route path="/verify-signature" element={<VerifySignatureTool />} />
          <Route path="/repair" element={<RepairTool />} />
          <Route path="/extract-images" element={<ExtractImagesTool />} />
          <Route path="/grayscale" element={<GrayscaleTool />} />

          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<History />} />
          <Route path="/thanks" element={<About />} />
          <Route
            path="*"
            element={
              <div className="reading-page">
                <h1>This page wandered off.</h1>
                <a className="button primary" href="#/">
                  Back to the playground
                </a>
              </div>
            }
          />
        </Routes>
      </Suspense>
    </Layout>
  );
}
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <PipelineProvider>
        <AppContent />
      </PipelineProvider>
    </HashRouter>
  );
}
