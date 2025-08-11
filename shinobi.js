// Shin Jidai: Shinobi — v13 совместимая версия
const { ActorSheetV2 } = foundry.applications.sheets;
const { Actor } = foundry.documents;

class ShinobiActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();

    const sys = this.system;
    const A = sys.abilities ?? {};

    const SKR  = Number(A.skr?.value  ?? 0);
    const CKR  = Number(A.ckr?.value  ?? 0);
    const PCHT = Number(A.pcht?.value ?? 0);
    const STR  = Number(A.str?.value  ?? 0);
    const RCX  = Number(A.rcx?.value  ?? 0);
    const VIT  = Number(A.vit?.value  ?? 0);

    sys.derived ??= {};
    sys.resources ??= {};

    // Производные
    sys.derived.speed   = { value: SKR };
    sys.derived.actions = { value: PCHT };

    // Покров
    const shroudMax = VIT * 5 + STR * 2;
    sys.resources.shroud = {
      value: sys.resources.shroud?.value ?? shroudMax,
      max: shroudMax
    };

    // Чакра
    const chakraMax = CKR * 100;
    sys.resources.chakra = {
      value: sys.resources.chakra?.value ?? chakraMax,
      max: chakraMax
    };

    // HP и пороги
    const hpMax = 100;
    sys.resources.hp = {
      value: sys.resources.hp?.value ?? hpMax,
      max: hpMax
    };

    sys.derived.thresholds = {
      faint: VIT * 2 + 10,
      maim: VIT * 5 + 20,
      dying: VIT * 10 + 50
    };
  }
}

class ShinobiActorSheet extends ActorSheetV2 {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["shinobi", "sheet", "actor"],
      template: "systems/shin-jidai-shinobi/templates/actor-sheet.html",
      width: 640,
      height: 720
    });
  }

  async _updateObject(event, formData) {
    const expanded = foundry.utils.expandObject(formData);
    await this.actor.update(expanded);
  }
}

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = ShinobiActor;
  Actors.unregisterSheet("core", ActorSheetV2);
  Actors.registerSheet("shin-jidai-shinobi", ShinobiActorSheet, { makeDefault: true });
});
