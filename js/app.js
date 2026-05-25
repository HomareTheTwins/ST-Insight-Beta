/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

// アプリ名
const APP_NAME = "ST-Insight"

// バージョン情報
const APP_VERSION = "v0.30-Beta"	// service-workerのバージョンと合わせる

// フォア/バック不要ショット
const noHandShots = new Set([
	"サービスエース",
	"フォルト",
	"ダブルフォルト"
])

/* =====================================================
   試合開始処理
   ・設定画面の入力値をstateに保存
   ・シングルス／ダブルス判定
   ・スコアボード、選手ボタン、得点ボタンを初期化
   ===================================================== */
function startMatch(){
	// UI関連フラグ初期化
	initUIState()
	
	/* 試合関連フラグ初期化 */
	initMatchState()
	
	// ① 生データ取得（ここではまだstateに入れない）
	const A1 = document.getElementById("A1").value.trim();
	const A2 = document.getElementById("A2").value.trim();
	const B1 = document.getElementById("B1").value.trim();
	const B2 = document.getElementById("B2").value.trim();

	// ② 空チェックして人数カウント
	const Acount = (A1 !== "" ? 1 : 0) + (A2 !== "" ? 1 : 0);
	const Bcount = (B1 !== "" ? 1 : 0) + (B2 !== "" ? 1 : 0);
	
	// シングルス判定
	state.isSingles=(Acount==1 && Bcount==1)
	
	// 選手確定
	if (state.isSingles) {
	  // シングルス：2人だけ確定
	  const A = A1 || A2;
	  const B = B1 || B2;

	  state.players = {
	    A1: A || "A1",
	    B1: B || "B1"
	  };
	} else {
	  // ダブルス：4人構造
	  state.players = {
	    A1: A1 || "A1",
	    A2: A2 || "A2",
	    B1: B1 || "B1",
	    B2: B2 || "B2"
	  };
	}
	
	// ゲーム数
	state.settings.games=parseInt(
		document.querySelector("input[name='games']:checked").value
	)

	// サービス権取得
	state.service=document.querySelector("input[name='serve']:checked").value
	
	// シングル選手設定
	if(state.isSingles){
		state.singleA=state.players.A1 || state.players.A2
		state.singleB=state.players.B1 || state.players.B2
	}
	
	// サービス順作成
	buildServerRotation()
	
	// 設定&バージョン情報非表示
	document.getElementById("setup").classList.add("hidden")
	document.getElementById("appInfo").classList.add("hidden")
	
	// 試合開始後画面表示
	document.getElementById("match").classList.remove("hidden")

	const btn = document.getElementById("undoBtn")
	if(btn){
		btn.addEventListener("click", undo)
	}
	
	createScoreboard()
	initPlayers()
	
	/* 画面戻す */
	updateUI()
	
	// 得点履歴にゲーム数出力
	addHistory("system", `1ゲーム目`)
}

/* =====================================================
   選手ボタン初期化
   ・選手名表示
   ・クリックイベント設定
   ・シングルス時は不要ボタン非表示
   ===================================================== */
function initPlayers(){
	let ids=["A1","A2","B1","B2"]

	ids.forEach(id=>{
		let btn=document.getElementById("btn"+id)

		btn.innerText=state.players[id]||"-"

		btn.onclick=()=>selectPlayer(id)

		if(id.startsWith("A")) btn.classList.add("teamA")
		if(id.startsWith("B")) btn.classList.add("teamB")
	})

	if(state.isSingles){
		if(!state.players.A1) document.getElementById("btnA1").style.display="none"
		if(!state.players.A2) document.getElementById("btnA2").style.display="none"
		if(!state.players.B1) document.getElementById("btnB1").style.display="none"
		if(!state.players.B2) document.getElementById("btnB2").style.display="none"
	}

	// 試合開始時のデフォルト選択選手
	selectPlayer(state.service==="A"?"A1":"B1")
}

function handleShotInput(name,type){

	// 対象外 → 即処理
	if(noHandShots.has(name)){

		if(type==="得点"){
			recordShot(name)
		}else{
			recordError(name)
		}

		return
	}

	// 一時保存
	state.pendingShot = {
		name:name,
		type:type
	}

	showHandChoice()
}

/* =====================================================
   フォア/バック確定処理
   ===================================================== */
function selectHand(hand){

	if(!state.pendingShot) return

	let shotName =
		state.pendingShot.name + "（" + hand + "）"

	if(state.pendingShot.type==="得点"){
		recordShot(shotName)
	}else{
		recordError(shotName)
	}

	state.pendingShot = null

	removeHandChoice()
}

