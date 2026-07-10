/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

// global
let currentMatchAnalysis = null
let currentAnalysisTeam = "A"

// グラフ
let scoreShotChart = null
let missShotChart = null
let scoreCourseChart = null
let missResultChart = null
let missTypeChart = null

// 得点コース棒グラフ表示順
const COURSE_ORDER = [
	"cross",
	"reverseCross",
	"center",
	"straight",
	"short"
]

// 除外対象
const ANALYSIS_EXCLUDE_KEYS = ["skipped"]

/* =====================================================
   試合分析トグル
   ===================================================== */
function toggleAnalysis(){

	const analysisArea = document.getElementById("analysisArea")
	if(!analysisArea) return

	analysisArea.classList.toggle("hidden")
}

function hideMatchAnalysis(){

	const analysisArea = document.getElementById("analysisArea")
	if(!analysisArea) return

	analysisArea.classList.add("hidden")
	analysisArea.innerHTML = ""
}

function showMatchAnalysis(){
	// 試合分析機能OFFの場合は計算・表示しない
	if(appSettings.showAnalysis === false){
		return
	}

	const analysisArea = document.getElementById("analysisArea")
	if(!analysisArea) return

	currentMatchAnalysis = buildMatchAnalysis()

	// 分析画面初期状態
	state.ui.analysis.tab = "summary"
	state.ui.analysis.team = "A"

	//analysisArea.classList.remove("hidden")
	renderMatchAnalysis(currentMatchAnalysis)

	setTimeout(() => {
		analysisArea.scrollIntoView({
			behavior: "smooth",
			block: "start"
		})
	}, 100)
}
function updateMatchAnalysisVisibility(){

    const area = document.getElementById("analysisArea")

	if(appSettings.showAnalysis !== false){
		if(state.matchFinished){
			area.classList.remove("hidden")
		}else{
			area.classList.add("hidden")
		}
	}
}

function buildMatchAnalysis(){

	return {
		result: {
			gameA: getGameCount("A"),
			gameB: getGameCount("B"),
			teamAName: getTeamName("A"),
			teamBName: getTeamName("B")
		},
		teamA: buildTeamSummary("A"),
		teamB: buildTeamSummary("B")
	}
}

function getTeamName(team){

	if(team === "A"){
		if(state.isSingles){
			return state.players.A1 || "味方"
		}

		return `${state.players.A1 || "A1"} & ${state.players.A2 || "A2"}`
	}

	if(state.isSingles){
		return state.players.B1 || "対戦相手"
	}

	return `${state.players.B1 || "B1"} & ${state.players.B2 || "B2"}`
}

function getMatchResultText(){

	const gameA = getGameCount("A")
	const gameB = getGameCount("B")

	const teamAName = state.isSingles
		? (state.players.A1 || "味方")
		: `${state.players.A1 || "A1"} & ${state.players.A2 || "A2"}`

	const teamBName = state.isSingles
		? (state.players.B1 || "対戦相手")
		: `${state.players.B1 || "B1"} & ${state.players.B2 || "B2"}`

	return `${teamAName} [${gameA} - ${gameB}] ${teamBName}`
}

