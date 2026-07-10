/*
 ST-Insight
 Copyright © Takashi SAITO
 無断転載・再配布禁止
*/

const SETTINGS_KEY = "stInsightSettings"

let appSettings = {
	showAnalysis: true,
	useHand: true,
	useCourse: true,
	useMissResult: true,
	useMissType: true
}

function loadAppSettings(){

	const saved = localStorage.getItem(SETTINGS_KEY)

	if(!saved) return

	try{
		const parsed = JSON.parse(saved)

		appSettings = {
			...appSettings,
			...parsed
		}

	}catch(e){
		console.warn("設定の読み込みに失敗しました", e)
	}
}

function saveAppSettings(){

	localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings))
}