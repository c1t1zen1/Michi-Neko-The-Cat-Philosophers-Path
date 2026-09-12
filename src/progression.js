export class ProgressionManager {
  constructor(ui, player) {
    this.ui = ui;
    this.player = player;
    this.xp = 0;
    this.rank = 0;
    this.ranks = ['Kitten', 'Curious Cat', 'Backyard Explorer', 'Rooftop Wanderer', 'City Legend'];
    this.thresholds = [0, 30, 80, 150, 250];
    // Sprint is available from the start (C2.3); rank messages now describe
    // the world opening up rather than gating basic movement. Rank 4 (Master
    // Cat) grants a real, visible reward: a golden bell for the collar.
    this.messages = {
      1: 'Curious Cat — the valley is starting to remember your pawprints.',
      2: 'Jump boost! Your paws find height you couldn’t reach before.',
      3: 'You feel lighter and faster on your feet.',
      4: 'Master Cat mode! A golden bell is tied to your collar. The valley knows you now.'
    };
    this.ui.setRank(this.ranks[this.rank]);
  }

  addXP(amount, reason = '') {
    this.xp += amount;
    let newRank = this.rank;
    while (newRank + 1 < this.ranks.length && this.xp >= this.thresholds[newRank + 1]) {
      newRank++;
    }
    if (newRank !== this.rank) {
      this.rank = newRank;
      this.ui.showToast(this.messages[newRank] || `Rank up: ${this.ranks[this.rank]}!`);
      this.applyRankEffects();
    }
    this.refreshHud();
  }

  refreshHud() {
    this.ui.setRank(this.ranks[this.rank]);
    const next = this.rank + 1 < this.thresholds.length ? this.thresholds[this.rank + 1] : null;
    this.ui.setXpProgress(this.xp, this.thresholds[this.rank], next != null ? next : this.xp);
  }

  applyRankEffects() {
    if (this.rank >= 1) this.player.canSprint = true;
    if (this.rank >= 2) this.player.jumpForce = 8.5;
    if (this.rank >= 3) {
      this.player.speed = 5.5;
      this.player.sprintMultiplier = 1.9;
    }
    // Rank 4 — Master Cat (C2.4): a defined, meaningful final reward.
    // A golden bell is tied to the collar (cosmetic identity) and the
    // completion beat on the torii becomes reachable (already gated at
    // rank >= 4 in main.js).
    if (this.rank >= 4 && this.player.cat && this.player.cat.setMasterCat) {
      this.player.cat.setMasterCat();
    }
  }

  load(state) {
    if (!state) return;
    this.xp = state.xp || 0;
    this.rank = state.rank || 0;
    this.applyRankEffects();
    this.refreshHud();
  }
}