function buildTeamSummary(team){

	const playerIds = state.isSingles
		? [team === "A" ? "A1" : "B1"]
		: (team === "A" ? ["A1", "A2"] : ["B1", "B2"])

	const summary = {
		team,
		players: {},
		shots: {},				// 得点ショット
		shotsMiss: {},			// ミスショット
		courses: {},			// 得点コース
		missResults: {},		// ミス結果（ネット/アウト/サイドアウト/前衛捕球）
		missTypes: {},			// ミス分類（攻めミス/凡ミス/押し負け）
		frontActions: {},       // 前衛アクション（得点＋失点）
        frontActionWins: {},    // 前衛得点アクション
        frontActionErrors: {},  // 前衛失点アクション
		goodPoints: [],
		nextChallenges: []
	}

	playerIds.forEach(playerId => {
		summary.players[playerId] = {
			name: state.players[playerId] || playerId,
			win: 0,
			error: 0
            // total: 0
		}
	})

	;(state.history || []).forEach(h => {

		if(h.type !== "得点" && h.type !== "失点") return
		if(!h.playerId) return
		if(!playerIds.includes(h.playerId)) return

		if(!summary.players[h.playerId]){
			summary.players[h.playerId] = {
				name: h.player || h.playerId,
				win: 0,
				error: 0
			}
		}

		if(h.type === "得点"){
			summary.players[h.playerId].win++
            // summary.players[h.playerId].total++

			if(h.eventName){
				incrementCount(summary.shots, h.eventName)
			}

			if(h.course && h.course !== "skipped"){
				incrementCount(summary.courses, h.course)
			}

			if(isFrontAction(h.eventName)){
				incrementCount(summary.frontActions, h.eventName)
                incrementCount(summary.frontActionWins, h.eventName)
			}
		}

		if(h.type === "失点"){
			summary.players[h.playerId].error++
            // summary.players[h.playerId].total++

			if(h.eventName){
				incrementCount(summary.shotsMiss, h.eventName)
			}

			if(h.missResult && h.missResult !== "skipped"){
				incrementCount(summary.missResults, h.missResult)
			}

			if(h.missType && h.missType !== "skipped"){
				incrementCount(summary.missTypes, h.missType)
			}

			if(isFrontAction(h.eventName)){
				incrementCount(summary.frontActions, h.eventName)
                incrementCount(summary.frontActionErrors, h.eventName)
			}
		}
	})

	summary.goodPoints = buildGoodPoints(summary)
	summary.nextChallenges = buildNextChallenges(summary)

	return summary
}

function incrementCount(obj, key){

	if(!key) return

	if(!obj[key]){
		obj[key] = 0
	}

	obj[key]++
}

/* =====================================================
   集計済みデータから多い順に上位limit件を取得
   　obj：取得したい条件（shotsやcourseなど）
    return：["stroke", 6],["lob", 4],["poach", 3]の形で返す
   ===================================================== */
function getTopEntries(obj, limit = 3, excludeKeys = []){

	return Object.entries(obj || {})
        .filter(([key]) => !excludeKeys.includes(key))
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
}

/* =====================================================
   上位1件を取得
   　obj：取得したい条件（shotsやcourseなど）
    return：["stroke", 6]の形で返す
   ===================================================== */
function getTopEntry(obj, excludeKeys = []){

	const entries = getTopEntries(obj, 1, excludeKeys)

	return entries.length > 0 ? entries[0] : null
}

/* =====================================================
   同率1位を全取得
   　obj：取得したい条件（shotsやcourseなど）
   　max：上限を設けたい場合は設定
    return：["stroke", 6],["lob", 6],["poach", 6]の形で返す
   ===================================================== */
function getTopEntriesWithTie(obj, excludeKeys = [], max = null){

	const entries = getTopEntries(obj, Object.keys(obj || {}).length, excludeKeys)

	if(entries.length === 0) return []

	const topCount = entries[0][1]

	const tiedEntries = entries.filter(([key, count]) => count === topCount)

	return max ? tiedEntries.slice(0, max) : tiedEntries
}

/* =====================================================
   前衛アクションかどうかを返す
   ===================================================== */
function isFrontAction(eventName){

	return [
		"volley",
		"poach",
		"smash",
		"highVolley",
		"lowVolley",
		"volleyFollow",
		"smashFollow"
	].includes(eventName)
}

/* =====================================================
   総数を返す処理
   ===================================================== */
function getTotalCount(obj){

	return Object.values(obj || {})
		.reduce((sum, count) => sum + count, 0)
}

function addComment(comments, comment) {
    if (comment) {
        comments.push(comment)
    }
}

function buildGoodPoints(summary){

	const comments = []

    // トッププレーヤー
	addComment(comments, buildTopPlayerComment(summary))

    // トップショット：同率一位あり
    addComment(comments, buildTopShotComment(summary))

    // トップコース：同率一位あり
    addComment(comments, buildTopCourseComment(summary))

    // ポーチコメント：グッドポイント
    addComment(comments, buildPoachGoodComment(summary))

	if(comments.length === 0){
		comments.push("得点パターンを振り返り、次の試合につなげましょう。")
	}

	return comments.slice(0, 3)
}

