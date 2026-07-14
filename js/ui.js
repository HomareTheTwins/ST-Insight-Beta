/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

/* =====================================================
   スコアボード作成
   ・ゲーム数に応じた表生成
   ・選手名表示
   ・サーバー表示と現在ゲームハイライト更新
   ===================================================== */
function createScoreboard(){
	let table=document.getElementById("scoreboard")

	let html="<tr><th class='playerHeader'>PLAYER</th>"
	
	for(let i=1;i<=state.settings.games;i++){
		html+="<th class='gameTitle' id='h"+i+"'>"+i+"G</th>"
	}

	html+="<th class='gameHeader'>G</th></tr>"

	let nameA=state.isSingles
	?state.singleA
	:state.players.A1+" & "+state.players.A2

	let nameB=state.isSingles
	?state.singleB
	:state.players.B1+" & "+state.players.B2

	html+="<tr><td id='pairA'></td>"

	for(let i=1;i<=state.settings.games;i++){
		html+="<td id='g"+i+"A'>-</td>"
	}

	html+="<td id='gameA'>0</td></tr>"

	html+="<tr><td id='pairB'></td>"

	for(let i=1;i<=state.settings.games;i++){
		html+="<td id='g"+i+"B'>-</td>"
	}

	html+="<td id='gameB'>0</td></tr>"

	table.innerHTML=html

	updateServerMark()
	updateCurrentGameHighlight()
}

/* =====================================================
   現在ゲームのポイント表示更新
   ===================================================== */
function updatePoints(){
	let g=state.score.currentGame

	// 安全対策
	const pointAElmnt = document.getElementById("g"+g+"A")
	const pointBElmnt = document.getElementById("g"+g+"B")

	// ★ポイントセルが存在しない場合は更新処理をスキップ（例: ゲーム数以上のポイント更新など）
	if(!pointAElmnt || !pointBElmnt) return

	pointAElmnt.innerText=state.score.pointA
	pointBElmnt.innerText=state.score.pointB
	
	renderScoreboard()
}

/* =====================================================
	スコアボードの描画
	・ゲーム数に応じた表生成
	====================================================== */
function renderScoreboard(){
	// スコアボードのハイライト等を削除
	document.querySelectorAll(".scoreboard td").forEach(td=>{
		td.classList.remove("win")
	})
	
	// リロード後やUndo後に古いデータが残らないようにする
	for(let i=1; i<=state.settings.games; i++){
		document.getElementById("g"+i+"A").innerText = "-"
		document.getElementById("g"+i+"B").innerText = "-"
	}
	
	// 終了済みゲームのスコアと勝者を反映
	state.gameResults.forEach((game, i) => {
		const gameNo = i + 1
		document.getElementById("g"+gameNo+"A").innerText = game.aPoints
		document.getElementById("g"+gameNo+"B").innerText = game.bPoints

		const cell = document.getElementById("g"+gameNo+game.winner)
		if(cell){
			cell.classList.add("win")
		}
	});

	// 現在のゲームポイント更新
	const currentGame = state.gameResults.length + 1
	if(currentGame <= state.settings.games){
		document.getElementById("g"+currentGame+"A").innerText = state.score.pointA
		document.getElementById("g"+currentGame+"B").innerText = state.score.pointB
	}

	document.getElementById("gameA").innerText = getGameCount("A")
	document.getElementById("gameB").innerText = getGameCount("B")
}
/* =====================================================
   サーバー表示更新
   ・サービス権がある側の選手名の前に○を表示
   ===================================================== */
function updateServerMark(){
	let markA = state.service === "A"?"○":""
	let markB = state.service === "B"?"○":""

	let nameA = state.isSingles ? state.singleA : state.players.A1 + " & " + state.players.A2
	let nameB = state.isSingles ? state.singleB : state.players.B1 + " & " + state.players.B2

	document.getElementById("pairA").innerHTML =
	"<div class='nameCell'><span class='serverMark'>"+markA+"</span><span class='playerName'>"+nameA+"</span></div>"

	document.getElementById("pairB").innerHTML =
	"<div class='nameCell'><span class='serverMark'>"+markB+"</span><span class='playerName'>"+nameB+"</span></div>"
}

/* =====================================================
   現在進行中ゲームのハイライト更新
   ===================================================== */
