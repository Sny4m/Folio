import { useState, useRef, useEffect } from 'react'
import { Plus, X, Loader2, GripVertical, Upload, ArrowRight } from 'lucide-react'
import { PDFDocument } from 'pdf-lib'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'

import { addActivity } from '../../utils/recentActivity'
import SuccessState from './shared/SuccessState'
import { ToolLayout } from './shared/ToolLayout'
import { useObjectURL } from '../../utils/useObjectURL'
import { usePipeline } from '../../utils/pipelineContext'

type ImageFile = { id: string, file: File, preview: string }

function SortableImageItem({ id, img, onRemove }: { id: string, img: ImageFile, onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0 }
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl border transition-colors  group touch-none relative ${isDragging ? 'border-zinc-500  scale-[1.02]' : 'border-gray-100 dark:border-white/5'}`}>
      <div {...attributes} {...listeners} className="p-2 cursor-grab text-zinc-400 hover:text-zinc-600 active:scale-90 transition-transform"><GripVertical size={20} /></div>
      <div className="w-12 h-16 bg-gray-100 dark:bg-black rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-zinc-800"><img src={img.preview} alt="P" className="w-full h-full object-cover" /></div>
      <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate dark:text-white">{img.file.name}</p></div>
      <button onClick={() => onRemove(id)} className="p-2 text-gray-400 hover:text-zinc-400"><X size={18} /></button>
    </div>
  )
}

export default function ImageToPdfTool() {
  const { createUrl } = useObjectURL()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { consumePipelineFiles } = usePipeline()
  const [images, setImages] = useState<ImageFile[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [customFileName, setCustomFileName] = useState('folio-images-to-pdf')

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

  const handleFiles = (selectedFiles: FileList | File[]) => {
    const newImages = Array.from(selectedFiles).filter(f => /^image\/(png|jpeg|webp)$/.test(f.type)).map(file => ({ id: crypto.randomUUID(), file, preview: createUrl(file) }))
    if (newImages.length === 0) { toast.error('Select images (JPG, PNG, WebP)'); return }
    setImages(prev => [...prev, ...newImages]); setDownloadUrl(null)
  }

  useEffect(() => {
    const files = consumePipelineFiles()
    if (files && files.length > 0) {
      handleFiles(files)
    }
  }, [])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) { setImages((items) => { const oldIdx = items.findIndex((i) => i.id === active.id); const newIdx = items.findIndex((i) => i.id === over?.id); return arrayMove(items, oldIdx, newIdx) }) }
  }

  const convertToPDF = async () => {
    if (images.length === 0) return
    setIsProcessing(true); await new Promise(resolve => setTimeout(resolve, 100))
    try {
      const pdfDoc = await PDFDocument.create()
      for (const imgData of images) {
        const imgBytes = await imgData.file.arrayBuffer(); let pdfImg
        if (imgData.file.type === 'image/png') {
          pdfImg = await pdfDoc.embedPng(imgBytes)
        } else if (imgData.file.type === 'image/jpeg') {
          pdfImg = await pdfDoc.embedJpg(imgBytes)
        } else {
          const bitmap = await createImageBitmap(imgData.file)
          try {
            const canvas = document.createElement('canvas')
            canvas.width = bitmap.width; canvas.height = bitmap.height
            const context = canvas.getContext('2d')
            if (!context) throw new Error('Image conversion is unavailable in this browser.')
            context.drawImage(bitmap, 0, 0)
            const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not convert this image.')), 'image/png'))
            pdfImg = await pdfDoc.embedPng(await png.arrayBuffer())
          } finally { bitmap.close() }
        }
        const { width, height } = pdfImg.scale(1); const page = pdfDoc.addPage([width, height]); page.drawImage(pdfImg, { x: 0, y: 0, width, height })
      }
      const pdfBytes = await pdfDoc.save(); const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = createUrl(blob); setDownloadUrl(url)
      addActivity({ name: `${customFileName}.pdf`, tool: 'Image to PDF', size: blob.size, resultUrl: url, buffer: new Uint8Array(await blob.arrayBuffer()) })
    } catch (error: any) { toast.error(`Error: ${error.message}`) } finally { setIsProcessing(false) }
  }

  const ActionButton = () => (
    <button onClick={convertToPDF} disabled={isProcessing || images.length === 0} className={`w-full bg-white hover:bg-zinc-200 !text-black font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3   p-6 rounded-3xl text-xl`}>
      {isProcessing ? <><Loader2 className="animate-spin" /> Working...</> : <>Generate PDF <ArrowRight size={18} /></>}
    </button>
  )

  return (
    <ToolLayout busy={isProcessing} title="Image to PDF" description="Convert photos and images into a professional PDF." actions={images.length > 0 && !downloadUrl && <ActionButton />}>
      <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files && handleFiles(e.target.files)} />
      {images.length === 0 ? (
        <div onClick={() => fileInputRef.current?.click()} className="border-4 border-dashed border-gray-100 dark:border-zinc-900 rounded-[2.5rem] p-12 text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/10 transition-all cursor-pointer group">
          <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900/20 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Upload size={32} /></div>
          <h3 className="text-xl font-bold dark:text-white mb-2">Select Images</h3>
          <p className="text-sm text-gray-400">JPG, PNG, or WebP</p>
        </div>
      ) : !downloadUrl ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1"><p className="text-[10px] font-black uppercase text-gray-400">{images.length} Images</p><button onClick={() => setImages([])} className="text-[10px] font-black uppercase text-zinc-400/60">Clear</button></div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={images.map(img => img.id)} strategy={verticalListSortingStrategy}><div className="space-y-2">{images.map(img => <SortableImageItem key={img.id} id={img.id} img={img} onRemove={(id) => setImages(prev => prev.filter(i => i.id !== id))} />)}</div></SortableContext></DndContext>
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl text-gray-400 font-bold text-sm flex items-center justify-center gap-2 hover:border-zinc-500 hover:text-zinc-400 transition-all"><Plus size={16} /> Add More</button>
          <div><label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Filename</label><input type="text" value={customFileName} onChange={(e) => setCustomFileName(e.target.value)} className="w-full bg-gray-50 dark:bg-black rounded-xl px-4 py-3 border border-transparent focus:border-zinc-500 outline-none font-bold text-sm" /></div>
        </div>
      ) : (
        <SuccessState message="PDF Ready!" downloadUrl={downloadUrl} fileName={`${customFileName}.pdf`} onStartOver={() => { setImages([]); setDownloadUrl(null); }} />
      )}
    </ToolLayout>
  )
}
