// === Shin Jidai: Shinobi — Character Sheet (stable) ===

class ShinobiCharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shinjidai", "sheet", "actor"],
      template: "systems/shinjidaishinobi/templates/actor/character-sheet.html",
      width: 820,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }],
      submitOnChange: false // ⛔ не авто-сабмитим: сохраняем сами
    });
  }

  /** Сохранение формы (когда явный submit/save) */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    return this.actor.update(data);
  }

  /** Данные + производные */
  getData(options) {
    const ctx = super.getData(options);
    const sys = ctx.actor.system ?? {};
    const base = sys.base ?? {};
    const N = v => Number(v ?? 0);

    const skr  = N(base.skr);
    const chkr = N(base.chkr);
    const pcht = N(base.pcht);
    const sil  = N(base.sil);
    const rkc  = N(base.rkc);
    const vyn  = N(base.vyn);

    const chakraMax  = chkr * 100;
    const shieldMax  = vyn * 5 + sil * 2;
    const thresholds = {
      knockdown: vyn * 2 + 10,
      injury:    vyn * 5 + 20,
      nearDeath: vyn * 10 + 50
    };

    const res = sys.resources ?? { hp:{value:0,max:0}, shield:{value:0,max:0}, chakra:{value:0,max:0} };
    const pct = (val, max) => {
      const m = Math.max(0, Number(max || 0));
      if (m <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((Number(val||0) / m) * 100)));
    };

    ctx.derived = {
      stats: { skr, chkr, pcht, sil, rkc, vyn },
      speed: skr,
      seals: pcht,
      chakraMax,
      shieldMax,
      thresholds,
      bars: {
        hp:     pct(res.hp.value,     thresholds.nearDeath),
        shield: pct(res.shield.value, shieldMax),
        chakra: pct(res.chakra.value, chakraMax)
      }
    };

    return ctx;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // ✅ Один раз инициализируем ресурсы, если актёр старый/пустой
    this._ensureResourceDefaults();

    // ✅ Меняем любой базовый стат → читаем ВСЕ базовые из формы → одним апдейтом сохраняем + пересчитываем максы
    html.find('input[name^="system.base."]').on("change", () => this._saveBaseAndRecalc());

    // Кнопка «Уворот»
    html.find('[data-action="dodge"]').on("click", () => this._rollDodge());
  }

  /** Если ресурсы пустые — проинициализировать из формул (без трогания базовых статов) */
  async _ensureResourceDefaults() {
    const sys = this.actor.system ?? {};
    const base = sys.base ?? {};
    const res  = sys.resources ?? {};

    const N = v => Number(v ?? 0);
    const vyn  = N(base.vyn);
    const sil  = N(base.sil);
    const chkr = N(base.chkr);

    const chakraMax = chkr * 100;
    const shieldMax = vyn * 5 + sil * 2;
    const hpMax     = vyn * 10 + 50;

    const needsInit =
      !res?.hp?.max && !res?.shield?.max && !res?.chakra?.max;

    if (!needsInit) return;

    await this.actor.update({
      "system.resources.hp.max": hpMax,
      "system.resources.hp.value": hpMax,
      "system.resources.shield.max": shieldMax,
      "system.resources.shield.value": shieldMax,
      "system.resources.chakra.max": chakraMax,
      "system.resources.chakra.value": chakraMax
    });
  }

  /** Считать базовые из формы → сохранить все разом → пересчитать и записать максимумы */
  async _saveBaseAndRecalc() {
    // читаем ПРЯМО из формы, чтобы ничего не терялось
    const getNum = (name) => Number(this.element.find(`input[name="${name}"]`).val() || 0);

    const skr  = getNum("system.base.skr");
    const chkr = getNum("system.base.chkr");
    const pcht = getNum("system.base.pcht");
    const sil  = getNum("system.base.sil");
    const rkc  = getNum("system.base.rkc");
    const vyn  = getNum("system.base.vyn");

    // производные
    const chakraMax = chkr * 100;
    const shieldMax = vyn * 5 + sil * 2;
    const hpMax     = vyn * 10 + 50;

    // аккуратно подрежем текущие значения под новые максимумы
    const res = foundry.utils.duplicate(this.actor.system.resources ?? {});
    const clamp = (val, max) => Math.max(0, Math.min(Number(val||0), Number(max||0)));

    const updates = {
      // сохраняем ВСЕ базовые статы (в т.ч. те, которые ты не менял)
      "system.base.skr":  skr,
      "system.base.chkr": chkr,
      "system.base.pcht": pcht,
      "system.base.sil":  sil,
      "system.base.rkc":  rkc,
      "system.base.vyn":  vyn,

      // пересчитанные максимумы ресурсов
      "system.resources.chakra.max": chakraMax,
      "system.resources.shield.max": shieldMax,
      "system.resources.hp.max": hpMax,

      // подрезанные текущие значения
      "system.resources.chakra.value": clamp(res.chakra?.value ?? chakraMax, chakraMax),
      "system.resources.shield.value": clamp(res.shield?.value ?? shieldMax, shieldMax),
      "system.resources.hp.value": clamp(res.hp?.value ?? hpMax, hpMax)
    };

    await this.actor.update(updates);
  }

  /** Бросок уворота: 1d20 + РКЦ */
  async _rollDodge() {
    const rkc = Number(this.actor.system?.base?.rkc ?? 0);
    const roll = await (new Roll("1d20 + @rkc", { rkc })).evaluate({async: true});
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Уворот</b> (РКЦ ${rkc >= 0 ? "+"+rkc : rkc})`
    });
  }
}

/** Регистрация */
Hooks.once("init", async () => {
  console.log("[SJ] init start");
  await loadTemplates(["systems/shinjidaishinobi/templates/actor/character-sheet.html"]);
  DocumentSheetConfig.registerSheet(Actor, "shinjidaishinobi", ShinobiCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Shin Jidai: Shinobi"
  });
  console.log("[SJ] sheet registered");
});
