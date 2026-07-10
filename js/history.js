/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

/* =====================================================
   得点履歴登録&イベントログ保存
   ・得点/失点の内容と選手名を履歴に保存
   ・ショット統計用の情報も保存（hand/course/missType/missResult）
   ===================================================== */
function addHistory(eventData) {
	// eventDataから必要な情報を分割代入で取得（objectで受け取る形に変更）
	const {
		type,				// 履歴タイプ（例: 得点/失点/system）
		eventName,			// 履歴内容（例: サーブ/フォアハンド/ゲーム開始）
		player = null,		// 選手ID（例: A1/A2/B1/B2）★統計管理用

		hand = null,		// フォア/バック管理用（例: fore/back）★統計管理用
		course = null,		// コース管理用（例: ストレート/クロス/逆クロス/センター）★統計管理用

		missType = null,	// ミスの種類管理用（例: 凡ミス/攻めミス/押された）★統計管理用
		missResult = null,	// ミスの結果管理用（例: ネット/アウト/サイドアウト）★統計管理用

		// wind = null			// 風向きはstateから直接取得するので不要
	} = eventData

	// system表示用
	// let playerName = ""

	// 選手名が必要な履歴タイプのみ選手名取得
	const needPlayerTypes = ["得点", "失点"]

	const playerId =needPlayerTypes.includes(type) ? (player || state.selectedPlayerId || null) : null

	const playerName = playerId ? (state.players[playerId] || playerId) : ""

	// 履歴に追加(このデータは統計管理にも活用されるため、必要な情報を全て保存する形に変更)
	state.history.push({
		type,				// 履歴タイプ（例: 得点/失点/system）
		eventName,			// 履歴内容（例: サーブ/フォアハンド/ゲーム開始）

		playerId,			// 履歴表示用の選手ID（例: A1/A2/B1/B2）★統計管理用
		player: playerName,	// 履歴表示用の選手名（例: 田中）

		hand,				// フォア/バック管理用（例: fore/back）★統計管理用
		course,				// コース管理用（例: ストレート/クロス/逆クロス/センター）★統計管理用

		missType,			// ミスの種類管理用（例: 凡ミス/攻めミス/押された）★統計管理用
		missResult,			// ミスの結果管理用（例: ネット/アウト/サイドアウト）★統計管理用
		
		wind: state.wind,	// 風向きも履歴に保存

		time: Date.now()	// タイムスタンプ（必要に応じて） ★履歴の時間管理に活用できるかも
	})

	// 表示中なら再描画
	if (!document.getElementById("historyArea").classList.contains("hidden")) {
		renderHistory()
	}
}

/* 得点・失点から得点履歴に表示するマークを取得 */
function getPointResultMark(type){
	if(type === "得点") return "○"
	if(type === "失点") return "×"
	return ""
}

/* 得点・失点から得点履歴に表示するマークのクラスを取得 */
function getPointResultClass(type){
	if(type === "得点") return "point-win"
	if(type === "失点") return "point-error"
	return ""
}

/* 自チーム目線の得点マーク取得 */
function getOwnTeamPointMark(historyItem, ownTeam = "A"){
	if(!historyItem) return ""

	const playerId = historyItem.playerId
	const type = historyItem.type

	if(!playerId) return ""
	if(type!=="得点" && type !=="失点") return ""

	const playerTeam = playerId.startsWith("A") ? "A" : "B"

	const pointTeam = (type === "得点") ? playerTeam : (playerTeam === "A" ? "B" : "A")

	return pointTeam === ownTeam ? "○" : "×"
}

function getOwnTeamPointClass(historyItem, ownTeam = "A"){
	const mark = getOwnTeamPointMark(historyItem, ownTeam)
	
	if(mark === "○") return "point-win"
	if(mark === "×") return "point-error"
	return ""
}

/* =====================================================
   得点履歴表示
   ・得点/失点なら選手名＋内容表示
   ・type=systemならシステム文言表示（例: 各ゲーム/ファイナルゲーム）
   ・風向きは前回から変わったときのみ表示（得点/失点のみ）
   ===================================================== */
