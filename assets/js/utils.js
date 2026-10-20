/* ============================================================
   Arad AI — utils.js
   ابزارهای عمومی: کار با DOM، ذخیره‌سازی محلی، پردازش تصویر،
   متن، زمان، کلیپ‌بورد، رنگ‌آمیزی و …
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- ۱) کار با DOM ---------- */

  function $(selector, root) { return (root || document).querySelector(selector); }

  function $$(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  /**
   * ساخت عنصر: el('div', { class: 'x', text: 'y' }, [child1, child2])
   * کلیدهای ویژه: class/className, text, html, style (شیء), dataset (شیء), on (شیء شنونده‌ها)
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'class' || key === 'className') node.className = value;
        else if (key === 'text') node.textContent = value;
        else if (key === 'html') node.innerHTML = value;
        else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
        else if (key === 'dataset' && typeof value === 'object') {
          Object.keys(value).forEach(function (dk) { node.dataset[dk] = value[dk]; });
        } else if (key === 'on' && typeof value === 'object') {
          Object.keys(value).forEach(function (evt) { node.addEventListener(evt, value[evt]); });
        } else if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'hidden') {
          node[key] = value;
        } else node.setAttribute(key, value);
      });
    }
    appendChildren(node, children);
    return node;
  }

  function appendChildren(node, children) {
    if (children === null || children === undefined) return;
    (Array.isArray(children) ? children : [children]).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.appendChild(typeof child === 'string' || typeof child === 'number'
        ? document.createTextNode(String(child))
        : child);
    });
  }

  function clear(node) {
    if (!node) return node;
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function on(target, event, handler, options) {
    if (!target) return function () {};
    target.addEventListener(event, handler, options);
    return function off() { target.removeEventListener(event, handler, options); };
  }

  /** واگذاری رویداد (event delegation) */
  function delegate(root, event, selector, handler) {
    return on(root, event, function (evt) {
      var node = evt.target instanceof Element ? evt.target.closest(selector) : null;
      if (node && root.contains(node)) handler(evt, node);
    });
  }

  /* ---------- ۲) متن ---------- */

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) { return escapeHtml(value); }

  /** کوتاه‌سازی متن با احترام به طول */
  function truncate(value, max) {
    var text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    return text.slice(0, Math.max(0, max - 1)).trim() + '…';
  }

  /** ساخت عنوان خودکار برای گفتگو از اولین پیام کاربر */
  function deriveTitle(text) {
    var clean = String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`~\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return 'گفتگوی جدید';
    return truncate(clean, 42);
  }

  function uid(prefix) {
    var rand = Math.random().toString(36).slice(2, 9);
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + rand;
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function throttle(fn, wait) {
    var last = 0, timer = null, lastArgs = null, lastSelf = null;
    return function () {
      lastArgs = arguments; lastSelf = this;
      var now = Date.now();
      var remaining = wait - (now - last);
      if (remaining <= 0) {
        last = now;
        fn.apply(lastSelf, lastArgs);
      } else if (!timer) {
        timer = setTimeout(function () {
          last = Date.now();
          timer = null;
          fn.apply(lastSelf, lastArgs);
        }, remaining);
      }
    };
  }

  /* ---------- ۳) زمان ---------- */

  function formatTime(ts) {
    var date = new Date(ts || Date.now());
    try {
      return date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return date.toTimeString().slice(0, 5);
    }
  }

  function relativeTime(ts, lang) {
    var diff = Date.now() - (ts || 0);
    var sec = Math.round(diff / 1000);
    var table = lang === 'en'
      ? [[60, 's'], [60, 'min'], [24, 'h'], [7, 'd'], [4.35, 'w'], [12, 'mo']]
      : [[60, 'ثانیه'], [60, 'دقیقه'], [24, 'ساعت'], [7, 'روز'], [4.35, 'هفته'], [12, 'ماه']];

    if (sec < 45) return lang === 'en' ? 'just now' : 'همین حالا';
    var value = sec;
    for (var i = 0; i < table.length; i++) {
      if (value < table[i][0]) {
        var rounded = Math.floor(value);
        return lang === 'en'
          ? rounded + table[i][1] + ' ago'
          : rounded + ' ' + table[i][1] + ' پیش';
      }
      value = value / table[i][0];
    }
    return new Date(ts).toLocaleDateString(lang === 'en' ? 'en-US' : 'fa-IR');
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  }

  /* ---------- ۴) ذخیره‌سازی محلی ---------- */

  var Store = {
    read: function (key, fallback) {
      try {
        var raw = global.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    write: function (key, value) {
      try {
        global.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },
    remove: function (key) {
      try { global.localStorage.removeItem(key); } catch (e) {}
    },
    available: (function () {
      try {
        var k = '__arad_test__';
        global.localStorage.setItem(k, '1');
        global.localStorage.removeItem(k);
        return true;
      } catch (e) {
        return false;
      }
    })()
  };

  /* ---------- ۵) پردازش تصویر ---------- */

  var Images = {
    /** خواندن فایل به‌صورت DataURL */
    readAsDataUrl: function (file) {
      return new Promise(function (resolve, reject) {
        var reader = new FileReader();
        reader.onload = function () { resolve(String(reader.result || '')); };
        reader.onerror = function () { reject(new Error('خواندن فایل تصویر ناموفق بود.')); };
        reader.readAsDataURL(file);
      });
    },

    loadImage: function (src) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () { resolve(img); };
        img.onerror = function () { reject(new Error('تصویر قابل بازکردن نیست.')); };
        img.src = src;
      });
    },

    /**
     * فشرده‌سازی و تغییر اندازه تصویر
     * @returns {Promise<{dataUrl:string,name:string,size:number,width:number,height:number}>}
     */
    process: function (file, options) {
      var opts = options || {};
      var maxSide = opts.maxSide || 1280;
      var quality = opts.quality || 0.82;
      var mime = 'image/jpeg';

      return Images.readAsDataUrl(file).then(function (original) {
        if (/^image\/(png|gif|webp)$/i.test(file.type) && file.size < 240 * 1024 && !opts.forceReencode) {
          // تصاویر کوچک را دست‌نخورده نگه می‌داریم تا شفافیت حفظ شود
          return Images.loadImage(original).then(function (img) {
            return {
              dataUrl: original,
              name: file.name,
              size: file.size,
              width: img.naturalWidth,
              height: img.naturalHeight
            };
          });
        }

        return Images.loadImage(original).then(function (img) {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          var scale = Math.min(1, maxSide / Math.max(w, h));
          var outW = Math.max(1, Math.round(w * scale));
          var outH = Math.max(1, Math.round(h * scale));

          var canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, outW, outH);
          ctx.drawImage(img, 0, 0, outW, outH);

          var dataUrl = canvas.toDataURL(mime, quality);
          return {
            dataUrl: dataUrl,
            name: file.name,
            size: Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75),
            width: outW,
            height: outH
          };
        });
      });
    },

    /** اعتبارسنجی فایل انتخاب‌شده */
    validate: function (file, maxBytes) {
      var limit = maxBytes || 8 * 1024 * 1024;
      if (!file) return 'فایلی انتخاب نشده است.';
      if (!/^image\//i.test(file.type || '')) return 'فقط فایل تصویری مجاز است.';
      if (file.size > limit) return 'حجم تصویر بیشتر از ' + formatBytes(limit) + ' است.';
      return null;
    },

    /** پاک‌کردن پیشوند data:image/... برای استفاده‌های خاص */
    stripPrefix: function (dataUrl) {
      var idx = String(dataUrl).indexOf(',');
      return idx === -1 ? dataUrl : String(dataUrl).slice(idx + 1);
    },

    /** برآورد حجم واقعی DataURL */
    sizeOfDataUrl: function (dataUrl) {
      var idx = String(dataUrl).indexOf(',');
      if (idx === -1) return 0;
      var b64 = dataUrl.slice(idx + 1);
      var padding = (b64.match(/=+$/) || [''])[0].length;
      return Math.round(b64.length * 0.75) - padding;
    }
  };

  /* ---------- ۶) کلیپ‌بورد و دانلود ---------- */

  function copyText(text) {
    var value = String(text === null || text === undefined ? '' : text);
    if (global.navigator && navigator.clipboard && global.isSecureContext) {
      return navigator.clipboard.writeText(value).then(function () { return true; })
        .catch(function () { return legacyCopy(value); });
    }
    return Promise.resolve(legacyCopy(value));
  }

  function legacyCopy(value) {
    try {
      var ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', 'readonly');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 500);
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('خواندن فایل ناموفق بود.')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  /* ---------- ۷) متفرقه ---------- */

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /** رأی‌گیری با تلاش مجدد برای شرط‌های نامطمئن */
  function retry(fn, attempts, delay) {
    var tries = attempts || 2;
    return fn().catch(function (err) {
      if (tries <= 1) throw err;
      return sleep(delay || 400).then(function () { return retry(fn, tries - 1, delay); });
    });
  }

  function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch (e) { return fallback; }
  }

  function isRtlText(text) {
    return /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(text || ''));
  }

  global.Arad = global.Arad || {};
  global.Arad.Utils = {
    $: $, $$: $$, el: el, clear: clear, on: on, delegate: delegate,
    escapeHtml: escapeHtml, escapeAttr: escapeAttr, truncate: truncate,
    deriveTitle: deriveTitle, uid: uid, debounce: debounce, throttle: throttle,
    formatTime: formatTime, relativeTime: relativeTime, formatBytes: formatBytes,
    Store: Store, Images: Images,
    copyText: copyText, download: download, readFileAsText: readFileAsText,
    clamp: clamp, sleep: sleep, retry: retry, safeJsonParse: safeJsonParse,
    isRtlText: isRtlText
  };
})(window);
