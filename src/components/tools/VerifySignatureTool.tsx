import { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  FileCheck,
  Calendar,
  User,
  Key,
  Download,
  AlertCircle,
  FileText,
  X,
  Loader2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

import { getPdfMetaData, unlockPdf } from '../../utils/pdfHelpers';
import { getProcessBytes } from '../../utils/decryptInput';
import { usePipeline } from '../../utils/pipelineContext';
import { ToolLayout } from './shared/ToolLayout';
import {
  VerifiedSignature,
  verifyPdfDigitalSignatures,
} from '../../utils/digitalSignatureEngines';

type PdfFile = {
  file: File;
  pageCount: number;
  isLocked: boolean;
  password?: string;
};

export default function VerifySignatureTool() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { consumePipelineFile } = usePipeline();

  const [pdfData, setPdfData] = useState<PdfFile | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signatures, setSignatures] = useState<VerifiedSignature[] | null>(null);

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
    setSignatures(null);
    try {
      const meta = await getPdfMetaData(file);
      if (meta.isLocked) {
        setPdfData({ file, pageCount: 0, isLocked: true });
      } else {
        setPdfData({ file, pageCount: meta.pageCount, isLocked: false });
        await inspectSignatures(file);
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
          password: unlockPassword,
        });
        await inspectSignatures(pdfData.file, unlockPassword);
      } else {
        toast.error(`Incorrect password for "${pdfData.file.name}".`);
      }
    } catch {
      toast.error('Failed to unlock PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const inspectSignatures = async (file: File, password?: string) => {
    setIsProcessing(true);
    try {
      const bytes = await getProcessBytes(file, password);
      const results = await verifyPdfDigitalSignatures(bytes);
      setSignatures(results);
      if (results.length > 0) {
        toast.success(`Found ${results.length} digital signature${results.length > 1 ? 's' : ''}!`);
      }
    } catch (err) {
      console.error('Inspection failed:', err);
      toast.error('Could not verify digital signatures.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadCert = (sig: VerifiedSignature) => {
    try {
      const blob = new Blob([sig.certificate.pem], { type: 'application/x-x509-ca-cert' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sig.certificate.commonName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-cert.pem`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Signer certificate downloaded.');
    } catch {
      toast.error('Could not export certificate.');
    }
  };

  return (
    <ToolLayout
      busy={isProcessing}
      title="Verify Digital Signature"
      description="Inspect cryptographic digital signatures, signer certificates, and document integrity."
    >
      <input
        type="file"
        accept=".pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!pdfData ? (
        <button
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className="w-full border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-[2.5rem] p-12 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer group"
        >
          <ShieldCheck size={40} className="mx-auto mb-4 text-emerald-500" />
          <h3 className="text-xl font-bold dark:text-white mb-1">Select PDF to Verify</h3>
          <p className="text-xs text-gray-400">Inspect digital certificates, signers, and tampering status</p>
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
              Unlock & Verify
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Header */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center gap-6">
            <div className="w-12 h-16 bg-gray-50 dark:bg-black rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400">
              <FileText size={24} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-bold text-sm truncate dark:text-white">{pdfData.file.name}</h3>
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">
                {pdfData.pageCount} Pages • {(pdfData.file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              onClick={() => {
                setPdfData(null);
                setSignatures(null);
              }}
              className="p-2 text-gray-400 hover:text-zinc-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Results Area */}
          {isProcessing ? (
            <div className="bg-white dark:bg-zinc-900 p-12 rounded-[2.5rem] border border-gray-100 dark:border-white/5 text-center">
              <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={32} />
              <h4 className="text-base font-bold dark:text-white">Verifying Digital Signatures…</h4>
              <p className="text-xs text-gray-400 mt-1">Analyzing PKCS#7 byte ranges and certificates</p>
            </div>
          ) : signatures === null ? null : signatures.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 text-center space-y-3">
              <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400">
                <AlertCircle size={28} />
              </div>
              <h3 className="text-lg font-bold dark:text-white">No Digital Signatures Detected</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                This document does not contain cryptographic PDF digital signatures (`/Type /Sig`).
                Note that visual ink or uploaded stamp images without an embedded cryptographic X.509
                certificate are not recognized as digital signatures.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Summary Banner */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-3xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-black flex items-center justify-center shrink-0 font-bold">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-black dark:text-white">
                    {signatures.length === 1 ? '1 Digital Signature Verified' : `${signatures.length} Digital Signatures Verified`}
                  </h4>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Document contains authentic cryptographic signatures. Details shown below.
                  </p>
                </div>
              </div>

              {/* Individual Signature Cards */}
              {signatures.map((sig) => (
                <div
                  key={sig.index}
                  className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-gray-100 dark:border-white/5 overflow-hidden"
                >
                  {/* Signature Card Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-emerald-500 flex items-center justify-center font-bold">
                        <FileCheck size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black dark:text-white">
                          Signature #{sig.index}: {sig.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 tracking-wider uppercase font-bold">
                          {sig.fileCoverage === 'complete' ? 'Covers Full Document' : 'Document Has Subsequent Revisions'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                          sig.status === 'valid'
                            ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {sig.status === 'valid' ? 'Valid & Intact' : 'Warning / Review'}
                      </span>

                      <button
                        onClick={() => handleDownloadCert(sig)}
                        className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-[10px] font-black uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors"
                        title="Download Certificate"
                      >
                        <Download size={12} /> Certificate
                      </button>
                    </div>
                  </div>

                  {/* Signature Details Grid */}
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    {/* Signer Identity */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <User size={12} className="text-emerald-500" /> Signer Identity
                      </h5>
                      <div className="bg-gray-50 dark:bg-black/40 p-4 rounded-2xl space-y-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Common Name (CN)</span>
                          <span className="text-xs font-bold dark:text-white">{sig.certificate.commonName}</span>
                        </div>
                        {sig.certificate.organization && (
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Organization</span>
                            <span className="text-xs font-bold dark:text-zinc-200">{sig.certificate.organization}</span>
                          </div>
                        )}
                        {sig.certificate.email && (
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Email</span>
                            <span className="text-xs font-bold dark:text-zinc-200">{sig.certificate.email}</span>
                          </div>
                        )}
                        {sig.certificate.country && (
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Country</span>
                            <span className="text-xs font-bold dark:text-zinc-200">{sig.certificate.country}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Certificate & Validity */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <Key size={12} className="text-emerald-500" /> Certificate Authority
                      </h5>
                      <div className="bg-gray-50 dark:bg-black/40 p-4 rounded-2xl space-y-2">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Issuer</span>
                          <span className="text-xs font-bold dark:text-white">{sig.certificate.issuerCommonName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Validity Period</span>
                          <span className="text-xs font-bold dark:text-zinc-200">
                            {sig.certificate.validFrom.toLocaleDateString()} — {sig.certificate.validTo.toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Serial Number</span>
                          <span className="text-[11px] font-mono dark:text-zinc-400 break-all">
                            {sig.certificate.serialNumber}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Signature Metadata */}
                    <div className="space-y-3 md:col-span-2">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <Calendar size={12} className="text-emerald-500" /> Signing Metadata & Statement
                      </h5>
                      <div className="bg-gray-50 dark:bg-black/40 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Signing Time</span>
                          <span className="text-xs font-bold dark:text-white">
                            {sig.signingDate ? sig.signingDate.toLocaleString() : 'Not specified in dictionary'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Reason</span>
                          <span className="text-xs font-bold dark:text-white">
                            {sig.reason || 'None provided'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-bold">Location</span>
                          <span className="text-xs font-bold dark:text-white">
                            {sig.location || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setPdfData(null);
              setSignatures(null);
            }}
            className="w-full py-2 text-[10px] font-black uppercase text-gray-400 hover:text-white transition-colors"
          >
            Check Another PDF
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
