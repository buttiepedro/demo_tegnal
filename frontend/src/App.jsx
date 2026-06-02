import { useState, useCallback } from 'react'

const BADGE = {
  HSAUT:   'badge-hsaut',
  HSFET:   'badge-hsfet',
  HSEX50:  'badge-hsex50',
  HSEX100: 'badge-hsex100',
}

export default function App() {
  const [status, setStatus]       = useState('idle')      // idle | uploading | done | error
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [filename, setFilename]   = useState('')
  const [dragover, setDragover]   = useState(false)
  const [downloading, setDown]    = useState(false)

  const processFile = useCallback(async (file) => {
    if (!file) return
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('El archivo debe ser .xlsx o .xls')
      setStatus('error')
      return
    }

    setFilename(file.name)
    setStatus('uploading')
    setError('')
    setResult(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/process', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Error del servidor (${res.status})`)
      }
      setResult(await res.json())
      setStatus('done')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragover(false)
    processFile(e.dataTransfer.files[0])
  }, [processFile])

  const handleDownload = async () => {
    if (!result?.token) return
    setDown(true)
    try {
      const res = await fetch(`/api/download/${result.token}`)
      if (!res.ok) throw new Error('Error al descargar. Volvé a cargar el archivo.')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `tango_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    } finally {
      setDown(false)
    }
  }

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setError('')
    setFilename('')
    document.getElementById('fileInput').value = ''
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>Marcaciones → Tango</h1>
          <span>Procesamiento de novedades para liquidación de sueldos</span>
        </div>
      </header>

      <main className="main">

        {/* ── Upload zone ── */}
        <div
          className={`upload-zone ${dragover ? 'dragover' : ''} ${status === 'uploading' ? 'loading' : ''}`}
          onClick={() => document.getElementById('fileInput').click()}
          onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
          onDragLeave={() => setDragover(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && document.getElementById('fileInput').click()}
        >
          <div className="upload-icon">
            {status === 'uploading' ? '⏳' : status === 'done' ? '✅' : '📊'}
          </div>
          <div className="upload-text">
            {status === 'uploading'
              ? 'Procesando el archivo...'
              : status === 'done'
              ? filename
              : 'Arrastrá el Excel de marcaciones acá'}
          </div>
          <div className="upload-hint">
            {status === 'done'
              ? 'Hacé clic para cargar otro archivo'
              : 'o hacé clic para seleccionarlo (.xlsx / .xls)'}
          </div>
          <input
            id="fileInput"
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => { reset(); processFile(e.target.files[0]) }}
          />
        </div>

        {/* ── Error ── */}
        {status === 'error' && (
          <div className="alert alert-error">⚠ {error}</div>
        )}

        {/* ── Warnings ── */}
        {result?.warnings?.length > 0 && (
          <div className="alert alert-warn">
            ⚠ {result.warnings.join(' · ')}
          </div>
        )}

        {/* ── Results ── */}
        {status === 'done' && result && (
          <>
            <div className="card">
              <div className="card-title">Resumen</div>
              <div className="stats-grid">
                <Stat value={result.stats.total_employees} label="Empleados"       />
                <Stat value={result.stats.total_rows}      label="Novedades Tango" />
                <Stat value={result.stats.with_extras}     label="Con horas extra" />
                <Stat value={result.stats.with_feriado}    label="Con feriados"    />
              </div>
              <button
                className="btn btn-success"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? '⏳ Descargando...' : '⬇ Descargar Excel Tango'}
              </button>
            </div>

            <div className="card">
              <div className="card-title">Vista previa — Novedades Tango</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Nro. Legajo</th>
                      <th>Código de Novedad</th>
                      <th>Cantidad</th>
                      <th>Valor</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.fecha}</td>
                        <td><strong>{r.legajo}</strong></td>
                        <td><span className={`badge ${BADGE[r.codigo]}`}>{r.codigo}</span></td>
                        <td>{r.cantidad}</td>
                        <td>{r.valor}</td>
                        <td>{r.obs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  )
}
