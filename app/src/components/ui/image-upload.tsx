'use client'

import { useRef, useState } from 'react'

interface Props {
  max?: number
  label?: string
}

export function ImageUpload({ max = 4, label = 'Añadir fotos' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max - urls.length)
    if (!files.length) return
    setUploading(true)
    setErr('')

    const newUrls: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) newUrls.push(json.url)
      else setErr('Error subiendo una imagen. Intenta de nuevo.')
    }

    setUrls(prev => [...prev, ...newUrls])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(url: string) {
    setUrls(prev => prev.filter(u => u !== url))
  }

  return (
    <div>
      {/* Hidden value passed to server action */}
      <input type="hidden" name="image_urls" value={urls.join(',')} />

      {/* Thumbnails */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {urls.map(url => (
            <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden"
                 style={{ border: '1px solid #DED6C8' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center
                           text-white text-[10px] font-bold transition-opacity"
                style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload trigger */}
      {urls.length < max && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFiles}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium
                       transition-all duration-150 hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: '#F1ECE2', border: '1px solid #DED6C8', color: '#5F5B52' }}
          >
            {uploading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-signal-ash border-t-signal-text-soft
                                 rounded-full animate-spin" />
                Subiendo…
              </>
            ) : (
              <>
                <CameraIcon />
                {label}
                {max > 1 && (
                  <span className="text-signal-ash font-normal text-[11px]">
                    ({urls.length}/{max})
                  </span>
                )}
              </>
            )}
          </button>
        </>
      )}

      {err && <p className="text-[12px] mt-1.5" style={{ color: '#B8795B' }}>{err}</p>}
    </div>
  )
}

function CameraIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
         stroke="currentColor" strokeWidth={1.75} style={{ color: '#7A7468' }}>
      <path strokeLinecap="round" strokeLinejoin="round"
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86
               a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5
               a2 2 0 01-2-2V9z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  )
}
