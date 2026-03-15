import type { Player } from '../types'

interface PlayerListProps {
  players: Player[]
}

const PlayerList = ({ players }: PlayerListProps) => {
  return (
    <div className="player-list">
      <h3>参加プレイヤー（{players.length} 人）</h3>

      {players.length === 0 ? (
        <p className="player-list__empty">
          スマホで QR を読み取ると参加できます…
        </p>
      ) : (
        <ul className="player-list__items">
          {players.map((p) => (
            <li key={p.id} className="player-list__item">
              <span
                className={`player-list__dot${p.ready ? ' is-ready' : ''}`}
                title={p.ready ? '準備完了' : '待機中'}
              />
              <span className="player-list__name">{p.name || '名無し'}</span>
              {p.ready && (
                <span className="player-list__badge">READY</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PlayerList
