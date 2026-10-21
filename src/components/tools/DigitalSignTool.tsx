import { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  Key,
  FileCheck,
  Plus,
  Trash2,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  Pen,
  Eraser,
  Check,
  Download,
  Upload,
  ArrowRight,
  Loader2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { getPdfMetaData, loadPdfDocument, renderPageThumbnail, unlockPdf } from '../../utils/pdfHelpers';
import { getProcessBytes } from '../../utils/decryptInput';
import { addActivity } from '../../utils/recentActivity';
import { usePipeline } from '../../utils/pipelineContext';
import SuccessState from './shared/SuccessState';
import { ToolLayout } from './shared/ToolLayout';
import {
  DigitalIdentity,
  getSavedDigitalIdentities,
  saveDigitalIdentity,
  deleteDigitalIdentity,
  generateDigitalCertificate,
  importPkcs12Certificate,
  exportToPkcs12,
  digitallySignPdf,
} from '../../utils/digitalSignatureEngines';

type PdfData = {
  file: File;
  pageCount: number;
  isLocked: boolean;
  pdfDoc?: any;
  password?: string;
};

function MiniSignaturePad({
  onSave,
  onCancel,
}: {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const toPt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const pt = toPt(clientX, clientY);
    lastPoint.current = pt;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const pt = toPt(clientX, clientY);
    const last = lastPoint.current || pt;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
    lastPoint.current = pt;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPoint.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/1] w-full bg-white border border-gray-200 dark:border-zinc-700 rounded-2xl overflow-hidden touch-none select-none">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <button
          onClick={clear}
          className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-500"
          title="Clear"
        >
          <Eraser size={14} />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-wider text-gray-500"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2 bg-white !text-black rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <Check size={14} /> Attach Drawing
        </button>
      </div>
    </div>
  );
}