function buildTopPlayerComment(summary){
    // トッププレーヤー
    const topWinPlayer = Object.values(summary.players)
		.sort((a, b) => b.win - a.win)[0]

    // トッププレーヤーの得失点数と得点割合
    const playCount = topWinPlayer.win + topWinPlayer.error
    const topRate = playCount > 0
            ? Math.round(topWinPlayer.win / playCount * 100)
            : 0
    
    // ペア二人の総得点数
    const teamScoreTotal = Object.values(summary.players)
        .reduce((sum, player) => sum + player.win, 0)

    // トッププレーヤーのペア内得点割合
    const scoreShare = teamScoreTotal > 0
        ? Math.round(topWinPlayer.win / teamScoreTotal * 100)
        : 0

	if(topWinPlayer && scoreShare >= 60 && topRate >= 50){
		return `${topWinPlayer.name}の得点がペア間の${scoreShare}%を占めていました。<br>
            個人の得点率も${topRate}%だったため、その調子で攻めていきましょう。`

	}else if(topWinPlayer && scoreShare >= 60 && topRate < 50){
		return `${topWinPlayer.name}はミスもありましたが、ペア間の得点の${scoreShare}%を占めていました。<br>
            良いプレーを維持しつつ、ミスを減らしていきましょう。`
    }

    return ""
}

function buildTopShotComment(summary){
    const topShots = getTopEntriesWithTie(summary.shots)
    if(topShots.length > 0){
        const count = topShots[0][1]
        const labels = topShots.map(([key]) => getShotLabel(key)).join("・")

        if(topShots.length === 1){
         	if(count >= 5){
                return `${labels}での得点が${count}本あり、効果的な得点パターンになっていました。`
            }else if(count >= 3){
                return `${labels}での得点が${count}本あり、良い形ができていました。`
            }else{
                return `${labels}での得点が${count}本ありました。`
            }
        }else{
         	if(count >= 5){
                return `${labels}での得点がそれぞれ${count}本あり、効果的な得点パターンになっていました。`
            }else if(count >= 3){
                return `${labels}での得点がそれぞれ${count}本あり、良い形ができていました。`
            }else{
                return `${labels}での得点がそれぞれ${count}本ありました。`  // ToDo★ いらないかも
            }
        }
    }

    return ""
}

function buildTopCourseComment(summary){
    const topCourses = getTopEntriesWithTie(summary.courses, ANALYSIS_EXCLUDE_KEYS)
    if(topCourses.length){
        const count = topCourses[0][1]
        const labels = topCourses.map(([key]) => getCourseLabel(key)).join("・")

        if(topCourses.length === 1){
         	if(count >= 5){
                return `${labels}方向での得点が${count}本あり、効果的なコースになっていました。`
            }else if(count >= 3){
                return `${labels}方向での得点が${count}本あり、良い形ができていました。`
            }else{
                return `${labels}方向の得点が${count}本ありました。`
            }
        }else{
         	if(count >= 5){
                return `${labels}方向での得点がそれぞれ${count}本あり、効果的なコースになっていました。`
            }else if(count >= 3){
                return `${labels}方向での得点がそれぞれ${count}本あり、良い形ができていました。`
            }else{
                return `${labels}方向での得点がそれぞれ${count}本ありました。`  // ToDo★ いらないかも
            }
        }
    }

    return ""
}

function buildNextChallenges(summary){

	const comments = []

    // ミスプレーヤー
    addComment(comments, buildErrorPlayerComment(summary))
    
    // ミス結果（ネット/アウト/サイドアウト/前衛補給）
    addComment(comments, buildMissResultComment(summary))

    // ミス分類（攻めミス/凡ミス/押し負け）
    addComment(comments, buildMissTypeComment(summary))

    // ポーチコメント：チャレンジ
    addComment(comments, buildPoachChallengeComment(summary))
 
	if(comments.length === 0){
		comments.push("大きなミス傾向は目立ちませんでした。良かったプレーを継続しましょう。")
	}

	return comments.slice(0, 3)
}

