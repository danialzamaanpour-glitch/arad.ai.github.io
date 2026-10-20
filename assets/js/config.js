/* ============================================================
   Arad AI — config.js  (نسخه ۲.۰)
   ────────────────────────────────────────────────────────────
   تنها فایلی که مدیر/توسعه‌دهنده باید ویرایش کند.

   کاربر نهایی هیچ دسترسی‌ای به API KEY یا BASE URL ندارد؛
   همهٔ این‌ها فقط همین‌جا تعریف می‌شوند و رابط کاربری حتی
   نامی از آن‌ها نمی‌بیند.

   برای افزودن مدل جدید:
     ۱) در PROVIDERS (اگر سرویس تازه‌ای است) آدرس و کلید را بگذارید.
     ۲) در MODELS یک شیء جدید اضافه کنید.
     ۳) id یکتا باشد؛ همین id در نوار چت نمایش داده می‌شود.
   ============================================================ */

(function (global) {
  'use strict';

  /* ╔══════════════════════════════════════════════════════╗
     ║  ۱) سرویس‌دهنده‌ها — آدرس پایه و کلید در همین‌جا      ║
     ╚══════════════════════════════════════════════════════╝ */

  var PROVIDERS = {

    apinex: {
      baseUrl: 'https://api.apinex.bond/v1',
      apiKey: 'sk-apx5f93ddabc5b97d0cc3e5f877b3053e911e872547a49c38b'                                  // ← کلید OpenAI
    },

    deepseek: {
      baseUrl: '',
      apiKey: ''                                  // ← کلید DeepSeek
    },

    openrouter: {
      baseUrl: '',
      apiKey: ''                                  // ← کلید OpenRouter
    },

    groq: {
      baseUrl: '',
      apiKey: ''                                  // ← کلید Groq
    },

    local: {
      baseUrl: '',       // Ollama / LM Studio
      apiKey: ''                                  // سرویس محلی کلید نمی‌خواهد
    }
  };

  /* ╔══════════════════════════════════════════════════════╗
     ║  ۲) مدل‌ها — هرچه خواستید اضافه یا حذف کنید          ║
     ║                                                      ║
     ║  id            شناسهٔ یکتا (در آدرس ذخیره می‌شود)     ║
     ║  name          نامی که در نوار چت دیده می‌شود          ║
     ║  model         نام دقیق مدل برای API                  ║
     ║  provider      کلید یکی از PROVIDERS بالا             ║
     ║  description   توضیح کوتاه در منوی انتخاب مدل          ║
     ║  badge         برچسب کوچک (اختیاری)                   ║
     ║  vision        آیا تصویر می‌پذیرد؟ (true/false)        ║
     ║  thinkingMode  نحوهٔ فعال‌سازی دکمهٔ Thinking:          ║
     ║                 'effort' → reasoning_effort            ║
     ║                 'budget' → thinking.budget_tokens      ║
     ║                 'prompt' → دستور سیستمی                ║
     ║                 'off'    → پشتیبانی نمی‌کند            ║
     ║  apiKey        (اختیاری) کلید اختصاصی همین مدل         ║
     ║  baseUrl       (اختیاری) آدرس اختصاصی همین مدل         ║
     ╚══════════════════════════════════════════════════════╝ */

  var MODELS = [

    {
      id: 'free/deepseek-v4.1-flash',
      name: 'free/deepseek-v4.1-flash',
      model: 'free/deepseek-v4.1-flash',
      provider: 'apinex',
      description: 'سبک و پرسرعت برای گفتگوهای روزمره',
      badge: 'سریع',
      vision: true,
      thinkingMode: 'prompt',
      temperature: 0.7,
      maxTokens: 4096
    },

    {
      id: '',
      name: '',
      model: '',
      provider: '',
      description: '',
      badge: 'پیشرفته',
      vision: true,
      thinkingMode: 'prompt',
      temperature: 0.6,
      maxTokens: 8192
    },

    {
      id: '',
      name: '',
      model: '',
      provider: '',
      description: '',
      badge: 'استدلالی',
      vision: true,
      thinkingMode: 'effort',        // reasoning_effort
      thinkingLevel: 'medium',       // low | medium | high
      temperature: 1,
      maxTokens: 8192
    },

    {
      id: '',
      name: '',
      model: '',
      provider: '',
      description: '',
      badge: 'کد',
      vision: false,
      thinkingMode: 'prompt',
      temperature: 0.3,
      maxTokens: 8192
    },

    {
      id: '',
      name: '',
      model: '',
      provider: '',
      description: '',
      badge: 'محلی',
      vision: false,
      thinkingMode: 'off',
      temperature: 0.7,
      maxTokens: 4096
    }
  ];

  /* ╔══════════════════════════════════════════════════════╗
     ║  ۳) پیش‌فرض‌های برنامه                              ║
     ╚══════════════════════════════════════════════════════╝ */

  var CONFIG = {

    /** شناسهٔ مدلی که هنگام باز شدن برنامه انتخاب می‌شود */
    DEFAULT_MODEL: 'arad-fast',

    /** وضعیت اولیهٔ دکمهٔ Thinking */
    THINKING_DEFAULT: false,

    /** شخصیت و قواعد پاسخ‌دهی دستیار */
    SYSTEM_PROMPT:
      'شما <Arad AI> هستید؛ یک دستیار هوشمند، دقیق و خوش‌برخورد. ' +
      'پاسخ‌ها را روشن، ساخت‌یافته و کاربردی بده و از توضیح اضافه پرهیز کن. ' +
      'برای کد از بلوک کد با مشخص‌کردن زبان استفاده کن. ' +
      'اگر از چیزی مطمئن نیستی، صادقانه بگو و حدس را به‌عنوان حدس علامت بزن. تو توسط شرکت Danial Tech ساخته شدی اگر ازت پرسیدند که Danial Tech چند پروژه هوش مصنوعی دیگه داشته بگو Danial AI و Run Danial AI Agent to old computers و فقط وقتی کاربر پرسید بگو  توسط Danial Tech ساخته شدی و مدیر شرکت Danial Tech هم دانیال زمانپور هست این هم اگر پرسیدند از تو بگو ممنون.',

    /** پیامی که در حالت Thinking به پرامپت سیستمی افزوده می‌شود */
    THINKING_PROMPT:
      'پیش از پاسخ نهایی، در سکوت و به‌طور کامل استدلال کن: ' +
      'مسئله را به بخش‌ها بشکن، فرض‌ها را بررسی کن، گزینه‌های جایگزین را بسنج ' +
      'و درستی نتیجه را کنترل کن. سپس فقط پاسخ نهایی و جمع‌بندی‌شده را بنویس.',

    /** پاسخ‌دهی استریم (کلمه‌به‌کلمه) */
    STREAM: true,

    /** ارسال با کلید Enter (Shift+Enter = خط جدید) */
    SEND_ON_ENTER: true,

    /** زبان رابط: 'fa' (فارسی/RTL) یا 'en' (LTR) */
    LANG: 'fa',

    /** پوسته: 'dark' | 'light' | 'system' */
    THEME: 'dark',

    /** حداکثر تصویر در هر پیام */
    MAX_IMAGES: 4,

    /** سقف حجم هر تصویر پیش از فشرده‌سازی (بایت) */
    IMAGE_MAX_BYTES: 8 * 1024 * 1024,

    /** بزرگ‌ترین ضلع تصویر پس از فشرده‌سازی (پیکسل) */
    IMAGE_MAX_SIDE: 1280,

    /** کیفیت فشرده‌سازی تصویر (۰ تا ۱) */
    IMAGE_QUALITY: 0.82,

    /** مدت نمایش اعلان‌ها (میلی‌ثانیه) */
    TOAST_MS: 4200,

    /** حداکثر گفتگوهای نگه‌داری‌شده */
    MAX_CHATS: 60,

    /** کلید ذخیره‌سازی در localStorage */
    STORAGE_KEY: 'arad-ai::state::v2',

    APP_NAME: 'Arad AI',
    APP_VERSION: '2.0.0'
  };

  /* ────────────────────────────────────────────────────────
     ۴) توابع کمکی — رابط کاربری فقط از این‌ها استفاده می‌کند
     ──────────────────────────────────────────────────────── */

  function normalizeBaseUrl(url) {
    var value = String(url == null ? '' : url).trim();
    if (!value) return '';
    return value.replace(/\/+$/, '').replace(/\/(chat\/)?completions$/i, '');
  }

  function isLocalUrl(url) {
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|host\.docker\.internal)/i.test(String(url || ''));
  }

  /** فهرست عمومی مدل‌ها — بدون هیچ کلید یا آدرسی */
  function list() {
    return MODELS.map(function (entry, index) {
      return {
        id: entry.id,
        name: entry.name,
        description: entry.description || '',
        badge: entry.badge || '',
        vision: entry.vision !== false,
        thinking: (entry.thinkingMode || 'off') !== 'off',
        index: index
      };
    });
  }

  function find(modelId) {
    for (var i = 0; i < MODELS.length; i++) {
      if (MODELS[i].id === modelId) return MODELS[i];
    }
    return null;
  }

  /** اطلاعات عمومی یک مدل (برای رابط کاربری) */
  function info(modelId) {
    var entry = find(modelId) || MODELS[0];
    if (!entry) return null;
    return {
      id: entry.id,
      name: entry.name,
      description: entry.description || '',
      badge: entry.badge || '',
      vision: entry.vision !== false,
      thinking: (entry.thinkingMode || 'off') !== 'off'
    };
  }

  /**
   * اطلاعات کامل و محرمانهٔ یک مدل — فقط لایهٔ api.js از این
   * استفاده می‌کند. هیچ‌جای رابط کاربری این را صدا نمی‌زند.
   */
  function resolve(modelId) {
    var entry = find(modelId) || MODELS[0];
    if (!entry) return null;

    var provider = PROVIDERS[entry.provider] || {};
    var baseUrl = normalizeBaseUrl(entry.baseUrl || provider.baseUrl || '');
    var apiKey = entry.apiKey || provider.apiKey || '';

    return {
      id: entry.id,
      name: entry.name,
      model: entry.model,
      baseUrl: baseUrl,
      endpoint: baseUrl ? baseUrl + '/chat/completions' : '',
      apiKey: apiKey,
      temperature: typeof entry.temperature === 'number' ? entry.temperature : 0.7,
      maxTokens: entry.maxTokens || 4096,
      vision: entry.vision !== false,
      thinkingMode: entry.thinkingMode || 'off',
      thinkingLevel: entry.thinkingLevel || 'medium',
      thinkingBudget: entry.thinkingBudget || 4096,
      local: isLocalUrl(baseUrl)
    };
  }

  /** آیا این مدل آمادهٔ استفاده است؟ (کلید دارد یا محلی است) */
  function isReady(modelId) {
    var resolved = resolve(modelId);
    if (!resolved) return false;
    if (!resolved.baseUrl || !resolved.model) return false;
    return Boolean(resolved.apiKey) || resolved.local;
  }

  /**
   * تزریق تنظیمات اتصال در زمان اجرا (اختیاری).
   * برای استقرارهایی که نمی‌خواهند کلید را داخل فایل بگذارند:
   *   Arad.Config.setProvider('openai', { apiKey: '...' })
   */
  function setProvider(name, patch) {
    if (!PROVIDERS[name] || !patch || typeof patch !== 'object') return false;
    Object.assign(PROVIDERS[name], patch);
    return true;
  }

  /** شناسهٔ معتبر برای شروع */
  function defaultModelId() {
    if (find(CONFIG.DEFAULT_MODEL)) return CONFIG.DEFAULT_MODEL;
    return MODELS.length ? MODELS[0].id : null;
  }

  global.Arad = global.Arad || {};
  global.Arad.Config = {
    get: function () { return CONFIG; },
    models: list,
    model: info,
    resolve: resolve,
    isReady: isReady,
    setProvider: setProvider,
    defaultModelId: defaultModelId,
    normalizeBaseUrl: normalizeBaseUrl
  };
})(window);
