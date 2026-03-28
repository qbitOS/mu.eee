(function () {
  var b = document.getElementById('da-lb-log');
  if (!b || !window.DATerminalLB) return;
  b.addEventListener('click', function () {
    var ch = (document.getElementById('da-ref-center') || {}).textContent || '?';
    var tab = window.DigitalAlphabet && DigitalAlphabet.getGlyphTab ? DigitalAlphabet.getGlyphTab() : '';
    DATerminalLB.append({ glyph: String(ch).trim().slice(0, 12), tab: tab, note: 'digital_alphabet' });
    var o = b.textContent;
    b.textContent = '✓ LB';
    setTimeout(function () {
      b.textContent = o;
    }, 700);
  });
})();