function buildErrorPlayerComment(summary){
    // ミスプレーヤー
	const topErrorPlayer = Object.values(summary.players)
		.sort((a, b) => b.error - a.error)[0]

    // ミスプレーヤーの得失点数と失点割合
    const playCount = topErrorPlayer.win + topErrorPlayer.error
    const errorRate = playCount > 0
            ? Math.round(topErrorPlayer.error / playCount * 100)
            : 0
    
    // ペア二人の総失点数
    const teamErrorTotal = Object.values(summary.players)
        .reduce((sum, player) => sum + player.error, 0)

    // ミスプレーヤーのペア内失点割合
    const errorShare = teamErrorTotal > 0
        ? Math.round(topErrorPlayer.error / teamErrorTotal * 100)
        : 0

	if(topErrorPlayer && errorShare >= 60 && errorRate >= 50){
		return `${topErrorPlayer.name}の失点がペア間の${errorShare}%を占めていました。<br>
            個人のミス率も${errorRate}%だったため、ミスの内容を確認し同じミスを減らしていきましょう。`

	}else if(topErrorPlayer && errorShare >= 60 && errorRate < 50){
		return `${topErrorPlayer.name}の失点がペア間の${errorShare}%でしたが、積極的に攻めてもいました。<br>
            良いプレーを維持しつつ、ミスを減らしていきましょう。`
    }

    return ""
}

function buildPoachGoodComment(summary){

	const poachTotal = summary.frontActions.poach || 0
	const poachWinCount = summary.frontActionWins.poach || 0

	if(poachTotal === 0) return ""

	const poachWinRate = Math.round((poachWinCount / poachTotal) * 100)

	if(poachTotal >= 5 && poachWinRate >= 70){
		return `ポーチで${poachTotal}本 球に触り、そのうち${poachWinCount}本を得点につなげられていました。(得点率：${poachWinRate}%)<br>
        前衛で効果的に流れを作れていました。`
	}

	if(poachTotal >= 3 && poachWinRate >= 50){
		return `ポーチで${poachTotal}本 球に触り、${poachWinCount}本を得点につなげられていました。(得点率：${poachWinRate}%)<br>
        前衛で関わる意識が出ていました。`
	}

	return ""
}

function buildPoachChallengeComment(summary){

	const poachTotal = summary.frontActions.poach || 0
	const poachWinCount = summary.frontActionWins.poach || 0
	const poachErrorCount = summary.frontActionErrors.poach || 0

	if(poachTotal === 0) return ""

	const poachWinRate = Math.round((poachWinCount / poachTotal) * 100)

	if(poachTotal >= 5 && poachWinRate < 50){
		return `ポーチで${poachTotal}本 球に触れ、${poachWinCount}得点・${poachErrorCount}失点でした。(得点率：${poachWinRate}%)<br>
        相手の体勢や位置をよく観察し、出るタイミングや打つコースを確認して決め切りましょう。`
	}

	if(poachTotal >= 3 && poachWinRate <= 40){
		return `ポーチで${poachTotal}本 球に触れ、得点につながった本数は${poachWinCount}本でした。(得点率：${poachWinRate}%)<br>
        相手の体勢や位置をよく観察し、出るタイミングや場面、面の向きやネットに詰めているか振り返りましょう。`
	}

	if(poachTotal >= 1 && poachTotal < 3 && poachWinCount){
		return `ポーチで${poachTotal}本 球に触れ、${poachWinCount}本得点できていました。(得点率：${poachWinRate}%)<br>
        相手の位置や体勢をよく観察したうえで更に積極的に仕掛けていきましょう。`
	}

    if(poachTotal && poachWinCount == 0){
		return `得点には至りませんでしたが、ポーチを${poachTotal}本仕掛けることができました。<br>
        相手の位置や体勢をよく観察し、出るタイミングや場面、面の向きやネットに詰めているか振り返りましょう。`
    }

    // ToDo★ 前衛有無✅を設けたらPoachComment系はForwordComment系としてまとめる
    // const volleyTotal = summary.frontActions.volley || 0
    // const smashTotal = summary.frontActions.smash || 0
    // if(poachTotal == 0){
    //     return `ポーチプレーはありませんでした。ペアが攻めた球を打って相手を押し込んだり、ロブで走らせたなど、
    //     ポーチが狙えそうな場面がなかったか振り返ってみましょう。`
    // }

    return ""
}

