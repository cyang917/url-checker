const Crawler = require('simplecrawler')
const chalk = require('chalk')
const fs = require('fs-extra')
const he = require('he')
// const cachedLink = new Map()
const argv = require('yargs-parser')(process.argv.slice(2))
const { URL } = require('url')
const Mustache = require('mustache')

const cachedLink = new Map()
const result = {
  results: [],
  total: 0,
  pass: 0,
  fail: 0
}
// const videos = []
function parseUrl (url) {
  let baseUrl
  try {
    baseUrl = new URL(url)
  } catch (e) {
    console.error('invalid URL')
  }
  return baseUrl.href
}

function init () {
  if (argv.u) {
    const url = parseUrl(argv.u)
    if (!url) process.exit()
    const crawler = config(url)
    crawler.start()
  } else {
    const crawler = config('https://www.hbo.com/documentaries/taxi-to-the-dark-side/resources')
    crawler.start()
    console.error('no URL provided')
  }
}

function output () {
  fs.outputJsonSync('reports/url_check.json', result)
  const mailTpl = fs.readFileSync('./templates/link.mustache.html', 'utf8')
  const rendered = Mustache.render(mailTpl, result)
  fs.outputFileSync('./reports/report.html', rendered)
}

function calculateResult (url, code, referrer = '') {
  result.total += 1
  if (code >= 400) {
    result.fail += 1
    result.results.push({
      'status': 'Fail',
      'code': code,
      'url': url,
      'from': referrer
    })
    console.log(chalk.red('[' + code + ']') + url + chalk.blueBright( ' from ') + referrer)
  } else {
    result.pass += 1
    // result.results.push({
    //   'status': 'Pass',
    //   'code': code,
    //   'url': url
    // })
    console.log(chalk.green('[' + code + ']') + url + chalk.blueBright( ' from ') + referrer)
  }
}

function config (url) {
  const ignore = /\.(?:png|jpg|pdf|svg|gif|ico|js|css)$/i
  const crawler = new Crawler(url)
  crawler.on('fetchheaders', (queueItem, response) => {
    calculateResult(queueItem.url, response.statusCode, queueItem.referrer)
    cachedLink.set(queueItem.url, response.statusCode)
  })
  .on('complete', queueItem => {
    output()
    console.log('==========complete==========')
  })
  crawler.addFetchCondition((queueItem, referrerQueueItem, callback) => {
    if (cachedLink.has(queueItem.url)) {
      const code = cachedLink.get(queueItem.url)
      calculateResult(queueItem.url, code, queueItem.referrer)
      callback(null, false)
    } else {
      callback(null, referrerQueueItem.host === crawler.host || referrerQueueItem.stateData.code > 299)
    }
  })
  crawler.addDownloadCondition((queueItem, referrerQueueItem, callback) => {
    callback(null,
      queueItem.host === crawler.host && !queueItem.stateData.contentType.match(ignore))
  })

  crawler.respectRobotsTxt = false
  crawler.maxDepth = argv.l || 2
  crawler.filterByDomain = false
  crawler.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:52.0) Gecko/20100101 Firefox/52.0'
  crawler.discoverRegex = [
    // discover resources in href & src attr
    string => {
      const pattern = /\s(?:href|src)\s?=\s?(["'])(.*?)\1/ig
      const links = []
      let match
      while ((match = pattern.exec(string)) !== null) {
        links.push(he.decode(match[2]))
      }
      return links.length ? links : null
    },
    // discover resources in url()
    string => {
      const pattern = /\s?url\((["'])(.*?)\1\)/ig
      const links = []
      let match
      while ((match = pattern.exec(string)) !== null) {
        links.push(he.decode(match[2]))
      }
      return links.length ? links : null
    },
    // discover resources in srcset
    string => {
      const pattern = /srcset\s?=\s?(["'])(.*?)\1/ig
      const links = []
      let match
      while ((match = pattern.exec(string)) !== null) {
        links.push(...match[2].split(',')
          .map(string => (he.decode(string.trim().split(/\s+/)[0]))))
      }
      return links.length ? links : null
    }
  ]
  return crawler
}

process.on('SIGINT', function () {
  output()
  process.exit()
})

init()