// キャンセル
function cancelHand(){

	state.pendingShot = null

	removeHandChoice()
	
	createShotButtons()
}

// UI削除
function removeHandChoice(){

	let overlay = document.getElementById("handOverlay")

	if(overlay){
		overlay.remove()
	}
}

/* =====================================================
   得点入力処理
   ・選択選手のチームにポイント加算
   ・スコア更新とゲーム判定
   ===================================================== */
function recordShot(shotName){
	// Undo用
	pushState()

	let playerId = state.selectedPlayerId
	let team=state.selectedPlayerId.startsWith("A")?"A":"B"
	let server = getCurrentServer()
	
	// ===== スコア更新 =====
	if(team==="A") state.score.pointA++
	else state.score.pointB++
	
	updateServeButton()	// フォルトボタン更新

	// 得点履歴追加
	addHistory("得点", shotName)
	
	// サーブのカウントアップ
	if(state.is1stServe){
	    state.serveStats[server].firstTotal++
	    state.serveStats[server].firstIn++
	}else{
	    state.serveStats[server].secondTotal++
	    state.serveStats[server].secondIn++
	}
	
	// 得点更新
	updatePoints()
	
	// 1ゲーム終了確認
	checkGame()
		
	state.is1stServe = true
	
	if(!state.gameFinished){
		advanceServer()
	}else{
		// ゲーム終了なのでインデックス初期化
		state.serveIndex = 0
	}
	
	// UI更新
	updateUI()
}


/* =====================================================
   ミスショット処理
   ===================================================== */
function recordError(errorName){
	// Undo用
	pushState()

	let scoredTeam=state.selectedPlayerId.startsWith("A")?"B":"A"
	let server = getCurrentServer()
	let selectedPlayerId = state.selectedPlayerId
	
	// ===== スコア更新（内部）=====
	if(scoredTeam==="A"){
		state.score.pointA++
	}else{
		state.score.pointB++
	}
	
	// ===== サーブ統計 =====
	// フォルト後の失点
	if(!state.is1stServe){
		// 選択中の選手がサーバー
		if(server == selectedPlayerId){
			// ダブルフォルト以外の失点（ダブルフォルトはserveFault()で加算する）
			if(!(errorName === "ダブルフォルト")){
				state.serveStats[server].secondTotal++
				state.serveStats[server].secondIn++
			}
		// 他の選手のミス
		}else{
			state.serveStats[server].secondTotal++
			state.serveStats[server].secondIn++
		}
		
	// フォルト以外の失点(1st入ってる)
	}else{
	    state.serveStats[server].firstTotal++
	    state.serveStats[server].firstIn++
	}
	
	// ===== レシーブ統計 =====
	let isServer =
	(state.selectedPlayerId.startsWith("A") && state.service==="A") ||
	(state.selectedPlayerId.startsWith("B") && state.service==="B")
	
	let player = state.selectedPlayerId
	let serveStats = state.serveStats[player]
	let receiveStats = state.receiveStats[player]
	if(isServer){
		// サーブの場合はフォルト処理内で加算
	}else{
	    receiveStats.receiveTotal++
	}
	
	// ポイント更新
	updatePoints()
	
	// 履歴追加
	addHistory("失点", errorName)

	// 1ゲーム終了確認
	checkGame()

	state.is1stServe=true
	// ===== サーバー更新 =====
	if(!state.gameFinished){
		advanceServer()
	}else{
		// ゲーム終了なのでインデックス初期化
		state.serveIndex = 0
	}
	
	// ===== サーブ状態リセット =====
	updateServeButton()	// フォルトボタン更新
	
	// UI更新
	updateUI()
}


/* =====================================================
   ゲーム取得判定
   ・通常ゲーム
   ・ファイナルゲーム(7ポイント)
   ===================================================== */
function checkGame(){
	if(state.isFinalGame){
		// ファイナルゲーム終了判定
		// Aの勝利
		if(state.score.pointA>=7 && state.score.pointA-state.score.pointB>=2){
			winGame("A")
			state.gameFinished = true
			
		// Bの勝利
		}else if(state.score.pointB>=7 && state.score.pointB-state.score.pointA>=2){
			winGame("B")
			state.gameFinished = true
			
		// ゲーム継続中
		}else{
			state.gameFinished = false
			// ボタンの更新
			createShotButtons()
		}
		return
	}

	// 以下ファイナルゲームではない場合
	let a=state.score.pointA
	let b=state.score.pointB

	if(a>=4 && a-b>=2){
		winGame("A")
		state.gameFinished = true

	}else if(b>=4 && b-a>=2){
		winGame("B")
		state.gameFinished = true
		
	// ゲーム継続中
	}else{
		state.gameFinished = false
	}

	// ゲーム数を得点履歴に表示
	if(state.gameFinished && !state.matchFinished && !state.isFinalGame){
		addHistory(
			"system",
			`${state.score.currentGame}ゲーム目`
		)
	}

	if(!state.matchFinished){
		// ボタンの更新
		createShotButtons()
	}
	return
}


/* =====================================================
	ゲーム終了時の処理
	・勝利チームのゲーム数を加算
	・該当ゲームセルに勝利色(win)を付与
	・GAME列の表示を更新
	・ポイントをリセット
	・現在ゲーム番号を次へ進める
	・サービス権を交代
	・サーバーマーク更新
	・現在ゲームのハイライト更新
	・試合終了判定(checkGameSet)を実行
   ===================================================== */
function winGame(team){
	let g=state.score.currentGame
	
	// stateに記録
	state.gameResults[g] = team
	
	// スコア更新
	if(team==="A"){
		state.score.gameA++
	}else{
		state.score.gameB++
	}
	
	// ファイナルゲーム判定
	state.isFinalGame = (state.score.gameA == Math.floor(state.settings.games/2) &&
	state.score.gameB == Math.floor(state.settings.games/2))

	// ファイナルゲーム時、得点履歴にその旨表示
	if(state.isFinalGame){
		addHistory("system","ファイナルゲーム")
	}

	// 1ゲーム終了のため初期化
	state.score.pointA=0
	state.score.pointB=0
	state.score.currentGame++

	// サービス権更新
	state.service=state.service === "A" ? "B" : "A"
	buildServerRotation()

	checkGameSet()
}

/* =====================================================
	試合終了判定処理

	・規定ゲーム数の過半数を取得しているか確認
	・試合終了の場合
	    - GAME列をmatchEndの指定色（黄色）でハイライト
	    - 現在ゲームのハイライトを解除
	    - 試合終了フラグをON
	    - 「試合終了」アラート表示
	    - 得点入力ボタンを無効化
	    - 「次の試合」ボタンを表示
===================================================== */
function checkGameSet(){
	const win=Math.floor(state.settings.games/2)+1

	if(state.score.gameA>=win || state.score.gameB>=win){
		const winner = state.score.gameA >= win ? "A" : "B"
		finishMatch(winner)
	}
}

function finishMatch(winner){

	state.matchFinished = true;
	
	renderScoreboard()
	updateCurrentGameHighlight()
	highlightWinner();
	
	displayForNextGame()

	alert("試合終了");
}

/* =====================================================
	次の試合開始準備処理

	・試合終了フラグをOFF
	・スコア状態(point / game / currentGame)をリセット
	・試合画面を非表示
	・試合設定画面を表示
	・「次の試合」ボタンを再度非表示
===================================================== */
function nextMatch(){

	/* 画面戻す */
	document.getElementById("match").classList.add("hidden")
	document.getElementById("setup").classList.remove("hidden")

	/* ボタン戻す */
	document.getElementById("nextMatchBtn").classList.add("hidden")

	/* 選手ボタン再有効化 */
	document.querySelectorAll(".playerBtn").forEach(b=>{
		b.disabled=false
	})
}

/* =====================================================
	風向き変更処理
	・風向きは詳細モードでのみ表示
	・風向き変更をstateに保存
	・得点入力のタイミングで履歴に出力するためのフラグをON
====================================================== */
function changeWind(btn,wind){
	// 同じ風なら何もしない
	if(state.wind === wind) return

	// 状態更新
	state.wind = wind

	// 風向き未出力フラグON
	state.pendingWindLog = true

	// active解除
	document.querySelectorAll(".windBtn").forEach(b=>{
		b.classList.remove("activeWind")
	})

	// 押下ボタン強調
	btn.classList.add("activeWind")

	// 風向きは得点入力のタイミングで履歴に出力する
	// addHistory("wind", `【風向き：${wind}】`)
}

// 風向きラベル取得	
function getWindLabel(wind){

	switch(wind){

		case "追風":
			return "⬆ 追風"

		case "向風":
			return "⬇ 向風"

		case "右風":
			return "➡ 右風"

		case "左風":
			return "⬅ 左風"

		case "無風":
			return "◯ 無風"

		default:
			return wind
	}
}

function init(){
	// バージョン情報表示
	document.getElementById("appInfo").innerText = `${APP_NAME} ${APP_VERSION}`
}

init()