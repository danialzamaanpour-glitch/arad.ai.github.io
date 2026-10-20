/* ============================================================
   Arad AI — markdown.js
   رندر مارک‌داون + هایلایت کد، بدون هیچ وابستگی بیرونی.

   پشتیبانی: عنوان‌ها، پررنگ، ایتالیک، خط‌خورده، کد درون‌خطی،
   بلوک کد با زبان، پیوند، تصویر، فهرست تودرتو، نقل‌قول، جدول،
   خط جداکننده، پیوند خودکار.

   امنیت: ابتدا همهٔ متن HTML-escape می‌شود، سپس قواعد مارک‌داون
   اعمال می‌گردد؛ بنابراین HTML تزریقی اجرا نمی‌شود.
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- ۱) ابزارهای پایه ---------- */

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeUrl(url) {
    var value = String(url == null ? '' : url).trim();
    if (/^j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/i.test(value)) return '#';
    if (/^\s*data:text\/html/i.test(value)) return '#';
    if (/^\s*vbscript:/i.test(value)) return '#';
    return escapeHtml(value);
  }

  /* ---------- ۲) موتور هایلایت ---------- */

  var RX = {
    dq: '"(?:\\\\.|[^"\\\\\\n])*"',
    sq: "'(?:\\\\.|[^'\\\\\\n])*'",
    bt: '`(?:\\\\.|[^`\\\\])*`',
    num: '\\b(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b',
    cComment: '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/',
    hashComment: '#[^\\n]*',
    ctrl: '\\b(?:if|else|elif|then|fi|for|while|do|done|case|esac|in|return|function|end)\\b'
  };

  var KW = {
    js: ('as async await break case catch class const continue debugger default delete do ' +
         'else enum export extends false finally for from function get if implements import in ' +
         'instanceof interface let new null of private protected public readonly return set ' +
         'static super switch this throw true try type typeof undefined var void while with yield ' +
         'any boolean number object string symbol never unknown abstract declare keyof infer satisfies'
        ).split(' '),
    java: ('abstract assert boolean break byte case catch char class const continue default do double ' +
           'else enum extends final finally float for goto if implements import instanceof int interface ' +
           'long native new package private protected public return short static strictfp super switch ' +
           'synchronized this throw throws transient try void volatile while var record sealed yield true false null'
          ).split(' '),
    c: ('auto break case char const continue default do double else enum extern float for goto if inline int ' +
        'long register restrict return short signed sizeof static struct switch typedef union unsigned void ' +
        'volatile while class namespace template typename public private protected virtual override new delete ' +
        'this nullptr true false try catch throw using constexpr auto bool'
       ).split(' '),
    csharp: ('abstract as base bool break byte case catch char checked class const continue decimal default ' +
             'delegate do double else enum event explicit extern false finally fixed float for foreach goto if ' +
             'implicit in int interface internal is lock long namespace new null object operator out override ' +
             'params private protected public readonly ref return sbyte sealed short sizeof stackalloc static ' +
             'string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void while async await'
            ).split(' '),
    go: ('break case chan const continue default defer else fallthrough for func go goto if import interface map ' +
         'package range return select struct switch type var nil true false make new len cap append'
        ).split(' '),
    rust: ('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match ' +
           'mod move mut pub ref return self Self static struct super trait true type unsafe use where while Box Vec Option Some None Result Ok Err'
          ).split(' '),
    php: ('abstract and array as break callable case catch class clone const continue declare default do echo else ' +
          'elseif empty enddeclare endfor endforeach endif endswitch endwhile eval exit extends final finally fn for ' +
          'foreach function global goto if implements include include_once instanceof insteadof interface isset ' +
          'list match namespace new or print private protected public readonly require require_once return static ' +
          'switch throw trait try unset use var while xor yield true false null $this'
         ).split(' '),
    python: ('and as assert async await break class continue def del elif else except False finally for from global ' +
             'if import in is lambda None nonlocal not or pass raise return True try while with yield match case self'
            ).split(' '),
    bash: ('if then else elif fi for while until do done case esac function return in export local readonly declare ' +
           'unset shift set source alias echo exit break continue eval trap'
          ).split(' '),
    sql: ('select from where insert into values update set delete create alter drop table index view join left right ' +
          'inner outer full on group by order having limit offset as and or not null is in like between distinct ' +
          'count sum avg min max case when then else end primary key foreign references unique default union all ' +
          'exists with returning cascade truncate begin commit rollback'
         ).split(' '),
    yaml: ('true false null yes no on off').split(' ')
  };

  var KNOWN = {
    js: ['js', 'javascript', 'mjs', 'cjs', 'jsx', 'ts', 'typescript', 'tsx', 'node', 'json5'],
    json: ['json', 'jsonc', 'ndjson', 'geojson'],
    markup: ['html', 'htm', 'xml', 'svg', 'vue', 'svelte', 'xhtml', 'rss'],
    style: ['css', 'scss', 'sass', 'less', 'stylus'],
    python: ['py', 'python', 'python3', 'pyw'],
    bash: ['sh', 'bash', 'shell', 'zsh', 'fish', 'console', 'terminal', 'ps1', 'powershell'],
    sql: ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite', 'plsql'],
    java: ['java', 'kotlin', 'kt', 'scala', 'groovy', 'swift', 'dart'],
    c: ['c', 'h', 'cpp', 'c++', 'cc', 'hpp', 'objc', 'objectivec'],
    csharp: ['cs', 'csharp', 'dotnet'],
    go: ['go', 'golang'],
    rust: ['rust', 'rs'],
    php: ['php', 'phtml'],
    yaml: ['yaml', 'yml'],
    ini: ['ini', 'toml', 'conf', 'cfg', 'env', 'properties'],
    docker: ['dockerfile', 'docker', 'makefile', 'make'],
    diff: ['diff', 'patch'],
    plain: ['text', 'txt', 'plain', 'plaintext', 'log', 'output', 'none']
  };

  var ALIAS = (function () {
    var map = {};
    Object.keys(KNOWN).forEach(function (group) {
      KNOWN[group].forEach(function (name) { map[name] = group; });
    });
    return map;
  })();

  var RULES = {
    js: [
      ['comment', RX.cComment],
      ['string', RX.dq + '|' + RX.sq + '|' + RX.bt],
      ['keyword', '\\b(?:' + KW.js.join('|') + ')\\b'],
      ['number', RX.num],
      ['func', '\\b[A-Za-z_$][\\w$]*(?=\\s*\\()']
    ],
    json: [
      ['key', '"(?:\\\\.|[^"\\\\\\n])*"(?=\\s*:)'],
      ['string', RX.dq],
      ['bool', '\\b(?:true|false|null)\\b'],
      ['number', '-?' + RX.num]
    ],
    markup: [
      ['comment', '<!--[\\s\\S]*?-->'],
      ['doctype', '<!(?:DOCTYPE|doctype)[^>]*>'],
      ['string', RX.dq + '|' + RX.sq],
      ['tag', '<\\/?[A-Za-z][\\w:.-]*|\\/?>'],
      ['attr', '\\b[A-Za-z_:@#][\\w:.-]*(?=\\s*=)']
    ],
    style: [
      ['comment', '\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*'],
      ['atrule', '@[\\w-]+'],
      ['string', RX.dq + '|' + RX.sq],
      ['property', '(?:^|[;{\\s])[-a-zA-Z]+(?=\\s*:)'],
      ['hex', '#[0-9a-fA-F]{3,8}\\b'],
      ['number', '-?\\b\\d+(?:\\.\\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in|s|ms|deg|rad|turn|fr|dpi)?\\b'],
      ['func', '\\b[a-zA-Z-]+(?=\\()'],
      ['selector', '[.#][\\w-]+']
    ],
    python: [
      ['comment', RX.hashComment],
      ['string', '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|' + RX.dq + '|' + RX.sq],
      ['decorator', '@[\\w.]+'],
      ['keyword', '\\b(?:' + KW.python.join('|') + ')\\b'],
      ['builtin', '\\b(?:print|len|range|str|int|float|dict|list|set|tuple|bool|bytes|open|enumerate|zip|map|filter|sum|min|max|abs|round|type|isinstance|super|input|sorted|reversed|format|exception|Exception|ValueError|TypeError)\\b'],
      ['number', RX.num]
    ],
    bash: [
      ['comment', RX.hashComment],
      ['string', RX.dq + '|' + RX.sq],
      ['variable', '\\$\\{[^}\\n]*\\}|\\$[A-Za-z_][\\w]*|\\$[0-9@*#?!$]'],
      ['keyword', RX.ctrl],
      ['builtin', '\\b(?:echo|printf|cd|pwd|ls|cp|mv|rm|mkdir|rmdir|touch|cat|head|tail|grep|sed|awk|find|xargs|chmod|chown|chgrp|tar|zip|unzip|curl|wget|git|npm|npx|node|python|python3|pip|pip3|docker|kubectl|sudo|apt|apt-get|brew|yarn|pnpm|make|ssh|scp|rsync|export|source|test|read|set|unset|sleep|kill|ps|top|df|du|whoami|env|which|jq)\\b'],
      ['number', RX.num]
    ],
    sql: [
      ['comment', '--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'],
      ['string', "'(?:''|\\\\.|[^'\\\\\\n])*'|" + RX.dq + '|' + RX.bt],
      ['keyword', '\\b(?:' + KW.sql.join('|') + ')\\b'],
      ['number', RX.num]
    ],
    java: [
      ['comment', RX.cComment],
      ['string', RX.dq + '|' + RX.sq],
      ['annotation', '@[A-Za-z_][\\w.]*'],
      ['keyword', '\\b(?:' + KW.java.join('|') + ')\\b'],
      ['number', RX.num],
      ['func', '\\b[A-Za-z_$][\\w$]*(?=\\s*\\()']
    ],
    c: [
      ['comment', RX.cComment],
      ['preprocessor', '^[ \\t]*#[ \\t]*\\w+'],
      ['string', RX.dq + '|' + RX.sq],
      ['keyword', '\\b(?:' + KW.c.join('|') + ')\\b'],
      ['number', RX.num],
      ['func', '\\b[A-Za-z_][\\w]*(?=\\s*\\()']
    ],
    csharp: [
      ['comment', RX.cComment],
      ['string', RX.dq + '|' + RX.sq],
      ['keyword', '\\b(?:' + KW.csharp.join('|') + ')\\b'],
      ['number', RX.num],
      ['func', '\\b[A-Za-z_][\\w]*(?=\\s*\\()']
    ],
    go: [
      ['comment', RX.cComment],
      ['string', RX.dq + '|' + RX.bt + '|' + RX.sq],
      ['keyword', '\\b(?:' + KW.go.join('|') + ')\\b'],
      ['number', RX.num],
      ['func', '\\b[A-Za-z_][\\w]*(?=\\s*\\()']
    ],
    rust: [
      ['comment', RX.cComment],
      ['string', RX.dq + '|' + RX.sq + '|r#?"[^"]*"'],
      ['macro', '\\b[a-z_][\\w]*!'],
      ['keyword', '\\b(?:' + KW.rust.join('|') + ')\\b'],
      ['number', RX.num],
      ['func', '\\b[A-Za-z_][\\w]*(?=\\s*\\()']
    ],
    php: [
      ['comment', RX.cComment + '|' + RX.hashComment],
      ['string', RX.dq + '|' + RX.sq],
      ['variable', '\\$[A-Za-z_][\\w]*'],
      ['keyword', '\\b(?:' + KW.php.join('|') + ')\\b'],
      ['number', RX.num]
    ],
    yaml: [
      ['comment', RX.hashComment],
      ['string', RX.dq + '|' + RX.sq],
      ['key', '^[ \\t-]*[\\w.$-]+(?=\\s*:)'],
      ['keyword', '\\b(?:' + KW.yaml.join('|') + ')\\b'],
      ['number', RX.num]
    ],
    ini: [
      ['comment', '[;#][^\\n]*'],
      ['section', '^\\s*\\[[^\\]]+\\]'],
      ['key', '^[ \\t]*[\\w.$-]+(?=\\s*=)'],
      ['string', RX.dq + '|' + RX.sq],
      ['number', RX.num]
    ],
    docker: [
      ['comment', RX.hashComment],
      ['keyword', '^\\s*(?:FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|HEALTHCHECK|SHELL|STOPSIGNAL|AS)\\b'],
      ['string', RX.dq + '|' + RX.sq],
      ['variable', '\\$\\w+']
    ],
    diff: [
      ['diff-add', '^\\+.*$'],
      ['diff-del', '^-.*$'],
      ['diff-meta', '^@@.*$|^diff .*$|^index .*$']
    ],
    plain: null
  };

  function normalizeLang(raw) {
    var name = String(raw == null ? '' : raw).trim().toLowerCase().replace(/^\{\.?|\}$/g, '');
    if (!name) return 'plain';
    if (name.charAt(0) === '.') name = name.slice(1);
    return ALIAS[name] || 'plain';
  }

  function tokenize(code, rules) {
    if (!rules) return escapeHtml(code);
    var parts = [], types = [];
    for (var r = 0; r < rules.length; r++) {
      parts.push('(?<g' + r + '>' + rules[r][1] + ')');
      types.push(rules[r][0]);
    }
    var re;
    try { re = new RegExp(parts.join('|'), 'gm'); }
    catch (e) { return escapeHtml(code); }

    var out = '', last = 0, m, guard = 0;
    while ((m = re.exec(code)) !== null) {
      if (guard++ > 200000) break;
      var text = m[0];
      if (text === '') { re.lastIndex++; continue; }
      if (m.index > last) out += escapeHtml(code.slice(last, m.index));
      var typeIndex = 0;
      for (var i = 0; i < types.length; i++) {
        if (m.groups && m.groups['g' + i] !== undefined) { typeIndex = i; break; }
      }
      out += '<span class="tok-' + types[typeIndex] + '">' + escapeHtml(text) + '</span>';
      last = m.index + text.length;
    }
    out += escapeHtml(code.slice(last));
    return out;
  }

  /** هایلایت یک قطعه کد و بازگرداندن HTML */
  function highlight(code, lang) {
    var group = normalizeLang(lang);
    return tokenize(String(code == null ? '' : code), RULES[group] || null);
  }

  /** برچسب‌های ترجمه‌شده (اگر ماژول رابط بارگذاری شده باشد) */
  function label(key, fallback) {
    try {
      var ui = global.Arad && global.Arad.UI;
      if (ui && typeof ui.t === 'function') {
        var value = ui.t(key);
        if (value && value !== key) return value;
      }
    } catch (e) { /* بی‌اثر */ }
    return fallback;
  }

  /** ساخت HTML یک بلوک کد کامل (با سرصفحه، زبان و دکمه کپی) */
  function buildCodeBlock(lang, code) {
    var name = String(lang || '').trim();
    var group = normalizeLang(name);
    var body = highlight(code, name);
    var copyLabel = label('copy', 'کپی');
    var wrapLabel = label('wrap', 'شکست خط');

    return '' +
      '<div class="code-block">' +
        '<div class="code-block__head">' +
          '<span class="code-block__lang">' + escapeHtml(name || group || 'code') + '</span>' +
          '<span class="code-block__tools">' +
            '<button type="button" class="code-block__btn" data-code-wrap title="' + escapeHtml(wrapLabel) + '">' + escapeHtml(wrapLabel) + '</button>' +
            '<button type="button" class="code-block__btn" data-code-copy title="' + escapeHtml(copyLabel) + '">' + escapeHtml(copyLabel) + '</button>' +
          '</span>' +
        '</div>' +
        '<pre class="code-block__pre"><code class="language-' + escapeHtml(group) + '">' + body + '</code></pre>' +
      '</div>';
  }

  /* ---------- ۳) درون‌خطی ---------- */

  function inline(source) {
    if (source === null || source === undefined) return '';
    var text = escapeHtml(source);
    var stash = [];

    function keep(html) {
      stash.push(html);
      return '\u0001' + (stash.length - 1) + '\u0001';
    }

    // کد درون‌خطی
    text = text.replace(/`([^`\n]+)`/g, function (m, code) {
      return keep('<code class="md-code">' + code + '</code>');
    });

    // تصویر
    text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, alt, url, title) {
      return keep('<img class="md-img" src="' + safeUrl(url) + '" alt="' + alt + '"' +
        (title ? ' title="' + title + '"' : '') + ' loading="lazy">');
    });

    // پیوند
    text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, function (m, label, url, title) {
      return keep('<a href="' + safeUrl(url) + '" target="_blank" rel="noopener noreferrer"' +
        (title ? ' title="' + title + '"' : '') + '>' + label + '</a>');
    });

    // پررنگ وایتالیک
    text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    text = text.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    text = text.replace(/(^|[^_\w])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');

    // خط‌خورده
    text = text.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    // پیوند خودکار
    text = text.replace(/(^|[\s(])((?:https?:\/\/|www\.)[^\s<)]+)/g, function (m, prefix, url) {
      var href = /^www\./i.test(url) ? 'https://' + url : url;
      return prefix + keep('<a href="' + safeUrl(href) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>');
    });

    // بازگرداندن بخش‌های محفوظ
    text = text.replace(/\u0001(\d+)\u0001/g, function (m, idx) {
      return stash[Number(idx)];
    });

    // شکست خط درون پاراگراف
    text = text.replace(/\n/g, '<br>');

    return text;
  }

  /* ---------- ۴) جدول ---------- */

  function splitCells(row) {
    var text = String(row).trim();
    if (text.charAt(0) === '|') text = text.slice(1);
    if (text.charAt(text.length - 1) === '|') text = text.slice(0, -1);
    var cells = [], buffer = '', escaped = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (escaped) { buffer += ch; escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '|') { cells.push(buffer); buffer = ''; continue; }
      buffer += ch;
    }
    cells.push(buffer);
    return cells.map(function (c) { return c.trim(); });
  }

  function isTableStart(lines, index) {
    if (index + 1 >= lines.length) return false;
    if (lines[index].indexOf('|') === -1) return false;
    if (lines[index + 1].indexOf('-') === -1) return false;
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[index + 1]);
  }

  function buildTable(header, aligns, rows) {
    var out = '<div class="md-table-wrap"><table><thead><tr>';
    header.forEach(function (cell, i) {
      out += '<th' + alignAttr(aligns[i]) + '>' + inline(cell) + '</th>';
    });
    out += '</tr></thead><tbody>';
    rows.forEach(function (row) {
      out += '<tr>';
      for (var i = 0; i < header.length; i++) {
        out += '<td' + alignAttr(aligns[i]) + '>' + inline(row[i] === undefined ? '' : row[i]) + '</td>';
      }
      out += '</tr>';
    });
    return out + '</tbody></table></div>';
  }

  function alignAttr(value) {
    return value ? ' style="text-align:' + value + '"' : '';
  }

  /* ---------- ۵) فهرست تودرتو ---------- */

  function renderListTree(items) {
    if (!items.length) return '';
    var root = { children: [], indent: -1 };
    var stack = [root];

    items.forEach(function (item) {
      while (stack.length > 1 && item.indent <= stack[stack.length - 1].indent) stack.pop();
      var parent = stack[stack.length - 1];
      var node = { text: item.text, ordered: item.ordered, indent: item.indent, children: [] };
      parent.children.push(node);
      stack.push(node);
    });

    function walk(node) {
      if (!node.children.length) return '';
      var ordered = node.children[0].ordered;
      var tag = ordered ? 'ol' : 'ul';
      var html = '<' + tag + '>';
      node.children.forEach(function (child) {
        var nested = walk(child);
        html += '<li>' + inline(child.text) + (nested ? nested : '') + '</li>';
      });
      return html + '</' + tag + '>';
    }

    return walk(root);
  }

  /* ---------- ۶) پردازش بلوکی ---------- */

  var CODE_TOKEN = /^\u0002CODE(\d+)\u0002$/;

  function isBlockStart(lines, index) {
    var line = lines[index];
    if (!line || !line.trim()) return true;
    if (CODE_TOKEN.test(line.trim())) return true;
    if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
    if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) return true;
    if (/^\s*>/.test(line)) return true;
    if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) return true;
    return isTableStart(lines, index);
  }

  function render(source) {
    if (source === null || source === undefined) return '';
    var src = String(source).replace(/\r\n?/g, '\n');
    var stash = [];

    // ۱) بلوک‌های کد بسته‌شده
    src = src.replace(/```([^\n`]*)\n?([\s\S]*?)```/g, function (m, lang, body) {
      var index = stash.push(buildCodeBlock(String(lang || '').trim(), body.replace(/\n$/, ''))) - 1;
      return '\n\u0002CODE' + index + '\u0002\n';
    });

    // ۲) بلوک کد باز (در حال استریم)
    var openFence = src.indexOf('```');
    if (openFence !== -1) {
      var head = src.slice(0, openFence);
      var rest = src.slice(openFence + 3);
      var lineBreak = rest.indexOf('\n');
      var openLang = lineBreak === -1 ? rest : rest.slice(0, lineBreak);
      var openBody = lineBreak === -1 ? '' : rest.slice(lineBreak + 1);
      var openIndex = stash.push(buildCodeBlock(openLang.trim(), openBody.replace(/\n$/, ''))) - 1;
      src = head + '\n\u0002CODE' + openIndex + '\u0002\n';
    }

    var lines = src.split('\n');
    var html = '';
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // خط خالی
      if (!line.trim()) { i++; continue; }

      // بلوک کد
      var codeMatch = line.trim().match(CODE_TOKEN);
      if (codeMatch) {
        html += '\n' + stash[Number(codeMatch[1])];
        i++;
        continue;
      }

      // عنوان
      var heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
      if (heading) {
        var level = heading[1].length;
        html += '\n<h' + level + '>' + inline(heading[2].trim().replace(/\s+#+\s*$/, '')) + '</h' + level + '>';
        i++;
        continue;
      }

      // خط جداکننده
      if (/^\s*([-*_])\s*(\1\s*){2,}$/.test(line)) {
        html += '\n<hr>';
        i++;
        continue;
      }

      // جدول
      if (isTableStart(lines, i)) {
        var header = splitCells(lines[i]);
        var aligns = splitCells(lines[i + 1]).map(function (cell) {
          var left = cell.charAt(0) === ':';
          var right = cell.charAt(cell.length - 1) === ':';
          if (left && right) return 'center';
          if (right) return 'right';
          if (left) return 'left';
          return '';
        });
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') !== -1) {
          rows.push(splitCells(lines[i]));
          i++;
        }
        html += '\n' + buildTable(header, aligns, rows);
        continue;
      }

      // نقل‌قول
      if (/^\s*>/.test(line)) {
        var quote = [];
        while (i < lines.length && (/^\s*>/.test(lines[i]) || (lines[i].trim() && quote.length))) {
          if (!/^\s*>/.test(lines[i])) {
            if (!lines[i].trim()) break;
            quote.push(lines[i]);
          } else {
            quote.push(lines[i].replace(/^\s*>\s?/, ''));
          }
          i++;
        }
        html += '\n<blockquote>' + render(quote.join('\n')) + '</blockquote>';
        continue;
      }

      // فهرست
      if (/^\s*(?:[-*+]|\d+[.)])\s+/.test(line)) {
        var items = [];
        var listRe = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
        while (i < lines.length) {
          var itemMatch = lines[i].match(listRe);
          if (itemMatch) {
            items.push({
              indent: itemMatch[1].replace(/\t/g, '    ').length,
              text: itemMatch[3],
              ordered: /\d/.test(itemMatch[2])
            });
            i++;
          } else if (items.length && /^\s{2,}\S/.test(lines[i])) {
            items[items.length - 1].text += ' ' + lines[i].trim();
            i++;
          } else {
            break;
          }
        }
        html += '\n' + renderListTree(items);
        continue;
      }

      // پاراگراف
      var buffer = [];
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
        buffer.push(lines[i]);
        i++;
      }
      if (!buffer.length) { buffer.push(lines[i]); i++; }
      html += '\n<p>' + inline(buffer.join('\n')) + '</p>';
    }

    return html.replace(/^\n/, '');
  }

  global.Arad = global.Arad || {};
  global.Arad.Markdown = {
    render: render,
    inline: inline,
    highlight: highlight,
    codeBlock: buildCodeBlock,
    normalizeLang: normalizeLang,
    escapeHtml: escapeHtml,
    languages: KNOWN
  };
})(window);
