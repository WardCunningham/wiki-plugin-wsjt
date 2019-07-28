
(function() {
  var bind, emit, expand;

  expand = text => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*(.+?)\*/g, '<i>$1</i>');
  };

  emit = ($item, item) => {
    return $item.append(`
      <pre style="background-color:#eee;padding:15px;">
        waiting
      </pre>`);
  };

  bind = function($item, item) {
    $item.dblclick(() => {
      return wiki.textEditor($item, item);
    });

    fetch('/plugin/wsjt/copy')
      .then(res=>res.text())
      .then(text=>$item.find('pre').text(text))
  };

  if (typeof window !== "undefined" && window !== null) {
    window.plugins.wsjt = {emit, bind};
  }

  if (typeof module !== "undefined" && module !== null) {
    module.exports = {expand};
  }

}).call(this);
