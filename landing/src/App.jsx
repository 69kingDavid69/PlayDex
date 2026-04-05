import React, { useState, useEffect, useRef } from 'react'
import './App.css'

const VERSION = '0.2.2'
const MAC_URL = `https://github.com/69kingDavid69/PlayDex/releases/download/playdex-desktop-v${VERSION}/PlayDex_${VERSION}_x64.dmg`
const WIN_URL = `https://github.com/69kingDavid69/PlayDex/releases/download/playdex-desktop-v${VERSION}/PlayDex_${VERSION}_x64_en-US.msi`
const LINUX_URL = `https://github.com/69kingDavid69/PlayDex/releases/download/playdex-desktop-v${VERSION}/playdex-desktop_${VERSION}_amd64.deb`
const GITHUB_URL = 'https://github.com/69kingDavid69/PlayDex'

const content = {
  en: {
    tagline: 'Your playlists. Your files.',
    sub: 'Import from Spotify CSV or iTunes XML and download in FLAC or MP3 320 — all on your computer, offline, forever.',
    version: `v${VERSION} · macOS / Windows / Linux`,
    installTitle: 'How to install',
    steps: [
      { icon: '⬇️', text: 'Download the installer and open it' },
      { icon: '📂', text: 'Install or drag to Applications' },
      { icon: '🖱️', text: 'First launch: approve permissions if asked' },
      { icon: '🔑', text: 'Add your Deezer ARL token in Settings' },
    ],
    featuresTitle: 'Features',
    features: [
      { icon: '📋', title: 'CSV from Spotify', desc: 'Export your playlist from Exportify and import it directly. Supports multi-artist fields.' },
      { icon: '🎵', title: 'XML from iTunes', desc: 'Works with Music.app exported XML libraries. Smart column detection.' },
      { icon: '🎶', title: 'FLAC & MP3 320', desc: 'Download in lossless FLAC or high-quality MP3 320 via Deezer + deemix.' },
      { icon: '🔒', title: 'Secure ARL', desc: 'Your Deezer token is stored encrypted in your system keyring. Never in the source code.' },
      { icon: '💻', title: 'Multi-platform', desc: 'Available for macOS, Windows, and Linux with full native experience.' },
    ],
    noteTitle: 'Note',
    note: 'On some OS like macOS or Windows, you may see a security warning since PlayDex is an indie app. Proceed anyways, it is normal for open-source.',
    sourceCode: 'Source code on GitHub',
    footer: 'Free and open-source · MIT License',
  },
  es: {
    tagline: 'Tus playlists. Tus archivos.',
    sub: 'Importa desde Spotify CSV o iTunes XML y descarga en FLAC o MP3 320 — en tu computadora, sin internet, para siempre.',
    version: `v${VERSION} · macOS / Windows / Linux`,
    installTitle: 'Cómo instalar',
    steps: [
      { icon: '⬇️', text: 'Descarga el instalador y ábrelo' },
      { icon: '📂', text: 'Instálalo o arrástralo a Aplicaciones' },
      { icon: '🖱️', text: 'Primera vez: aprueba los permisos si te pregunta' },
      { icon: '🔑', text: 'Agrega tu token ARL de Deezer en Ajustes' },
    ],
    featuresTitle: 'Características',
    features: [
      { icon: '📋', title: 'CSV de Spotify', desc: 'Exporta tu playlist con Exportify e impórtala directamente. Soporta campos de múltiples artistas.' },
      { icon: '🎵', title: 'XML de iTunes', desc: 'Compatible con librerías XML exportadas desde Music.app. Detección automática de columnas.' },
      { icon: '🎶', title: 'FLAC y MP3 320', desc: 'Descarga en FLAC sin pérdida o MP3 320 de alta calidad vía Deezer + deemix.' },
      { icon: '🔒', title: 'ARL seguro', desc: 'Tu token de Deezer se guarda cifrado en el llavero de tu sistema. Nunca en el código fuente.' },
      { icon: '💻', title: 'Multiplataforma', desc: 'Disponible para macOS, Windows, y Linux con experiencia nativa completa.' },
    ],
    noteTitle: 'Nota',
    note: 'Al abrirla, tu sistema (macOS o Windows) puede mostrar una advertencia de seguridad ya que PlayDex es app indie. Continúa normalmente, es estándar en código abierto.',
    sourceCode: 'Código fuente en GitHub',
    footer: 'Gratuito y de código abierto · Licencia MIT',
  },
}

function LiquidBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animId
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      // Deep black base
      ctx.fillStyle = '#060304'
      ctx.fillRect(0, 0, w, h)

      // Animated liquid blobs
      const blobs = [
        { x: 0.2, y: 0.3, r: 0.35, color: [140, 15, 5] },   // deep crimson
        { x: 0.8, y: 0.6, r: 0.30, color: [60, 10, 130] },   // deep purple
        { x: 0.5, y: 0.8, r: 0.25, color: [180, 80, 0] },    // amber
        { x: 0.15, y: 0.75, r: 0.20, color: [90, 20, 100] }, // violet
        { x: 0.85, y: 0.2, r: 0.22, color: [120, 10, 0] },   // red
      ]

      blobs.forEach((b, i) => {
        const phase = t * 0.0008 + i * 1.2
        const ox = Math.sin(phase * 1.1) * 0.08
        const oy = Math.cos(phase * 0.9) * 0.06
        const px = (b.x + ox) * w
        const py = (b.y + oy) * h
        const radius = b.r * Math.min(w, h) * (1 + Math.sin(phase * 0.7) * 0.15)

        const grad = ctx.createRadialGradient(px, py, 0, px, py, radius)
        const [r, g, bl] = b.color
        grad.addColorStop(0,   `rgba(${r},${g},${bl},0.55)`)
        grad.addColorStop(0.5, `rgba(${r},${g},${bl},0.18)`)
        grad.addColorStop(1,   `rgba(${r},${g},${bl},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fill()
      })

      // Chrome shimmer streaks
      for (let i = 0; i < 3; i++) {
        const phase = t * 0.0005 + i * 2.1
        const y = h * (0.2 + i * 0.28 + Math.sin(phase) * 0.05)
        const grad = ctx.createLinearGradient(0, y - 1, w, y + 1)
        const alpha = 0.04 + Math.sin(phase * 1.3) * 0.03
        grad.addColorStop(0,   `rgba(200,160,120,0)`)
        grad.addColorStop(0.3, `rgba(200,160,120,${alpha})`)
        grad.addColorStop(0.5, `rgba(240,200,160,${alpha * 1.5})`)
        grad.addColorStop(0.7, `rgba(200,160,120,${alpha})`)
        grad.addColorStop(1,   `rgba(200,160,120,0)`)
        ctx.fillStyle = grad
        ctx.fillRect(0, y - 2, w, 4)
      }

      t++
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="liquid-bg" />
}

function FeatureCard({ icon, title, desc }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className={`feature-card ${visible ? 'visible' : ''}`}>
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
    </div>
  )
}

function StepItem({ icon, text, index }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`step-item ${visible ? 'visible' : ''}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="step-number">{index + 1}</div>
      <div className="step-icon">{icon}</div>
      <p className="step-text">{text}</p>
    </div>
  )
}

export default function App() {
  const [lang, setLang] = useState('es')
  const t = content[lang]

  return (
    <div className="app">
      <LiquidBackground />

      {/* Language toggle */}
      <div className="lang-toggle">
        <button className={lang === 'es' ? 'active' : ''} onClick={() => setLang('es')}>ES</button>
        <span className="lang-sep">|</span>
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">PlayDex</h1>
          <p className="hero-tagline">{t.tagline}</p>
          <p className="hero-sub">{t.sub}</p>
          <div className="download-grid">
            <a href={MAC_URL} className="download-btn" download>
              <span className="download-icon"></span> macOS
            </a>
            <a href={WIN_URL} className="download-btn" download>
              <span className="download-icon">⊞</span> Windows
            </a>
            <a href={LINUX_URL} className="download-btn" download>
              <span className="download-icon">🐧</span> Linux
            </a>
          </div>
          <p className="version-label">{t.version}</p>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <h2 className="section-title">{t.featuresTitle}</h2>
        <div className="features-grid">
          {t.features.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </section>

      {/* Install steps */}
      <section className="install-section">
        <h2 className="section-title">{t.installTitle}</h2>
        <div className="steps-row">
          {t.steps.map((s, i) => (
            <StepItem key={i} {...s} index={i} />
          ))}
        </div>
      </section>

      {/* Note */}
      <section className="note-section">
        <div className="note-card">
          <span className="note-badge">{t.noteTitle}</span>
          <p>{t.note}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="github-link">
          <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          {t.sourceCode}
        </a>
        <p className="footer-text">{t.footer}</p>
      </footer>
    </div>
  )
}
