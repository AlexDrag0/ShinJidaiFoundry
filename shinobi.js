// === Shin Jidai: Shinobi — Character Sheet ===

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

  /** Корректное сохранение данных формы в актора */
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

    // Базовые характеристики (с дефолтами, чтобы поля не пустели)
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
      knockdown: vyn * 2 + 10,
      injury:    vyn * 5 + 20,
      nearDeath: vyn * 10 + 50
    };

    // Ресурсы и проценты для прогресс-баров
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
    // меняем базовые статы → сначала сохранить форму, потом пересчитать
    html.find('input[name^="system.base."]').on("change", ev => this._onBaseChanged(ev));
    // кнопка уворота
    html.find('[data-action="dodge"]').on("click", () => this._rollDodge());
  }

  /** Сначала сохраняем форму, затем пересчитываем максимумы ресурсов */
  async _onBaseChanged(ev) {
    // это вызовет _updateObject и запишет текущее поле в актора
    await this._onSubmit(ev);

    // Читаем уже сохранённые значения
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
      "system.resourc
