
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
    let result = {}
    var m
    for (let line of text.split(/\r?\n/)) {
      if (m=line.match(/FIND (.*)/)) {
        result.find = m[1]
      } else if (m=line.match(/HOST (.*)/)) {
        result.host = m[1]
      }
    }
    return result
  }

  function drill ($item, param, text) {
    const id = () => Math.random()*100000000000000000+''

    let json = {
      title: 'Find '+text,
      story: [{type: 'wsjt', text: `HOST ${param.host}\nFIND ${text}`, id:id()}]
    }
    let pageObject = wiki.newPage(json, null)
    let $page = $item.parents('.page')
    wiki.showResult(pageObject, {$page})
  }

  function emit ($item, item) {
    console.log('emit',parse(item.text))
    return $item.append(`
      <pre style="background-color:#eee;padding:15px;">waiting</pre>`)
  }

  function bind ($item, item) {
    let result=parse(item.text)

    $item.dblclick((e) => {
      console.log('double click', e.target.tagName)
      if (e.target.tagName == 'SPAN') {
        console.log('span', e.target, e.target.innerText)
        return drill($item, result, e.target.innerText)
      }
      return wiki.textEditor($item, item);
    });

    let host = result.host ? `//${result.host}` : ''
    let query = result.find ? `find?word=${result.find}` : 'copy'
    fetch(`${host}/plugin/wsjt/${query}`)
      .then(res=>res.text())
      .then(text=>$item.find('pre').html(annotate(text)))

  };

  if (typeof window !== "undefined" && window !== null) {
    window.plugins.wsjt = {emit, bind};
  }

  if (typeof module !== "undefined" && module !== null) {
    module.exports = {expand};
  }

}).call(this);
