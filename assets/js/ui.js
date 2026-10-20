/* ============================================================
   Arad AI — ui.js  (نسخه ۲.۰)
   ساخت و به‌روزرسانی DOM: فهرست گفتگوها، حباب پیام‌ها، منوی
   انتخاب مدل، اعلان‌ها، پنجره‌ها، تصاویر.
   بدون هیچ منطق تجاری — فقط نمایش.
   ============================================================ */

(function (global) {
  'use strict';

  var U = global.Arad.Utils;
  var MD = global.Arad.Markdown;
  var el = U.el, $ = U.$, clear = U.clear;

  /* ---------- ۱) متن‌های رابط ---------- */

  var STRINGS = {
    fa: {
      newChat: 'گفتگوی جدید',
      searchPh: 'جستجو در گفتگوها',
      tabChats: 'گفتگوها',
      clearAll: 'پاک کردن',
      noChats: 'هنوز گفتگویی ندارید. اولین پیام را بنویسید.',
      noResults: 'چیزی پیدا نشد.',
      rename: 'تغییر نام',
      copy: 'کپی',
      copied: 'کپی شد',
      retry: 'دوباره',
      del: 'حذف',
      delChatTitle: 'حذف گفتگو',
      delChatText: 'این گفتگو برای همیشه حذف می‌شود. مطمئن هستید؟',
      delMsgTitle: 'حذف پیام',
      delMsgText: 'این پیام حذف می‌شود. مطمئن هستید؟',
      clearChatTitle: 'پاک کردن گفتگو',
      clearChatText: 'همهٔ پیام‌های این گفتگو پاک می‌شود. ادامه می‌دهید؟',
      clearAllTitle: 'پاک کردن همهٔ گفتگوها',
      clearAllText: 'همهٔ گفتگوهای ذخیره‌شده در این مرورگر حذف می‌شود. این کار برگشت‌پذیر نیست.',
      cancel: 'انصراف',
      ok: 'تأیید',
      you: 'شما',
      assistant: 'Arad AI',
      thinking: 'Thinking',
      thinkingOn: 'روشن',
      thinkingOff: 'خاموش',
      thinkingBusy: 'در حال اندیشیدن…',
      reasoning: 'فرایند استدلال',
      stopped: 'متوقف شد',
      errorTitle: 'خطا',
      emptyTitle: 'امروز چه کاری انجام دهیم؟',
      emptySub: 'بنویسید، تصویر بفرستید یا یکی از گزینه‌های زیر را انتخاب کنید.',
      s1t: 'توضیح ساده',
      s1x: 'یادگیری ماشین را برای یک نوجوان توضیح بده',
      s2t: 'نوشتن کد',
      s2x: 'یک تابع جاوااسکریپت برای تبدیل CSV به آرایه بنویس',
      s3t: 'خلاصه‌سازی',
      s3x: 'این متن را در سه نکتهٔ کلیدی خلاصه کن',
      s4t: 'تحلیل تصویر',
      s4x: 'این تصویر را تحلیل کن و جزئیاتش را بگو',
      chars: 'کاراکتر',
      tokens: 'توکن',
      modelMenuTitle: 'انتخاب مدل',
      modelMenuFoot: 'مدل‌ها در config.js تعریف می‌شوند',
      noVision: 'این مدل تصویر نمی‌پذیرد',
      vision: 'تصویر',
      thinkingBadge: 'استدلال',
      footnote: 'Arad AI ممکن است اشتباه کند؛ اطلاعات مهم را بررسی کنید.',
      attach: 'افزودن تصویر',
      removeImage: 'حذف تصویر',
      emptyReply: 'پاسخ خالی از سرویس دریافت شد.',
      notConfigured: 'این مدل هنوز پیکربندی نشده است؛ کلید آن را در config.js وارد کنید.',
      thinkingUnsupported: 'این مدل از حالت Thinking پشتیبانی نمی‌کند',
      thinkingHint: 'استدلال عمیق‌تر پیش از پاسخ',
      wrap: 'شکست خط'
    },
    en: {
      newChat: 'New chat',
      searchPh: 'Search chats',
      tabChats: 'Chats',
      clearAll: 'Clear',
      noChats: 'No chats yet. Send the first message.',
      noResults: 'Nothing found.',
      rename: 'Rename',
      copy: 'Copy',
      copied: 'Copied',
      retry: 'Retry',
      del: 'Delete',
      delChatTitle: 'Delete chat',
      delChatText: 'This chat will be permanently deleted. Continue?',
      delMsgTitle: 'Delete message',
      delMsgText: 'This message will be removed. Continue?',
      clearChatTitle: 'Clear chat',
      clearChatText: 'All messages in this chat will be removed. Continue?',
      clearAllTitle: 'Clear all chats',
      clearAllText: 'Every chat stored in this browser will be deleted. This cannot be undone.',
      cancel: 'Cancel',
      ok: 'Confirm',
      you: 'You',
      assistant: 'Arad AI',
      thinking: 'Thinking',
      thinkingOn: 'ON',
      thinkingOff: 'OFF',
      thinkingBusy: 'Thinking…',
      reasoning: 'Reasoning',
      stopped: 'Stopped',
      errorTitle: 'Error',
      emptyTitle: 'What should we work on?',
      emptySub: 'Type a message, attach an image, or pick a starter below.',
      s1t: 'Explain simply',
      s1x: 'Explain machine learning to a teenager',
      s2t: 'Write code',
      s2x: 'Write a JavaScript function that turns CSV into an array',
      s3t: 'Summarize',
      s3x: 'Summarize this text into three key points',
      s4t: 'Analyze an image',
      s4x: 'Analyze this image and describe its details',
      chars: 'chars',
      tokens: 'tokens',
      modelMenuTitle: 'Choose a model',
      modelMenuFoot: 'Models are defined in config.js',
      noVision: 'This model cannot read images',
      vision: 'Vision',
      thinkingBadge: 'Reasoning',
      footnote: 'Arad AI can make mistakes. Check important information.',
      attach: 'Attach image',
      removeImage: 'Remove image',
      emptyReply: 'The service returned an empty response.',
      notConfigured: 'This model is not configured yet. Add its key in config.js.',
      thinkingUnsupported: 'This model does not support Thinking',
      thinkingHint: 'Deeper reasoning before answering',
      wrap: 'Wrap'
    }
  };

  var lang = 'fa';

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'fa';
    return lang;
  }

  function getLang() { return lang; }

  function t(key) {
    var table = STRINGS[lang] || STRINGS.fa;
    if (table[key] !== undefined) return table[key];
    return STRINGS.fa[key] !== undefined ? STRINGS.fa[key] : key;
  }

  /* ---------- ۲) آیکون‌ها ---------- */

  var ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5L20 7"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 5.5A2.5 2.5 0 0 0 12.5 3H6a2.5 2.5 0 0 0-2.5 2.5V13"/></svg>',
    retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3 4v5h5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7"/><path d="M6 7l1 13h10l1-13"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13.5 5.5l4 4"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 8l-4 4 4 4M15 8l4 4-4 4"/></svg>',
    text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 7h14M5 12h10M5 17h7"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l4.5-4 3.5 3 3-2.5 4 3.5"/></svg>',
    logo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 19 12 5l8 14h-4.4l-1.3-2.6H9.7L8.4 19z"/></svg>'
  };

  function svg(name) {
    var span = document.createElement('span');
    span.innerHTML = ICON[name] || '';
    return span.firstElementChild || document.createTextNode('');
  }

  /* ---------- ۳) اعلان ---------- */

  function toast(message, type, title) {
    var container = $('#toasts');
    if (!container) return null;

    var kind = type || 'info';
    var glyph = { success: '✓', error: '!', warning: '!', info: 'i' }[kind] || 'i';

    var node = el('div', { class: 'toast toast--' + kind, role: 'alert' }, [
      el('span', { class: 'toast__icon', text: glyph }),
      el('div', { class: 'toast__body' }, [
        title ? el('div', { class: 'toast__title', text: title }) : null,
        el('div', { class: 'toast__msg', text: String(message == null ? '' : message) })
      ]),
      el('button', {
        class: 'toast__close', type: 'button', 'aria-label': 'close',
        onClick: function () { dismiss(node); }
      }, '✕')
    ]);

    container.appendChild(node);

    var timer = setTimeout(function () { dismiss(node); }, Number(global.Arad.Config.get().TOAST_MS) || 4200);

    function dismiss(target) {
      clearTimeout(timer);
      if (!target || !target.parentNode) return;
      target.classList.add('is-leaving');
      setTimeout(function () { if (target.parentNode) target.parentNode.removeChild(target); }, 190);
    }

    return node;
  }

  /* ---------- ۴) پنجره‌ها ---------- */

  var openStack = [];

  function openModal(id) {
    var modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (!modal) return;
    modal.hidden = false;
    if (openStack.indexOf(modal) === -1) openStack.push(modal);
    document.body.style.overflow = 'hidden';
    var focusable = modal.querySelector('button');
    if (focusable) setTimeout(function () { focusable.focus(); }, 40);
  }

  function closeModal(id) {
    var modal = typeof id === 'string' ? document.getElementById(id) : id;
    if (!modal) return;
    modal.hidden = true;
    openStack = openStack.filter(function (m) { return m !== modal; });
    if (!openStack.length) document.body.style.overflow = '';
  }

  function closeTopModal() {
    if (!openStack.length) return false;
    closeModal(openStack[openStack.length - 1]);
    return true;
  }

  function confirm(options) {
    var opts = options || {};
    var modal = $('#confirmModal');
    if (!modal) return Promise.resolve(false);

    $('#confirmTitle').textContent = opts.title || t('ok');
    $('#confirmText').textContent = opts.text || '';
    var okBtn = $('#confirmOk');
    var cancelBtn = $('#confirmCancel');
    okBtn.textContent = opts.okLabel || t('ok');
    okBtn.className = 'btn ' + (opts.danger === false ? 'btn--primary' : 'btn--danger');
    cancelBtn.textContent = opts.cancelLabel || t('cancel');

    openModal(modal);

    return new Promise(function (resolve) {
      function cleanup(result) {
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        closeModal(modal);
        resolve(result);
      }
      function onOk() { cleanup(true); }
      function onCancel() { cleanup(false); }
      function onBackdrop(evt) { if (evt.target.closest('[data-close-modal]')) cleanup(false); }
      function onKey(evt) { if (evt.key === 'Escape') cleanup(false); }

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }

  /* ---------- ۵) نمایشگر تصویر ---------- */

  function lightbox(src, alt) {
    var box = el('div', { class: 'lightbox', role: 'dialog', 'aria-label': alt || 'image' }, [
      el('img', { src: src, alt: alt || '' })
    ]);
    function close() {
      document.removeEventListener('keydown', onKey);
      if (box.parentNode) box.parentNode.removeChild(box);
    }
    function onKey(evt) { if (evt.key === 'Escape') close(); }
    box.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box);
  }

  /* ---------- ۶) فهرست گفتگوها ---------- */

  function renderChatList(container, chats, activeId) {
    clear(container);
    if (!chats.length) {
      container.appendChild(el('div', { class: 'chat-list__empty', text: t('noChats') }));
      return;
    }

    chats.forEach(function (chat) {
      var tools = el('div', { class: 'chat-item__tools' });
      var renameBtn = el('button', { type: 'button', dataset: { act: 'rename' }, title: t('rename'), 'aria-label': t('rename') });
      renameBtn.appendChild(svg('pencil'));
      var delBtn = el('button', { type: 'button', dataset: { act: 'delete' }, title: t('del'), 'aria-label': t('del') });
      delBtn.appendChild(svg('trash'));
      tools.appendChild(renameBtn);
      tools.appendChild(delBtn);

      container.appendChild(el('div', {
        class: 'chat-item' + (chat.id === activeId ? ' is-active' : ''),
        dataset: { id: chat.id },
        role: 'button',
        tabindex: '0',
        title: chat.title
      }, [
        el('div', { class: 'chat-item__main' }, [
          el('div', { class: 'chat-item__title', text: chat.title || t('newChat') })
        ]),
        tools
      ]));
    });
  }

  /* ---------- ۷) حالت خالی ---------- */

  function renderEmpty(container, modelName) {
    var items = [
      { ico: 'sparkle', title: t('s1t'), text: t('s1x') },
      { ico: 'code', title: t('s2t'), text: t('s2x') },
      { ico: 'text', title: t('s3t'), text: t('s3x') },
      { ico: 'image', title: t('s4t'), text: t('s4x') }
    ];

    var mark = el('div', { class: 'empty__mark', 'aria-hidden': 'true' });
    mark.appendChild(svg('logo'));

    container.appendChild(el('div', { class: 'empty' }, [
      mark,
      el('h1', { class: 'empty__title', text: t('emptyTitle') }),
      el('p', { class: 'empty__sub', text: t('emptySub') }),
      el('div', { class: 'suggestions' }, items.map(function (item) {
        var ico = el('span', { class: 'suggestion__ico', 'aria-hidden': 'true' });
        ico.appendChild(svg(item.ico));
        return el('button', {
          class: 'suggestion', type: 'button', dataset: { prompt: item.text }
        }, [
          ico,
          el('span', {}, [
            el('span', { class: 'suggestion__title', text: item.title }),
            el('span', { class: 'suggestion__text', text: item.text })
          ])
        ]);
      }))
    ]));
  }

  /* ---------- ۸) پیام‌ها ---------- */

  function imagesNode(images) {
    if (!images || !images.length) return null;
    return el('div', { class: 'msg__images' }, images.map(function (image) {
      return el('img', {
        src: image.dataUrl,
        alt: image.name || 'image',
        loading: 'lazy',
        onClick: function () { lightbox(image.dataUrl, image.name); }
      });
    }));
  }

  function actionsNode(message) {
    function act(name, icon, label) {
      var button = el('button', {
        class: 'msg__act', type: 'button', dataset: { act: name }, title: label, 'aria-label': label
      });
      button.appendChild(svg(icon));
      button.appendChild(document.createTextNode(label));
      return button;
    }

    var children = [act('copy', 'copy', t('copy'))];
    if (message.role !== 'system') children.push(act('retry', 'retry', t('retry')));
    children.push(act('delete', 'trash', t('del')));

    return el('div', { class: 'msg__foot' }, children);
  }

  /**
   * ساخت گرهٔ پیام
   * @param {object} message
   * @param {object} options { modelName, showReasoning }
   */
  function createMessageNode(message, options) {
    var opts = options || {};
    var isUser = message.role === 'user';
    var content = el('div', { class: 'msg__content md' });
    var reason = el('details', { class: 'msg__reason', hidden: true }, [
      el('summary', { text: t('reasoning') }),
      el('div', { class: 'msg__reason-body' })
    ]);

    if (isUser) {
      var bubble = el('div', { class: 'msg__bubble' }, [imagesNode(message.images), content]);
      var node = el('article', {
        class: 'msg msg--user' + (message.error ? ' msg--error' : ''),
        dataset: { id: message.id || '' }
      }, [
        el('div', { class: 'msg__body' }, [bubble, actionsNode(message)])
      ]);
      updateMessageContent(node, message, opts);
      return node;
    }

    var avatar = el('div', { class: 'msg__avatar', 'aria-hidden': 'true' });
    avatar.appendChild(svg('logo'));

    var head = el('div', { class: 'msg__head' }, [
      el('span', { class: 'msg__name', text: t('assistant') }),
      opts.modelName ? el('span', { class: 'msg__model', text: opts.modelName }) : null,
      el('span', { class: 'msg__time', text: U.formatTime(message.createdAt) })
    ]);

    var body = el('div', { class: 'msg__body' }, [head, reason, content, actionsNode(message)]);

    var article = el('article', {
      class: 'msg msg--ai' + (message.error ? ' msg--error' : ''),
      dataset: { id: message.id || '' }
    }, [avatar, body]);

    updateMessageContent(article, message, opts);
    return article;
  }

  /**
   * به‌روزرسانی محتوای پیام (در استریم هم صدا زده می‌شود)
   * @param {object} options { streaming, modelName }
   */
  function updateMessageContent(node, message, options) {
    var opts = options || {};
    var content = node.querySelector('.msg__content');
    if (!content) return;

    var isUser = node.classList.contains('msg--user');

    if (message.error) {
      content.classList.remove('md');
      content.textContent = (t('errorTitle') + ': ' + String(message.content || '')).trim();
      return;
    }

    // بخش استدلال
    var reason = node.querySelector('.msg__reason');
    if (reason) {
      var hasReason = Boolean(message.reasoning);
      reason.hidden = !hasReason;
      if (hasReason) {
        var reasonBody = reason.querySelector('.msg__reason-body');
        if (reasonBody) reasonBody.textContent = message.reasoning;
        if (opts.streaming && !String(message.content || '').length) reason.open = true;
      }
    }

    if (isUser) {
      content.textContent = String(message.content || '');
      return;
    }

    content.classList.add('md');

    // هنوز چیزی تولید نشده → نشانگر اندیشیدن
    if (!String(message.content || '').length) {
      if (opts.streaming) {
        clear(content);
        var label = message.reasoning ? t('thinkingBusy') : t('thinkingBusy');
        var row = el('div', { class: 'thinking-row' }, [
          el('span', { text: label }),
          el('span', { class: 'dots' }, [el('i'), el('i'), el('i')])
        ]);
        content.appendChild(row);
        return;
      }
      content.textContent = '';
      return;
    }

    content.innerHTML = MD.render(message.content || '');

    if (opts.streaming) {
      content.appendChild(el('span', { class: 'caret', 'aria-hidden': 'true' }));
    }
  }

  function renderConversation(container, chat, options) {
    var opts = options || {};
    clear(container);
    if (!chat || !chat.messages || !chat.messages.length) {
      renderEmpty(container, opts.modelName);
      return;
    }
    chat.messages.forEach(function (message) {
      var label = message.role === 'assistant' ? (message.modelName || opts.modelName) : null;
      container.appendChild(createMessageNode(message, { modelName: label }));
    });
  }

  /* ---------- ۹) منوی مدل ---------- */

  function renderModelMenu(container, models, activeId) {
    clear(container);
    (models || []).forEach(function (model) {
      var initial = (model.name || '?').trim().charAt(0).toUpperCase();

      var body = el('div', { class: 'model-item__body' }, [
        el('span', { class: 'model-item__name' }, [
          el('span', { text: model.name }),
          model.badge ? el('span', { class: 'model-item__badge', text: model.badge }) : null
        ]),
        model.description ? el('span', { class: 'model-item__desc', text: model.description }) : null
      ]);

      var check = el('span', { class: 'model-item__check', 'aria-hidden': 'true' });
      check.appendChild(svg('check'));

      container.appendChild(el('button', {
        class: 'model-item',
        type: 'button',
        role: 'option',
        dataset: { id: model.id },
        'aria-selected': model.id === activeId ? 'true' : 'false',
        tabindex: '-1'
      }, [
        el('span', { class: 'model-item__ico', text: initial }),
        body,
        check
      ]));
    });
  }

  /* ---------- ۱۰) ضمیمه‌ها ---------- */

  function renderAttachments(container, attachments) {
    clear(container);
    if (!attachments || !attachments.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    attachments.forEach(function (image, index) {
      container.appendChild(el('div', { class: 'thumb', dataset: { index: index } }, [
        el('img', { src: image.dataUrl, alt: image.name || '' }),
        el('button', {
          class: 'thumb__remove', type: 'button',
          dataset: { act: 'remove', index: index },
          title: t('removeImage'), 'aria-label': t('removeImage')
        }, '✕')
      ]));
    });
  }

  /* ---------- ۱۱) پیمایش و اندازه ---------- */

  function isNearBottom(scroller, threshold) {
    if (!scroller) return true;
    var gap = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    return gap < (threshold === undefined ? 120 : threshold);
  }

  /** اسکرول به یک موقعیت مشخص، با محدودکردن به بازهٔ مجاز */
  function setScroll(scroller, top, smooth) {
    if (!scroller) return;
    var max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    var target = Math.max(0, Math.min(top, max));
    if (Math.abs(target - scroller.scrollTop) < 1) return;

    if (typeof scroller.scrollTo === 'function') {
      try {
        scroller.scrollTo({ top: target, behavior: smooth === false ? 'auto' : 'smooth' });
        return;
      } catch (e) { /* بازگشت به روش جایگزین */ }
    }
    scroller.scrollTop = target;
  }

  function scrollToBottom(scroller, smooth) {
    if (!scroller) return;
    setScroll(scroller, scroller.scrollHeight, smooth);
  }

  /**
   * «یک پله» اسکرول: پیام تازه را دقیقاً به اندازه‌ای پایین می‌آورد
   * که کامل دیده شود — نه بیشتر.
   *
   * · هرگز بیش از ارتفاع خودِ پیام جابه‌جا نمی‌کند.
   * · اگر پیام از پنجره بلندتر باشد، ابتدای آن بالای کادر می‌نشیند
   *   تا هیچ بخشی از پاسخ پنهان یا «پاک‌شده» به نظر نرسد.
   * · اگر پیام همین حالا کامل دیده می‌شود، دست به اسکرول نمی‌زند.
   *
   * @returns {boolean} آیا اسکرولی انجام شد؟
   */
  function scrollToMessage(node, options) {
    var opts = options || {};
    var scroller = opts.scroller || (node ? node.closest('.chat') : null);
    if (!node || !scroller) return false;

    var pad = 14;
    var view = scroller.getBoundingClientRect();
    var box = node.getBoundingClientRect();
    if (!view.height) return false;

    var visibleTop = view.top + pad;
    var visibleBottom = view.bottom - pad;
    var delta = 0;

    if (box.height >= view.height - pad * 2) {
      // بلندتر از پنجره → ابتدای پیام را بالای کادر بیاور
      delta = box.top - visibleTop;
    } else if (box.bottom > visibleBottom) {
      // فقط به اندازهٔ سرریز، و حداکثر به اندازهٔ خود پیام
      delta = Math.min(box.bottom - visibleBottom, box.height);
    } else if (box.top < visibleTop) {
      delta = box.top - visibleTop;
    } else {
      return false;
    }

    setScroll(scroller, scroller.scrollTop + delta, opts.smooth);
    return true;
  }

  function autoGrow(textarea, maxHeight) {
    if (!textarea) return;
    var limit = maxHeight || 208;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(limit, Math.max(26, textarea.scrollHeight)) + 'px';
  }

  /* ---------- ۱۲) مقداردهی ---------- */

  function init() {
    U.delegate(document, 'click', '[data-code-copy]', function (evt, button) {
      var block = button.closest('.code-block');
      var code = block ? block.querySelector('code') : null;
      var text = code ? code.textContent : '';
      U.copyText(text).then(function (ok) {
        var original = button.textContent;
        button.textContent = ok ? t('copied') : '×';
        button.classList.add('is-ok');
        setTimeout(function () {
          button.textContent = original;
          button.classList.remove('is-ok');
        }, 1400);
      });
    });

    U.delegate(document, 'click', '[data-code-wrap]', function (evt, button) {
      var block = button.closest('.code-block');
      var pre = block ? block.querySelector('.code-block__pre') : null;
      if (!pre) return;
      var wrapped = pre.style.whiteSpace === 'pre-wrap';
      pre.style.whiteSpace = wrapped ? 'pre' : 'pre-wrap';
      pre.style.wordBreak = wrapped ? 'normal' : 'break-word';
      button.classList.toggle('is-ok', !wrapped);
    });

    U.delegate(document, 'click', '[data-close-modal]', function () {
      closeTopModal();
    });

    document.addEventListener('keydown', function (evt) {
      if (evt.key === 'Escape' && openStack.length) {
        evt.preventDefault();
        closeTopModal();
      }
    });
  }

  global.Arad = global.Arad || {};
  global.Arad.UI = {
    init: init,
    setLang: setLang,
    getLang: getLang,
    t: t,
    svg: svg,
    icons: ICON,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    closeTopModal: closeTopModal,
    confirm: confirm,
    lightbox: lightbox,
    renderChatList: renderChatList,
    renderEmpty: renderEmpty,
    renderConversation: renderConversation,
    createMessageNode: createMessageNode,
    updateMessageContent: updateMessageContent,
    renderModelMenu: renderModelMenu,
    renderAttachments: renderAttachments,
    isNearBottom: isNearBottom,
    scrollToBottom: scrollToBottom,
    scrollToMessage: scrollToMessage,
    setScroll: setScroll,
    autoGrow: autoGrow,
    strings: STRINGS
  };
})(window);