function updateCurrentGameHighlight(){
	// 削除
	document.querySelectorAll(".currentGame").forEach(el=>{
		el.classList.remove("currentGame")
	})

	if(state.matchFinished) return

	let g = state.score.currentGame

	if(g > state.settings.games) return

	let cellA = document.getElementById("g"+g+"A")
	let cellB = document.getElementById("g"+g+"B")

	if(cellA) cellA.classList.add("currentGame")
	if(cellB) cellB.classList.add("currentGame")
}

function highlightWinner(){
	// 削除
	document.querySelectorAll(".matchEnd").forEach(el=>{
		el.classList.remove("matchEnd")
	})
	
	const win=Math.floor(state.settings.games/2)+1
	const gameA = getGameCount("A")
	const gameB = getGameCount("B")
	if(gameA>=win || gameB>=win){
		// 勝者の選手(ペア)名とGAME列をハイライト
		const winner = gameA >= win ? "A" : "B"
		document.getElementById("game"+winner).classList.add("matchEnd")
		document.getElementById("pair"+winner).classList.add("matchEnd")
	}
}

function displayForNextGame(){
	const isFinished = state.matchFinished
	
	/* 選手ボタン無効化 */
	document.querySelectorAll(".playerBtn").forEach(b=>{
		b.disabled=isFinished
	})

	/* 得点/失点ボタンを非表示 */
	const shotButtons = document.getElementById("shotButtons")
	if(shotButtons){
		shotButtons.classList.toggle("hidden", isFinished)
	}

	/* 次の試合ボタン表示 */
	const nextMatchBtn = document.getElementById("nextMatchBtn")
	if(nextMatchBtn){
		nextMatchBtn.classList.toggle("hidden", !isFinished)
	}

	/* 試合終了時だけ得点履歴を閉じる */	// ★ 勝手に閉じると得点更新時（updateUI）に毎回表示されるので撤回
	// const historyArea = document.getElementById("historyArea")
	// if(isFinished){
	// 	if(historyArea){
	// 		historyArea.classList.add("hidden")
	// 	}
	// }else{
	// 	if(historyArea){
	// 		historyArea.classList.remove("hidden")
	// 	}
	// }
}

/* =====================================================
   得点入力ボタン生成
   ・サーバーかどうかでエース名変更
   ===================================================== */
function createShotButtons(){
	// 選択選手がサーバーかどうか
	let isServer = (state.selectedPlayerId.startsWith("A") && state.currentServer.startsWith("A")) ||
				   (state.selectedPlayerId.startsWith("B") && state.currentServer.startsWith("B"))

	let aceName = isServer ? "サービスエース" : "リターンエース"

	let shots = createShots(isServer)
	
	let errors = createMissShots(state.is1stServe)
	
	let grid=document.getElementById("shotButtons")

	grid.innerHTML=""

	/* 得点タイトル */
	let scoreHeader=document.createElement("div")

	scoreHeader.style.gridColumn="1 / -1"
	scoreHeader.style.display="flex"
	scoreHeader.style.justifyContent="space-between"
	scoreHeader.style.alignItems="center"
	scoreHeader.style.width="100%"

	let scoreTitle=document.createElement("span")
	scoreTitle.innerText="【得点】"
	scoreTitle.style.fontWeight="bold"

	// 詳細/簡易モード切替ボタン
	let modeBtn=document.createElement("button")
	modeBtn.className = "modeToggleBtn"
	modeBtn.innerText = (state.inputMode === "simple") ? "詳細モードへ" : "簡易モードへ"

	modeBtn.onclick = () => {
		state.inputMode = (state.inputMode === "simple") ? "detail" : "simple"

		localStorage.setItem("inputMode",state.inputMode)
		
		// モード切替に伴うボタン更新
		createShotButtons()

		// 風向きボタンの表示切替
		updateWindButtons()	
	}

	scoreHeader.appendChild(scoreTitle)
	scoreHeader.appendChild(modeBtn)

	grid.appendChild(scoreHeader)
	/* 得点ボタン生成 */
	shots.forEach(s=>{

		let btn=document.createElement("button")

		btn.innerText=s.label
		btn.className=s.type

		// ドロップはツイストと現在統合しているため文字を小さくする
		if(s.key === "drop"){
			btn.classList.add("shot-small-text")
		}

		btn.disabled = state.matchFinished
		btn.onclick=()=>handleShotInput(s.key,"得点")

		grid.appendChild(btn)

	})

	/* ミスタイトル */
	let errorTitle=document.createElement("div")
	errorTitle.innerText="【ミス】"
	errorTitle.style.gridColumn="1 / span 3"
	errorTitle.style.fontWeight="bold"
	errorTitle.style.marginTop="6px"
	errorTitle.style.textAlign="left"
	grid.appendChild(errorTitle)

	/* ミスボタン生成 */
	errors.forEach(e=>{

		/* レシーバーの場合フォルトは非表示 */
		if(e.isFault && !isServer) return
		if(e.receiveOnly && isServer) return

		let btn=document.createElement("button")

		btn.className=e.type
		
		// ドロップはツイストと現在統合しているため文字を小さくする
		if(e.key === "drop"){
			btn.classList.add("shot-small-text")
		}

		btn.disabled = state.matchFinished

		if(e.isFault){
			btn.id = "btnFault"
			btn.innerText = e.label //(state.is1stServe==false)? "ダブルフォルト" : "フォルト"
			btn.onclick=()=>serveFault()
		}else{
			btn.innerText=e.label
			btn.onclick=()=>handleShotInput(e.key,"失点")
		}

		grid.appendChild(btn)

	})

	/* 得点ボタンエリアの色更新 */
	updateShotAreaColor()
}

