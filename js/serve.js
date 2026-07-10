/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

/* =====================================================
   最新のサーバー取得
   ===================================================== */
function getCurrentServer() {
	return state.serverRotation[state.serveIndex]
}

/* =====================================================
   サーバー順作成
   ・現在のサービス権があるペアを基準に作成
   ===================================================== */
function buildServerRotation() {
	// 通常ゲーム
	if (!state.isFinalGame) {
		// ダブルス
		if (!state.isSingles) {
			if (state.service === "A") {
				state.serverRotation = ["A1", "A1", "A2", "A2"]
			} else {
				state.serverRotation = ["B1", "B1", "B2", "B2"]
			}
			// シングルス
		} else {
			let singleServer = state.service === "A" ? state.players.A1 ? "A1" : "A2"
				: state.players.B1 ? "B1" : "B2"
			state.serverRotation = [singleServer, singleServer]
		}
		// ファイナルゲーム
	} else {
		// ダブルス
		if (!state.isSingles) {
			if (state.service === "A") {
				state.serverRotation = ["A1", "A1", "B1", "B1", "A2", "A2", "B2", "B2"]
			} else {
				state.serverRotation = ["B1", "B1", "A1", "A1", "B2", "B2", "A2", "A2"]
			}
			// シングルス
		} else {
			let singlePlayerA = state.players.A1 ? "A1" : "A2"
			let singlePlayerB = state.players.B1 ? "B1" : "B2"

			if (state.service === "A") {
				state.serverRotation = [singlePlayerA, singlePlayerA, singlePlayerB, singlePlayerB]
			} else {
				state.serverRotation = [singlePlayerB, singlePlayerB, singlePlayerA, singlePlayerA]
			}
		}
	}
	state.serveIndex = 0
	state.currentServer = getCurrentServer() // ★
}

/* =====================================================
   サーバー変更
   ・ポイント確定後に実施
   ===================================================== */
function advanceServer() {
	// 1st ⇔ 2nd切り替え
	state.is1stServe == true ? false : true

	// 次のサーブ
	state.serveIndex++

	// 一巡したら最初へ
	if (state.serveIndex >= state.serverRotation.length) {
		state.serveIndex = 0
	}

	state.currentServer = state.serverRotation[state.serveIndex]

	// サーバー変更時に現在のサーバーを選択状態にする
	selectPlayer(state.currentServer)
}

/* =====================================================
   サーブ順更新
   ・ダブルス	：A1→A2		 or B1→B2
		  (ファイナル)：A1→B1→A2→B2 or B1→A1→B2→A2
   ・シングルス ：A→B			 or B→A
   ※現在未使用
   ===================================================== */
function updateServeOrder() {
	// サービス権の変更
	// 通常ゲームの場合
	if (!state.isFinalGame) {
		// ダブルスの場合
		if (!state.isSingles) {
			// チーム切り替え
			if (state.serveOrder[0].startsWith("A")) {	// 最初のサービスがAペアの場合
				state.serveOrder = ["B1", "B2"]
			} else {
				state.serveOrder = ["A1", "A2"]
			}

			// シングルスの場合
		} else {
			// チーム切り替え
			if (state.serveOrder[0].startsWith("A")) {
				state.serveOrder = ["B", "A"]
			} else {
				state.serveOrder = ["A", "B"]
			}
			state.serveIndex = (state.serveIndex + 1) % 2
		}

		// ファイナルゲームの場合
	} else {
		// ダブルスの場合
		if (!state.isSingles) {
			state.serveOrder = ["A1", "B1", "A2", "B2"]

			// シングルスの場合
		} else {
			state.serveOrder = ["A", "B"]
		}
	}

	state.serveIndex = 0
	state.serveTurnCount = 0
	state.currentServer = state.serveOrder[state.serveIndex]
}

/* =====================================================
   フォルト処理
   ===================================================== */
function serveFault() {
	// Undo用
	pushState()	// 1stも2ndも1操作として記録

	let server = getCurrentServer()

	// 1st失敗：フォルト→ダブルフォルトへ
	if (state.is1stServe) {

		state.is1stServe = false
		state.serveStats[server].firstTotal++

		updateUI()
		return
	} else {
		state.serveStats[server].secondTotal++

		// 得点処理
		let scoredTeam = server.startsWith("A") ? "B" : "A"
		if (scoredTeam === "A") {
			state.score.pointA++
		} else {
			state.score.pointB++
		}
		
		addHistory({
			type: "失点",
			eventName: "doubleFault",
			missResult: "skipped",
			missType: "skipped"
		})

		state.is1stServe = true

		updatePoints()
		checkGame()
		// ===== サーバー更新 =====
		if (!state.gameFinished) {
			advanceServer()
		} else {
			// ゲーム終了なのでインデックス初期化
			state.serveIndex = 0
		}
		updateUI()
	}
}

/* =====================================================
   サーブ確率計算
   ===================================================== */
function getServeRate(player) {

	let s = state.serveStats[player]

	let rate1 = s.firstTotal ? (s.firstIn / s.firstTotal * 100).toFixed(1) : 0
	let rate2 = s.secondTotal ? (s.secondIn / s.secondTotal * 100).toFixed(1) : 0

	return {
		first: rate1,
		second: rate2
	}
}

