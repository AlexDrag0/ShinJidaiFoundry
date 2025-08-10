// === Shin Jidai: Shinobi — Character Sheet (v13-safe) ===

class ShinobiCharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shinjidai", "sheet", "actor"],
      template: "systems/shinjidaishinobi/templates/actor/character-sheet.html",
      width: 820,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  /** Корректно сохраняем данные формы в актора */
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    return this.actor.update(data);
  }

  /** Данные для шаблона + производные */
  getData(options) {
    const ctx = super.getData(options);
    const sys = ctx.actor.system ?? {};
    const base = sys.base ?? {};
    const N = v => Number(v ?? 0);

    // Базовые харак-ки (дефолты, чтобы поля не пустели)
    const skr  = N(base.skr);
    const chkr = N(base.chkr);
    const pcht = N(base.pcht);
    const sil  = N(base.sil);
    const rkc  = N(base.rkc);
    const vyn  = N(base.vyn);

    // Производные
    const chakraMax  = chkr * 100;
    const shieldMax  = vyn * 5 + sil * 2;
    const thresholds = {
      knockdown: vyn * 2 + 10,
      injury:    vyn * 5 + 20,
      nearDeath: vyn * 10 + 50
    };

    // Ресурсы и проценты для баров
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

  /** Листенеры */
  activateListeners(html) {
    super.activateListeners(html);
    // Сначала сохранить форму, затем пересчитать максимумы
    html.find('input[name^="system.base."]').on("change", ev => this._onBaseChanged(ev));
    // Кнопка уворота
    html.find('[data-action="dodge"]').on("click", () => this._rollDodge());
  }

  /** Сохранить форму → пересчитать макс-значения ресурсов */
  async _onBaseChanged(ev) {
    await this._onSubmit(ev); // вызовет _updateObject и запишет поле

    const base = this.actor.system?.base ?? {};
    const vyn  = Number(base.vyn ?? 0);
    const sil  = Number(base.sil ?? 0);
    const chkr = Number(base.chkr ?? 0);

    const chakraMax = chkr * 100;
    const shieldMax = vyn * 5 + sil * 2;
    const hpMax     = vyn * 10 + 50;

    const res = foundry.utils.duplicate(this.actor.system.resources ?? {});
    const clamp = (val, max) => Math.max(0, Math.min(Number(val||0), Number(max||0)));

    await this.actor.update({
      "system.resources.chakra.max": chakraMax,
      "system.resources.shield.max": shieldMax,
      "system.resources.hp.max": hpMax,
      "system.resources.chakra.value": clamp(res.chakra?.value ?? 0, chakraMax),
      "system.resources.shield.value": clamp(res.shield?.value ?? 0, shieldMax),
      "system.resources.hp.value": clamp(res.hp?.value ?? hpMax, hpMax)
    });
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

/** Регистрация (надёжный способ для v13) */
Hooks.once("init", async () => {
  console.log("[SJ] init start");
  await loadTemplates(["systems/shinjidaishinobi/templates/actor/character-sheet.html"]);
  console.log("[SJ] templates loaded");

  // Регистрируем лист через DocumentSheetConfig — это самый совместимый способ
  DocumentSheetConfig.registerSheet(Actor, "shinjidaishinobi", ShinobiCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "Shin Jidai: Shinobi"
  });
  console.log("[SJ] sheet registered");
});
