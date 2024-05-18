import {
    getKeyByValue,
    readWallets
} from './utils/common.js'
import axios from "axios"
import { Table } from 'console-table-printer'
import { createObjectCsvWriter } from 'csv-writer'
import cliProgress from 'cli-progress'
import { HttpsProxyAgent } from "https-proxy-agent"
import { SocksProxyAgent } from "socks-proxy-agent"
import Papa from "papaparse"
import fs from "fs"

let columns = [
    { name: 'n', color: 'green', alignment: "right" },
    { name: 'wallet', color: 'green', alignment: "right" },
    { name: 'sybil', color: 'green', alignment: "right" },
]

let headers = [
    { id: 'n', title: '№' },
    { id: 'wallet', title: 'wallet' },
    { id: 'sybil', title: 'sybil' },
]

let debug = false
let p
let csvWriter
let wallets = readWallets('./addresses.txt')
let proxies = readWallets('./proxies.txt')
let iterations = wallets.length
let iteration = 1
let stats = []
let data = []
let csvData = []
const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic)

const csvFile = fs.readFileSync('./data/data.csv', 'utf8')

Papa.parse(csvFile, {
    header: true,
    complete: function(results) {
        results.data.forEach(row => {
            if (row.ADDRESS) {
                data[row.ADDRESS.toLowerCase()] = true
            }
        })
    }
})

async function checkSybil(wallet, proxy = null) {
    let config = {
        timeout: 5000
    }

    if (proxy) {
        if (proxy.includes('http')) {
            config.httpsAgent = new HttpsProxyAgent(proxy)
        }

        if (proxy.includes('socks')) {
            config.httpsAgent = new SocksProxyAgent(proxy)
        }
    }

    let isFetched = false
    let retries = 0

    stats[wallet].sybil = false

    stats[wallet] = {
        sybil: data[wallet.toLowerCase()] ? true : false
    }

    // while (!isFetched) {
    //     await axios.get(`${wallet}`, config).then(async response => {
    //         stats[wallet].sybil = response.data.amount ? parseFloat(response.data.amount, 0) : 0
    //         isFetched = true
    //     }).catch(e => {
    //         if (debug) console.log('balances', e.toString())

    //         retries++

    //         if (retries >= 3) {
    //             isFetched = true
    //         }
    //     })
    // }
}

async function fetchWallet(wallet, index) {

    let proxy = null
    if (proxies.length) {
        if (proxies[index]) {
            proxy = proxies[index]
        } else {
            proxy = proxies[0]
        }
    }

    stats[wallet] = {
        sybil: false
    }

    await checkSybil(wallet, proxy)

    progressBar.update(iteration)

    let row = {
        n: parseInt(index) + 1,
        wallet: wallet,
        sybil: stats[wallet].sybil,
    }

    p.addRow(row, { color: "cyan" })

    iteration++
}

async function fetchWallets() {
    iterations = wallets.length
    iteration = 1
    csvData = []

    let batchSize = 1
    let timeout = 1000

    if (proxies.length) {
        batchSize = 100
        timeout = 1000
    }

    const batchCount = Math.ceil(wallets.length / batchSize)
    const walletPromises = []

    p = new Table({
        columns: columns,
        sort: (row1, row2) => +row1.n - +row2.n
    })

    csvWriter = createObjectCsvWriter({
        path: './result.csv',
        header: headers
    })

    for (let i = 0; i < batchCount; i++) {
        const startIndex = i * batchSize
        const endIndex = (i + 1) * batchSize
        const batch = wallets.slice(startIndex, endIndex)

        const promise = new Promise((resolve) => {
            setTimeout(() => {
                resolve(fetchBatch(batch))
            }, i * timeout)
        })

        walletPromises.push(promise)
    }

    await Promise.all(walletPromises)
    return true
}

async function fetchBatch(batch) {
    await Promise.all(batch.map((account, index) => fetchWallet(account, getKeyByValue(wallets, account))))
}

async function saveToCsv() {
    p.table.rows.map((row) => {
        csvData.push(row.text)
    })
    csvData.sort((a, b) => a.n - b.n)
    csvWriter.writeRecords(csvData).then().catch()
}

async function addTotalRow() {
    p.addRow({})
    const sybilCount = Object.entries(stats).filter(([key, value]) => value.sybil === true).length
    const walletsCount = wallets.length

    let row = {
        wallet: 'Total sybil count',
        sybil: `${sybilCount} / ${walletsCount} (${((sybilCount / walletsCount) * 100).toFixed(0)}%)`
    }

    p.addRow(row, { color: "cyan" })
}

export async function layerzeroSybilChecker() {
    progressBar.start(iterations, 0)
    await fetchWallets()
    await addTotalRow()
    await saveToCsv()
    progressBar.stop()
    p.printTable()
}