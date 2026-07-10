/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

// フォア/バック不要ショット
const noHandShots = new Set([
	"serviceAce",
	"fault",
	"doubleFault"
])

// 一時変数
let selectedMissResult = null;	// 選択中のミス結果（ネット、アウト、サイドアウト、スキップなど）

// ショット名のラベル
const SHOT_LABELS = {
	serviceAce: "サービスエース",
	returnAce: "リターンエース",
	fault: "フォルト",
	doubleFault: "ダブルフォルト",
	receive: "レシーブ",

	stroke: "ストローク",
	lob: "ロブ",
	midLob: "中ロブ",
	shortCross: "ショートクロス",

	passing: "パッシング",
	attack:	"前衛アタック",
	slice: "スライス",
	cut: "カット",
	drop: "ドロップ/ツイスト",
	twist: "ツイスト",

	volley: "ボレー",
	poach: "ポーチ",
	smash: "スマッシュ",
	lowVolley: "ローボレー",
	highVolley: "ハイボレー",
}

// ミス結果のラベル
const MISS_RESULT_LABELS = {
	net: "ネット",
	overOut: "アウト",
	sideOut: "サイドアウト",
	frontCaught: "前衛捕球",
	skipped: "スキップ"
}

// ミス分類のラベル
const MISS_TYPE_LABELS = {
	attack: "攻めミス",
	unforced: "凡ミス",
	pressured: "押し負け",
	skipped: "スキップ"
}

// コースラベル
const COURSE_LABELS = {
	cross: "クロス",
	reverseCross: "逆クロス",
	center: "センター",
	straight: "ストレート",
	short: "ショート",
	skipped: "スキップ"
}

function resetSelectedInputs(){
	selectedMissResult = null
	// 他の選択変数もここでリセット
}

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
	
	resetSelectedInputs()	// 選択変数リセット

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
	
	// 選手名保存
	saveOwnPlayerNames()

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
	addHistory({
		type: "system",
		eventName: `1ゲーム目`
	})
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

/* =====================================================
	ショット入力処理
	・ショット名と得点/失点の情報をstate.pendingShotに一時保存
	・フォア/バック選択UI表示
	・今後コースや結果の選択も追加する場合はここでstate.pendingShotに情報を追加していく★
   ===================================================== */
function handleShotInput(shotKey,type){

	// フォア/バック対象外ショット → 即処理
	if(noHandShots.has(shotKey)){

		if(type==="得点"){
			recordShot(shotKey)
		}else{
			recordError(shotKey, null, "skipped", "skipped")	// ミスタイプはスキップで記録
		}
		return
	}

	// 一時保存
	state.pendingShot = {
		shotKey:shotKey,	// ショットキー（stroke, lob etc...）
		type:type,			// 得点 or 失点
		hand:null,			// フォア/バックは後で選択
		course: null,		// コース（クロス、逆クロス、ストレート、センター、ショート、スキップ）
		missResult:null,	// ミス結果（ネット、アウト、サイドアウト、スキップなど）
		missType:null		// ミスの種類（凡ミス/攻めミス/押し負け）※失点のみ
	}

	// フォア/バック選択対象ショット→ポップアップ表示
	showHandChoice()
}

/* =====================================================
   フォア/バック確定処理
   ===================================================== */
