/**
 * Villager idle grooming (C3). The Cat already picks idle verbs from its
 * personality weights; this adds what the weights cannot say: a *bout*, a
 * long unhurried wash that suits the cat (Luna's is tidy and long, Mochi's
 * short and fidgety, Kuro's rare). Only used by modular villagers.
 *
 * personality.groom = { bout: [min, max] s, pause: [min, max] s between bouts, chance 0..1 }
 */
export function groomPlan(personality) {
  const g = personality && personality.groom;
  if (!g || !Array.isArray(g.bout) || !Array.isArray(g.pause)) return null;
  return { bout: g.bout, pause: g.pause, chance: typeof g.chance === 'number' ? g.chance : 1 };
}

const span = (r, u) => r[0] + (r[1] - r[0]) * u;

export class GroomingBehaviour {
  /** rng: () => 0..1 (injectable for tests); the first pause is a random part of one. */
  constructor(personality, rng = Math.random) {
    this.plan = groomPlan(personality);
    this.rng = rng;
    this.timer = this.plan ? span(this.plan.pause, rng()) * 0.5 : Infinity;
    this.bouts = 0;
  }

  /**
   * Tick while the cat is at rest. `cat` needs idleAction and startIdleAction().
   * Returns true on the frame a bout starts.
   */
  update(dt, cat, atRest) {
    if (!this.plan || !atRest || cat.idleAction) return false;
    this.timer -= dt;
    if (this.timer > 0) return false;
    this.timer = span(this.plan.pause, this.rng());
    if (this.rng() > this.plan.chance) return false;
    cat.startIdleAction('groom', span(this.plan.bout, this.rng()));
    this.bouts++;
    return true;
  }
}
