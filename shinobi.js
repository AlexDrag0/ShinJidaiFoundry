// shinobi.js
class ShinobiActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    const sys = this.system;
    const A = sys.abilities;

    // Читаемые значения (игрок может менять в листе)
    const SKR = Number(A.skr?.value ?? 0);
    const CKR = Number(A.ckr?.value ?? 0);
    const PCHT= Number(A.pcht?.value ?? 0);
    const STR = Number(A.str?.value ?? 0);
    const RCX = Number(A.rcx?.value ?? 0);
    const VIT = Number(A.vit?.value ?? 0);

    // Производные (НЕ сохраняем через update, просто кладём в this.system)
    sys.derived ??= {};
    sys.resources ??= {};

    // 1) Скорость, Печати
    sys.derived.speed   = { value: SKR * 1 };
    sys.derived.actions = { value: PCHT * 1 };

    // 2) Покров чакры (max) и текущее значение (не затираем value)
    const shroudMax = VIT * 5 + STR * 2;
    const currentShroud = Number(sys.resources.shroud?.value ?? shroudMax);
    sys.resources.shroud = { value: currentShroud, max: shroudMax };

    // 3) Макс. чакра
    const chakraMax = CKR * 100;
    const currentChakra = Number(sys.resources.chakra?.value ?? chakraMax);
    sys.resources.chakra = { value: currentChakra, max: chakraMax };

    // 4) HP пороги
    const faint = VIT * 2 + 10;
    const maim  = VIT * 5 + 20;
    const dying = VIT * 10 + 50;
    // Пример: базовый max HP = 100 (как у тебя в описании); можно вынести в формулу позже
    const hpMax = 100;
    const currentHP = Number(sys.resources.hp?.value ?? hpMax);
    sys.resources.hp = { value: currentHP, max: hpMax };

    sys.derived.thresholds = { faint, maim, dying };

    // На будущее: можно переопределить modifyTokenAttribute для особой логики баров. :contentReference[oaicite:4]{index=4}
  }
}

// Регистрируем документ и шит
class ShinobiActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shinobi", "sheet", "actor"],
      template: "systems/shin-jidai-shinobi/templates/actor-sheet.html",
      width: 600, height: 700, tabs: [{navSelector: ".tabs", contentSelector: ".sheet-body", initial: "stats"}]
    });
  }
  async getData(options) {
    const data = await super.getData(options);
    return data; // system.* уже с производными
  }
  async _updateObject(event, formData) {
    // КЛЮЧЕВОЕ: просто обновляем actor — Foundry сам сопоставит name="system.***"
    await this.actor.update(formData);
  }
}

Hooks.once("init", () => {
  // Назначаем свой класс актёра и лист
  CONFIG.Actor.documentClass = ShinobiActor;
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("shin-jidai-shinobi", ShinobiActorSheet, { makeDefault: true });
});