function renderHistory() {

	let area = document.getElementById("historyArea")


	area.innerHTML = state.history.map(h => {
		// system履歴：ゲーム区切り
		if (h.type === "system") {
			const legendHtml = (h.eventName === "1ゲーム目")
				? `<span class="historyLegend">
						<span class="point-win">○</span>→味方ポイント
						<span class="point-error">×</span>→相手ポイント
				</span>`
				: ""

			return `
				<div class="historyGameHeader">
					<span>=== ${h.eventName} ===</span>
					${legendHtml}
				</div>
			`
		}

		// 通常履歴：選手名＋内容+風向き
		// 風向きラベルの取得（例: 追風 → ↑追風）★getWindLabelForPlayer関数でプレイヤーごとのラベルを取得する形に変更
		let windHtml = ""
		const windLabel = getWindLabelForPlayer(h.wind, h.playerId)
		if (state.inputMode === "detail" && windLabel){
			windHtml = `<span class="windInline"> ${windLabel}</span>`
		}

		// 表示用イベントラベルの取得
		let displayEventLabel = getShotLabel(h.eventName)	

		// hand情報がある場合は表示用イベントラベルにhand情報を追加（例: ストローク → ストローク（フォア））
		if (h.hand) {
			displayEventLabel += `(${h.hand})`
		}

		// コース情報がある場合は表示用イベントラベルにcourse情報を追加（）
		if(h.course && h.course !== "skipped"){
			displayEventLabel += `[${getCourseLabel(h.course)}]`
		}

		// ミス結果がある場合は表示用イベントラベルにミス結果情報を追加
		if(h.missResult && h.missResult !== "skipped"){
			displayEventLabel += `【${getMissResultLabel(h.missResult)}】`
		}
		
		// ミスタイプがある場合は表示用イベントラベルにミスタイプ情報を追加（例: ストローク（フォア） → ストローク（フォア）[凡ミス]）
		if(h.missType && h.missType !== "skipped"){
			displayEventLabel += `[${getMissTypeLabel(h.missType)}]`
		}

		const pointResultMark = getOwnTeamPointMark(h, "A")
		const pointResultClass = getOwnTeamPointClass(h, "A")

		// 履歴行のHTMLを返す（例: 〇 田中：得点-ストローク（フォア）【凡ミス】↑追風）
		return `<span class="historyRow">
					<span class="historyMark ${pointResultClass}">${pointResultMark}</span>
					<span class="historyMain">
						<span class="historyPlayer">${h.player}</span>
						<span class="historyDetail">：${h.type}-${displayEventLabel}</span>
					</span>
						${windHtml}
				</span>
				`
	}).join("")
}

/* =====================================================
   得点履歴押下処理
   ===================================================== */
function toggleHistory() {

	let area = document.getElementById("historyArea")

	area.classList.toggle("hidden")

	if (!area.classList.contains("hidden")) {
		renderHistory()
	}
}

/* =====================================================
   サーブ確率の計算＆表示
   ===================================================== */
function renderServeStats() {

	let div = document.getElementById("statsArea")
	div.innerHTML = ""

	Object.keys(state.serveStats).forEach(p => {

		let playerName = state.players[p]

		// 選手名未入力は非表示
		if (!playerName) return

		// シングルス時は対象2人のみ表示
		if (state.isSingles) {
			if (playerName !== state.singleA && playerName !== state.singleB) {
				return
			}
		}

		let s = state.serveStats[p]

		let firstRate = s.firstTotal > 0 ? Math.round(s.firstIn / s.firstTotal * 100) : "-"
		let secondRate = s.secondTotal > 0 ? Math.round(s.secondIn / s.secondTotal * 100) : "-"

		let row = document.createElement("div")
		row.className = "stats-line"

		row.innerHTML = `
      <span class="name">${playerName}</span>
      <span class="stat">1st: ${firstRate}% (${s["firstIn"]}/${s["firstTotal"]})</span>
      <span class="stat">2nd: ${secondRate}% (${s["secondIn"]}/${s["secondTotal"]})</span>
    `
		div.appendChild(row)
	})
}

/* =====================================================
   サーブ確率押下処理
   ===================================================== */
function toggleStats() {

	let area = document.getElementById("statsArea")

	area.classList.toggle("hidden")

	if (!area.classList.contains("hidden")) {
		// サーブ後更新に変更　renderServeStats()
	}
}

/* =====================================================
   ショット確率集計
   ・個人
   ・ペア
   ・得点寄与率
   ===================================================== */
