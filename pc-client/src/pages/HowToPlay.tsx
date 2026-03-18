import { useNavigate } from 'react-router-dom'
import '../styles/ui.css'

const HowToPlay = () => {
  const navigate = useNavigate()

  return (
    <div className="room-create how-to-play">
      <header className="room-create__header">
        <h1>遊び方</h1>
        <p className="room-create__subtitle">爆転振動！バイブレードの世界へようこそ</p>
      </header>

      <main className="how-to-play__content">
        {/* 基本ルール */}
        <div className="how-to-play__section">
          <h2>基本ルール</h2>
          
          <section className="how-to-card">
            <div className="how-to-card__icon">📱</div>
            <div className="how-to-card__text">
              <h3>1. 準備・参加</h3>
              <p>PCでルームを作成し、表示されたQRコードをスマホで読み取ります。名前を入力して参加完了！</p>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">🔥</div>
            <div className="how-to-card__text">
              <h3>2. ゴー・シュート！</h3>
              <p>カウントダウンに合わせてスマホを力強く振ると、ベイ（コマ）がスタジアムに射出されます。振りの強さが射出速度に影響します。</p>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">🌀</div>
            <div className="how-to-card__text">
              <h3>3. 操作方法</h3>
              <p>射出後、スマホを傾けることでベイを自在に操ることができます。相手に体当たりして弾き飛ばせ！傾きが弱いと、ベイは中心に戻ろうとします。</p>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">⚡</div>
            <div className="how-to-card__text">
              <h3>4. スペシャルアタック</h3>
              <p>ベイを高速で動かしていると、スペシャルアタックが発動！スマホが強烈に振動し、ベイは大ダメージを与えることができます。</p>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">💥</div>
            <div className="how-to-card__text">
              <h3>5. 場外（場外判定）</h3>
              <p>ベイが連続してダメージを受けたり、相手に強く弾き飛ばされたりすると「場外リスク」が蓄積します。リスクが高い状態で壁に押し出されると場外（KO）になります！</p>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">🏆</div>
            <div className="how-to-card__text">
              <h3>6. 勝利条件</h3>
              <p>最後までスタジアム内で回り続けたプレイヤーの勝利です。相手を場外に追い込め！</p>
            </div>
          </section>
        </div>

        {/* ベイの種類 */}
        <div className="how-to-play__section">
          <h2>ベイの種類</h2>
          <p className="how-to-play__intro">選んだベイの種類によって、特性が異なります。自分のプレイスタイルに合わせて選びましょう。</p>

          <section className="how-to-card bey-type bey-type--balance">
            <div className="how-to-card__icon">⚖️</div>
            <div className="how-to-card__text">
              <h3>バランス型</h3>
              <p>全ての能力が平均的でバランスの取れた万能ベイです。初心者向けで、どのような戦い方にも対応できます。</p>
              <ul className="bey-stats">
                <li>射出力：普通</li>
                <li>操作性：普通</li>
                <li>耐久性：普通</li>
                <li>場外リスク：普通</li>
              </ul>
            </div>
          </section>

          <section className="how-to-card bey-type bey-type--power">
            <div className="how-to-card__icon">💪</div>
            <div className="how-to-card__text">
              <h3>パワー型</h3>
              <p>強力な射出力とノックバック性能が特徴。相手を一撃で吹き飛ばせますが、場外リスクが蓄積しやすく不安定です。</p>
              <ul className="bey-stats">
                <li>射出力：高い</li>
                <li>操作性：高い</li>
                <li>耐久性：低い（ダメージを受けやすい）</li>
                <li>場外リスク：蓄積しやすい</li>
              </ul>
            </div>
          </section>

          <section className="how-to-card bey-type bey-type--defense">
            <div className="how-to-card__icon">🛡️</div>
            <div className="how-to-card__text">
              <h3>防御型</h3>
              <p>堅牢な防御力と場外リスクの軽減が特徴。相手の攻撃に強く、長く戦い続けられます。射出力は低めです。</p>
              <ul className="bey-stats">
                <li>射出力：低い</li>
                <li>操作性：低い</li>
                <li>耐久性：高い（ダメージに強い）</li>
                <li>場外リスク：蓄積しにくい</li>
              </ul>
            </div>
          </section>

          <section className="how-to-card bey-type bey-type--stamina">
            <div className="how-to-card__icon">⚙️</div>
            <div className="how-to-card__text">
              <h3>スタミナ型</h3>
              <p>優れた操作性と高い耐久性を兼ね備えたベイ。細かい操作で相手を翻弄でき、長時間戦い続けられます。</p>
              <ul className="bey-stats">
                <li>射出力：低い</li>
                <li>操作性：非常に高い</li>
                <li>耐久性：非常に高い（HPが多い）</li>
                <li>場外リスク：蓄積しにくい</li>
              </ul>
            </div>
          </section>
        </div>

        {/* 戦闘テクニック */}
        <div className="how-to-play__section">
          <h2>戦闘テクニック</h2>

          <section className="how-to-card">
            <div className="how-to-card__icon">🎯</div>
            <div className="how-to-card__text">
              <h3>スマホ操作のコツ</h3>
              <ul className="how-to-list">
                <li><strong>傾き角度：</strong>大きく傾けるほど強く加速します</li>
                <li><strong>円形操作：</strong>スマホを回すように傾けて、円形に動く相手を追い詰められます</li>
                <li><strong>フェイント：</strong>傾きを弱めてベイを中心に寄せ、タイミングを見て急加速する攻撃が有効です</li>
              </ul>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">⚡</div>
            <div className="how-to-card__text">
              <h3>スペシャルアタック活用法</h3>
              <ul className="how-to-list">
                <li>高速移動時に自動発動する大ダメージ攻撃です</li>
                <li>スペシャルが発動したら、スマホの強い振動を感じられます</li>
                <li>相手が弱った時にスペシャルで一気に決めよう</li>
              </ul>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">🎪</div>
            <div className="how-to-card__text">
              <h3>場外を防ぐ</h3>
              <ul className="how-to-list">
                <li><strong>リスク管理：</strong>ダメージが蓄積して赤くなったら、壁に押し出されないよう注意</li>
                <li><strong>防御型の利点：</strong>防御型を選ぶと場外リスクが溜まりにくいです</li>
                <li><strong>中心に戻す：</strong>傾きを弱めるとベイが中心に戻ります</li>
              </ul>
            </div>
          </section>

          <section className="how-to-card">
            <div className="how-to-card__icon">🏁</div>
            <div className="how-to-card__text">
              <h3>種類別の戦略</h3>
              <ul className="how-to-list">
                <li><strong>パワー型：</strong>相手に直撃させてノックバックを活かす攻撃型プレイ</li>
                <li><strong>防御型：</strong>相手の攻撃を受け切り、長期戦で相手を疲弊させる</li>
                <li><strong>スタミナ型：</strong>高い操作性で相手の周りを回り、場外リスクを狙う</li>
              </ul>
            </div>
          </section>
        </div>

        <div className="how-to-play__actions">
          <button className="btn btn--secondary btn--large" onClick={() => navigate('/')}>
            タイトルに戻る
          </button>
        </div>
      </main>
    </div>
  )
}

export default HowToPlay
