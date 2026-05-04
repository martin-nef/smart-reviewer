import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { api } from './api'

function App() {
  const [healthy, setHealthy] = useState(false)
  const [healthText, setHealthText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api('/health')
      .then((r) => {
        setHealthy(true)
        setHealthText(JSON.stringify(r))
        setLoading(false)
      })
      .catch((e) => {
        console.error(JSON.stringify(e))
        setError(true)
        setLoading(false)
      })
  }, [])

  const badgeVariant = loading ? 'badge-warning' : healthy ? 'badge-success' : 'badge-error'
  const statusLabel = loading ? 'checking…' : healthy ? 'healthy' : 'down'

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center gap-8 p-6">
      <div className="card bg-base-100 shadow-xl w-full max-w-lg">
        <div className="card-body items-center text-center gap-6">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <img src={heroImg} className="w-44" alt="" />
            <img src={reactLogo} className="absolute top-8 h-7 animate-spin" style={{ animationDuration: '10s' }} alt="React logo" />
            <img src={viteLogo} className="absolute top-[107px] h-6" alt="Vite logo" />
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-4xl font-semibold tracking-tight">Backend status</h1>
            <span className={`badge badge-lg ${badgeVariant}`}>{statusLabel}</span>
          </div>

          {loading && (
            <span className="loading loading-dots loading-md" />
          )}

          {!loading && healthText && (
            <div className="mockup-code w-full text-left text-sm">
              <pre><code>{healthText}</code></pre>
            </div>
          )}

          {error && (
            <div role="alert" className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 stroke-current" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Could not reach the backend.</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <a href="https://vite.dev/" target="_blank" className="btn btn-ghost btn-sm gap-2">
          <img src={viteLogo} className="h-4" alt="" />
          Vite docs
        </a>
        <a href="https://react.dev/" target="_blank" className="btn btn-ghost btn-sm gap-2">
          <img src={reactLogo} className="h-4" alt="" />
          React docs
        </a>
        <a href="https://daisyui.com/" target="_blank" className="btn btn-ghost btn-sm">
          DaisyUI docs
        </a>
      </div>
    </div>
  )
}

export default App