function shotStatistics() {

	let area = document.getElementById("shotStatsArea")
	if (!area) return

	area.innerHTML = ""

	// =========================
	// 表示順
	// =========================
	const playerOrder = ["A1", "A2", "B1", "B2"]

	// =========================
	// ヘッダー
	// =========================
	let headerRow = document.createElement("div")
	headerRow.className = "shot-header-row"

	let title = document.createElement("div")
	title.textContent = "ショット集計"
	title.className = "shot-title"

	let toggleBtn = document.createElement("button")
	toggleBtn.className = "shot-toggle-btn"

	toggleBtn.textContent = state.ui.showAllShots
		? "上位表示に戻す"
		: "全ショット表示"

	// ボタン押下で全表示と上位表示を切り替え
	toggleBtn.onclick = () => {
		state.ui.showAllShots = !state.ui.showAllShots
		shotStatistics() // 再描画
	}

	headerRow.appendChild(title)
	headerRow.appendChild(toggleBtn)
	area.appendChild(headerRow)

	// =========================
	// 集計用オブジェクト初期化
	// =========================
	let teamTotals = {
		A: { win: 0, error: 0 },
		B: { win: 0, error: 0 }
	}

	let playerStats = {}

	playerOrder.forEach(playerId => {
		const team = playerId.startsWith("A") ? "A" : "B"

		playerStats[playerId] = {
			shotsMap: {},	// 一時集計用
			shots: [],		// 表示用配列
			win: 0,
			error: 0,
			team: team
		}
	})

	// =========================
	// history からショット集計作成
	// =========================
	;(state.history || []).forEach(h => {

		// 得点・失点以外は集計しない
		if (!["得点", "失点"].includes(h.type)) return

		// ショット名がないものは集計しない
		if (!h.eventName) return

		// playerId がない旧データ対策
		const playerId = h.playerId || null
		if (!playerId) return

		// A1/A2/B1/B2 以外は集計しない
		if (!playerStats[playerId]) return

		const shotKey = h.eventName
		const hand = h.hand || null

		const statKey = makeShotStatKey({
			shotKey: shotKey,
			hand: hand
		})

		if (!playerStats[playerId].shotsMap[statKey]) {
			playerStats[playerId].shotsMap[statKey] = {
				shotKey: shotKey,
				hand: hand,
				win: 0,
				error: 0
			}
		}

		if (h.type === "得点") {
			playerStats[playerId].shotsMap[statKey].win++
			playerStats[playerId].win++
		}

		if (h.type === "失点") {
			playerStats[playerId].shotsMap[statKey].error++
			playerStats[playerId].error++
		}
	})

	// =========================
	// shotsMap を表示用配列に変換
	// =========================
	playerOrder.forEach(playerId => {

		const ps = playerStats[playerId]
		if (!ps) return

		ps.shots = Object.values(ps.shotsMap).map(s => {

			const win = s.win || 0
			const error = s.error || 0
			const total = win + error
			const rate = total > 0 ? Math.round(win / total * 100) : 0

			return {
				shotKey: s.shotKey,
				hand: s.hand,
				win: win,
				error: error,
				total: total,
				rate: rate
			}
		})

		// 試行数が多い順に並べる
		ps.shots.sort((a, b) => b.total - a.total)

		// チーム合計
		const team = ps.team

		teamTotals[team].win += ps.win
		teamTotals[team].error += ps.error
	})

	// =========================
	// 表示（個人）
	// =========================
	playerOrder.forEach(player => {

		let ps = playerStats[player]
		if (!ps) return

		// まだ何も記録がない選手は表示しない
		if (ps.shots.length === 0 && ps.win === 0 && ps.error === 0) return

		let wrapper = document.createElement("div")
		wrapper.className = "shot-player"

		// ===== ヘッダー（クリック部分） =====
		let header = document.createElement("div")
		header.className = "toggle-header"
		header.classList.add(player.startsWith("A") ? "teamA" : "teamB")

		let isOpen = state.ui.openPlayers[player] ?? true

		header.innerHTML = `
			<span>${state.players[player] || player}</span>
			<span class="toggle-icon">${isOpen ? "▼" : "▶"}</span>
		`

		// ===== コンテンツ =====
		let content = document.createElement("div")
		content.style.display = isOpen ? "block" : "none"

		header.onclick = () => {
			let current = state.ui.openPlayers[player] ?? true
			let next = !current

			state.ui.openPlayers[player] = next

			content.style.display = next ? "block" : "none"
			header.querySelector(".toggle-icon").textContent = next ? "▼" : "▶"
		}

		// ===== 成功率 =====
		let title1 = document.createElement("div")
		title1.innerHTML = "【ショット成功率】<small>※ 成功 /（成功＋ミス）</small>"
		content.appendChild(title1)

		let shots = Array.isArray(ps.shots) ? ps.shots : []
		let limit = shotStatsConfig?.showTopN ?? 5

		let displayShots = state.ui.showAllShots
			? shots
			: shots.slice(0, limit)

		if (!Array.isArray(displayShots)) return

		displayShots.forEach((s, i) => {

			let color = ""

			if (shotStatsConfig?.enableColor) {
				if (s.rate >= 70) color = shotStatsConfig.color.high
				else if (s.rate >= 50) color = shotStatsConfig.color.mid
				else color = shotStatsConfig.color.low
			}

			let bold = (i === 0 && shotStatsConfig.highlightBest)
				? "font-weight:bold;"
				: ""

			let line = document.createElement("div")
			line.innerHTML = `
				<span style="color:${color};${bold}">
				${getShotStatLabel(s)}：${s.rate}% (${s.win}/${s.total})
				</span>
			`

			content.appendChild(line)
		})

		wrapper.appendChild(header)
		wrapper.appendChild(content)
		area.appendChild(wrapper)
	})

	// =========================
	// ペア分析
	// =========================
	if (!state.isSingles) {
		let pairDiv = document.createElement("div")
		pairDiv.className = "shot-pair"

		// ===== ヘッダー =====
		let header = document.createElement("div")
		header.className = "toggle-header"
		header.classList.add("pair-header")

		let isOpen = state.ui.openPair

		header.innerHTML = `
			<span>ペア分析</span>
			<span class="toggle-icon">${isOpen ? "▼" : "▶"}</span>
		`

		// ===== コンテンツ =====
		let content = document.createElement("div")
		content.style.display = isOpen ? "block" : "none"

		header.onclick = () => {
			state.ui.openPair = !state.ui.openPair
			content.style.display = state.ui.openPair ? "block" : "none"

			header.querySelector(".toggle-icon").textContent = state.ui.openPair ? "▼" : "▶"
		}

		;["A", "B"].forEach(team => {

			const pairOrder = team === "A" ? ["A1", "A2"] : ["B1", "B2"]

			const teamLabel = pairOrder
				.filter(p => playerStats[p])
				.map(p => state.players[p] || p)
				.join("＆")

			content.innerHTML += `
				<div style="
					margin-top:14px;
					padding:6px 0;
					border-top:1px solid #ddd;
					font-weight:bold;
				">
				【${teamLabel}】
				</div>
			`

			// ===== 得点寄与 =====
			content.innerHTML += "<div>■ 得点寄与</div>"

			pairOrder.forEach(p => {
				let ps = playerStats[p]
				if (!ps) return

				let winRate = teamTotals[team].win
					? Math.round(ps.win / teamTotals[team].win * 100)
					: 0

				content.innerHTML += `${state.players[p] || p}：${winRate}%<br>`
			})

			// ===== ミス寄与 =====
			content.innerHTML += "<div style='color:#aaa'>■ ミス寄与</div>"

			pairOrder.forEach(p => {
				let ps = playerStats[p]
				if (!ps) return

				let errRate = teamTotals[team].error
					? Math.round(ps.error / teamTotals[team].error * 100)
					: 0

				content.innerHTML += `<span style="color:#aaa">${state.players[p] || p}：${errRate}%</span><br>`
			})
		})

		pairDiv.appendChild(header)
		pairDiv.appendChild(content)
		area.appendChild(pairDiv)
	}
}

