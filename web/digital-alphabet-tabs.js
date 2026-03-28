/* beyondBINARY quantum-prefixed | uvspeed | glyph tabs: qp.lang · written alphabets · keyboard hints */
/* digital_alphabet.html + kbatch glyphs CLI
 *  f: L=latin A–Z+a–z  D=digits  G=greek  S=ASCII symbols only
 *  x: extra punctuation for that code style
 *  letters: native script (merged into global glyph order; peg art = PLACEHOLDER until mapped)
 *  qpLangs: quantum-prefixes.js LANG keys for gutter / classifier alignment
 *  kbd: common physical layouts (kbatch / HexTerm lanes) — advisory
 */
(function (g) {
  'use strict';
  g.DA_ALPHABET_TAB_MANIFEST = {
    version: '1.1.0',
    tabs: [
      { id: 'all', label: 'All' },
      { id: 'latin', label: 'Latin', f: 'L', qpLangs: [], kbd: ['QWERTY', 'AZERTY', 'QWERTZ'] },
      { id: 'digits', label: '0–9', f: 'D' },
      { id: 'sym', label: 'ASCII symbols', f: 'S' },
      { id: 'greek', label: 'Greek', f: 'G', qpLangs: [] },
      {
        id: 'cyrillic',
        label: 'Cyrillic',
        f: 'D',
        letters: 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
        qpLangs: [],
        kbd: ['ЙЦУКЕН', 'JCUKEN']
      },
      {
        id: 'arabic',
        label: 'Arabic',
        letters: 'ءابتثجحخدذرزسشصضطظعغفقكلمنهوي',
        qpLangs: [],
        kbd: ['Arabic']
      },
      { id: 'hebrew', label: 'Hebrew', letters: 'אבגדהוזחטיכלמנסעפצקרשת', qpLangs: [], kbd: ['Hebrew'] },
      {
        id: 'devanagari',
        label: 'Devanagari',
        letters: 'अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसहािीुूृेैोौंः्',
        qpLangs: [],
        kbd: ['InScript']
      },
      {
        id: 'hiragana',
        label: 'Hiragana',
        letters: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんぁぃぅぇぉっゃゅょゎゑゐ',
        qpLangs: [],
        kbd: ['JP']
      },
      {
        id: 'hangul',
        label: 'Hangul jamo',
        letters: 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ',
        qpLangs: [],
        kbd: ['KR']
      },
      { id: 'python', label: 'Python', f: 'LD', x: '#_:"\'\\%`=', qpLangs: ['python'], kbd: ['QWERTY', 'Colemak'] },
      { id: 'js', label: 'JS / TS', f: 'LD', x: '{}[]();=>&|!?.:`+\'"\\/-*#', qpLangs: ['javascript', 'typescript'], kbd: ['QWERTY'] },
      { id: 'rust', label: 'Rust', f: 'LD', x: '{}[]<>!?:&@#$^\'_|.', qpLangs: ['rust'], kbd: ['QWERTY'] },
      { id: 'go', label: 'Go', f: 'LD', x: '{}[]&*!:=<>,._`', qpLangs: ['go'], kbd: ['QWERTY'] },
      { id: 'shell', label: 'Shell · Bash · Nu', f: 'LD', x: '$`|;&!#*?[]{}<>~^\'"\\,.-/', qpLangs: ['shell', 'nushell'], kbd: ['QWERTY'] },
      { id: 'c', label: 'C · C++ · Java', f: 'LD', x: '{}[]<>#;*&.!|-+/:%?^~\'', qpLangs: ['c', 'cpp', 'java'], kbd: ['QWERTY'] },
      { id: 'web', label: 'HTML · CSS · MD', f: 'LD', x: '<>/="-#*.[]():!|`$', qpLangs: ['html', 'css', 'markdown', 'mdc'], kbd: ['QWERTY'] },
      { id: 'data', label: 'SQL · YAML · JSON', f: 'LD', x: '|,-\"\'{}[]:#!@?*_=.', qpLangs: ['sql', 'yaml', 'json'], kbd: ['QWERTY'] },
      { id: 'haskell', label: 'Haskell', f: 'LD', x: '\\|><-=!:$._', qpLangs: ['haskell'], kbd: ['QWERTY'] },
      { id: 'ruby', label: 'Ruby · PHP', f: 'LD', x: '$@#%&*!?[]{}<>:;,.\\|_=~`', qpLangs: ['ruby', 'php'], kbd: ['QWERTY'] },
      { id: 'wasm', label: 'Wasm · Zig', f: 'LD', x: '()[]{},.;:!$@%^&*-=+<>~`', qpLangs: ['wasm', 'zig'], kbd: ['QWERTY'] },
      { id: 'quantum', label: 'QASM · Q# · WGSL', f: 'LDG', x: ';[]{}"()@!|&^*+=<>./\\_', qpLangs: ['qasm', 'qsharp', 'wgsl'], kbd: ['QWERTY'] },
      { id: 'swift', label: 'Swift · Kotlin', f: 'LD', x: '{}[]<>:!?@#$_&*.-+=^~`', qpLangs: ['swift', 'kotlin'], kbd: ['QWERTY'] },
      {
        id: 'more',
        label: 'More langs',
        f: 'LD',
        x: '[]{}<>!?:;.,/\\|@#$%^&*-=+\'`~_',
        letters:
          'ñßäöüÄÖÜąćęłńśźżĄĆĘŁŃŚŹŻøæÆœŒçÇðÐþÞıİşŞğĞ',
        qpLangs: ['lua', 'scala', 'clojure', 'nim', 'elixir', 'erlang', 'crystal', 'dart', 'julia'],
        kbd: ['QWERTY', 'AZERTY']
      }
    ]
  };
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);