/* 詳細モードボタン：ベース配列 */
const detailShotsBase = [
	{key:"ace",			type:"shot-back"},
	{key:"stroke",		type:"shot-back"},
	{key:"lob",			type:"shot-back"},
	{key:"midLob",		type:"shot-back"},

	{key:"short",		type:"shot-common"},
	{key:"passing",		type:"shot-common"},
	{key:"attack",		type:"shot-common"},
	{key:"slice",		type:"shot-common"},
	{key:"cut",			type:"shot-common"},
	{key:"drop",		type:"shot-common"},
//	{key:"twist",		type:"shot-common"},	// スライス追加のためドロップに統合★

	{key:"volley",		type:"shot-front"},
	{key:"poach",		type:"shot-front"},
	{key:"smash",		type:"shot-front"},
	{key:"lowVolley",	type:"shot-front"},
	{key:"highVolley",	type:"shot-front"},
]

/* 簡易モード：ベース配列 */
const simpleShotsBase = [
	{key:"ace",			type:"shot-back"},
	{key:"stroke",		type:"shot-back"},
	{key:"lob",			type:"shot-back"},

	{key:"short",		type:"shot-common"},
	{key:"attack",		type:"shot-common"},
	{key:"drop",		type:"shot-common"},

	{key:"volley",		type:"shot-front"},
	{key:"poach",		type:"shot-front"},
	{key:"smash",		type:"shot-front"},
]

/* =====================================================
   得点ショットボタン生成処理（詳細モード/簡易モード）
   ===================================================== */
function createShots(isServer){
	let aceName = isServer ? "サービスエース" : "リターンエース"
	
	let shotsBase = state.inputMode === "detail" ? detailShotsBase : simpleShotsBase
	
	let shots = shotsBase.map(shot => {
		if(shot.key === "ace"){
			return {
				...shot,
				label: isServer ? "サービスエース" : "リターンエース",
				// name:aceName
				key: isServer ? "serviceAce" : "returnAce",
			}
		}
		return {
			...shot,
			label: getShotLabel(shot.key)
		}
	})
	
	return shots
}

/* 詳細モードボタン：ベース配列(ミス) */
const detailMissShotsBase = [
	{key:"fault",		type:"error-fault",isFault:true},
	{key:"receive",		type:"error-back",receiveOnly:true},

	{key:"stroke",		type:"error-back"},
	{key:"lob",			type:"error-back"},
	{key:"midLob",		type:"error-back"},

	{key:"short",		type:"error-common"},
	{key:"passing",		type:"error-common"},
	{key:"attack",		type:"error-common"},
	{key:"slice",		type:"error-common"},
	{key:"cut",			type:"error-common"},
	{key:"drop",		type:"error-common"},
//	{key:"twist",		type:"error-common"},	// スライス追加のためdropに統合★
	
	{key:"volley",		type:"error-front"},
	{key:"poach",		type:"error-front"},
	{key:"smash",		type:"error-front"},
	{key:"lowVolley",	type:"error-front"},
	{key:"highVolley",	type:"error-front"}
]

