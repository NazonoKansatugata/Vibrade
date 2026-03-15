import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const RoomJoin = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [manualRoomId, setManualRoomId] = useState('')

  useEffect(() => {
    const roomId = searchParams.get('room')
    if (roomId) {
      navigate('/enter-name', { state: { roomId } })
    }
  }, [searchParams, navigate])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualRoomId.trim()) {
      navigate('/enter-name', { state: { roomId: manualRoomId.trim().toUpperCase() } })
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0a12] text-white flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-700/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-blue-700/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Spinning ring logo */}
      <div className="relative mb-6 z-10">
        <div className="w-24 h-24 rounded-full border-4 border-violet-500/30 border-dashed animate-spin" style={{ animationDuration: '8s' }} />
        <div className="absolute inset-3 rounded-full border-4 border-violet-400/20 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-blue-600 rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
        </div>
      </div>

      {/* Title */}
      <div className="z-10 mb-8 text-center w-full">
        <h1 className="text-4xl font-black tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-r from-violet-300 via-white to-blue-300">
          VIBRADE
        </h1>
        <p className="text-slate-400 text-sm mt-1 tracking-widest uppercase text-center">Battle Arena</p>
      </div>

      {/* Card */}
      <div className="z-10 w-full max-w-sm px-6">
        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-6">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold text-center mb-4">ルームIDを入力</p>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input
                id="roomId"
                type="text"
                value={manualRoomId}
                onChange={(e) => setManualRoomId(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                maxLength={8}
                autoCapitalize="characters"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/60 focus:border-violet-500/40 transition-all tracking-[0.3em] text-center text-2xl font-mono uppercase"
              />
              <button
                type="submit"
                disabled={!manualRoomId.trim()}
                className="w-full group bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold py-4 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] disabled:shadow-none"
              >
                <span className="tracking-wider">参加する</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
          <div className="border-t border-white/5 px-6 py-4 bg-black/20">
            <p className="text-xs text-slate-500 leading-relaxed text-center">
              PC画面のQRコードをスマホカメラで<br />読み込むと自動で接続されます
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomJoin
