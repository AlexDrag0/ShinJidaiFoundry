Hooks.once("init", async function () {
  console.log("Shin Jidai: Shinobi system initializing...");

  // Подгружаем шаблоны, если будут partials — добавим сюда
  await loadTemplates([
    "systems/shinjidaishinobi/templates/actor/character-sheet.html"
  ]);

  // Регистрируем наш кастомный лист как дефолтный для character
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("shinjidaishinobi", ShinobiCharacterSheet, {
    types: ["character"],
    makeDefault: true
  });
});

class ShinobiCharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shinjidai", "sheet", "actor"],
      template: "systems/shinjidaishinobi/templates/actor/character-sheet.html",
      width: 780,
      height: 640,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  /** Добавим производные значения (автоподсчёты) в контекст шаблона */
  getData(options) {
    const context = super.getData(options);

    // Достаём system-данные (v10+)
    const sys = context.actor.system ?? {};
    const base = sys.base ?? {};          // базовые характеристики
    const res  = sys.resources ?? {};     // ресурсы (можем добавлять позже)

    // Считыватель чисел с дефолтом 0
    const N = (v) => Number(v ?? 0);

    const skr  = N(base.skr);   // Скорость
    const chkr = N(base.chkr);  // Чакра
    const pcht = N(base.pcht);  // Печати
    const sil  = N(base.sil);   // Сила
    const rkc  = N(base.rkc);   // Реакция
    const vyn  = N(base.vyn);   // Выносливость

    // Производные (по твоим формулам)
    const chakraMax   = chkr * 100;
    const shieldMax   = vyn * 5 + sil * 2; // Покров чакры (макс)
    const thresholds  = {
      knockdown:  vyn * 2 + 10,     // Потеря сознания
      injury:     vyn * 5 + 20,     // Увечье
      nearDeath:  vyn * 10 + 50     // Предсмертное состояние (порог для отслеживания)
    };

    context.derived = {
      speed: skr,         // гексов за ход
      seals: pcht,        // действий за ход
      chakraMax,
      shieldMax,
      thresholds,
      stats: { skr, chkr, pcht, sil, rkc, vyn }
    };

    return context;
  }
}