const MISS_RESULT_ADVICE = {
    net: "面やスイングの向きが白帯の上を向いていたか、守るべき球を無理に攻めていないかなどを振り返ってみましょう。",
    overOut: "きちんと打点に入って打てていたか、自分の球速やドライブ量に合わせた高さに球を抑えられていたか確認してみましょう。",
    sideOut: "コースを狙い過ぎていなかったか、風を考慮できていたかどうかを振り返ってみましょう。",
    frontCaught: "打つ前に相手の位置を確認し、打つコースを工夫してみましょう。"
}

// ミス結果（ネット/アウト/サイドアウト/前衛補給）
function buildMissResultComment(summary){
	const topMissResults = getTopEntriesWithTie(summary.missResults, ANALYSIS_EXCLUDE_KEYS)
	if(topMissResults.length){
        const count = topMissResults[0][1]
        const labels = topMissResults.map(([key]) => getMissResultLabel(key)).join("・")

        if(topMissResults.length === 1){
            const topMissResult = topMissResults[0][0]
            const advice = MISS_RESULT_ADVICE[topMissResult]
            return `${labels}による失点が${count}本ありました。<br>${advice}`
        }else{
            const advices = topMissResults.map(([key]) =>
                `・${getMissResultLabel(key)}：${MISS_RESULT_ADVICE[key]}`
            ).join("<br>")

            return `${labels}による失点がそれぞれ${count}本ありました。<br>${advices}`
        }
	}

    return ""
}

const MISS_TYPE_ADVICE = {
	attack: "積極性は◎です。精度を上げていきましょう。",
	unforced: "もったいないミスが多いようです。打点に早く入る、手打ちをしないなどに気を付け、丁寧に攻めていきましょう。",
	pressured: "前打点でタイミングを合わせる、しっかり繋ぐなど、攻守を意識してプレーしましょう。"
}

// ミス分類（攻めミス/凡ミス/押し負け）
function buildMissTypeComment(summary){
	const topMissTypes = getTopEntriesWithTie(summary.missTypes, ANALYSIS_EXCLUDE_KEYS)
	if(topMissTypes.length){
        const count = topMissTypes[0][1]
        const labels = topMissTypes.map(([key]) => getMissTypeLabel(key)).join("・")

        if(topMissTypes.length === 1){
            const topMissType = topMissTypes[0][0]
            const advice = MISS_TYPE_ADVICE[topMissType]
            return `${labels}による失点が${count}本ありました。<br>${advice}`
        }else{
            const advices = topMissTypes.map(([key]) =>
                `・${getMissTypeLabel(key)}：${MISS_TYPE_ADVICE[key]}`
            ).join("<br>")
            
            return `${labels}による失点がそれぞれ${count}本ありました。<br>${advices}`
        }
	}

    return ""
}

function renderMatchAnalysis(analysis){

	currentMatchAnalysis = analysis

	document.getElementById("analysisMatchResult").innerHTML =	buildMatchResultHtml(analysis)

	updateAnalysisTabs()

	updateAnalysisTeamTabs()

	renderAnalysisContent()
}

function buildMatchResultHtml(analysis){

	return `
		<div class="analysis-section">
			<h4>試合結果</h4>
			<div class="analysis-match-result">
				<span>${analysis.result.teamAName}</span>
				<span class="score">
					[ ${analysis.result.gameA} - ${analysis.result.gameB} ]
				</span>
				<span>${analysis.result.teamBName}</span>
			</div>
		</div>
	`
}

function switchAnalysisTeam(team){
console.log(state.ui)
	state.ui.analysis.team = team

	updateAnalysisTeamTabs()

	renderAnalysisContent()
}

function updateAnalysisTeamTabs(){
	console.log(
		"analysisTeamA:",
		document.getElementById("analysisTeamA")
	)

	console.log(
		"analysisTeamB:",
		document.getElementById("analysisTeamB")
	)
	document.getElementById("analysisTeamA")
		.classList.toggle(
			"active",
			state.ui.analysis.team === "A"
		)

	document.getElementById("analysisTeamB")
		.classList.toggle(
			"active",
			state.ui.analysis.team === "B"
		)
}

