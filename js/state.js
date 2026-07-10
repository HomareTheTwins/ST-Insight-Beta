/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

/* 状態管理 */
let state={

	players:{},				// 選手情報 { A1: "選手名", A2: "選手名", B1: "選手名", B2: "選手名" }
	isSingles:false,		// シングルスかどうか
	singleA:"",				// シングルスの選手A（A1 or A2）
	singleB:"",				// シングルスの選手B（B1 or B2）

	settings:{},

	// ゲームスコア(ポイント、ゲームカウント、現在のゲーム)
	score:{
		pointA:0,			// Aのポイント
		pointB:0,			// Bのポイント
		gameA:0,			// Aのゲームカウント
		gameB:0,			// Bのゲームカウント
		currentGame:1		// 現在のゲーム
	},
	
	gameResults: [],		// 各ゲームのスコアと勝者 [{ aPoints: 4, bPoints: 2, winner: "A" }, { aPoints: 3, bPoints: 5, winner: "B" }...]

	selectedPlayerId:"A1",	// 選択中の選手ID（例: A1/A2/B1/B2）
	
	service:"A",			// サービス権のあるペア（A or B）
	serverRotation: [],		// サービス順
	serveIndex: 0,			// サービス管理配列のインデックス
	is1stServe: true,		// true:1stサーブ / false:2ndサーブ
	currentServer:null,		// 現在のサーバー
	
	serveOrder: [],			// サービス管理配列 ★使ってなさそう
	serveTurnCount: 0,		// サービス交代ポイント(2ポイントごと) ★使ってなさそう

	isFinalGame: false,		// ファイナルゲームかどうか

	
	history:[],				// 試合履歴用
	historyStack:[],		// undo用（リロード後もundoできるように履歴を保存）★★★将来重くなる可能性あり★★★
	
	/* サービススタッツ */
	serveStats:{
	    A1:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 },
	    A2:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 },
	    B1:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 },
	    B2:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 }
	},
	
	/* レシーブスタッツ */
	receiveStats:{
	    A1:{ receiveTotal:0, receiveIn:0 },
	    A2:{ receiveTotal:0, receiveIn:0 },
	    B1:{ receiveTotal:0, receiveIn:0 },
	    B2:{ receiveTotal:0, receiveIn:0 }
	},
	
	pendingShot:null,		// ショット一時状態
	
	/* ショットスタッツ */
	//shotStats:{},
	
	/* 描画ロックフラグ */
	_renderLock: false,
	
	/* UI状態管理 */
	ui: {
		openPlayers: {},		// 選手ごとの開閉状態
		openPair: false,		// ペア分析の開閉状態
		showAllShots: false,	// 全ショット表示

		analysis:{
			tab: "summary",		// 分析タブ
			team: "A"			// 分析対象チーム
		},
	},
	
	/* ゲーム終了フラグ */
	gameFinished:false,	// false：ゲーム継続中/true：各ゲーム終了時（次のゲームスタート→★false）
	
	/* 試合終了フラグ */
	matchFinished:false,
	
	/* 入力モード */
	inputMode : localStorage.getItem("inputMode") || "detail",	/* detail：詳細モード / simple : 簡易モード */

	/* 風の状態 */
	wind: "無風",			// 追風、向風、右風、左風、無風	※風向きはundo/redoの対象外（画面上部に現在の風向き表示されているため
	pendingWindLog: false	// 風の変更ログが保留中かどうか（true:保留中 / false:保留なし）	
}

// ショット分析設定
const shotStatsConfig = {
	showTopN: 5,          // 上位何ショット表示するか
	enableColor: true,    // 成功率色分けON/OFF
	highlightBest: true,  // 最重要ショット強調

	color: {
		high:	"#4CAF50",	// 70%以上
		mid:	"#ff9800",	// 50〜69%
		low:	"#f44336"	// 50%未満
	}
}

/* =====================================================
   試合関連ステータス初期化処理
   ===================================================== */
function initMatchState(){
	state.score = {
		pointA:0,
		pointB:0,
		gameA:0,
		gameB:0,
		currentGame:1
	}

	state.gameResults = []
	state.selectedPlayerId = "A1"
	state.history = []
	state.historyStack = []

	state.serveStats = {
		A1:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 },
		A2:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 },
		B1:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 },
		B2:{ firstTotal:0, firstIn:0, secondTotal:0, secondIn:0 }
	}

	state.receiveStats = {
		A1:{ receiveTotal:0, receiveIn:0 },
		A2:{ receiveTotal:0, receiveIn:0 },
		B1:{ receiveTotal:0, receiveIn:0 },
		B2:{ receiveTotal:0, receiveIn:0 }
	}

	state.service = "A"
	state.serverRotation = []
	state.serveIndex = 0
	state.is1stServe = true
	state.currentServer = null

	state.isFinalGame = false
	state.gameFinished = false
	state.matchFinished = false

	selectedMissResult = null
}