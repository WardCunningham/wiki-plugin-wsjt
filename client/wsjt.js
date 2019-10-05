
(function() {
  var bind, emit, expand;

  function expand (text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*(.+?)\*/g, '<i>$1</i>');
  }

  function annotate (text) {
    return text.replace(/\S+/g,'<span>$&</span>')
  }

  function parse (text) {
    let markup = {}
    var m
    for (let line of text.split(/\r?\n/)) {
      if (m=line.match(/FIND (.*)/)) {
        markup.find = m[1]
      } else if (m=line.match(/HOST (.*)/)) {
        markup.host = m[1]
      } else if (line.match(/MARKERS/)) {
        markup.markers = true
      } else if (line.match(/STATS/)) {
        markup.stats = true
      }
    }
    return markup
  }

  function madenhead (text) {

    function marker(grid,label) {
      // https://en.wikipedia.org/wiki/Maidenhead_Locator_System
      const a = i => grid.charCodeAt(i)-'A'.charCodeAt(0) || 0
      const n = i => grid.charCodeAt(i)-'0'.charCodeAt(0) || 0
      let lat = a(1)*10 + n(3)*1 + a(5)/24 + n(7)/240 - 90
      let lon = a(0)*20 + n(2)*2 + a(4)/12 + n(6)/120 - 180
      return {lat:1*lat.toFixed(5), lon:1*lon.toFixed(5), label}
    }

    let callgrid = /(\b[A-Z]+\d+[A-Z]+) ([A-R][A-Q]\d\d)/
    let hits = text.split("\n").filter(line=>line.match(callgrid))
    return hits.map(line => {
      let m = line.match(callgrid)
      return marker(m[2], m[1])
    })
  }

  function drill ($item, param, text) {
    const id = () => Math.random()*100000000000000000+''

    let json = {
      title: 'Find '+text,
      story: [
        {type: 'paragraph', text: `See [[Diagram]], [[Topo Map]]`, id:id()},
        {type: 'wsjt', text: `HOST ${param.host}\nFIND ${text}\nMARKERS`, id:id()},
      ]
    }
    let pageObject = wiki.newPage(json, null)
    let $page = $item.parents('.page')
    wiki.showResult(pageObject, {$page})
  }

  function tally (text) {
    let lines = text.split("\n")

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
    console.log('got stats',report)
    return Object.keys(report).map(k => `<tr><td style="text-align:right">${report[k]}<td>${k}`).join("\n")
  }

  function emit ($item, item) {
    let markup = parse(item.text)
    console.log('emit',markup)
    if (markup.markers) {
      $item.addClass('marker-source')
      $item.get(0).markerData = () => []
    }
    return $item.append(`
      <table></table>
      <pre style="background-color:#eee;padding:15px;">waiting</pre>
    `)
  }

  function bind ($item, item) {
    let markup=parse(item.text)

    $item.dblclick((e) => {
      console.log('double click', e.target.tagName)
      if (e.target.tagName == 'SPAN') {
        console.log('span', e.target, e.target.innerText)
        return drill($item, markup, e.target.innerText)
      }
      return wiki.textEditor($item, item);
    });

    let host = markup.host ? `//${markup.host}` : ''
    let query = markup.find ? `find?word=${markup.find}` : 'copy?last=500'
    fetch(`${host}/plugin/wsjt/${query}`)
      .then(res=>res.text())
      .then(text=>{
        $item.find('pre').html(annotate(text))
        if (markup.stats) {
          console.log('want stats')
          $item.find('table').html(tally(text))
        }
        $item.get(0).markerData = () => madenhead(text)
      })
  };

  if (typeof window !== "undefined" && window !== null) {
    window.plugins.wsjt = {emit, bind};
  }

  if (typeof module !== "undefined" && module !== null) {
    module.exports = {expand};
  }

}).call(this);
