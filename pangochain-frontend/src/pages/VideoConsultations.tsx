import { useState } from 'react'
import { Lock, Video, VideoOff } from 'lucide-react'

const DEMO_PASSWORD = 'Video123!'

export default function VideoConsultations() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')

  const join = () => {
    if (password !== DEMO_PASSWORD) {
      setError('Wrong video password')
      setUnlocked(false)
      return
    }
    setError('')
    setUnlocked(true)
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <Video className="w-6 h-6 text-[#1d6464]" />
          Secure Video Consultation
        </h1>
        <p className="text-text-muted text-sm mt-1">
          Enter the meeting password before the video room is shown.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        <section className="card space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 flex gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Password protected video access.</span>
          </div>

          <div>
            <label className="label">Video Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter video password"
            />
            {error && <p className="text-xs text-error mt-2">{error}</p>}
          </div>

          <button
            onClick={join}
            disabled={!password}
            className="btn-primary w-full justify-center py-2.5 disabled:opacity-50"
          >
            Join Video
          </button>

          <p className="text-xs text-text-muted">
            Demo password: <span className="font-semibold">Video123!</span>
          </p>
        </section>

        <section className="card min-h-[460px] flex items-center justify-center">
          {unlocked ? (
            <div className="w-full max-w-2xl aspect-video rounded-lg bg-[#102f36] text-white flex flex-col items-center justify-center">
              <Video className="w-12 h-12 mb-3 text-emerald-200" />
              <p className="font-heading font-semibold">Video room unlocked</p>
              <p className="text-sm text-white/70 mt-1">WebRTC signalling is not connected in this demo environment.</p>
            </div>
          ) : (
            <div className="text-center text-text-muted">
              <VideoOff className="w-12 h-12 mx-auto mb-3 text-[#1d6464]" />
              <p className="font-heading font-semibold text-text-primary">Video hidden</p>
              <p className="text-sm mt-1">Enter the password to reveal the consultation room.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
