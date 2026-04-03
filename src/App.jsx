import React, { useState, useRef, useEffect, useCallback } from 'react'
import './index.css'

// Templates are now loaded dynamically from public/templates.json at runtime.
// Use 'npm run build' to regenerate this manifest.

const EMOJIS = ['😂', '😍', '🤔', '🔥', '✨', '🐱', '🐾', '🌈', '🍕', '🎉', '💩', '🕶️']
const FONTS = ['Impact', 'Arial', 'Courier New', 'Comic Sans MS', 'Georgia', 'Verdana']

export default function App() {
  const [templates, setTemplates] = useState([])
  const [currentPage, setCurrentPage] = useState('landing')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [filter, setFilter] = useState('all')
  const [textElements, setTextElements] = useState([
    { id: 't1', text: 'TOP TEXT', x: 250, y: 50, size: 40, color: '#ffffff', font: 'Impact', isDragging: false }
  ])
  const [activeId, setActiveId] = useState(null)
  const [history, setHistory] = useState([])
  
  const canvasRef = useRef(null)
  const imageCache = useRef(new Image())
  const [inputText, setInputText] = useState('')
  const [isResizing, setIsResizing] = useState(false)

  // Fetch templates from JSON
  useEffect(() => {
    fetch('/templates.json')
      .then(res => res.json())
      .then(data => {
        setTemplates(data)
        if (data.length > 0) setSelectedTemplate(data[0])
      })
      .catch(err => console.error("Error loading templates:", err))
  }, [])

  // Handle Image Upload
  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setSelectedTemplate({ id: Date.now(), name: 'Uploaded Cat', url: event.target.result, emotion: 'custom' })
        setCurrentPage('editor')
      }
      reader.readAsDataURL(file)
    }
  }

  // History Management
  const saveHistory = useCallback(() => {
    setHistory(prev => {
      const next = [...prev, textElements]
      if (next.length > 20) return next.slice(1)
      return next
    })
  }, [textElements])

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1]
      setTextElements(prev)
      setHistory(history.slice(0, -1))
    }
  }

  const handleReset = () => {
    saveHistory()
    setTextElements([])
    setActiveId(null)
  }

  // Draw Function
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const img = imageCache.current

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (img.complete && img.naturalWidth !== 0) {
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height)
      const x = (canvas.width / 2) - (img.width / 2) * scale
      const y = (canvas.height / 2) - (img.height / 2) * scale
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
    } else {
      ctx.fillStyle = '#1a1b23'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#ffffff'
      ctx.font = '20px Inter'
      ctx.textAlign = 'center'
      ctx.fillText('Loading Image...', canvas.width / 2, canvas.height / 2)
      if (!img.onloadSet) {
        img.onload = draw
        img.onloadSet = true
      }
    }

    textElements.forEach(el => {
      ctx.font = `bold ${el.size}px ${el.font}`
      ctx.fillStyle = el.color
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = Math.max(2, el.size / 10)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.strokeText(el.text, el.x, el.y)
      ctx.fillText(el.text, el.x, el.y)

      if (el.id === activeId) {
        ctx.strokeStyle = '#6366f1'
        ctx.lineWidth = 2
        const metrics = ctx.measureText(el.text)
        const width = metrics.width + 20
        const height = el.size + 20
        ctx.setLineDash([5, 5])
        ctx.strokeRect(el.x - width / 2, el.y - height / 2, width, height)
        ctx.setLineDash([])
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(el.x + width / 2 - 5, el.y + height / 2 - 5, 10, 10)
      }
    })
  }, [textElements, activeId])

  useEffect(() => {
    if (currentPage === 'editor') {
      const img = imageCache.current
      img.crossOrigin = "anonymous"
      img.src = selectedTemplate.url
      img.onload = draw
    }
  }, [selectedTemplate, draw, currentPage])

  useEffect(() => {
    if (currentPage === 'editor') draw()
  }, [textElements, activeId, draw, currentPage])

  const getMousePos = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY
    }
  }

  const handleMouseDown = (e) => {
    const pos = getMousePos(canvasRef.current, e)
    const ctx = canvasRef.current.getContext('2d')
    if (activeId) {
      const activeEl = textElements.find(el => el.id === activeId)
      if (activeEl) {
        ctx.font = `bold ${activeEl.size}px ${activeEl.font}`
        const metrics = ctx.measureText(activeEl.text)
        const width = metrics.width + 20
        const height = activeEl.size + 20
        const handleX = activeEl.x + width / 2
        const handleY = activeEl.y + height / 2
        if (Math.abs(pos.x - handleX) < 15 && Math.abs(pos.y - handleY) < 15) {
          setIsResizing(true)
          return
        }
      }
    }
    const hit = [...textElements].reverse().find(el => {
      ctx.font = `bold ${el.size}px ${el.font}`
      const metrics = ctx.measureText(el.text)
      const w = metrics.width + 20
      const h = el.size + 20
      return pos.x >= el.x - w / 2 && pos.x <= el.x + w / 2 &&
        pos.y >= el.y - h / 2 && pos.y <= el.y + h / 2
    })
    if (hit) {
      setActiveId(hit.id)
      setInputText(hit.text)
      saveHistory()
      setTextElements(textElements.map(el =>
        el.id === hit.id ? { ...el, isDragging: true, offsetX: pos.x - el.x, offsetY: pos.y - el.y } : el
      ))
    } else {
      setActiveId(null)
      setInputText('')
    }
  }

  const handleMouseMove = (e) => {
    const pos = getMousePos(canvasRef.current, e)
    if (isResizing && activeId) {
      setTextElements(textElements.map(el => {
        if (el.id === activeId) {
          const newSize = Math.max(10, Math.abs(pos.y - el.y) * 2)
          return { ...el, size: newSize }
        }
        return el
      }))
      return
    }
    const dragging = textElements.find(el => el.isDragging)
    if (dragging) {
      setTextElements(textElements.map(el =>
        el.id === dragging.id ? { ...el, x: pos.x - el.offsetX, y: pos.y - el.offsetY } : el
      ))
    }
  }

  const handleMouseUp = () => {
    setTextElements(textElements.map(el => ({ ...el, isDragging: false })))
    setIsResizing(false)
  }

  const handleAddText = (content = 'NEW TEXT') => {
    saveHistory()
    const newText = {
      id: Date.now().toString(),
      text: content,
      x: 250,
      y: 250,
      size: 40,
      color: '#ffffff',
      font: 'Impact',
      isDragging: false
    }
    setTextElements([...textElements, newText])
    setActiveId(newText.id)
    setInputText(newText.text)
  }

  const updateActiveText = (key, value) => {
    if (!activeId) return
    setTextElements(textElements.map(el =>
      el.id === activeId ? { ...el, [key]: value } : el
    ))
  }

  const downloadMeme = () => {
    const currentActive = activeId
    setActiveId(null)
    setTimeout(() => {
      const link = document.createElement('a')
      link.download = 'cat-meme.png'
      link.href = canvasRef.current.toDataURL('image/png')
      link.click()
      setActiveId(currentActive)
    }, 100)
  }

  const randomMeme = () => {
    if (templates.length === 0) return
    saveHistory()
    const t = templates[Math.floor(Math.random() * templates.length)]
    setSelectedTemplate(t)
    const captions = ["I don't care", "Is it Friday yet?", "Who did this?", "Bruh...", "Explain your smallness"]
    const cap = captions[Math.floor(Math.random() * captions.length)]
    setTextElements([{ id: 'r1', text: cap, x: 250, y: 400, size: 50, color: '#ffffff', font: 'Impact', isDragging: false }])
  }

  const handleDelete = (id) => {
    saveHistory()
    setTextElements(textElements.filter(el => el.id !== id))
    if (activeId === id) {
      setActiveId(null)
      setInputText('')
    }
  }

  const filteredTemplates = filter === 'all' ? templates : templates.filter(t => t.emotion === filter)

  if (currentPage === 'landing') {
    return (
      <div className="landing-container">
        <header>
          <div className="logo">ME-MEOW MAKER</div>
        </header>

        <section className="hero">
          <h1>Create Your Purr-fect Meme</h1>
          <p>Choose a template below or upload your own cat photo to get started!</p>
          <div className="hero-actions">
            <input type="file" id="cat-upload" hidden accept="image/*" onChange={handleUpload} />
            <label htmlFor="cat-upload" className="btn-primary" style={{ display: 'inline-block', cursor: 'pointer', padding: '1rem 2rem' }}>
              📤 Upload Your Cat Photo
            </label>
          </div>
        </section>

        <section className="template-selection">
          <h2>Popular Templates</h2>
          <div className="template-grid-large">
            {templates.map(t => (
              <div key={t.id} className="template-card-large" onClick={() => {
                setSelectedTemplate(t)
                setCurrentPage('editor')
              }}>
                <img src={t.url} alt={t.name} />
                <div className="template-overlay">
                  <span>{t.name}</span>
                </div>
              </div>
            ))}
            {templates.length === 0 && <p>No templates found. Add images to public/templates/ and run build!</p>}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header>
        <button className="btn-secondary" onClick={() => setCurrentPage('landing')} style={{ width: 'auto' }}>← Back</button>
        <div className="logo">ME-MEOW MAKER</div>
        <button className="btn-primary" onClick={downloadMeme} style={{ width: 'auto' }}>Download Meme</button>
      </header>

      <main>
        <aside className="left-panel">
          <div className="filter-box">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Emotions</option>
              <option value="angry">Angry</option>
              <option value="confused">Confused</option>
              <option value="happy">Happy</option>
              <option value="chill">Chill</option>
              <option value="space">Space</option>
              <option value="business">Business</option>
            </select>
          </div>
          <div className="template-grid">
            {filteredTemplates.map(t => (
              <div
                key={t.id}
                className={`template-card ${selectedTemplate.id === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTemplate(t)}
              >
                <img src={t.url} alt={t.name} />
              </div>
            ))}
          </div>
        </aside>

        <section className="center-panel">
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={(e) => {
                const touch = e.touches[0]
                handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY })
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY })
              }}
              onTouchEnd={handleMouseUp}
            />
          </div>
        </section>

        <aside className="right-panel">
          <div className="control-group">
            <label>Text Content</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Type something..."
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  updateActiveText('text', e.target.value)
                }}
                onFocus={() => {
                  if (!activeId && textElements.length === 0) handleAddText('')
                }}
              />
              {activeId && (
                <button className="btn-secondary" onClick={() => handleDelete(activeId)} style={{ width: '50px', padding: '0.75rem', background: '#ef4444' }}>🗑️</button>
              )}
            </div>
            <button className="btn-secondary" style={{ marginTop: '5px' }} onClick={() => handleAddText('NEW CAPTION')}>+ Add More Text</button>
          </div>

          <div className="control-group">
            <label>Font Family</label>
            <select
              value={activeId ? textElements.find(el => el.id === activeId)?.font : 'Impact'}
              onChange={(e) => updateActiveText('font', e.target.value)}
            >
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="control-group">
            <label>Text Color</label>
            <input
              type="color"
              style={{ height: '40px', padding: '2px' }}
              value={activeId ? textElements.find(el => el.id === activeId)?.color : '#ffffff'}
              onChange={(e) => updateActiveText('color', e.target.value)}
            />
          </div>

          <div className="control-group">
            <label>Add Stickers / Emojis</label>
            <div className="emoji-grid">
              {EMOJIS.map(e => (
                <div key={e} className="emoji-item" onClick={() => handleAddText(e)}>{e}</div>
              ))}
            </div>
          </div>

          {textElements.length > 0 && (
            <div className="control-group">
              <label>Layers</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {textElements.map(el => (
                  <div key={el.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: el.id === activeId ? 'rgba(99,102,241,0.2)' : 'var(--glass)', padding: '8px', borderRadius: '4px', border: el.id === activeId ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} onClick={() => setActiveId(el.id)}>{el.text || '(empty)'}</span>
                    <button onClick={() => handleDelete(el.id)} style={{ padding: '4px 8px', background: 'transparent', fontSize: '1rem' }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '1rem' }}>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={handleUndo}>Undo</button>
            <button className="btn-secondary" style={{ flex: 1, color: '#ff4444' }} onClick={handleReset}>Reset</button>
          </div>
        </aside>
      </main>

      <footer>
        <button className="btn-secondary" onClick={randomMeme}>🎲 Random Meme Generator</button>
        <button className="btn-primary" onClick={() => alert('Caption submitted to community (mock)!')}>📢 Submit Your Caption</button>
      </footer>
    </div>
  )
}
