// wsjt plugin, server-side component
// These handlers are launched with the wiki server.

const fs = require('fs')
const dgram = require('dgram')
const {Reader} = require('wsjt-reader')

var PORT = 33333;

var server = dgram.createSocket('udp4');

server.on('listening', function() {
  var address = server.address();
  console.log('UDP Server listening on ' + address.address + ':' + address.port);
})

server.bind(PORT);

function cors (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  next()
}

function buf2hex (buf) {
  let hex = ''
  for (let val of buf) {
    hex = hex + ' ' + val.toString(16)
  }
  return hex
}

// function decoder (buf) {
//   let b = buf, n = buf.length, i = 0
//   let one = () => {return buf[i++]}
//   let two = () => {return one()*256+one()}
//   let four = () => {return two()*256*256+two()}
//   let eight = () => {return [four(),four()]}
//   let str = () => {let s='', c=four(); for(let j=0;j<c;j++){s=s+String.fromCharCode(one())}; return s}
//   return {one,two,four,eight,str}
// }

function format (time) {
  let pad = n => Math.floor(n).toString().padStart(2,0)
  var at = time / 1000
  var at = at - at%15
  return pad(at/3600%24)+pad(at/60%60)+pad(at%60)
}

function tally (lines) {

  function uniq (pattern) {
    let found = {}
    for (line of lines) {
      let m = line.match(pattern)
      if (m) {found[m[1]]=true}
    }
    return Object.keys(found).length
  }

  decodes = lines.length
  radios = uniq(/^(\d+\.\d+\.\d+\.\d+) /)
  stations = uniq(/([A-Z]+\d[A-Z]+)/)
  slots = uniq(/ (\d\d\d\d\d\d) /)
  heard = uniq(/ [A-Z]+\d[A-Z]+ ([A-Z]+\d[A-Z]+) /)
  cq = uniq(/ CQ.* ([A-Z]+\d[A-Z]+) /)
  squares = uniq(/ ([A-R][A-Q]\d\d)\b/)
  grids = uniq(/ ([A-R][A-Q])\d\d\b/)
  report = {decodes, slots, stations, heard, cq, squares, grids, radios}
  return report
}

function attention(lines) {
  let calls = {}
  let result = {}
  let regex = /\b([A-Z]+\d{1,2}[A-Z]+) ([A-Z]+\d{1,2}[A-Z]+)\b/

  for (line of lines) {
    let m = regex.exec(line)
    if (m) {
      let callers = calls[m[1]] = calls[m[1]] || {}
      callers[m[2]] = true
    }
  }
  for (call in calls) {
    let callers = calls[call]
    let count = Object.keys(callers).length
    if (count > 4) {
      result[call] = count
    }
  }
  return result
}


function startServer (params) {
  var app = params.app
  var argv = params.argv
  var assets = argv.assets

  function mkdir(dir) {
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }
  }

  mkdir(`${assets}`)
  mkdir(`${assets}/plugins`)
  mkdir(`${assets}/plugins/wsjt`)

  function sample (message,type) {
    let rand = ((Math.random()*100)+100+'').substring(1,2)
    let name = `${assets}/plugins/wsjt/type-${type}-${rand}.data`
    fs.writeFile(name,message,(err)=>{
      if(err)console.log('write sample', err.message)
    })
  }

  // |-------|=============|----------------|
  // 0       reading       writing          length-1
  //
  // |==============|-------------|=========|
  // 0              writing       reading   length-1

  var queue = new Array(12000)
  var reading = writing = 0

  const next = (i) => {return (i+1)%queue.length}
  const more = ( ) => {return reading != writing}
  const room = ( ) => {if(next(writing) == reading) reading = next(reading)}
  const push = (v) => {room(); queue[writing] = v; writing = next(writing);}
  const copy = ( ) => {return writing >= reading
      ? queue.slice(reading, writing)
      : queue.slice(reading, queue.length).concat(queue.slice(0,writing))}

  function handle_message (message, remote) {
    // console.log(remote.address + ':' + remote.port +' - ' + buf2hex(message));
    let r = new Reader(message)
    // let dec = decoder(message)
    // let magic = dec.four()
    // let version = dec.four()
    // let type = dec.four()
    // sample(message,type)
    switch (r.type()) {
      case 2:
        // let id = dec.str()
        // let isnew = dec.one()
        // let time = dec.four()
        // let snr = dec.four()
        // let dtime = dec.eight()
        // let freq = dec.four()
        // let mode = dec.str()
        // let copy = dec.str()
        // let conf = dec.one()
        let rept = `${remote.address} ${format(r.time())} ${r.freq()} ${r.copy()}`
        // console.log(rept)
        push(rept)
        console.log('push',reading,writing)
        break;
    }
  }

  function winnow () {
    let expired = ` ${format(Date.now() - 60*60*1000)} `
    console.log('winnow',expired,reading,writing)
    while(more() && queue[reading] && queue[reading].includes(expired)) {
      reading = next(reading)
    }
  }
  
  server.on('message', handle_message)
  setInterval(winnow,7500)

  app.get('/plugin/wsjt/copy', cors, (req, res) => {
    let last = req.query.last || 0
    res.set('Content-Type', 'text/plain')
    res.send(copy().slice(-last).join("\n")+"\n")
  })

  app.get('/plugin/wsjt/find', cors, (req, res) => {
    let found = copy().filter(line => line.includes(req.query.word))
    res.set('Content-Type', 'text/plain')
    res.send(found.join("\n")+"\n")
  })

  app.get('/plugin/wsjt/stats', cors, (req, res) => {
    res.json(tally(copy()))
  })

  app.get('/plugin/wsjt/attention', cors, (req, res) => {
    res.json(attention(copy()))
  })
}

module.exports = {startServer};

