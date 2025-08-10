Hooks.once("init", async function () {
  console.log("Shin Jidai: Shinobi system initializing...");

  await loadTemplates([
    "systems/shinjidaishinobi/templates/actor/character-sheet.html"
  ]);

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
      width: 820,
      height: 680,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  /** Данные в шаблон + производные */
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

    // Производные по твоим формулам
    const chakraMax  = chkr * 100;
    const shieldMax  = vyn * 5 + sil * 2;
    const thresholds = {
      knockdown: vyn * 2 + 10,   // Потеря сознания
      injury:    vyn * 5 + 20,   // Увечье
      nearDeath: vyn * 10 + 50   // Предсмертное состояние (используем как HP max)
    };

    // Текущие ресурсы
    const res = sys.resources ?? { hp:{value:0,max:0}, shield:{value:0,max:0}, chakra:{value:0,max:0} };

    // % для прогресс-баров (защитимся от деления на 0)
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

  /** После рендера: навесим слушатели */
  activateListeners(html) {
    super.activateListeners(html);

    // Изменения базовых статов → обновить максимумы ресурсов
    html.find('input[name^="system.base."]').on("change", ev => this._onBaseChanged(ev, html));

    // Кнопка "Уворот"
    html.find('[data-action="dodge"]').on("click", ev => this._rollDodge());
  }

  /** Пересчёт и сохранение максимумов, когда меняются базовые статы */
  async _onBaseChanged(_ev, html) {
    // Считаем из формы, чтобы ловить незасохранённые значения
    const getNum = sel => Number(html.find(sel).val() || 0);
    const vyn = getNum('input[name="system.base.vyn"]');
    const sil = getNum('input[name="system.base.sil"]');
    const chkr = getNum('input[name="system.base.chkr"]');

    const chakraMax  = chkr * 100;
    const shieldMax  = vyn * 5 + sil * 2;
    const hpMax      = vyn * 10 + 50; // как обсуждали: верхняя граница здоровья

    // Аккуратно обновим actor только по максимумам. Если текущие значения превышают новые максимумы — подрежем.
    const res = foundry.utils.duplicate(this.actor.system.resources ?? {});
    const clamp = (val, max) => Math.max(0, Math.min(Number(val||0), Number(max||0)));

    const updates = {
      "system.resources.chakra.max": chakraMax,
      "system.resources.shield.max": shieldMax,
      "system.resources.hp.max": hpMax,
      "system.resources.chakra.value": clamp(res.chakra?.value ?? 0, chakraMax),
      "system.resources.shield.value": clamp(res.shield?.value ?? 0, shieldMax),
      "system.resources.hp.value": clamp(res.hp?.value ?? hpMax, hpMax)
    };

    await this.actor.update(updates);
  }

  /** Бросок уворота: d20 + РКЦ */
  async _rollDodge() {
    const rkc = Number(this.actor.system?.base?.rkc ?? 0);
    const roll = await (new Roll("1d20 + @rkc", { rkc })).evaluate({async: true});
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<b>Уворот</b> (РКЦ ${rkc >= 0 ? "+"+rkc : rkc})`
    });
  }
}