function buildTeamSummaryHtml(summary){

	return `
		<div class="analysis-section">
			<h4>${summary.team === "A" ? "味方サマリー" : "対戦相手サマリー"}</h4>
		</div>

		<div class="analysis-section">
			<h4>Good Point!!</h4>
			${renderAnalysisList(summary.goodPoints)}
		</div>

		<div class="analysis-section">
			<h4>Next Charenge!!</h4>
			${renderAnalysisList(summary.nextChallenges)}
		</div>

		<div class="analysis-section">
			<h4>選手別 得点 / 失点</h4>
			${renderPlayerAnalysis(summary)}
		</div>

		<div class="analysis-section">
			<h4>得点ショット</h4>
			${renderShotAnalysis(summary)}
		</div>

		<div class="analysis-section">
			<h4>得点コース</h4>
			${renderCourseAnalysis(summary)}
		</div>

		<div class="analysis-section">
			<h4>ミス傾向</h4>
			${renderMissAnalysis(summary)}
		</div>
	`
}

function renderAnalysisList(items){

	if(!items || items.length === 0){
		return `<div>データがありません。</div>`
	}

	return `
		<ul>
			${items.map(item => `<li>${item}</li>`).join("")}
		</ul>
	`
}

function renderPlayerAnalysis(summary){

	const players = Object.values(summary.players)

	if(players.length === 0){
		return `<div>データがありません。</div>`
	}

	return `
		<ul>
			${players.map(p => `
				<li>${p.name}：得点 ${p.win} / 失点 ${p.error}</li>
			`).join("")}
		</ul>
	`
}

function renderShotAnalysis(summary){

	const entries = getTopEntries(summary.shots, 5)

	if(entries.length === 0){
		return `<div>得点ショットのデータがありません。</div>`
	}

	return `
		<div>
			${entries.map(([key, count]) => `${getShotLabel(key)}：${count}`).join(" / ")}
		</div>
	`
}

function renderCourseAnalysis(summary){

	const entries = getTopEntries(summary.courses, 5)

	if(entries.length === 0){
		return `<div>得点コースのデータがありません。</div>`
	}

	return `
		<div>
			${entries.map(([key, count]) => `${getCourseLabel(key)}：${count}`).join(" / ")}
		</div>
	`
}

function renderMissAnalysis(summary){

	const missResults = getTopEntries(summary.missResults, 5)
	const missTypes = getTopEntries(summary.missTypes, 5)

	if(missResults.length === 0 && missTypes.length === 0){
		return `<div>ミス傾向データはありません。</div>`
	}

	return `
		<div>
			<div>ミス結果：${missResults.map(([key, count]) => `${getMissResultLabel(key)} ${count}`).join(" / ") || "なし"}</div>
			<div>ミス分類：${missTypes.map(([key, count]) => `${getMissTypeLabel(key)} ${count}`).join(" / ") || "なし"}</div>
		</div>
	`
}

function switchAnalysisTab(tab){

	state.ui.analysis.tab = tab

	updateAnalysisTabs()

	renderAnalysisContent()
}


function updateAnalysisTabs(){

	const summary =
		document.getElementById("analysisTabSummary")

	const graph =
		document.getElementById("analysisTabGraph")

	const serve =
		document.getElementById("analysisTabServe")


	if(!summary || !graph || !serve){
		console.warn("分析タブが存在しません")
		return
	}


	summary.classList.toggle(
		"active",
		state.ui.analysis.tab === "summary"
	)

	graph.classList.toggle(
		"active",
		state.ui.analysis.tab === "graph"
	)

	serve.classList.toggle(
		"active",
		state.ui.analysis.tab === "serve"
	)
}

function renderAnalysisContent(){

	if(!currentMatchAnalysis) return

	const summary =
		state.ui.analysis.team === "A"
			? currentMatchAnalysis.teamA
			: currentMatchAnalysis.teamB

	const area = document.getElementById("analysisContent")

	switch(state.ui.analysis.tab){
		case "summary":

			area.innerHTML =
				buildTeamSummaryHtml(summary)

			break

		case "graph":

			area.innerHTML =
				buildGraphHtml(summary)

			drawScoreShotChart(summary)

			drawMissShotChart(summary)

			drawScoreCourseChart(summary)

			drawMissResultChart(summary)

			drawMissCategoryChart(summary)

			break

		case "serve":

			area.innerHTML =
				buildServeAnalysisHtml(summary)

			break
	}
}