/* 簡易モード：ベース配列(ミス) */
const simpleMissShotsBase = [
	{key:"fault",		type:"error-fault",isFault:true},
	{key:"receive",		type:"error-back",receiveOnly:true},

	{key:"stroke",		type:"error-back"},
	{key:"lob",			type:"error-back"},

	{key:"short",		type:"error-common"},
	{key:"attack",		type:"error-common"},
	{key:"drop",		type:"error-common"},
	
	{key:"volley",		type:"error-front"},
	{key:"poach",		type:"error-front"},
	{key:"smash",		type:"error-front"},
]

/* =====================================================
   ミスショットボタン生成処理（詳細モード/簡易モード）
   ===================================================== */
function createMissShots(is1stServe){
	let faultName = is1stServe ? "フォルト" : "ダブルフォルト"
	
	let shotsBase = state.inputMode === "detail" ? detailMissShotsBase : simpleMissShotsBase
	
	let shots = shotsBase.map(shot => {
		if(shot.key === "fault"){
			return {
				...shot,
				//name:faultName
				label: is1stServe ? "フォルト" : "ダブルフォルト",
				key: is1stServe ? "fault" : "doubleFault",
				//isFault: true
			}
		}
		return {
			...shot,
			label: getShotLabel(shot.key)
		}
	})
	
	return shots
}

/* =====================================================
   フォア/バック選択UI
   ===================================================== */
function showHandChoice(){

	removeHandChoice()

	//let grid = document.getElementById("shotButtons")

	let overlay = document.createElement("div")
	overlay.id = "handOverlay"
	overlay.className = "popup-overlay"

	let shotName = getShotLabel(state.pendingShot?.shotKey) || state.pendingShot?.shotKey || ""

	// ★ 得点 / 失点
	let popupClass =
		state.pendingShot?.type === "得点"
			? "hand-popup win-popup"
			: "hand-popup error-popup"

	overlay.innerHTML = `
		<div class="${popupClass}">

			<div class="hand-title">
				${shotName}
			</div>

<!--			<div class="hand-subtitle">
				フォア / バック
			</div>
-->
			<button class="popup-btn btn-fore" id="btnFore">フォア</button>
			<button class="popup-btn btn-back" id="btnBack">バック</button>
			<button class="popup-btn btn-cancel" id="btnCancel">戻る</button>

		</div>
	`

	document.body.appendChild(overlay)

	document.getElementById("btnFore").onclick =
		()=>selectHand("フォア")

	document.getElementById("btnBack").onclick =
		()=>selectHand("バック")

	document.getElementById("btnCancel").onclick =
		()=>cancelHand()
}

/* =====================================================
   フォア/バック選択UI削除
   ===================================================== */
function removeHandChoice(){

	let overlay = document.getElementById("handOverlay")

	if(overlay){
		overlay.remove()
	}
}

// コースキー
const courseOptions = [
	{ key: "cross", label: "クロス" },
	{ key: "reverseCross", label: "逆クロス" },
	{ key: "center", label: "センター" },
	{ key: "rightStraight", label: "右ストレート" },
	{ key: "leftStraight", label: "左ストレート" }
	// { key: "short", label: "ショート" }
]

/* =====================================================
   コース選択UI
   ===================================================== */
function showCourseChoice(){

	removeCourseChoice()

	let overlay = document.createElement("div")
	overlay.id = "courseOverlay"
	overlay.className = "popup-overlay"

	let shotName = getShotLabel(state.pendingShot?.shotKey) || state.pendingShot?.shotKey || ""

	overlay.innerHTML = `
		<div class="hand-popup win-popup">

			<div class="hand-title">
				${shotName}
			</div>

			<button class="popup-btn btn-course-cross" id="btnCourseCross">クロス</button>
			<button class="popup-btn btn-course-reverse" id="btnCourseReverse">逆クロス</button>
			<button class="popup-btn btn-course-center" id="btnCourseCenter">センター</button>
			<button class="popup-btn btn-course-rightStraight" id="btnCourseRightStraight">右ストレート</button>
			<button class="popup-btn btn-course-leftStraight" id="btnCourseLeftStraight">左ストレート</button>
			<button class="popup-btn btn-course-skip" id="btnCourseSkip">スキップ</button>
			<button class="popup-btn btn-cancel" id="btnCourseCancel">戻る</button>

		</div>
	`

	document.body.appendChild(overlay)

	document.getElementById("btnCourseCross").onclick =
		()=>selectCourse("cross")

	document.getElementById("btnCourseReverse").onclick =
		()=>selectCourse("reverseCross")

	document.getElementById("btnCourseCenter").onclick =
		()=>selectCourse("center")

	document.getElementById("btnCourseRightStraight").onclick =
		()=>selectCourse("rightStraight")

	document.getElementById("btnCourseLeftStraight").onclick =
		()=>selectCourse("leftStraight")

	// document.getElementById("btnCourseShort").onclick =
	// 	()=>selectCourse("short")

	document.getElementById("btnCourseSkip").onclick =
		()=>selectCourse("skipped")

	document.getElementById("btnCourseCancel").onclick =
		()=>cancelCourse()
}

