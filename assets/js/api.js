/* ============================================================
   Arad AI — api.js  (نسخه ۲.۰)
   لایهٔ ارتباط با سرویس + پارسر SSE + حالت Thinking.

   هر مدل تنظیمات اتصال خودش را از config.js می‌گیرد؛
   رابط کاربری فقط شناسهٔ مدل را می‌فرستد و هیچ‌گاه کلید یا
   آدرس را نمی‌بیند.
   ============================================================ */

(function (global) {
  'use strict';

  var Config = global.Arad.Config;
  var U = global.Arad.Utils;

  /* ---------- ۱) ساخت درخواست ---------- */

  function headers(apiKey) {
    var out = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    var key = String(apiKey || '').trim();
    if (key) out['Authorization'] = 'Bearer ' + key;
    return out;
  }

  /**
   * تبدیل پیام داخلی به قالب API.
   * اگر محتوا از قبل آرایهٔ بخش‌ها باشد، دست‌نخورده می‌ماند
   * (idempotent) تا تبدیل دوباره، محتوای چندوجهی را خراب نکند.
   */
  function toApiMessage(message) {
    if (Array.isArray(message.content)) {
      return { role: message.role, content: message.content };
    }

    var images = message.images || [];
    var text = message.content === null || message.content === undefined ? '' : String(message.content);

    if (!images.length) return { role: message.role, content: text };

    var parts = [];
    if (text) parts.push({ type: 'text', text: text });
    images.forEach(function (image) {
      if (image && image.dataUrl) parts.push({ type: 'image_url', image_url: { url: image.dataUrl } });
    });
    if (!parts.length) parts.push({ type: 'text', text: text });
    return { role: message.role, content: parts };
  }

  /** تبدیل تاریخچهٔ گفتگو به پیام‌های آمادهٔ ارسال */
  function toApiMessages(history, systemPrompt) {
    var cfg = Config.get();
    var out = [];
    var sys = systemPrompt !== undefined ? systemPrompt : cfg.SYSTEM_PROMPT;

    if (sys && String(sys).trim()) out.push({ role: 'system', content: String(sys).trim() });

    (history || []).forEach(function (message) {
      if (!message || !message.role) return;
      if (message.role === 'system') return;
      if (message.error) return;
      var hasText = message.content && String(message.content).trim();
      var hasImages = message.images && message.images.length;
      if (!hasText && !hasImages) return;
      out.push({
        role: message.role,
        content: String(message.content || ''),
        images: Array.isArray(message.images) ? message.images : []
      });
    });

    return out;
  }

  /** افزودن دستور Thinking به لایهٔ پیام‌ها (حالت prompt) */
  function injectThinkingPrompt(messages) {
    var cfg = Config.get();
    var hint = String(cfg.THINKING_PROMPT || '').trim();
    if (!hint) return messages;

    var copy = messages.slice();
    if (copy.length && copy[0].role === 'system' && !Array.isArray(copy[0].content)) {
      copy[0] = { role: 'system', content: String(copy[0].content) + '\n\n' + hint };
    } else {
      copy.unshift({ role: 'system', content: hint });
    }
    return copy;
  }

  /**
   * ساخت بدنهٔ درخواست برای یک مدل مشخص
   * @param {Array} messages پیام‌های آمادهٔ ارسال
   * @param {object} model نتیجهٔ Config.resolve()
   * @param {object} options { stream, thinking }
   */
  function buildPayload(messages, model, options) {
    var opts = options || {};
    var thinking = Boolean(opts.thinking) && model.thinkingMode !== 'off';
    var prepared = messages;

    if (thinking && model.thinkingMode === 'prompt') {
      prepared = injectThinkingPrompt(messages);
    }

    var payload = {
      model: model.model,
      messages: prepared.map(toApiMessage),
      stream: opts.stream !== undefined ? !!opts.stream : true
    };

    // مدل‌های استدلالی معمولاً temperature را نمی‌پذیرند و
    // برای سقف پاسخ از max_completion_tokens استفاده می‌کنند.
    if (model.thinkingMode === 'effort') {
      payload.max_completion_tokens = model.maxTokens;
    } else {
      payload.temperature = model.temperature;
      payload.max_tokens = model.maxTokens;
    }

    if (thinking) {
      if (model.thinkingMode === 'effort') {
        payload.reasoning_effort = model.thinkingLevel || 'medium';
      } else if (model.thinkingMode === 'budget') {
        payload.thinking = { type: 'enabled', budget_tokens: model.thinkingBudget || 4096 };
      }
    }

    return payload;
  }

  /* ---------- ۲) خطاها ---------- */

  function buildHttpError(response, bodyText) {
    var parsed = U.safeJsonParse(bodyText, null);
    var detail = (parsed && ((parsed.error && parsed.error.message) || parsed.message || parsed.detail)) || '';
    if (!detail) detail = String(bodyText || '').slice(0, 400) || response.statusText || 'خطای نامشخص';

    var hints = {
      400: 'درخواست نامعتبر است؛ نام مدل را در config.js بررسی کنید.',
      401: 'کلید این مدل در config.js تنظیم نشده یا معتبر نیست.',
      403: 'دسترسی این کلید به مدل انتخاب‌شده مجاز نیست.',
      404: 'آدرس سرویس یا نام مدل در config.js پیدا نشد.',
      413: 'حجم درخواست بیش از حد مجاز است (تصویر یا متن را کم کنید).',
      422: 'پارامترهای درخواست پذیرفته نشد.',
      429: 'محدودیت نرخ درخواست؛ کمی بعد دوباره تلاش کنید.',
      500: 'خطای داخلی سرویس.',
      502: 'پاسخ نامعتبر از سرویس.',
      503: 'سرویس موقتاً در دسترس نیست.'
    };

    var error = new Error(detail);
    error.status = response.status;
    error.hint = hints[response.status] || 'پاسخ سرویس با خطا برگشت.';
    return error;
  }

  function humanizeError(error) {
    if (!error) return 'خطای نامشخص';
    if (error.name === 'AbortError') return 'تولید متوقف شد.';
    if (error.name === 'TypeError') {
      return 'ارتباط با سرویس برقرار نشد. اتصال اینترنت، آدرس سرویس در config.js و مجوز CORS آن را بررسی کنید.';
    }
    var text = error.message || String(error);
    if (error.hint) text = error.hint + ' — ' + text;
    if (error.status) text = '[' + error.status + '] ' + text;
    return text;
  }

  /* ---------- ۳) استخراج متن از پاسخ ---------- */

  function textFromContent(content) {
    if (content === null || content === undefined) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(function (part) {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (typeof part.text === 'string') return part.text;
        return '';
      }).join('');
    }
    if (typeof content.text === 'string') return content.text;
    return '';
  }

  function extract(json) {
    var out = { text: '', reasoning: '', finish: null, usage: null };
    if (!json || typeof json !== 'object') return out;

    if (json.usage) out.usage = json.usage;

    var choices = json.choices;
    if (Array.isArray(choices) && choices.length) {
      var choice = choices[0] || {};
      if (choice.finish_reason) out.finish = choice.finish_reason;

      var delta = choice.delta || choice.message || {};
      if (delta) {
        out.text = textFromContent(delta.content !== undefined ? delta.content : choice.text);
        if (!out.text && typeof choice.text === 'string') out.text = choice.text;
        var reason = delta.reasoning_content !== undefined ? delta.reasoning_content
                   : (delta.reasoning !== undefined ? delta.reasoning : '');
        if (reason) out.reasoning = textFromContent(reason);
      }
    } else if (json.error) {
      var err = new Error(json.error.message || 'خطای سرویس');
      err.hint = json.error.type || '';
      throw err;
    }
    return out;
  }

  /* ---------- ۴) ارسال ---------- */

  /**
   * @param {object} options
   *   messages  پیام‌های آماده (خروجی toApiMessages)
   *   modelId   شناسهٔ مدل از config.js
   *   thinking  بولین — حالت استدلال
   *   stream    بولین
   *   signal    AbortSignal
   *   onDelta   (text, meta) => void
   *   onDone    (result) => void
   *   onError   (error) => void
   */
  function send(options) {
    var opts = options || {};
    var model = Config.resolve(opts.modelId);

    if (!model) {
      return Promise.reject(new Error('مدلی انتخاب نشده است.'));
    }
    if (!model.endpoint) {
      return Promise.reject(new Error('آدرس سرویس این مدل در config.js تعریف نشده است.'));
    }
    if (!model.apiKey && !model.local) {
      var missing = new Error('کلید این مدل در config.js وارد نشده است.');
      missing.hint = 'پیکربندی ناقص';
      return Promise.reject(missing);
    }
    if (!opts.messages || !opts.messages.length) {
      return Promise.reject(new Error('پیامی برای ارسال وجود ندارد.'));
    }

    var stream = opts.stream !== undefined ? !!opts.stream : !!Config.get().STREAM;
    var payload = buildPayload(opts.messages, model, {
      stream: stream,
      thinking: Boolean(opts.thinking) && model.thinkingMode !== 'off'
    });

    var result = { content: '', reasoning: '', usage: null, finish: null, model: model.id };
    var finished = false;

    // fetch در برخی موارد (آدرس نامعتبر) به‌صورت همگام خطا می‌دهد؛
    // همیشه باید یک Promise برگردانیم تا فراخواننده در حالت انتظار نماند.
    var request;
    try {
      request = fetch(model.endpoint, {
        method: 'POST',
        headers: headers(model.apiKey),
        body: JSON.stringify(payload),
        signal: opts.signal
      });
    } catch (syncError) {
      return Promise.reject(syncError);
    }

    return request.then(function (response) {
      if (!response.ok) {
        return response.text().then(function (body) {
          throw buildHttpError(response, body);
        });
      }
      if (stream && response.body && typeof response.body.getReader === 'function') {
        return readStream(response, result, opts, function () { finished = true; });
      }
      return readJson(response, result, opts);
    }).then(function () {
      if (opts.onDone && !finished) opts.onDone(result);
      return result;
    }).catch(function (error) {
      if (error && error.name === 'AbortError') {
        result.aborted = true;
        if (opts.onDone && !finished) opts.onDone(result);
        return result;
      }
      if (opts.onError) opts.onError(error);
      throw error;
    });
  }

  function readJson(response, result, opts) {
    return response.json().then(function (json) {
      var parsed = extract(json);
      result.content = parsed.text;
      result.reasoning = parsed.reasoning;
      result.usage = parsed.usage;
      result.finish = parsed.finish;
      if (result.content && opts.onDelta) opts.onDelta(result.content, { full: true });
    });
  }

  function readStream(response, result, opts, markFinished) {
    var reader = response.body.getReader();
    var decoder = new TextDecoder('utf-8');
    var buffer = '';

    function handleEvent(rawEvent) {
      var lines = rawEvent.split(/\r?\n/);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line) continue;
        if (line.charAt(0) === ':') continue;
        if (line.indexOf('data:') !== 0) continue;

        var data = line.slice(5).trim();
        if (!data) continue;
        if (data === '[DONE]') {
          result.finish = result.finish || 'stop';
          markFinished();
          return;
        }

        var json = U.safeJsonParse(data, null);
        if (!json) continue;

        var parsed = extract(json);
        if (parsed.usage) result.usage = parsed.usage;
        if (parsed.finish) result.finish = parsed.finish;
        if (parsed.reasoning) {
          result.reasoning += parsed.reasoning;
          if (opts.onDelta) opts.onDelta('', { reasoning: parsed.reasoning });
        }
        if (parsed.text) {
          result.content += parsed.text;
          if (opts.onDelta) opts.onDelta(parsed.text, {});
        }
      }
    }

    function pump() {
      return reader.read().then(function (chunk) {
        if (chunk.done) {
          if (buffer.trim()) handleEvent(buffer);
          buffer = '';
          markFinished();
          return;
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        var events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || '';
        for (var i = 0; i < events.length; i++) {
          if (events[i].trim()) handleEvent(events[i]);
        }
        return pump();
      });
    }

    return pump();
  }

  global.Arad = global.Arad || {};
  global.Arad.API = {
    send: send,
    toApiMessages: toApiMessages,
    toApiMessage: toApiMessage,
    buildPayload: buildPayload,
    humanizeError: humanizeError,
    extract: extract
  };
})(window);