function buildGraphHtml(summary){

	return `
		<div class="analysis-section">

			<h4>得点ショット</h4>

			<div class="chart-container">
				<canvas id="scoreShotChart"></canvas>
			</div>

		</div>


		<div class="analysis-section">

			<h4>ミスショット</h4>

			<div class="chart-container">
				<canvas id="missShotChart"></canvas>
			</div>

		</div>


		<div class="analysis-section">

			<h4>得点コース</h4>

			<div class="chart-container">
				<canvas id="scoreCourseChart"></canvas>
			</div>

		</div>


		<div class="analysis-section">

			<h4>ミス結果</h4>

			<div class="chart-container">
				<canvas id="missResultChart"></canvas>
			</div>

		</div>


		<div class="analysis-section">

			<h4>ミス分類</h4>

			<div class="chart-container">
				<canvas id="missCategoryChart"></canvas>
			</div>

		</div>
	`
}
function buildServeAnalysisHtml(summary){

	return `
		<div class="analysis-section">

			<h4>準備中</h4>

			<p>
				現在準備中です。
			</p>

		</div>
	`
}

function drawScoreShotChart(summary){

	const ctx = document.getElementById("scoreShotChart")
	if(!ctx) return

	if(scoreShotChart){
		scoreShotChart.destroy()
	}

	// 打ったショットのみ取得（本数順）
	const entries = getTopEntries(
		summary.shots,
		Number.MAX_SAFE_INTEGER
	)

	if(entries.length === 0){
		ctx.parentElement.innerHTML =
			"<div>得点ショットデータがありません。</div>"
		return
	}

	const labels = entries.map(([key]) =>
		getShotLabel(key)
	)

	const values = entries.map(([,count]) =>
		count
	)

	scoreShotChart = new Chart(ctx, {
		type:"bar",

		data:{
			labels:labels,
			datasets:[
				{
					label:"得点数",
					data:values,
					backgroundColor:"#59b7c1",
					borderColor:"#2E8E99",
					borderWidth:1
				}
			]
		},

		options:{
			indexAxis:"y",
			responsive:true,
			maintainAspectRatio:false,

			scales:{
				x:{
					beginAtZero:true,
					suggestedMax: Math.max(...values) + 2,
					ticks:{
						stepSize:1
					}
				}
			},

			plugins:{
				legend:{
					display:false
				},

				datalabels:{
					anchor:"end",
					align:"right",
					color:"#333",
					font:{
						weight:"bold"
					},
					formatter:value => `${value}本`
				}
			}
		},

		plugins:[
			ChartDataLabels
		]
	})
}

function drawMissShotChart(summary){

	const ctx =	document.getElementById("missShotChart")
	if(!ctx) return

	if(missShotChart){
		missShotChart.destroy()
	}

	// ミスしたショットのみ取得（本数順）
	const entries = getTopEntries(
		summary.shotsMiss,
		Number.MAX_SAFE_INTEGER
	)

	if(entries.length === 0){
		ctx.parentElement.innerHTML =
			"<div>ミスショットデータがありません。</div>"
		return
	}

	const labels = entries.map(([key]) =>
		getShotLabel(key)
	)

	const values = entries.map(([,count]) =>
		count
	)

	missShotChart = new Chart(ctx, {
		type:"bar",

		data:{
			labels,
			datasets:[
				{
					label:"失点数",
					data:values,
					backgroundColor:"#E57373",
					borderWidth:0
				}
			]
		},

		options:{
			indexAxis:"y",
			responsive:true,
			maintainAspectRatio:false,

			scales:{
				x:{
					beginAtZero:true,
					suggestedMax:Math.max(...values) + 2,
					ticks:{
						stepSize:1
					}
				}
			},

			plugins:{
				legend:{
					display:false
				},

				datalabels:{
					anchor:"end",
					align:"right",
					color:"#333",
					font:{
						weight:"bold"
					},
					formatter:value=>`${value}本`
				}
			}
		},

		plugins:[
			ChartDataLabels
		]
	})
}