export default function DigitalSignTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const p12InputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const thumbImgRef = useRef<HTMLImageElement>(null);

  const { consumePipelineFile } = usePipeline();

  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [customFileName, setCustomFileName] = useState('folio-digitally-signed');

  // Digital Identity State
  const [savedIdentities, setSavedIdentities] = useState<DigitalIdentity[]>([]);
  const [activeIdentity, setActiveIdentity] = useState<DigitalIdentity | null>(null);
  const [showCreateIdModal, setShowCreateIdModal] = useState(false);

  // New ID Form
  const [newIdName, setNewIdName] = useState('');
  const [newIdEmail, setNewIdEmail] = useState('');
  const [newIdOrg, setNewIdOrg] = useState('');
  const [newIdCountry, setNewIdCountry] = useState('US');
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // Signature Details
  const [signerName, setSignerName] = useState('');
  const [reason, setReason] = useState('I approve and certify this document');
  const [location, setLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  // Visual Appearance
  const [visualMode, setVisualMode] = useState<'badge' | 'invisible'>('badge');
  const [activePage, setActivePage] = useState(1);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [placement, setPlacement] = useState<{ x: number; y: number }>({ x: 50, y: 85 });
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showDrawPad, setShowDrawPad] = useState(false);

  useEffect(() => {
    const list = getSavedDigitalIdentities();
    setSavedIdentities(list);
    if (list.length > 0) {
      setActiveIdentity(list[0]);
      setSignerName(list[0].name);
      setContactInfo(list[0].email);
    }
  }, []);

  useEffect(() => {
    const pipelined = consumePipelineFile();
    if (pipelined) {
      const file = new File([pipelined.buffer as any], pipelined.name, {
        type: 'application/pdf',
      });
      handleFile(file);
    }
  }, []);

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please choose a PDF document.');
      return;
    }
    setIsProcessing(true);
    try {
      const meta = await getPdfMetaData(file);
      if (meta.isLocked) {
        setPdfData({ file, pageCount: 0, isLocked: true });
      } else {
        const pdfDoc = await loadPdfDocument(file);
        setPdfData({ file, pageCount: meta.pageCount, isLocked: false, pdfDoc });
        setActivePage(1);
        const thumb = await renderPageThumbnail(pdfDoc, 1, 1.8);
        setThumbnail(thumb);
      }
    } catch {
      toast.error('Failed to open PDF.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUnlock = async () => {
    if (!pdfData || !unlockPassword) return;
    setIsProcessing(true);
    try {
      const result = await unlockPdf(pdfData.file, unlockPassword);
      if (result.success) {
        setPdfData({
          ...pdfData,
          isLocked: false,
          pageCount: result.pageCount,
          pdfDoc: result.pdfDoc,
          password: unlockPassword,
        });
        setActivePage(1);
        const thumb = await renderPageThumbnail(result.pdfDoc, 1, 1.8);
        setThumbnail(thumb);
      } else {
        toast.error(`Incorrect password for "${pdfData.file.name}".`);
      }
    } catch {
      toast.error('Failed to unlock PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const changePage = async (page: number) => {
    if (!pdfData || !pdfData.pdfDoc) return;
    const clamped = Math.max(1, Math.min(page, pdfData.pageCount));
    if (clamped === activePage && thumbnail) return;
    setActivePage(clamped);
    setThumbnail(null);
    try {
      const thumb = await renderPageThumbnail(pdfData.pdfDoc, clamped, 1.8);
      setThumbnail(thumb);
    } catch {
      toast.error('Could not render page preview.');
    }
  };

  // Create new Digital ID
  const handleGenerateIdentity = async () => {
    if (!newIdName.trim()) {
      toast.error('Signer name is required.');
      return;
    }
    setIsGeneratingId(true);
    try {
      const { certificatePem, privateKeyPem } = await generateDigitalCertificate({
        commonName: newIdName.trim(),
        email: newIdEmail.trim(),
        organization: newIdOrg.trim() || 'Folio Verified',
        country: newIdCountry.trim() || 'US',
        validityYears: 3,
      });

      const newId: DigitalIdentity = {
        id: Math.random().toString(36).slice(2),
        name: newIdName.trim(),
        email: newIdEmail.trim(),
        organization: newIdOrg.trim() || 'Folio Verified',
        country: newIdCountry.trim() || 'US',
        certificatePem,
        privateKeyPem,
        createdAt: Date.now(),
      };

      saveDigitalIdentity(newId);
      const updated = getSavedDigitalIdentities();
      setSavedIdentities(updated);
      setActiveIdentity(newId);
      setSignerName(newId.name);
      setContactInfo(newId.email);
      setShowCreateIdModal(false);
      toast.success('Digital certificate created successfully!');
    } catch {
      toast.error('Failed to generate digital certificate.');
    } finally {
      setIsGeneratingId(false);
    }
  };

  // Import PKCS#12 (.p12/.pfx) file
  const handleImportP12 = async (file: File) => {
    const password = prompt('Enter certificate password (leave empty if none):') || '';
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const imported = await importPkcs12Certificate(buffer, password);

      const newId: DigitalIdentity = {
        id: Math.random().toString(36).slice(2),
        name: imported.commonName,
        email: '',
        organization: 'Imported Certificate',
        country: 'US',
        certificatePem: imported.certificatePem,
        privateKeyPem: imported.privateKeyPem,
        createdAt: Date.now(),
      };

      saveDigitalIdentity(newId);
      const updated = getSavedDigitalIdentities();
      setSavedIdentities(updated);
      setActiveIdentity(newId);
      setSignerName(newId.name);
      toast.success(`Imported certificate for "${newId.name}"!`);
    } catch (err: any) {
      toast.error(err.message || 'Could not import certificate.');
    } finally {
      setIsProcessing(false);
      if (p12InputRef.current) p12InputRef.current.value = '';
    }
  };

  const handleExportIdentity = (id: DigitalIdentity) => {
    try {
      const p12Bytes = exportToPkcs12(id.certificatePem, id.privateKeyPem, '');
      const blob = new Blob([p12Bytes.buffer as ArrayBuffer], { type: 'application/x-pkcs12' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-cert.p12`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Certificate (.p12) downloaded.');
    } catch {
      toast.error('Could not export certificate.');
    }
  };

  const handleDeleteIdentity = (id: string) => {
    deleteDigitalIdentity(id);
    const updated = getSavedDigitalIdentities();
    setSavedIdentities(updated);
    if (activeIdentity?.id === id) {
      setActiveIdentity(updated[0] || null);
      if (updated[0]) {
        setSignerName(updated[0].name);
        setContactInfo(updated[0].email);
      }
    }
    toast.success('Identity removed from this device.');
  };

  // Preview point placement
  const handlePreviewClick = (e: React.MouseEvent) => {
    const rect = thumbImgRef.current?.getBoundingClientRect() || previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(10, Math.min(90, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100));
    setPlacement({ x, y });
  };

  // Sign Document
  const handleSign = async () => {
    if (!pdfData || !activeIdentity) {
      toast.error('Please select or create a digital identity to sign.');
      return;
    }

    setIsProcessing(true);
    try {
      let rawBytes: Uint8Array;
      try {
        rawBytes = await getProcessBytes(pdfData.file, pdfData.password);
      } catch (err: any) {
        toast.error(err.message || 'Could not read PDF.');
        setIsProcessing(false);
        return;
      }

      const signedBytes = await digitallySignPdf(rawBytes, {
        signerName: signerName || activeIdentity.name,
        reason,
        location,
        contactInfo,
        certificatePem: activeIdentity.certificatePem,
        privateKeyPem: activeIdentity.privateKeyPem,
        pageNumber: activePage,
        visual: {
          enabled: visualMode === 'badge',
          x: placement.x,
          y: placement.y,
          width: 35,
          signatureImage: attachedImage || undefined,
        },
      });

      const blob = new Blob([signedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      addActivity({
        name: `${customFileName}.pdf`,
        tool: 'Digital Sign',
        size: blob.size,
        resultUrl: url,
        buffer: signedBytes,
      });

      toast.success('PDF successfully digitally signed!');
    } catch (err: any) {
      console.error('Digital sign error:', err);
      toast.error(err.message || 'Failed to digitally sign document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const ActionButton = () => (
    <button
      onClick={handleSign}
      disabled={isProcessing || !activeIdentity}
      className="w-full bg-white hover:bg-zinc-200 !text-black font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 p-6 rounded-3xl text-xl"
    >
      {isProcessing ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
          <ShieldCheck size={22} /> Digitally Sign PDF <ArrowRight size={18} />
        </>
      )}
    </button>
  );

  return (
    <ToolLayout
      busy={isProcessing}
      title="Digitally Sign PDF"
      description="Cryptographically sign PDFs with standard X.509 digital certificates and tamper-evident seal."
      actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButton />}
    >
      <input
        type="file"
        accept=".pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        type="file"
        accept=".p12,.pfx"
        className="hidden"
        ref={p12InputRef}
        onChange={(e) => e.target.files?.[0] && handleImportP12(e.target.files[0])}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={imgInputRef}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) {
            const reader = new FileReader();
            reader.onload = () => setAttachedImage(reader.result as string);
            reader.readAsDataURL(f);
          }
        }}
      />

      {!pdfData ? (
        <button
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="w-full border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-[2.5rem] p-12 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer group"
        >
          <ShieldCheck size={40} className="mx-auto mb-4 text-emerald-500" />
          <h3 className="text-xl font-bold dark:text-white mb-1">Select PDF to Digitally Sign</h3>
          <p className="text-xs text-gray-400">Add an authentic PKCS#7 digital signature with cryptographic seal</p>
        </button>
      ) : pdfData.isLocked ? (
        <div className="max-w-md mx-auto relative z-[100]">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900/30 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-2 dark:text-white">Protected Document</h3>
            <input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-gray-50 dark:bg-black rounded-2xl px-6 py-4 border border-transparent focus:border-zinc-500 outline-none font-bold text-center mb-4 dark:text-white"
            />
            <button
              onClick={handleUnlock}
              disabled={!unlockPassword || isProcessing}
              className="w-full bg-white !text-black p-4 rounded-2xl font-black uppercase tracking-widest text-xs"
            >
              Unlock
            </button>
          </div>
        </div>
      ) : !downloadUrl ? (
        <div className="space-y-6">
          {/* File Header */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center gap-6">
            <div className="w-12 h-16 bg-gray-50 dark:bg-black rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
              {thumbnail ? (
                <img src={thumbnail} className="w-full h-full object-cover" alt="Thumbnail" />
              ) : (
                <FileText size={24} />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-bold text-sm truncate dark:text-white">{pdfData.file.name}</h3>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                {pdfData.pageCount} Pages • {(pdfData.file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={() => setPdfData(null)}
              className="p-2 text-gray-400 hover:text-zinc-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Digital Certificate Section */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest dark:text-white flex items-center gap-2">
                  <Key size={14} className="text-emerald-500" /> Digital Identity & Certificate
                </h4>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Cryptographic certificate used to seal and authenticate this PDF.
                </p>
              </div>
              <button
                onClick={() => setShowCreateIdModal(true)}
                className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-200 flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> New Identity
              </button>
            </div>

            {savedIdentities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {savedIdentities.map((id) => {
                  const isSelected = activeIdentity?.id === id.id;
                  return (
                    <div
                      key={id.id}
                      onClick={() => {
                        setActiveIdentity(id);
                        setSignerName(id.name);
                        setContactInfo(id.email);
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/20'
                          : 'border-gray-100 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-sm dark:text-white truncate">{id.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{id.organization}</p>
                          {id.email && <p className="text-[10px] text-zinc-500 truncate">{id.email}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportIdentity(id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-zinc-200"
                            title="Export .p12 certificate"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteIdentity(id.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-400"
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                          RSA 2048
                        </span>
                        {isSelected && (
                          <span className="text-[9px] font-bold text-emerald-500">Active</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-100 dark:border-zinc-800 rounded-2xl">
                <Award size={28} className="mx-auto mb-2 text-zinc-500" />
                <p className="text-xs font-bold dark:text-zinc-300">No Digital Identity Found</p>
                <p className="text-[11px] text-gray-400 mb-4">Create a certificate or import an existing .p12/.pfx</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setShowCreateIdModal(true)}
                    className="px-4 py-2 bg-white !text-black rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    Create Digital ID
                  </button>
                  <button
                    onClick={() => p12InputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-black uppercase tracking-wider text-gray-700 dark:text-zinc-200"
                  >
                    Import .p12 / .pfx
                  </button>
                </div>
              </div>
            )}

            {savedIdentities.length > 0 && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => p12InputRef.current?.click()}
                  className="text-[11px] font-bold text-gray-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  <Upload size={12} /> Import existing .p12 / .pfx file
                </button>
              </div>
            )}
          </div>

          {/* Signature Metadata Form */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest dark:text-white flex items-center gap-2">
              <FileCheck size={14} className="text-emerald-500" /> Signature Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Signer Name
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none border border-transparent focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Contact / Email
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="e.g. signer@example.com"
                  className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none border border-transparent focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Reason for Signing
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. I approve this document"
                  className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none border border-transparent focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. New York, USA"
                  className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none border border-transparent focus:border-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* Visual Appearance & Placement */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest dark:text-white">
                  Signature Appearance
                </h4>
                <p className="text-[11px] text-gray-400">Choose how the digital seal is presented on the document</p>
              </div>
              <div className="flex gap-1.5 bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button
                  onClick={() => setVisualMode('badge')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    visualMode === 'badge'
                      ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm'
                      : 'text-gray-400 hover:text-zinc-300'
                  }`}
                >
                  Visual Seal
                </button>
                <button
                  onClick={() => setVisualMode('invisible')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    visualMode === 'invisible'
                      ? 'bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm'
                      : 'text-gray-400 hover:text-zinc-300'
                  }`}
                >
                  Invisible
                </button>
              </div>
            </div>

            {visualMode === 'badge' && (
              <>
                {/* Optional Attached Drawing or Image */}
                <div className="p-4 bg-gray-50 dark:bg-black/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Handwritten Ink / Graphic Inside Seal (Optional)
                    </span>
                    {attachedImage && (
                      <button
                        onClick={() => setAttachedImage(null)}
                        className="text-[10px] font-bold text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {showDrawPad ? (
                    <MiniSignaturePad
                      onSave={(dataUrl) => {
                        setAttachedImage(dataUrl);
                        setShowDrawPad(false);
                      }}
                      onCancel={() => setShowDrawPad(false)}
                    />
                  ) : attachedImage ? (
                    <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <img src={attachedImage} className="h-10 object-contain" alt="Drawn signature" />
                      <span className="text-xs text-gray-400">Signature attached to certificate badge</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDrawPad(true)}
                        className="flex-1 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-zinc-200 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <Pen size={14} /> Draw Ink
                      </button>
                      <button
                        onClick={() => imgInputRef.current?.click()}
                        className="flex-1 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-zinc-200 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-zinc-800"
                      >
                        <Upload size={14} /> Upload Image
                      </button>
                    </div>
                  )}
                </div>

                {/* Page Navigation */}
                {pdfData.pageCount > 1 && (
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-black px-4 py-2.5 rounded-2xl">
                    <button
                      onClick={() => changePage(activePage - 1)}
                      disabled={activePage <= 1}
                      className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                      Stamp on Page {activePage} of {pdfData.pageCount}
                    </span>
                    <button
                      onClick={() => changePage(activePage + 1)}
                      disabled={activePage >= pdfData.pageCount}
                      className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}

                {/* Interactive Placement Preview */}
                <p className="text-[11px] text-gray-400 text-center font-bold">
                  Tap anywhere on the page to reposition the digital seal:
                </p>

                <div
                  className="bg-gray-50 dark:bg-black p-4 rounded-3xl border border-gray-100 dark:border-zinc-800 overflow-hidden cursor-crosshair select-none"
                  ref={previewRef}
                  onClick={handlePreviewClick}
                >
                  {thumbnail ? (
                    <div className="relative w-full">
                      <img
                        ref={thumbImgRef}
                        src={thumbnail}
                        className="w-full h-auto block rounded-lg shadow-sm"
                        alt={`Page ${activePage}`}
                      />
                      {/* Stamp Preview Overlay */}
                      <div
                        style={{
                          left: `${placement.x}%`,
                          top: `${placement.y}%`,
                          transform: 'translate(-50%, -50%)',
                          width: '38%',
                        }}
                        className="absolute pointer-events-none rounded-lg border-2 border-emerald-500 bg-white/95 p-2 shadow-lg"
                      >
                        <div className="bg-emerald-600 text-[8px] font-black text-white px-2 py-0.5 rounded uppercase tracking-wider mb-1">
                          Digitally Signed & Verified
                        </div>
                        <p className="text-[9px] font-bold text-black truncate">
                          {signerName || activeIdentity?.name || 'Jane Doe'}
                        </p>
                        <p className="text-[7.5px] text-gray-500 truncate">
                          {new Date().toISOString().substring(0, 10)} • Cryptographic Seal
                        </p>
                        {attachedImage && (
                          <img src={attachedImage} className="h-4 object-contain mt-0.5" alt="Sig" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full min-h-[260px] flex items-center justify-center">
                      <Loader2 className="animate-spin text-zinc-400" />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Filename customization */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-gray-100 dark:border-white/5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Output Filename
            </label>
            <input
              type="text"
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 text-sm font-bold dark:text-white outline-none border border-transparent focus:border-zinc-500"
            />
          </div>

          <button
            onClick={() => setPdfData(null)}
            className="w-full py-2 text-[10px] font-black uppercase text-gray-400 hover:text-white transition-colors"
          >
            Close Document
          </button>
        </div>
      ) : (
        <SuccessState
          message="Document Digitally Signed!"
          downloadUrl={downloadUrl}
          fileName={`${customFileName}.pdf`}
          onStartOver={() => {
            setDownloadUrl(null);
            setPdfData(null);
          }}
        />
      )}

      {/* Modal: Create Digital Identity */}
      {showCreateIdModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/70 duration-200">
          <div className="w-full max-w-md bg-[#FAFAFA] dark:bg-zinc-950 rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-emerald-500" />
                <h3 className="text-base font-black dark:text-white">Create Digital Identity</h3>
              </div>
              <button
                onClick={() => setShowCreateIdModal(false)}
                className="p-1.5 text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Generates a private 2048-bit RSA key and X.509 digital certificate stored locally on this device.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Full Name / Common Name *
                </label>
                <input
                  type="text"
                  value={newIdName}
                  onChange={(e) => setNewIdName(e.target.value)}
                  placeholder="e.g. Johnathan Smith"
                  className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newIdEmail}
                  onChange={(e) => setNewIdEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={newIdOrg}
                    onChange={(e) => setNewIdOrg(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Country Code
                  </label>
                  <input
                    type="text"
                    value={newIdCountry}
                    onChange={(e) => setNewIdCountry(e.target.value.toUpperCase())}
                    placeholder="e.g. US"
                    maxLength={2}
                    className="w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold dark:text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowCreateIdModal(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-zinc-900 rounded-xl text-xs font-bold text-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateIdentity}
                disabled={isGeneratingId || !newIdName.trim()}
                className="flex-1 py-3 bg-white !text-black rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingId ? <Loader2 className="animate-spin" size={16} /> : 'Generate ID'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
