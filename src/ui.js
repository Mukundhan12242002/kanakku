/* Small DOM helpers shared by the three tools. Everything runs in the browser; nothing is sent anywhere. */
(function () {
  var K = window.Kanakku;
  K.$ = function (id) { return document.getElementById(id); };
  K.num = function (id) {
    var el = K.$(id);
    var v = parseFloat(String(el.value).replace(/,/g, ''));
    return isFinite(v) ? v : 0;
  };
  K.el = function (tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  K.row = function (list, label, value, cls, sub) {
    var r = K.el('div', 'row' + (cls ? ' ' + cls : ''));
    var l = K.el('span', 'lab', label);
    if (sub) l.appendChild(K.el('small', 'sub', sub));
    r.appendChild(l);
    r.appendChild(K.el('span', 'val', value));
    list.appendChild(r);
    return r;
  };
  K.group = function (list, label) {
    var r = K.el('div', 'row group', label);
    list.appendChild(r);
  };
  K.words = K.words || function () { return ''; };
  K.hint = function (id, value) {
    var h = K.$(id + '-hint');
    if (h) h.textContent = K.words(value);
  };
  K.on = function (ids, fn) {
    ids.forEach(function (id) {
      var e = K.$(id);
      e.addEventListener('input', fn);
      e.addEventListener('change', fn);
    });
  };
})();