/* =====================================================
   コース選択UI削除
   ===================================================== */
function removeCourseChoice(){

	const overlay = document.getElementById("courseOverlay")

	if(overlay){
		overlay.remove()
	}
}

/* =====================================================
	ミス結果表示ポップアップ
	===================================================== */
function showMissResultPopup(){
	document.getElementById("missResultPopup").classList.remove("hidden")
}

function hideMissResultPopup(){
	document.getElementById("missResultPopup").classList.add("hidden")
}

/* =====================================================
	ミス結果表示ポップアップ
	===================================================== */
function showMissResultChoice(){

	const overlay = document.createElement("div")

	overlay.id = "missResultChoiceOverlay"

	overlay.className = "popup-overlay"

	overlay.innerHTML = `
		<div class="hand-popup error-popup">

			<div class="hand-title">
				ミス結果
			</div>

			<button class="popup-btn btn-miss-net" onclick="selectMissResult('net')">
				ネット
			</button>

			<button class="popup-btn btn-miss-out" onclick="selectMissResult('overOut')">
				アウト
			</button>

			<button class="popup-btn btn-miss-sideout" onclick="selectMissResult('sideOut')">
				サイドアウト
			</button>

			<button class="popup-btn btn-miss-front" onclick="selectMissResult('frontCaught')">
				前衛捕球
			</button>

			<button class="popup-btn btn-miss-skip" onclick="selectMissResult('skipped')">
				スキップ
			</button>

			<button class="popup-btn btn-cancel" id="btnMissResultCancel">
				戻る
			</button>

		</div>
	`

	document.body.appendChild(overlay)

	document.getElementById("btnMissResultCancel").onclick = () => {
		removeMissResultChoice()
	}
}

function removeMissResultChoice(){

	const overlay = document.getElementById("missResultChoiceOverlay")

	if(overlay){
		overlay.remove()
	}
}

/* =====================================================
	ミスの種類表示ポップアップ
	===================================================== */
function showMissTypeChoice(){

	const overlay = document.createElement("div")

	overlay.id = "missTypeChoiceOverlay"

	overlay.className = "popup-overlay"

	overlay.innerHTML = `
		<div class="hand-popup error-popup">

			<div class="hand-title">
				ミス分類
			</div>

<!--			<div class="hand-subtitle">
				ミス内容を選択
			</div>
-->
			<button class="popup-btn btn-attack" onclick="selectMissType('attack')">
				攻めミス
			</button>

			<button class="popup-btn btn-unforced" onclick="selectMissType('unforced')">
				凡ミス
			</button>

			<button class="popup-btn btn-pressured" onclick="selectMissType('pressured')">
				押し負け
			</button>

			<button class="popup-btn btn-miss-skip" onclick="selectMissType('skipped')">
				スキップ
			</button>

			<button class="popup-btn btn-cancel" id="btnMissCancel">
				戻る
			</button>

		</div>
	`

	document.body.appendChild(overlay)

	document.getElementById("btnMissCancel").onclick = () => {
		removeMissTypeChoice()
		showMissResultChoice()	// ミス結果選択UIを再表示
	}
}

/* =====================================================
	ミスの種類選択ポップアップ削除
	===================================================== */
function removeMissTypeChoice(){

	const popup =
		document.getElementById("missTypeChoiceOverlay")

	if(popup){
		popup.remove()
	}
}

/* =====================================================
   フォルトボタンの更新
   ・フォルト→ダブルフォルト
   ===================================================== */
function updateServeButton() {
    const btn = document.getElementById("btnFault");

    if (!btn) return; // ★安全対策

    btn.innerText = (state.is1stServe==false)? "ダブルフォルト" : "フォルト"
}

/* =====================================================
   対戦カード表示更新
   ・シングルス / ダブルスに応じて表示内容を変更
   ※現在未使用
   ===================================================== */
