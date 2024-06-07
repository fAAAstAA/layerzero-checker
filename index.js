import { layerzeroSybilChecker } from "./checker.js"
import { layerzeroGithubSybilChecker } from "./github-checker.js"
import { commonwealthSybilChecker } from "./commonweath-checker.js"
import { entryPoint } from "./utils/common.js"

async function startMenu(menu) {
    let startOver = true
    if (menu === undefined) {
        mode = await entryPoint()
    } else {
        startOver = false
    }

    switch (mode) {
        case "stargate-series":
            commonwealthSybilChecker('stargate-series.txt')
            break
        case "reports0606":
            commonwealthSybilChecker('reports0606.txt')
            break
        case "sybil-list":
            layerzeroSybilChecker()
            break
        case "commonwealth":
            commonwealthSybilChecker()
            break
        case "sybil-github":
            layerzeroGithubSybilChecker()
            break
    }
}

const args = process.argv.slice(2)
let mode = args[0]

await startMenu(mode)
