/* ============================================================
   Arad AI — app.js  (نسخه ۲.۰)
   منطق برنامه: گفتگو، استریم، انتخاب مدل، حالت Thinking،
   ذخیره‌سازی، پوسته و زبان.

   هیچ تنظیمات کاربری برای API وجود ندارد؛ همهٔ اتصال‌ها
   از config.js خوانده می‌شوند.
   ============================================================ */

(function (global) {
  'use strict';

  var U = global.Arad.Utils;
  var UI = global.Arad.UI;
  var API = global.Arad.API;
  var Config = global.Arad.Config;
  var $ = U.$, $$ = U.$$;

  /* ---------- ۱) وضعیت ---------- */

  var state = {
    chats: [],
    activeId: null,
    attachments: [],
    modelId: null,
    thinking: false,
    streaming: false,
    controller: null,
    search: '',
    scrollStick: true,
    menuOpen: false,
    menuIndex: -1
  };

  var dom = {};

  function cacheDom() {
    dom.app = $('#app');
    dom.sidebar = $('#sidebar');
    dom.sidebarBackdrop = $('#sidebarBackdrop');
    dom.chatList = $('#chatList');
    dom.chat = $('#chat');
    dom.messages = $('#messages');
    dom.chatTitle = $('#chatTitle');
    dom.form = $('#composerForm');
    dom.input = $('#input');
    dom.sendBtn = $('#sendBtn');
    dom.stopBtn = $('#stopBtn');
    dom.attachBtn = $('#attachBtn');
    dom.fileInput = $('#fileInput');
    dom.attachments = $('#attachments');
    dom.charCount = $('#charCount');
    dom.scrollBottomBtn = $('#scrollBottomBtn');
    dom.chatSearch = $('#chatSearch');
    dom.newChatBtn = $('#newChatBtn');
    dom.clearAllChats = $('#clearAllChats');
    dom.themeBtn = $('#themeBtn');
    dom.langBtn = $('#langBtn');
    dom.langBtnLabel = $('#langBtnLabel');
    dom.importFile = $('#importFile');
    dom.footnote = $('#footnote');
    dom.thinkingBtn = $('#thinkingBtn');
    dom.modelBtn = $('#modelBtn');
    dom.modelBtnLabel = $('#modelBtnLabel');
    dom.modelMenu = $('#modelMenu');
    dom.modelMenuList = $('#modelMenuList');
  }

  function uiKey() { return Config.get().STORAGE_KEY + '::ui'; }

  /* ---------- ۲) کمکی‌های گفتگو ---------- */

  function activeChat() {
    for (var i = 0; i < state.chats.length; i++) {
      if (state.chats[i].id === state.activeId) return state.chats[i];
    }
    return null;
  }

  function sanitizeChats(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.filter(function (chat) {
      return chat && typeof chat === 'object';
    }).map(function (chat) {
      return {
        id: chat.id || U.uid('c'),
        title: chat.title || 'گفتگوی جدید',
        titleLocked: Boolean(chat.titleLocked),
        createdAt: Number(chat.createdAt) || Date.now(),
        updatedAt: Number(chat.updatedAt) || Number(chat.createdAt) || Date.now(),
        messages: Array.isArray(chat.messages) ? chat.messages.filter(function (m) {
          return m && m.role && typeof m.content === 'string';
        }).map(function (m) {
          return {
            id: m.id || U.uid('m'),
            role: m.role,
            content: String(m.content || ''),
            images: Array.isArray(m.images) ? m.images.filter(function (img) {
              return img && img.dataUrl;
            }).map(function (img) {
              return { dataUrl: img.dataUrl, name: img.name || 'image', width: img.width, height: img.height };
            }) : [],
            reasoning: typeof m.reasoning === 'string' ? m.reasoning : '',
            createdAt: Number(m.createdAt) || Date.now(),
            error: Boolean(m.error),
            usage: m.usage || null,
            modelId: m.modelId || null,
            modelName: m.modelName || '',
            thinking: Boolean(m.thinking)
          };
        }) : []
      };
    });
  }

  function createChat(silent) {
    var chat = {
      id: U.uid('c'),
      title: defaultChatTitle(),
      titleLocked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };
    state.chats.unshift(chat);
    state.activeId = chat.id;
    var max = Number(Config.get().MAX_CHATS) || 60;
    if (state.chats.length > max) state.chats = state.chats.slice(0, max);

    if (!silent) {
      renderSidebar();
      renderConversation();
      updateTopbar();
      focusInput();
    }
    persist();
    return chat;
  }

  function defaultChatTitle() {
    return UI.getLang() === 'en' ? 'New chat' : 'گفتگوی جدید';
  }

  function deleteChat(id) {
    state.chats = state.chats.filter(function (chat) { return chat.id !== id; });
    if (state.activeId === id) {
      state.activeId = state.chats.length ? state.chats[0].id : null;
    }
    if (!state.chats.length) createChat(true);
    persist();
    renderSidebar();
    renderConversation();
    updateTopbar();
  }

  function renameChat(id, newTitle) {
    var chat = state.chats.filter(function (c) { return c.id === id; })[0];
    if (!chat) return;
    var title = String(newTitle || '').trim();
    if (!title) return;
    chat.title = U.truncate(title, 60);
    chat.titleLocked = true;
    persist();
    renderSidebar();
    updateTopbar();
  }

  function touchChat(chat) {
    chat.updatedAt = Date.now();
    state.chats = state.chats.filter(function (c) { return c.id !== chat.id; });
    state.chats.unshift(chat);
  }

  /* ---------- ۳) ذخیره‌سازی ---------- */

  function persist() {
    var key = Config.get().STORAGE_KEY;
    var payload = { version: 2, savedAt: Date.now(), activeId: state.activeId, chats: state.chats };

    if (U.Store.write(key, payload)) return true;

    var trimmed = Object.assign({}, payload, { chats: state.chats.slice(0, 15) });
    if (U.Store.write(key, trimmed)) {
      UI.toast('حافظهٔ مرورگر پر شد؛ فقط ۱۵ گفتگوی اخیر نگه داشته می‌شود.', 'warning');
      return true;
    }

    var slim = Object.assign({}, payload, {
      chats: state.chats.slice(0, 10).map(function (chat) {
        return Object.assign({}, chat, {
          messages: chat.messages.map(function (m) {
            return (m.images && m.images.length) ? Object.assign({}, m, { images: [] }) : m;
          })
        });
      })
    });
    if (U.Store.write(key, slim)) {
      UI.toast('حافظهٔ مرورگر پر شد؛ تصاویر ذخیره نشدند.', 'warning');
      return true;
    }

    UI.toast('ذخیره‌سازی ناموفق بود؛ حافظهٔ مرورگر پر است.', 'error');
    return false;
  }

  function saveUiPrefs() {
    U.Store.write(uiKey(), {
      modelId: state.modelId,
      thinking: state.thinking,
      theme: Config.get().THEME,
      lang: Config.get().LANG
    });
  }

  function loadState() {
    var saved = U.Store.read(Config.get().STORAGE_KEY, null);
    if (saved && Array.isArray(saved.chats) && saved.chats.length) {
      state.chats = sanitizeChats(saved.chats);
      state.activeId = saved.activeId || state.chats[0].id;
    }
    if (!state.chats.length) createChat(true);
    if (!activeChat()) state.activeId = state.chats[0].id;

    var prefs = U.Store.read(uiKey(), null) || {};
    var models = Config.models();
    var known = models.some(function (m) { return m.id === prefs.modelId; });
    state.modelId = known ? prefs.modelId : Config.defaultModelId();

    var model = Config.model(state.modelId);
    state.thinking = (prefs.thinking !== undefined)
      ? Boolean(prefs.thinking) && Boolean(model && model.thinking)
      : Boolean(Config.get().THINKING_DEFAULT) && Boolean(model && model.thinking);

    if (prefs.theme) Config.get().THEME = prefs.theme;
    if (prefs.lang) Config.get().LANG = prefs.lang === 'en' ? 'en' : 'fa';
  }

  /* ---------- ۴) نمایش ---------- */

  function renderSidebar() {
    var query = state.search.trim().toLowerCase();
    var list = state.chats.filter(function (chat) {
      if (!query) return true;
      var haystack = chat.title + ' ' + chat.messages.slice(-6).map(function (m) { return m.content; }).join(' ');
      return haystack.toLowerCase().indexOf(query) !== -1;
    });

    if (!list.length && query) {
      U.clear(dom.chatList);
      dom.chatList.appendChild(U.el('div', { class: 'chat-list__empty', text: UI.t('noResults') }));
      return;
    }
    UI.renderChatList(dom.chatList, list, state.activeId);
  }

  function renderConversation() {
    var chat = activeChat();
    var model = Config.model(state.modelId);
    UI.renderConversation(dom.messages, chat, { modelName: model ? model.name : '' });
    UI.scrollToBottom(dom.chat, false);
    updateScrollButton();
  }

  function updateTopbar() {
    var chat = activeChat();
    var hasMessages = Boolean(chat && chat.messages.length);
    dom.chatTitle.textContent = hasMessages ? chat.title : defaultChatTitle();
    $('#clearChatBtn').disabled = !hasMessages;
    $('#exportBtn').disabled = !hasMessages;
  }

  function updateScrollButton() {
    var stick = UI.isNearBottom(dom.chat, 160);
    state.scrollStick = stick;
    dom.scrollBottomBtn.hidden = stick;
  }

  function appendMessage(message, options) {
    if (dom.messages.querySelector('.empty')) U.clear(dom.messages);
    var node = UI.createMessageNode(message, options || {});
    dom.messages.appendChild(node);
    return node;
  }

  function focusInput() {
    try { dom.input.focus({ preventScroll: true }); } catch (e) { dom.input.focus(); }
  }

  /* ---------- ۵) مدل و Thinking ---------- */

  function currentModel() { return Config.model(state.modelId); }

  function applyModel(modelId, options) {
    var opts = options || {};
    var model = Config.model(modelId);
    if (!model) return;

    state.modelId = model.id;

    if (dom.modelBtnLabel) dom.modelBtnLabel.textContent = model.name;

    // اگر مدل انتخابی Thinking ندارد، حالت خاموش می‌شود
    if (!model.thinking) state.thinking = false;

    renderThinking();
    updateAttachState();

    if (!opts.silent) {
      saveUiPrefs();
      if (model.vision === false && state.attachments.length) {
        UI.toast(UI.t('noVision'), 'warning', model.name);
      }
    }
  }

  function renderThinking() {
    var model = currentModel();
    var supported = Boolean(model && model.thinking);
    var on = state.thinking && supported;

    dom.thinkingBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    dom.thinkingBtn.disabled = !supported;
    dom.thinkingBtn.title = supported ? UI.t('thinkingHint') : UI.t('thinkingUnsupported');

    var stateLabel = dom.thinkingBtn.querySelector('.chip__state');
    if (stateLabel) {
      stateLabel.textContent = on ? (UI.getLang() === 'en' ? 'ON' : 'روشن')
                                  : (UI.getLang() === 'en' ? 'OFF' : 'خاموش');
    }
  }

  function toggleThinking() {
    var model = currentModel();
    if (!model || !model.thinking) return;
    state.thinking = !state.thinking;
    renderThinking();
    saveUiPrefs();
  }

  function updateAttachState() {
    var model = currentModel();
    var allowed = !model || model.vision !== false;
    dom.attachBtn.disabled = !allowed;
    dom.attachBtn.title = allowed ? UI.t('attach') : UI.t('noVision');
    if (!allowed && state.attachments.length) {
      state.attachments = [];
      UI.renderAttachments(dom.attachments, state.attachments);
    }
  }

  /* ---------- ۶) منوی مدل ---------- */

  function openModelMenu() {
    if (state.menuOpen) return;
    UI.renderModelMenu(dom.modelMenuList, Config.models(), state.modelId);
    dom.modelMenu.hidden = false;
    dom.modelBtn.setAttribute('aria-expanded', 'true');
    state.menuOpen = true;
    state.menuIndex = Config.models().findIndex(function (m) { return m.id === state.modelId; });
    highlightMenuItem();
  }

  function closeModelMenu() {
    if (!state.menuOpen) return;
    dom.modelMenu.hidden = true;
    dom.modelBtn.setAttribute('aria-expanded', 'false');
    state.menuOpen = false;
    state.menuIndex = -1;
  }

  function toggleModelMenu() {
    state.menuOpen ? closeModelMenu() : openModelMenu();
  }

  function menuItems() {
    return $$('.model-item', dom.modelMenuList);
  }

  function highlightMenuItem() {
    var items = menuItems();
    items.forEach(function (item, index) {
      var active = index === state.menuIndex;
      item.tabIndex = active ? 0 : -1;
      item.classList.toggle('is-focus', active);
      if (active) item.focus({ preventScroll: true });
    });
  }

  function moveMenu(delta) {
    var items = menuItems();
    if (!items.length) return;
    state.menuIndex = (state.menuIndex + delta + items.length) % items.length;
    highlightMenuItem();
  }

  /* ---------- ۷) ارسال و استریم ---------- */

  function bumpCharCount() {
    var length = dom.input.value.length;
    if (!length) {
      dom.charCount.hidden = true;
      return;
    }
    dom.charCount.hidden = false;
    dom.charCount.textContent = length + ' ' + UI.t('chars');
  }

  function resetInput() {
    dom.input.value = '';
    dom.input.style.height = 'auto';
    bumpCharCount();
  }

  function setStreaming(active) {
    state.streaming = active;
    dom.sendBtn.hidden = active;
    dom.stopBtn.hidden = !active;
    dom.input.setAttribute('aria-busy', active ? 'true' : 'false');
  }

  function sendMessage() {
    if (state.streaming) return;

    var text = dom.input.value.trim();
    var images = state.attachments.slice();
    var model = currentModel();

    if (!text && !images.length) {
      focusInput();
      return;
    }

    if (!model) {
      UI.toast('هیچ مدلی در config.js تعریف نشده است.', 'error');
      return;
    }

    if (!Config.isReady(state.modelId)) {
      UI.toast(UI.t('notConfigured'), 'error', model.name);
      return;
    }

    var chat = activeChat() || createChat(true);

    var userMessage = {
      id: U.uid('m'),
      role: 'user',
      content: text,
      images: images,
      createdAt: Date.now(),
      reasoning: '',
      error: false
    };

    var isFirstUserMessage = !chat.messages.some(function (m) { return m.role === 'user'; });
    chat.messages.push(userMessage);

    if (!chat.titleLocked && isFirstUserMessage) {
      var fallbackTitle = UI.getLang() === 'en' ? 'Image analysis' : 'تحلیل تصویر';
      chat.title = U.deriveTitle(text || (images.length ? fallbackTitle : ''));
    }

    touchChat(chat);

    // یک پله اسکرول: پیام تازه کامل دیده می‌شود و پیام قبلی هم
    // بالای کادر باقی می‌ماند (بدون پریدن به انتهای گفتگو).
    var userNode = appendMessage(userMessage, { modelName: model.name });

    state.attachments = [];
    UI.renderAttachments(dom.attachments, state.attachments);
    resetInput();
    persist();
    renderSidebar();
    updateTopbar();

    if (userNode) UI.scrollToMessage(userNode, { smooth: true });
    state.scrollStick = true;

    runAssistant(chat);
  }

  function runAssistant(chat) {
    var model = currentModel();
    if (!model) return;

    var thinking = state.thinking && model.thinking;

    var aiMessage = {
      id: U.uid('m'),
      role: 'assistant',
      content: '',
      images: [],
      reasoning: '',
      createdAt: Date.now(),
      error: false,
      pending: true,
      modelId: model.id,
      modelName: model.name,
      thinking: thinking
    };

    chat.messages.push(aiMessage);

    var node = appendMessage(aiMessage, { modelName: model.name });
    // ابتدای پاسخ دیده می‌شود؛ در طول استریم فقط اگر کاربر
    // پایین کادر باشد، دنبالهٔ متن نمایش داده می‌شود.
    UI.scrollToMessage(node, { smooth: true });
    state.scrollStick = true;

    setStreaming(true);
    state.controller = typeof AbortController === 'function' ? new AbortController() : null;

    var history = chat.messages.slice(0, -1);
    var apiMessages = API.toApiMessages(history, Config.get().SYSTEM_PROMPT);

    // نقاشی‌های تعویق‌افتاده پس از پایان اجرا نباید نشانگر بسازند
    var runFinished = false;

    var paint = U.throttle(function () {
      if (runFinished) return;
      UI.updateMessageContent(node, aiMessage, { streaming: true, modelName: model.name });
      if (state.scrollStick) UI.scrollToBottom(dom.chat, false);
    }, 55);

    return API.send({
      messages: apiMessages,
      modelId: model.id,
      thinking: thinking,
      stream: !!Config.get().STREAM,
      signal: state.controller ? state.controller.signal : undefined,
      onDelta: function (delta, meta) {
        if (meta && meta.reasoning) {
          aiMessage.reasoning = (aiMessage.reasoning || '') + meta.reasoning;
        } else if (meta && meta.full) {
          aiMessage.content = delta;
        } else if (delta) {
          aiMessage.content += delta;
        }
        paint();
      }
    }).then(function (result) {
      runFinished = true;
      aiMessage.pending = false;
      if (result && result.usage) aiMessage.usage = result.usage;

      if (!String(aiMessage.content || '').trim()) {
        if (result && result.aborted) {
          aiMessage.content = UI.t('stopped');
        } else {
          aiMessage.error = true;
          aiMessage.content = UI.t('emptyReply');
        }
      }

      if (result && result.finish === 'length') {
        UI.toast('پاسخ به سقف توکن رسید و ممکن است ناقص باشد.', 'warning');
      }
      finishRun(chat, aiMessage, node, false);
    }).catch(function (error) {
      runFinished = true;
      aiMessage.pending = false;

      if (error && error.name === 'AbortError') {
        if (!String(aiMessage.content || '').trim()) aiMessage.content = UI.t('stopped');
      } else {
        aiMessage.error = true;
        aiMessage.content = API.humanizeError(error);
        UI.toast(API.humanizeError(error), 'error', UI.t('errorTitle'));
      }
      finishRun(chat, aiMessage, node, true);
    });
  }

  function finishRun(chat, aiMessage, node, failed) {
    setStreaming(false);
    state.controller = null;

    UI.updateMessageContent(node, aiMessage, { streaming: false, modelName: aiMessage.modelName });

    if (aiMessage.usage && (aiMessage.usage.total_tokens || aiMessage.usage.completion_tokens)) {
      var head = node.querySelector('.msg__head');
      if (head && !head.querySelector('.msg__usage')) {
        head.appendChild(U.el('span', {
          class: 'msg__usage',
          text: '· ' + (aiMessage.usage.total_tokens || aiMessage.usage.completion_tokens) + ' ' + UI.t('tokens')
        }));
      }
    }

    touchChat(chat);
    persist();
    renderSidebar();
    updateTopbar();

    if (state.scrollStick) UI.scrollToBottom(dom.chat, true);
    updateScrollButton();
    focusInput();
  }

  function stopStreaming() {
    if (!state.streaming || !state.controller) return;
    try { state.controller.abort(); } catch (e) {}
  }

  /* ---------- ۸) عملیات پیام ---------- */

  function findMessageIndex(id) {
    var chat = activeChat();
    if (!chat) return -1;
    for (var i = 0; i < chat.messages.length; i++) {
      if (chat.messages[i].id === id) return i;
    }
    return -1;
  }

  function rerunMessage(id) {
    if (state.streaming) {
      UI.toast('ابتدا تولید فعلی را متوقف کنید.', 'warning');
      return;
    }
    if (!Config.isReady(state.modelId)) {
      UI.toast(UI.t('notConfigured'), 'error', (currentModel() || {}).name);
      return;
    }
    var chat = activeChat();
    if (!chat) return;
    var index = findMessageIndex(id);
    if (index === -1) return;

    var message = chat.messages[index];
    var from = message.role === 'user' ? index : index - 1;
    if (from < 0) from = index;

    chat.messages = chat.messages.slice(0, from + 1);
    renderConversation();
    persist();
    runAssistant(chat);
  }

  function deleteMessage(id) {
    var chat = activeChat();
    if (!chat) return;
    chat.messages = chat.messages.filter(function (m) { return m.id !== id; });
    touchChat(chat);
    persist();
    renderConversation();
    renderSidebar();
    updateTopbar();
  }

  /* ---------- ۹) ضمیمه‌ها ---------- */

  function addImages(files) {
    var model = currentModel();
    if (model && model.vision === false) {
      UI.toast(UI.t('noVision'), 'warning', model.name);
      return;
    }

    var cfg = Config.get();
    var list = Array.prototype.slice.call(files || []);
    if (!list.length) return;

    var room = Math.max(0, Number(cfg.MAX_IMAGES || 4) - state.attachments.length);
    if (!room) {
      UI.toast('حداکثر ' + (cfg.MAX_IMAGES || 4) + ' تصویر در هر پیام مجاز است.', 'warning');
      return;
    }

    list.slice(0, room).forEach(function (file) {
      var problem = U.Images.validate(file, cfg.IMAGE_MAX_BYTES);
      if (problem) {
        UI.toast(problem, 'error');
        return;
      }
      U.Images.process(file, { maxSide: cfg.IMAGE_MAX_SIDE, quality: cfg.IMAGE_QUALITY })
        .then(function (image) {
          state.attachments.push(image);
          UI.renderAttachments(dom.attachments, state.attachments);
        })
        .catch(function (error) {
          UI.toast(error && error.message ? error.message : 'پردازش تصویر ناموفق بود.', 'error');
        });
    });
  }

  /* ---------- ۱۰) پوسته و زبان ---------- */

  var mediaQuery = global.matchMedia ? global.matchMedia('(prefers-color-scheme: light)') : null;

  function resolveTheme(theme) {
    if (theme === 'system') return mediaQuery && mediaQuery.matches ? 'light' : 'dark';
    return theme === 'light' ? 'light' : 'dark';
  }

  /**
   * ارتفاع واقعی نمای دید را در --app-h می‌ریزد.
   * روی موبایل با باز شدن کیبورد، ارتفاع کم می‌شود و نوار چت
   * بالای کیبورد می‌ماند (به‌جای اینکه زیر آن گم شود).
   */
  function syncViewport() {
    var vv = global.visualViewport;

    // در زوم دو‌انگشتی، ارتفاع دید کوچک می‌شود ولی چیدمان نباید
    // تغییر کند؛ وگرنه کاربر برای خواندن کد مجبور به اسکرول افقی می‌شود.
    if (vv && vv.scale && vv.scale > 1.01) return;

    var height = (vv && vv.height) ? vv.height : global.innerHeight;
    if (!height) return;
    document.documentElement.style.setProperty('--app-h', Math.round(height) + 'px');
  }

  function applyTheme() {
    var resolved = resolveTheme(Config.get().THEME);
    document.documentElement.setAttribute('data-theme', resolved);
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', resolved === 'light' ? 'light dark' : 'dark light');
  }

  function toggleTheme() {
    Config.get().THEME = resolveTheme(Config.get().THEME) === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveUiPrefs();
  }

  function applyStaticLang() {
    var lang = UI.getLang();

    var newChatLabel = dom.newChatBtn.querySelector('span');
    if (newChatLabel) newChatLabel.textContent = UI.t('newChat');

    dom.chatSearch.placeholder = UI.t('searchPh');

    var sideLabel = document.querySelector('.sidebar__label span');
    if (sideLabel) sideLabel.textContent = UI.t('tabChats');

    dom.clearAllChats.textContent = UI.t('clearAll');

    var menuTitle = dom.modelMenu.querySelector('.model-menu__title');
    if (menuTitle) menuTitle.textContent = UI.t('modelMenuTitle');

    var menuFoot = dom.modelMenu.querySelector('.model-menu__foot');
    if (menuFoot) menuFoot.innerHTML = UI.t('modelMenuFoot').replace('config.js', '<code>config.js</code>');

    dom.footnote.textContent = UI.t('footnote');
    dom.input.placeholder = lang === 'en' ? 'How can I help?' : 'چطور می‌توانم کمکتان کنم؟';
    dom.langBtnLabel.textContent = lang === 'en' ? 'EN' : 'FA';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';

    renderThinking();
  }

  function applyLang() {
    UI.setLang(Config.get().LANG === 'en' ? 'en' : 'fa');
    applyStaticLang();
    renderSidebar();
    renderConversation();
    updateTopbar();
    bumpCharCount();
    updateAttachState();
  }

  function switchLang() {
    Config.get().LANG = UI.getLang() === 'fa' ? 'en' : 'fa';
    applyLang();
    saveUiPrefs();
  }

  /* ---------- ۱۱) ورودی / خروجی ---------- */

  function exportChat() {
    var chat = activeChat();
    if (!chat || !chat.messages.length) {
      UI.toast('گفتگویی برای خروجی وجود ندارد.', 'warning');
      return;
    }
    var payload = {
      app: Config.get().APP_NAME,
      version: Config.get().APP_VERSION,
      exportedAt: new Date().toISOString(),
      chat: chat
    };
    var safeTitle = (chat.title || 'chat').replace(/[^\w\u0600-\u06FF\-]+/g, '-').slice(0, 40);
    U.download('arad-ai-' + safeTitle + '.json', JSON.stringify(payload, null, 2), 'application/json');
    UI.toast('فایل گفتگو دانلود شد.', 'success');
  }

  function importPayload(text) {
    var data = U.safeJsonParse(text, null);
    if (!data) {
      UI.toast('فایل JSON معتبر نیست.', 'error');
      return;
    }

    var incoming = [];
    if (Array.isArray(data)) incoming = data;
    else if (Array.isArray(data.chats)) incoming = data.chats;
    else if (data.chat) incoming = [data.chat];

    var chats = sanitizeChats(incoming);
    if (!chats.length) {
      UI.toast('گفتگویی در فایل پیدا نشد.', 'warning');
      return;
    }

    var existing = {};
    state.chats.forEach(function (chat) { existing[chat.id] = true; });
    chats.forEach(function (chat) {
      if (existing[chat.id]) {
        chat.id = U.uid('c');
        chat.messages.forEach(function (m) { m.id = U.uid('m'); });
      }
    });

    state.chats = chats.concat(state.chats).slice(0, Number(Config.get().MAX_CHATS) || 60);
    state.activeId = chats[0].id;
    persist();
    renderSidebar();
    renderConversation();
    updateTopbar();
    UI.toast(chats.length + ' گفتگو بارگذاری شد.', 'success');
  }

  /* ---------- ۱۲) نوار کناری ---------- */

  function closeSidebar() {
    dom.app.classList.remove('is-sidebar-open');
    dom.sidebarBackdrop.hidden = true;
  }

  function openSidebar() {
    dom.app.classList.add('is-sidebar-open');
    dom.sidebarBackdrop.hidden = false;
  }

  /* ---------- ۱۳) رویدادها ---------- */

  function bindEvents() {
    // ارسال
    U.on(dom.form, 'submit', function (evt) {
      evt.preventDefault();
      sendMessage();
    });

    U.on(dom.input, 'input', function () {
      UI.autoGrow(dom.input, 208);
      bumpCharCount();
    });

    U.on(dom.input, 'keydown', function (evt) {
      if (evt.key === 'Enter' && !evt.shiftKey && !evt.isComposing && Config.get().SEND_ON_ENTER) {
        evt.preventDefault();
        sendMessage();
      }
    });

    U.on(dom.input, 'paste', function (evt) {
      var items = (evt.clipboardData && evt.clipboardData.items) || [];
      var files = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image/') === 0) {
          var file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        evt.preventDefault();
        addImages(files);
      }
    });

    U.on(dom.stopBtn, 'click', stopStreaming);

    // ضمیمه
    U.on(dom.attachBtn, 'click', function () { dom.fileInput.click(); });
    U.on(dom.fileInput, 'change', function () {
      addImages(dom.fileInput.files);
      dom.fileInput.value = '';
    });
    U.delegate(dom.attachments, 'click', '[data-act="remove"]', function (evt, button) {
      state.attachments.splice(Number(button.dataset.index), 1);
      UI.renderAttachments(dom.attachments, state.attachments);
    });

    ['dragenter', 'dragover'].forEach(function (type) {
      U.on(document, type, function (evt) {
        if (evt.dataTransfer && Array.prototype.indexOf.call(evt.dataTransfer.types || [], 'Files') !== -1) {
          evt.preventDefault();
        }
      });
    });
    U.on(document, 'drop', function (evt) {
      if (!evt.dataTransfer || !evt.dataTransfer.files || !evt.dataTransfer.files.length) return;
      evt.preventDefault();
      addImages(evt.dataTransfer.files);
    });

    // Thinking
    U.on(dom.thinkingBtn, 'click', toggleThinking);

    // منوی مدل
    U.on(dom.modelBtn, 'click', function (evt) {
      evt.stopPropagation();
      toggleModelMenu();
    });

    U.delegate(dom.modelMenuList, 'click', '.model-item', function (evt, item) {
      evt.stopPropagation();
      applyModel(item.dataset.id);
      closeModelMenu();
      focusInput();
    });

    U.on(document, 'click', function (evt) {
      if (!state.menuOpen) return;
      if (dom.modelMenu.contains(evt.target) || dom.modelBtn.contains(evt.target)) return;
      closeModelMenu();
    });

    U.on(document, 'keydown', function (evt) {
      if (!state.menuOpen) return;
      if (evt.key === 'Escape') {
        evt.preventDefault();
        closeModelMenu();
        dom.modelBtn.focus();
      } else if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
        evt.preventDefault();
        moveMenu(evt.key === 'ArrowDown' ? 1 : -1);
      } else if (evt.key === 'Enter' && state.menuIndex >= 0) {
        evt.preventDefault();
        var items = menuItems();
        if (items[state.menuIndex]) {
          applyModel(items[state.menuIndex].dataset.id);
          closeModelMenu();
          focusInput();
        }
      }
    });

    // نوار کناری
    U.on($('#brandHome'), 'click', function (evt) {
      evt.preventDefault();
      var chat = activeChat();
      if (!chat || chat.messages.length) createChat();
      closeSidebar();
      focusInput();
    });

    U.on(dom.newChatBtn, 'click', function () {
      var chat = activeChat();
      if (chat && !chat.messages.length) {
        closeSidebar();
        focusInput();
        return;
      }
      createChat();
      closeSidebar();
    });

    U.on($('#menuBtn'), 'click', openSidebar);
    U.on($('#sidebarClose'), 'click', closeSidebar);
    U.on(dom.sidebarBackdrop, 'click', closeSidebar);

    U.on(dom.chatSearch, 'input', U.debounce(function () {
      state.search = dom.chatSearch.value;
      renderSidebar();
    }, 160));

    U.delegate(dom.chatList, 'click', '.chat-item', function (evt, item) {
      var action = evt.target.closest('[data-act]');
      var id = item.dataset.id;

      if (action) {
        evt.stopPropagation();
        if (action.dataset.act === 'rename') {
          var chat = state.chats.filter(function (c) { return c.id === id; })[0];
          var next = global.prompt(UI.t('rename'), chat ? chat.title : '');
          if (next !== null) renameChat(id, next);
        } else if (action.dataset.act === 'delete') {
          UI.confirm({ title: UI.t('delChatTitle'), text: UI.t('delChatText'), okLabel: UI.t('del'), danger: true })
            .then(function (ok) { if (ok) deleteChat(id); });
        }
        return;
      }

      if (id === state.activeId) { closeSidebar(); return; }
      state.activeId = id;
      persist();
      renderSidebar();
      renderConversation();
      updateTopbar();
      closeSidebar();
    });

    U.on(dom.chatList, 'keydown', function (evt) {
      if (evt.key === 'Enter' && evt.target.classList.contains('chat-item')) evt.target.click();
    });

    U.on(dom.clearAllChats, 'click', function () {
      if (!state.chats.some(function (c) { return c.messages.length; })) return;
      UI.confirm({
        title: UI.t('clearAllTitle'),
        text: UI.t('clearAllText'),
        okLabel: UI.t('del'),
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        state.chats = [];
        state.activeId = null;
        createChat(true);
        persist();
        renderSidebar();
        renderConversation();
        updateTopbar();
        UI.toast('همهٔ گفتگوها پاک شد.', 'success');
      });
    });

    // اقدام‌های پیام
    U.delegate(dom.messages, 'click', '.msg__act', function (evt, button) {
      var node = button.closest('.msg');
      var id = node ? node.dataset.id : null;
      if (!id) return;
      var index = findMessageIndex(id);
      var chat = activeChat();
      var message = (index === -1 || !chat) ? null : chat.messages[index];
      var act = button.dataset.act;

      if (act === 'copy') {
        if (!message) return;
        U.copyText(message.content).then(function (ok) {
          var label = button.lastChild;
          if (label && label.nodeType === 3) {
            label.nodeValue = ok ? UI.t('copied') : '×';
            setTimeout(function () { label.nodeValue = UI.t('copy'); }, 1300);
          }
        });
      } else if (act === 'retry') {
        rerunMessage(id);
      } else if (act === 'delete') {
        UI.confirm({ title: UI.t('delMsgTitle'), text: UI.t('delMsgText'), okLabel: UI.t('del'), danger: true })
          .then(function (ok) { if (ok) deleteMessage(id); });
      }
    });

    U.delegate(dom.messages, 'click', '.suggestion', function (evt, button) {
      dom.input.value = button.dataset.prompt || '';
      UI.autoGrow(dom.input, 208);
      bumpCharCount();
      focusInput();
    });

    // پیمایش
    U.on(dom.chat, 'scroll', U.throttle(updateScrollButton, 120));
    U.on(dom.scrollBottomBtn, 'click', function () { UI.scrollToBottom(dom.chat, true); });

    // نوار بالا
    U.on($('#exportBtn'), 'click', exportChat);
    U.on($('#importBtn'), 'click', function () { dom.importFile.click(); });
    U.on(dom.importFile, 'change', function () {
      var file = dom.importFile.files && dom.importFile.files[0];
      if (!file) return;
      U.readFileAsText(file).then(importPayload).catch(function () {
        UI.toast('خواندن فایل ناموفق بود.', 'error');
      });
      dom.importFile.value = '';
    });

    U.on($('#clearChatBtn'), 'click', function () {
      var chat = activeChat();
      if (!chat || !chat.messages.length) return;
      UI.confirm({ title: UI.t('clearChatTitle'), text: UI.t('clearChatText'), okLabel: UI.t('ok'), danger: true })
        .then(function (ok) {
          if (!ok) return;
          chat.messages = [];
          touchChat(chat);
          persist();
          renderConversation();
          renderSidebar();
          updateTopbar();
        });
    });

    // پوسته و زبان
    U.on(dom.themeBtn, 'click', toggleTheme);
    U.on(dom.langBtn, 'click', switchLang);

    // میان‌برها
    document.addEventListener('keydown', function (evt) {
      var mod = evt.ctrlKey || evt.metaKey;
      if (mod && evt.key.toLowerCase() === 'k') {
        evt.preventDefault();
        createChat();
        focusInput();
      } else if (mod && evt.key === '/') {
        evt.preventDefault();
        focusInput();
      } else if (evt.key === 'Escape' && state.streaming && !$$('.modal:not([hidden])').length) {
        if (state.menuOpen) return;
        stopStreaming();
      }
    });

    global.addEventListener('resize', U.throttle(syncViewport, 120));
    global.addEventListener('orientationchange', function () {
      setTimeout(syncViewport, 260);
    });
    if (global.visualViewport) {
      global.visualViewport.addEventListener('resize', U.throttle(syncViewport, 90));
      global.visualViewport.addEventListener('scroll', U.throttle(syncViewport, 90));
    }

    if (mediaQuery) {
      var onScheme = function () { if (Config.get().THEME === 'system') applyTheme(); };
      if (mediaQuery.addEventListener) mediaQuery.addEventListener('change', onScheme);
      else if (mediaQuery.addListener) mediaQuery.addListener(onScheme);
    }

    global.addEventListener('beforeunload', function () { persist(); });
  }

  /* ---------- ۱۴) راه‌اندازی ---------- */

  function init() {
    cacheDom();
    UI.init();
    syncViewport();
    loadState();
    applyTheme();
    applyLang();
    applyModel(state.modelId, { silent: true });
    renderThinking();
    updateAttachState();
    bindEvents();
    renderSidebar();
    renderConversation();
    updateTopbar();
    UI.autoGrow(dom.input, 208);

    var model = currentModel();
    if (model && !Config.isReady(model.id)) {
      setTimeout(function () {
        UI.toast(UI.t('notConfigured'), 'info', model.name);
      }, 800);
    }

    global.Arad.App = {
      state: state,
      sendMessage: sendMessage,
      createChat: createChat,
      selectModel: applyModel,
      toggleThinking: toggleThinking,
      render: function () { renderSidebar(); renderConversation(); updateTopbar(); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
