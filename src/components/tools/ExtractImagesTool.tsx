import { useState, useRef, useEffect } from 'react'
import { Image as ImageIcon, Lock, Loader2, X, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { getPdfMetaData, loadPdfDocument, unlockPdf } from '../../utils/pdfHelpers'
import { addActivity } from '../../utils/recentActivity'
import { usePipeline } from '../../utils/pipelineContext'
import { extractEmbeddedImages } from '../../utils/extractImageEngines'
import SuccessState from './shared/SuccessState'
import { ToolLayout } from './shared/ToolLayout'

type PdfData = { file: File, thumbnail?: string, pageCount: number, isLocked: boolean, pdfDoc?: any, password?: string }

export default function ExtractImagesTool() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { consumePipelineFile } = usePipeline()
  const [pdfData, setPdfData] = useState<PdfData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [extractedCount, setExtractedCount] = useState(0)
  const [customFileName, setCustomFileName] = useState('extracted-images')
  const [unlockPassword, setUnlockPassword] = useState('')

  useEffect(() => {
    const pipelined = consumePipelineFile()
    if (pipelined) {
      const file = new File([pipelined.buffer as any], pipelined.name, { type: 'application/pdf' })
      handleFile(file)
    }
  }, [])

  const handleUnlock = async () => {
    if (!pdfData || !unlockPassword) return
    setIsProcessing(true)
    const result = await unlockPdf(pdfData.file, unlockPassword)
    if (result.success) {
      setPdfData({ ...pdfData, isLocked: false, pageCount: result.pageCount, pdfDoc: result.pdfDoc, thumbnail: result.thumbnail, password: unlockPassword })
      setCustomFileName(`${pdfData.file.name.replace('.pdf', '')}-extracted`)
    } else { toast.error(`Incorrect password for "${pdfData.file.name}".`) }
    setIsProcessing(false)
  }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') return
    setIsProcessing(true)
    try {
      const meta = await getPdfMetaData(file)
      if (meta.isLocked) { setPdfData({ file, pageCount: 0, isLocked: true }) }
      else {
        const pdfDoc = await loadPdfDocument(file)
        setPdfData({ file, pageCount: meta.pageCount, isLocked: false, pdfDoc, thumbnail: meta.thumbnail })
        setCustomFileName(`${file.name.replace('.pdf', '')}-extracted`)
      }
    } catch (err) { console.error(err); toast.error('Failed to open PDF') } finally { setIsProcessing(false); setDownloadUrl(null) }
  }

  const extractImages = async () => {
    if (!pdfData || !pdfData.pdfDoc) return
    setIsProcessing(true); setProgress(0); setExtractedCount(0)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    try {
      const { blob: zipBlob, count: imageCounter } = await extractEmbeddedImages(pdfData.pdfDoc, setProgress)
      const url = URL.createObjectURL(zipBlob)
      setDownloadUrl(url)
      setExtractedCount(imageCounter)
      addActivity({ name: `${customFileName}.zip`, tool: 'Extract Images', size: zipBlob.size, resultUrl: url, buffer: new Uint8Array(await zipBlob.arrayBuffer()) })
      toast.success(`Extracted ${imageCounter} images!`)
    } catch (error: any) { 
      toast.error(`Error: ${error.message}`) 
    } finally { 
      setIsProcessing(false) 
    }
  }

  const ActionButton = () => (
    <button onClick={extractImages} disabled={isProcessing} className={`w-full bg-white hover:bg-zinc-200 !text-black font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3   p-6 rounded-3xl text-xl`}>
      {isProcessing ? <><Loader2 className="animate-spin" /> {progress}%</> : <><Sparkles size={18} /> Extract Raw Images</>}
    </button>
  )

  return (
    <ToolLayout busy={isProcessing} title="Extract Images" description="Find and save all original images embedded inside the PDF." actions={pdfData && !pdfData.isLocked && !downloadUrl && <ActionButton />}>
      <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      {!pdfData ? (
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-[2.5rem] p-12 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900/20 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><ImageIcon size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select PDF</h3>
          <p className="text-sm text-gray-400">Tap to search for images</p>
        </div>
      ) : pdfData.isLocked ? (
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 text-center">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900/30 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={32} /></div>
            <h3 className="text-2xl font-bold mb-2 dark:text-white">Protected File</h3>
            <input type="password" value={unlockPassword} onChange={(e) => setUnlockPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-50 dark:bg-black rounded-2xl px-6 py-4 border border-transparent focus:border-zinc-500 outline-none font-bold text-center mb-4" />
            <button onClick={handleUnlock} disabled={!unlockPassword || isProcessing} className="w-full bg-white !text-black p-4 rounded-2xl font-black uppercase text-xs">Unlock</button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-white/5 flex items-center gap-6">
            <div className="w-16 h-20 bg-gray-50 dark:bg-black rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400">{pdfData.thumbnail ? <img src={pdfData.thumbnail} className="w-full h-full object-cover" /> : <ImageIcon size={20} />}</div>
            <div className="flex-1 min-w-0"><h3 className="font-bold text-sm truncate dark:text-white">{pdfData.file.name}</h3><p className="text-[10px] text-gray-400 uppercase font-black">{pdfData.pageCount} Pages • {(pdfData.file.size / (1024*1024)).toFixed(1)} MB</p></div>
            <button onClick={() => setPdfData(null)} className="p-2 text-gray-400 hover:text-zinc-400 transition-colors"><X size={20} /></button>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] border border-gray-100 dark:border-white/5 space-y-8 ">
            {!downloadUrl ? (
              <>
                <div className="space-y-4">
                  <div className="text-center py-2 px-4 bg-gray-50 dark:bg-black rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed font-medium">
                      This tool scans every page and recovers high-quality source images. Perfect for saving photos from documents.
                    </p>
                  </div>
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/10 rounded-xl border border-zinc-100 dark:border-zinc-900/20 text-center">
                    <p className="text-[10px] text-zinc-700 dark:text-zinc-400 font-bold uppercase tracking-widest">
                      Note: If no images are detected, the file may have been compressed using rasterization (printing to PDF).
                    </p>
                  </div>
                </div>
                <div><label className="block text-[10px] font-black uppercase text-gray-400 mb-3 tracking-widest px-1">Output ZIP Name</label><input type="text" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-zinc-500 outline-none font-bold text-sm dark:text-white" /></div>
                {isProcessing && (
                  <div className="space-y-3">
                    <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden ">
                       <div className="bg-zinc-500 h-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-center font-black text-gray-400 uppercase tracking-widest animate-pulse">Extracting High-Res Assets...</p>
                  </div>
                )}
              </>
            ) : (
              <SuccessState message={`Successfully extracted ${extractedCount} images!`} downloadUrl={downloadUrl} fileName={`${customFileName}.zip`} onStartOver={() => { setDownloadUrl(null); setProgress(0); setExtractedCount(0); setPdfData(null); }} showPreview={false} />
            )}
            <button onClick={() => setPdfData(null)} className="w-full py-2 text-[10px] font-black uppercase text-gray-300 hover:text-zinc-400 transition-colors">Close File</button>
          </div>
        </div>
      )}
    </ToolLayout>
  )
}
