// wsjt plugin, server-side component
// These handlers are launched with the wiki server.

var dgram = require('dgram');

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

function decoder (buf) {
  let b = buf, n = buf.length, i = 0
  let one = () => {return buf[i++]}
  let two = () => {return one()*256+one()}
  let four = () => {return two()*256*256+two()}
  let eight = () => {return [four(),four()]}
  let str = () => {let s='', c=four(); for(let j=0;j<c;j++){s=s+String.fromCharCode(one())}; return s}
  return {one,two,four,eight,str}
}

function format (time) {
  let pad = n => Math.floor(n).toString().padStart(2,0)
  let day = 24*60*60*1000
  let now = Date.now()
  var at = (now - now + time) / 1000
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
  cq = uniq(/ CQ .* ([A-Z]+\d[A-Z]+) /)
  squares = uniq(/ ([A-R][A-Q]\d\d)\b/)
  grids = uniq(/ ([A-R][A-Q])\d\d\b/)
  report = {decodes, slots, stations, heard, cq, squares, grids, radios}
  return report
}


function startServer (params) {
  var app = params.app
  var argv = params.argv

  var log = []

  function handle_message (message, remote) {
    // console.log(remote.address + ':' + remote.port +' - ' + buf2hex(message));
    let dec = decoder(message)
    let magic = dec.four()
    let version = dec.four()
    let type = dec.four()
    switch (type) {
      case 2:
        let id = dec.str()
        let isnew = dec.one()
        let time = dec.four()
        let snr = dec.four()
        let dtime = dec.eight()
        let freq = dec.four()
        let mode = dec.str()
        let copy = dec.str()
        let conf = dec.one()
        let rept = `${remote.address} ${format(time)} ${freq} ${copy}`
        // console.log(rept)
        while(log.length >= 1000) log.shift()
        log.push(rept)
        break;
    }
  }
  
  server.on('message', handle_message)

  app.get('/plugin/wsjt/copy', cors, (req, res) => {
    res.set('Content-Type', 'text/plain')
    res.send(log.join("\n")+"\n")
  })

  app.get('/plugin/wsjt/find', cors, (req, res) => {
    let found = log.filter(line => line.includes(req.query.word))
    res.set('Content-Type', 'text/plain')
    res.send(found.join("\n")+"\n")
  })

  app.get('/plugin/wsjt/stats', cors, (req, res) => {
    res.json(tally(log))
  })
}

module.exports = {startServer};