function drawScoreCourseChart(summary){

	const ctx =	document.getElementById("scoreCourseChart")
	if(!ctx) return

	if(scoreCourseChart){
		scoreCourseChart.destroy()
	}

	const data = summary.courses || {}
	if(Object.keys(data).length === 0){
		ctx.parentElement.innerHTML =
			"<div>得点コースデータがありません。</div>"
		return
	}

	const labels = []
	const values = []
	COURSE_ORDER.forEach(course => {

		labels.push(
			getCourseLabel(course)
		)

		values.push(
			data[course] || 0
		)
	})

	scoreCourseChart = new Chart(ctx, {
		type:"bar",

		data:{
			labels,

			datasets:[
				{
					label:"得点数",
					data:values,

					backgroundColor:[
						"#81c784", // クロス（緑）
						"#64b5f6", // 逆クロス（青）
						"#ffd54f", // ストレート（黄）
						"#f48fb1", // センター（ピンク）
						"#9575cd"  // ショート（紫）
					],

					borderColor:[
						"#4caf50",
						"#2196f3",
						"#ffc107",
						"#ec407a",
						"#7e57c2"
					],

					borderWidth:1
				}
			]
		},

		options:{
			indexAxis:"y",
			responsive:true,
			// maintainAspectRatio:false,

			scales:{
				x:{
					beginAtZero:true,
					suggestedMax:Math.max(...values) + 2,
					ticks:{
						stepSize:1
					}
				}
			},

			plugins:{
				legend:{
					display:false
				},

				datalabels:{
					anchor:"end",
					align:"right",
					color:"#333",
					font:{
						weight:"bold"
					},
					formatter:value=>`${value}本`
				}
			}
		},

		plugins:[
			ChartDataLabels
		]
	})
}

function drawMissResultChart(summary){

	const ctx =	document.getElementById("missResultChart")
	if(!ctx) return

	// 既存グラフ削除
	if(missResultChart){
		missResultChart.destroy()
	}

	const data = summary.missResults || {}
	// データなしの場合
	if(Object.keys(data).length === 0){
		ctx.parentElement.innerHTML =
			"<div>ミス結果データがありません。</div>"
		return
	}

	missResultChart = new Chart(ctx, {
		type:"pie",
		data:{
			labels:Object.keys(data).map(key =>
				getMissResultLabel(key)
			),

			datasets:[
				{
					data:Object.values(data)
				}
			]
		},

		plugins:[
			ChartDataLabels
		],

		options:{
			responsive:true,
			maintainAspectRatio:true,

			plugins:{
				legend:{
					position:"bottom"
				},

				datalabels:{
					formatter:(value, context)=>{
						const values =
							context.chart
								.data
								.datasets[0]
								.data

						const total =
							values.reduce(
								(sum, value)=>sum + value,
								0
							)

						const percentage =
							Math.round(
								value / total * 100
							)

						return `${percentage}%\n(${value}本)`
					},

					color:"#fff",

					font:{
						weight:"bold",
						size:14
					}
				}
			}
		}
	})
}

function drawMissCategoryChart(summary){

	const ctx =	document.getElementById("missCategoryChart")
	if(!ctx) return

	// 既存グラフ削除
	if(missTypeChart){
		missTypeChart.destroy()
	}

	const data = summary.missTypes || {}
	// データなしの場合
	if(Object.keys(data).length === 0){
		ctx.parentElement.innerHTML =
			"<div>ミス分類データがありません。</div>"
		return
	}

	missTypeChart = new Chart(ctx, {
		type:"pie",

		data:{
			labels:Object.keys(data).map(key =>
				getMissTypeLabel(key)
			),

			datasets:[
				{
					data:Object.values(data)
				}
			]
		},

		plugins:[
			ChartDataLabels
		],

		options:{
			responsive:true,
			maintainAspectRatio:true,

			plugins:{
				legend:{
					position:"bottom"
				},

				datalabels:{
					formatter:(value, context)=>{

						const values =
							context.chart
								.data
								.datasets[0]
								.data

						const total =
							values.reduce(
								(sum, value)=>sum + value,
								0
							)

						const percentage =
							Math.round(
								value / total * 100
							)
						return `${percentage}%\n(${value}本)`
					},

					color:"#fff",

					font:{
						weight:"bold",
						size:14
					}
				}
			}
		}
	})
}