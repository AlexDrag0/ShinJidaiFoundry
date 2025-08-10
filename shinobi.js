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

  // ✅ Сохраняем данные формы в актёра
  async _updateObject(event, formData) {
    const data = foundry.utils.expandObject(formData);
    return this.actor.update(data);
  }

  getData(options) {
    const ctx = super.getData(options);
    const sys = ctx.actor.system ?? {};
    const base = sys.base ?? {};
    const N = v => Number(v ?? 0);

    // Базовые характеристики с дефолтами
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

    // Ресурсы
    const res = sys.resources ?? { hp:{value:0,max:0}, shield:{value:0,max:0}, chakra:{value:0,max:0} };
    const pct = (val, max) => {
      const m = Math.max(0, Number(max || 0));
      if (m <= 0) return 0;
      return Math.max(0, Math.min(100, Math.round((Number(val||0) / m) * 100)));
    };

    ctx.derived = {
      stats: { skr, chkr, pcht, sil, rkc, vyn },
      speed: skr,
