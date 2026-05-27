'use client'

import { useRef, useState } from 'react'

interface Props {
  urls: string[]
  onChange: (urls: string[]) => void
  max?: number
}

export function ImageUploadControlled({ urls, onChange, max = 5 }: Props) {
  const inputRef   = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState('')

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, max - urls.length)
    if (!files.length) return
    setBusy(true)
    setErr('')
    const added: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) added.push(json.url)
      else setErr('Error al subir una imagen.')
    }
    onChange([...urls, ...added])
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(url: string) {
    onChange(urls.filter(u => u !== url))
  }

  return (
    <div>
      {/* Thumbnails */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {urls.map(url => (
            <div key={url} className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0"
                 style={{ border: '1px solid #DED6C8' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={() => remove(url)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center
                                 justify-center text-white text-[11px] font-bold"
                      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      {urls.length < max && (
        <>
          <input ref={inputRef} type="file"
                 accept="image/jpeg,image/png,image/webp" multiple
                 className="hidden" onChange={handleFiles} />
          <button type="button" disabled={busy}
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium
                             w-full justify-center transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#F1ECE2', border: '1.5px dashed #DED6C8', color: '#5F5B52' }}>
            {busy ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-signal-ash border-t-[#5F6F52]
                                 rounded-full animate-spin-smooth" />
                Subiendo…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor" strokeWidth={1.75} style={{ color: '#7A7468' }}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86
                           a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9
                           a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                Agregar fotos
                <span className="text-signal-ash font-normal text-[11px]">
                  ({urls.length}/{max})
                </span>
              </>
            )}
          </button>
        </>
      )}

      {err && <p className="text-[11px] mt-1.5" style={{ color: '#B8795B' }}>{err}</p>}
    </div>
  )
}