function updatePairLabel(){
	if(state.isSingles){
		document.getElementById("pairLabel").innerText=
		state.singleA+" VS "+state.singleB

	}else{
		document.getElementById("pairLabel").innerText=
		state.players.A1+" & "+state.players.A2+
		" VS "+
		state.players.B1+" & "+state.players.B2
	}
}

/* =====================================================
   得点入力対象選手を選択
   ・選択ボタンをハイライト
   ・ショットボタン更新
   ===================================================== */
function selectPlayer(playerId){
	state.selectedPlayerId=playerId

	document.querySelectorAll(".playerBtn").forEach(b=>{
		b.classList.remove("selected")
	})

	document.getElementById("btn"+playerId).classList.add("selected")

	updateShotAreaColor()

	createShotButtons()
}

/* =====================================================
   得点ボタンエリアの枠色変更
   ・味方選手選択 → 緑
   ・対戦相手選択 → オレンジ
   ===================================================== */
function updateShotAreaColor(){
	let grid=document.getElementById("shotButtons")

	grid.classList.remove("teamAActive","teamBActive")

	if(state.selectedPlayerId.startsWith("A")){
		grid.classList.add("teamAActive")
	}else{
		grid.classList.add("teamBActive")
	}
}

/* =====================================================
   UI関連初期化処理
   ===================================================== */
function initUIState(){
	if(!state.ui) state.ui = {}

	if(typeof state.ui.openPlayers !== "object"){
		state.ui.openPlayers = {}
	}

	if(typeof state.ui.openPair !== "boolean"){
		state.ui.openPair = false
	}
}

/* =====================================================
   戻すボタン更新
   ===================================================== */
function updateUndoButton(){

	const btn = document.getElementById("undoBtn")
	if(!btn) return

	btn.disabled = !state.historyStack?.length
}

/* =====================================================
   選手ボタン更新
   ===================================================== */
function updatePlayerButtons(){

	let disabled = state.matchFinished

	document.querySelectorAll(".playerBtn").forEach(btn=>{
		btn.disabled = disabled
	})
}

/* =====================================================
   風向きボタン表示変更
   ・簡易モードでは非表示
   ===================================================== */
function updateWindButtons(){
	const windArea = document.getElementById("windArea")

	if(state.inputMode === "simple"){
		windArea.classList.add("hidden")
	}else{
		windArea.classList.remove("hidden")
	}
}

/* =====================================================
	トップ画面のバージョン情報表示更新
	・APP_CONFIG.ENV_LABELがある場合は表示、ない場合は非表示
	===================================================== */
function updateTopEnvLabel(){

	const label = document.getElementById("appInfo")
	if(!label) return

	if(APP_CONFIG.ENV_LABEL){
		label.innerText = APP_CONFIG.APP_NAME+" "+APP_CONFIG.APP_VERSION
		label.classList.remove("hidden")
	}else{
		label.innerText = ""
		label.classList.add("hidden")
	}
}

/* =====================================================
   試合中画面の環境表示更新
   ・APP_CONFIG.ENV_LABELがある場合は表示、ない場合は非表示
   ===================================================== */
function updateEnvLabel(){

	const label = document.getElementById("envLabel")
	if(!label) return

	if(APP_CONFIG.ENV_LABEL){
		label.innerText = APP_CONFIG.ENV_LABEL + " "+ APP_CONFIG.APP_VERSION
		label.classList.remove("hidden")
	}else{
		label.innerText = ""
		label.classList.add("hidden")
	}
}

function updateBetaNotice(){
	const betaNotice = document.getElementById("betaNotice")
	if(!betaNotice) return

	if(window.APP_CONFIG?.ENV === "beta"){
		betaNotice.classList.remove("hidden")
	}else{
		betaNotice.classList.add("hidden")
	}
}

/* =====================================================
   UI全更新
   ===================================================== */
function updateUI(){
	updatePoints()
	updateServerMark()
	updateCurrentGameHighlight()
	highlightWinner()
	updateServeButton()
	updateShotAreaColor()
	
	renderScoreboard()
	renderHistory()
	renderServeStats()
	shotStatistics()
	
	updatePlayerButtons()
	createShotButtons()
	updateUndoButton()
	updateWindButtons()

	updateMatchAnalysisVisibility()
	displayForNextGame()

	// 状態を保存
	saveState()
}

