// Shin Jidai: Shinobi — v13 minimal
class ShinobiActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    const sys = this.system ?? {};
    const A = sys.abilities ?? {};

    const SKR  = Number(A.skr?.value  ?? 0);
    const CKR  = Number(A.ckr?.value  ?? 0);
    const PCHT = Number(A.pcht?.value ?? 0);
    const STR  = Number(A.str?.value  ?? 0);
    const RCX  = Number(A.rcx?.value  ?? 0);
    const VIT  = Number(A.vit?.value  ?? 0);

    sys.derived ??= {};
    sys.resources ??= {};

    // Производные — читаемые значения (не апдейтим документ!)
    sys.derived.speed   = { value: SKR * 1 };
    sys.derived.actions = { value: PCHT * 1 };

    // Покров (max) — VIT*5 + STR*2
    const shroudMax = VIT * 5 + STR * 2;
    const shroudVal = Number(sys.resources.shroud?.value ?? shroudMax);
    sys.resources.shroud = { value: shroudVal, max: shroudMax };

    // Чакра (max) — CKR*100
    const chakraMax = CKR * 100;
    const chakraVal = Number(sys.resources.chakra?.value ?? chakraMax);
    sys.resources.chakra = { value: chakraVal, max: chakraMax };

    // HP и пороги (пока max=100 как в описании)
    const hpMax = 100;
    const hpVal = Number(sys.resources.hp?.value ?? hpMax);
    sys.resources.hp = { value: hpVal, max: hpMax };

    const faint = VIT * 2 + 10;
    const maim  = VIT * 5 + 20;
    const dying = VIT * 10 + 50;
    sys.derived.thresholds = { faint, maim, dying };

    this.system = sys; // гарантируем ссылки
  }
}

class ShinobiActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shinobi", "sheet", "actor"],
      template: "systems/shin-jidai-shinobi/templates/actor-sheet.html",
      width: 640,
      height: 720,
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "stats" }]
    });
  }

  async getData(options) {
    const data = await super.getData(options);
    return data; // system.* уже включает производные
  }

  async _updateObject(event, formData) {
    await this.actor.update(formData);
  }
}

Hooks.once("init", () => {
  // Назначаем класс документа
  CONFIG.Actor.documentClass = ShinobiActor;

  // Назначаем лист по умолчанию
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("shin-jidai-shinobi", ShinobiActorSheet, { makeDefault: true });
});