/* =====================================================
   ショットスタッツ更新・表示
   ・リアルタイム表示
   ===================================================== */
function updateShotStats() {

	if (state._renderLock) return
	state._renderLock = true

	requestAnimationFrame(() => {
		shotStatistics()
		state._renderLock = false
	})
}

/* =====================================================
   ショット確率押下処理
   ===================================================== */
function toggleShotStats() {

	let area = document.getElementById("shotStatsArea")

	area.classList.toggle("hidden")

	if (!area.classList.contains("hidden")) {
		//shotStatistics()	// 得点後に更新ならコメントアウト★
	}
}

function pushState() {

	// state丸ごとコピー（深いコピー）
	const snapshot = JSON.parse(JSON.stringify({

		players: state.players,
		settings: state.settings,	// ★いる？

		score: state.score,
		gameResults: state.gameResults,	// ゲームごとのスコアと勝者を記録する
		history: state.history,

		serveStats: state.serveStats,
		receiveStats: state.receiveStats,

		selectedPlayerId: state.selectedPlayerId,

		service: state.service,
		serverRotation: state.serverRotation,
		serveIndex: state.serveIndex,
		is1stServe: state.is1stServe,
		currentServer: state.currentServer,
		serveTurnCount: state.serveTurnCount,

		isFinalGame: state.isFinalGame,
		gameFinished: state.gameFinished,
		matchFinished: state.matchFinished,

		ui: state.ui
	}))

	state.historyStack.push(snapshot)

	// 上限（任意）
	if (state.historyStack.length > 100) {
		state.historyStack.shift()
	}
}

function undo() {
	if (!state.historyStack?.length) return

	const prev = state.historyStack.pop()
	if (!prev) return

	// ★ 深く戻す
	state.players = prev.players
	state.settings = prev.settings

	state.score = prev.score
	state.gameResults = prev.gameResults
	state.history = prev.history

	state.serveStats = prev.serveStats
	state.receiveStats = prev.receiveStats

	state.selectedPlayerId = prev.selectedPlayerId

	state.service = prev.service
	state.serverRotation = prev.serverRotation
	state.serveIndex = prev.serveIndex
	state.is1stServe = prev.is1stServe
	state.currentServer = prev.currentServer
	state.serveTurnCount = prev.serveTurnCount

	state.isFinalGame = prev.isFinalGame
	state.gameFinished = prev.gameFinished
	state.matchFinished = prev.matchFinished

	state.ui = prev.ui

	// 再描画（重要）
	updateUI()
}