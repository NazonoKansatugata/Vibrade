import { useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

interface QRDisplayProps {
  roomId: string
  variant?: 'default' | 'compact'
}

const MOBILE_PROD_URL = 'https://vibrade-mobile.vercel.app'

// 本番 URL をデフォルトとする。必要に応じて VITE_MOBILE_URL で上書きする
const getBaseUrl = () => {
  if (import.meta.env.VITE_MOBILE_URL) {
    return import.meta.env.VITE_MOBILE_URL;
  }
  return MOBILE_PROD_URL;
}

const QRDisplay = ({ roomId, variant = 'default' }: QRDisplayProps) => {
  const qrRef = useRef<HTMLDivElement>(null)

  const serverUrl = getBaseUrl()
  const shouldWarnLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  
  // スマホのデフォルト QR リーダーがブラウザで開く URL
  const joinUrl = `${serverUrl}/join?room=${roomId}`

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `vibrade-room-${roomId}.png`
    link.click()
  }

  if (variant === 'compact') {
    return (
      <div className="qr-display qr-display--compact">
        <p className="qr-display__title">プレイヤー招待 (再接続用)</p>
  
        <div className="qr-display__code" ref={qrRef}>
          <QRCodeCanvas
            value={joinUrl}
            size={120}
            level="H"
            marginSize={2}
          />
        </div>
  
        <div className="qr-display__info">
          <p className="qr-display__hint">
            📱 スマホで読み取って復帰
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="qr-display">
      <h2 style={{ fontSize: '1rem', marginBottom: '8px' }}>プレイヤーを招待</h2>

      <div className="qr-display__code" ref={qrRef}>
        <QRCodeCanvas
          value={joinUrl}
          size={180}
          level="H"
          marginSize={2}
        />
      </div>

      <div className="qr-display__info">
        <p style={{ fontSize: '0.8rem', opacity: 0.8 }}>
          ルームID: <strong style={{ letterSpacing: '2px' }}>{roomId}</strong>
        </p>

        {shouldWarnLocalhost && (
          <p style={{ color: '#ef4444', fontSize: '10px', marginTop: '4px' }}>
            ⚠️ localhost では動作しません。IPアドレスを使用してください。
          </p>
        )}
      </div>

      <button 
        className="btn btn--secondary" 
        onClick={handleDownload}
        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
      >
        QR をダウンロード
      </button>
    </div>
  )
}

export default QRDisplay