function selectHand(hand){

	if(!state.pendingShot) return

	// 得点時処理
	if(state.pendingShot.type==="得点"){
		// recordShot(state.pendingShot.shotKey, hand)
		state.pendingShot.hand = hand	// 得点ショットにhand情報も追加する
		removeHandChoice()
		showCourseChoice()
		return
	// 失点時処理
	}else{
		state.pendingShot.hand = hand	// ミスのショットにhand情報も追加してからrecordError呼び出す

		// 詳細モードの場合はミスタイプ選択UI表示（ミスタイプ選択後にrecordError呼び出す）
		if(state.inputMode === "detail"){
			showMissResultChoice()	// ミス結果選択UI表示（ネット、アウト、サイドアウト、スキップなど）
			//showMissTypeChoice()	// ミス分類選択UI表示（凡ミス/攻めミス/押し負け/スキップ） --> ミス結果選択の後にミス分類選択UI表示するように変更(ミス結果選択後にポップアップ表示する)
			return
		}

		// 簡易モードの場合はミスタイプ選択なしでrecordError呼び出す
		recordError(state.pendingShot.shotKey, hand, "skipped", "skipped")	// ミスタイプとミス結果はスキップで記録
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

/* =====================================================
   コース選択処理
   ===================================================== */
function selectCourse(course){
	if(!state.pendingShot) return

	state.pendingShot.course = course

	removeCourseChoice()

	recordShot(
		state.pendingShot.shotKey,
		state.pendingShot.hand,
		state.pendingShot.course
	)
	state.pendingShot = null
}

function cancelCourse(){

	removeCourseChoice()

	if(state.pendingShot){
		state.pendingShot.course = null
	}

	showHandChoice()
}

/* =====================================================
   ミス結果選択処理
   ===================================================== */
function selectMissResult(missResult){

	if(!state.pendingShot) return

	state.pendingShot.missResult = missResult

	removeMissResultChoice()

	showMissTypeChoice()
}

/* =====================================================
	ミスの種類選択処理
	・recordError呼び出し
	・選択UI削除
	===================================================== */
function selectMissType(missType){

	state.pendingShot.missType = missType

	recordError(
		state.pendingShot.shotKey,
		state.pendingShot.hand,
		state.pendingShot.missType || "skipped",	// ミスタイプが選択されていない場合は"skipped"で記録
		state.pendingShot.missResult || "skipped"	// ミス結果が選択されていない場合は"skipped"で記録
	)

	state.pendingShot = null

	removeMissTypeChoice()
	removeHandChoice()
}

/* =====================================================
   得点入力処理
   ・選択選手のチームにポイント加算
   ・スコア更新とゲーム判定
   ・サービス権の更新
   ===================================================== */
function recordShot(shotName, hand = null, course = null){
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
	addHistory({
		type: "得点",
		eventName: shotName,
		hand: hand,
		course: course
	})
	
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
function recordError(errorName, hand = null, missType = "skipped", missResult = "skipped"){
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
	addHistory({
		type: "失点",
		eventName: errorName,
		hand,					// フォア/バック
		missType,				// ミスタイプ（凡ミス/攻めミス/押し負け/スキップ）
		missResult				// ミス結果（ネット/アウト/サイドアウト/スキップなど）
	})

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
   ・得点履歴にゲーム数出力
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
		addHistory({
			type: "system",
			eventName: `${state.score.currentGame}ゲーム目`
		})
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
	
	// スコア更新
	state.gameResults.push({ 
		aPoints: state.score.pointA,
		bPoints: state.score.pointB,
		winner: team
	})	// 勝者とそのゲームのポイントも記録するように変更
	const gameA = getGameCount("A")
	const gameB = getGameCount("B")

	// ファイナルゲーム判定
	state.isFinalGame = (
		gameA == Math.floor(state.settings.games/2) &&
		gameB == Math.floor(state.settings.games/2)
	)

	// ファイナルゲーム時、得点履歴にその旨表示
	if(state.isFinalGame){
		addHistory({
			type: "system",
			eventName: "ファイナルゲーム"
		})
	}

	// 1ゲーム終了のため初期化
	state.score.pointA=0
	state.score.pointB=0
	state.score.currentGame++

	// サービス権更新
	state.service=state.service === "A" ? "B" : "A"
	buildServerRotation()

	// サーバー変更時に現在のサーバーを選択状態にする
	selectPlayer(state.currentServer)

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

	const gameA = getGameCount("A")
	const gameB = getGameCount("B")
	if(gameA>=win || gameB>=win){
		const winner = gameA >= win ? "A" : "B"
		finishMatch(winner)
	}
	// if(state.score.gameA>=win || state.score.gameB>=win){
	// 	const winner = state.score.gameA >= win ? "A" : "B"
	// 	finishMatch(winner)
	// }
}

/* =====================================================
	試合終了処理

	・試合終了フラグをON
	・スコアボードの現在ゲーム列を黄色でハイライト
	・現在ゲームのハイライトを解除
	・「試合終了」アラート表示
	・得点入力ボタンを無効化
	・「次の試合」ボタンを表示
===================================================== */
function finishMatch(winner){
	state.matchFinished = true;

	updateUI()

	if(appSettings.showAnalysis !== false){
		// 試合分析表示
		showMatchAnalysis()
	}else{
		alert("試合終了")
	}
	
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
	// 試合分析ブロックの非表示
	hideMatchAnalysis()

	saveOwnPlayerNames()
	localStorage.removeItem("stInsightState")

	loadOwnPlayerNames()
	state.players.B1 = ""
	state.players.B2 = ""
	applyPlayerNamesToInputs()

	/* 画面戻す */
	document.getElementById("match").classList.add("hidden")
	document.getElementById("setup").classList.remove("hidden")
	document.getElementById("appInfo").classList.remove("hidden")

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
}

// 各プレイヤー目線の風向きラベル取得	
function getWindLabelForPlayer(wind, playerId){

	if(!wind) return ""

	const isOwnPlayer = playerId && playerId.startsWith("A")

	// プレイヤーが味方の場合
	if(isOwnPlayer){
		switch(wind){
			case "追風":
				return "↑追風"

			case "向風":
				return "↓向風"

			case "左風":
				return "→左風"

			case "右風":
				return "←右風"

			case "無風":
				return "◯無風"

			default:
				return wind
		}
	// プレイヤーが対戦相手の場合
	}else{
		switch(wind){
			case "追風":
				return "↓向風"

			case "向風":
				return "↑追風"

			case "左風":
				return "←右風"

			case "右風":
				return "→左風"

			case "無風":
				return "◯無風"

			default:
				return wind
		}
	}
}

/* =====================================================
	ゲームカウント取得処理
   ===================================================== */
   function getGameCount(team){
	return state.gameResults.filter(game => game.winner === team).length
}

/* =====================================================
	ショットラベル取得処理
   ===================================================== */
function getShotLabel(shotName){
	return SHOT_LABELS[shotName] || shotName || ""
}

/* =====================================================
   ショットのミスタイプラベル取得処理
   ===================================================== */
function getMissTypeLabel(missType){
	return MISS_TYPE_LABELS[missType] || missType || ""
}

/* =====================================================
	ミス結果のラベル取得処理
   ===================================================== */
function getMissResultLabel(missResult){
	return MISS_RESULT_LABELS[missResult] || missResult || ""
}

/* =====================================================
	コースラベル取得処理
   ===================================================== */
function getCourseLabel(course){
	return COURSE_LABELS[course] || course || ""
}

/* =====================================================
   ショット集計用キー作成
   ・内部集計用のkeyを作る
   ・表示名ではなく、分析しやすい機械的なkeyにする
   ===================================================== */
function makeShotStatKey({ shotKey, hand }) {
	return [
		shotKey || "unknown",
		hand || ""
	].join("__")
}


/* =====================================================
   ショット集計表示名作成
   ・内部keyから画面表示用ラベルを作る
   ・例: highVolley + フォア → ハイボレー（フォア）
   ===================================================== */
function getShotStatLabel(stat) {
	if (!stat) return ""

	const shotLabel = getShotLabel(stat.shotKey)
	const handLabel = stat.hand ? `(${stat.hand})` : ""

	return `${shotLabel}${handLabel}`
}

/* =====================================================
   アプリの状態保存
   ===================================================== */
function saveState(){

	if(state.matchFinished) return
	
	localStorage.setItem(
		"stInsightState",
		JSON.stringify({

			players: state.players,
			isSingles: state.isSingles,
			singleA: state.singleA,
			singleB: state.singleB,

			settings: state.settings,

			score: state.score,
			gameResults: state.gameResults,

			selectedPlayerId: state.selectedPlayerId,

			service: state.service,
			serverRotation: state.serverRotation,
			serveIndex: state.serveIndex,
			is1stServe: state.is1stServe,
			currentServer: state.currentServer,

			isFinalGame: state.isFinalGame,

			history: state.history,
			historyStack: state.historyStack,	// ★リロード後のundo用に履歴も保存

			serveStats: state.serveStats,
			receiveStats: state.receiveStats,

			gameFinished: state.gameFinished,
			matchFinished: state.matchFinished,

			inputMode: state.inputMode,

			wind: state.wind,
			pendingWindLog: state.pendingWindLog
		})
	)
}

/* =====================================================
   アプリの状態復元
   ===================================================== */
function loadState(){

	const savedState = localStorage.getItem("stInsightState")

	if(!savedState) return

	const parsedState =	JSON.parse(savedState)

	Object.assign(state, parsedState)
}

/* 味方選手名保存 */
function saveOwnPlayerNames(){
	const ownPlayers = {
		A1: state.players.A1 || "",
		A2: state.players.A2 || ""
	}

	localStorage.setItem("stInsightOwnPlayers", JSON.stringify(ownPlayers))
}

/* 選手名読み込み */
function loadOwnPlayerNames(){
	const saved = localStorage.getItem("stInsightOwnPlayers")
	if(!saved) return

	try{
		const ownPlayers = JSON.parse(saved)

		if(ownPlayers.A1 !== undefined){
			state.players.A1 = ownPlayers.A1
		}

		if(ownPlayers.A2 !== undefined){
			state.players.A2 = ownPlayers.A2
		}
	}catch(e){
		console.warn("味方選手名の読み込みに失敗しました", e)
	}
}

function applyPlayerNamesToInputs(){
	const inputA1 = document.getElementById("A1")
	const inputA2 = document.getElementById("A2")
	const inputB1 = document.getElementById("B1")
	const inputB2 = document.getElementById("B2")

	if(inputA1) inputA1.value = state.players.A1 || ""
	if(inputA2) inputA2.value = state.players.A2 || ""
	if(inputB1) inputB1.value = state.players.B1 || ""
	if(inputB2) inputB2.value = state.players.B2 || ""
}

/* =====================================================
   試合リセット処理
   ・ローカルストレージの状態を削除してリロード
   ・コンソールでstateを直接リセットする場合は以下のコードを実行
   ===================================================== */
function resetMatch(){
	localStorage.removeItem("stInsightState");
	location.reload();
}
function getSaveSize(){
	return JSON.stringify(state).length
}

function confirmFinishMatch(){

	const ok = confirm(
		"試合を終了しますか？"
	)

	if(!ok) return

	finishMatchFlow()
}

function finishMatchFlow(){

	localStorage.removeItem("stInsightState")

	location.reload()
}

// ショットボタンの押下エフェクト追加
function setupPressEffect(){
	document.addEventListener("pointerdown", e => {
		const target = e.target.closest(".shot-grid button, .stat-btn")
		if(!target) return

		target.classList.add("is-pressing")
	})

	document.addEventListener("pointerup", () => {
		document.querySelectorAll(".is-pressing").forEach(el => {
			el.classList.remove("is-pressing")
		})
	})

	document.addEventListener("pointercancel", () => {
		document.querySelectorAll(".is-pressing").forEach(el => {
			el.classList.remove("is-pressing")
		})
	})

	document.addEventListener("pointerleave", () => {
		document.querySelectorAll(".is-pressing").forEach(el => {
			el.classList.remove("is-pressing")
		})
	})
}

function setupEventHandlers(){
	// ここにイベントハンドラ設定コードをまとめる（例: ボタンクリックなど）
	const undoBtn = document.getElementById("undoBtn")
	if(undoBtn){
		undoBtn.addEventListener("click", undo)
	}

	const finishMatchBtn = document.getElementById("finishMatchBtn")
	if(finishMatchBtn){
		finishMatchBtn.addEventListener("click", confirmFinishMatch)
	}

	// ボタン押下効果追加
	setupPressEffect()
}

function init(){
	loadAppSettings()
	// 状態復元
	loadState()

	/* 画面表示 */
	if(state.score.pointA > 1 || state.score.pointB > 1 || state.gameResults.length > 0){
		// 試合途中の場合は試合画面表示
		document.getElementById("match").classList.remove("hidden")
		document.getElementById("setup").classList.add("hidden")

		createScoreboard()
		initPlayers()
		updateUI()
	}else{
		loadOwnPlayerNames()
		state.players.B1 = ""
		state.players.B2 = ""
		applyPlayerNamesToInputs()

		// 試合前の場合は設定画面表示
		document.getElementById("match").classList.add("hidden")
		document.getElementById("setup").classList.remove("hidden")

		// 設定画面のバージョン表示
		updateTopEnvLabel()

		// β版注意事項表示
		updateBetaNotice()
	}

	// 試合中画面のバージョン表示
	updateEnvLabel()

	// イベントハンドラ設定(ここではまだundoボタンのみ)
	setupEventHandlers()
}

init()