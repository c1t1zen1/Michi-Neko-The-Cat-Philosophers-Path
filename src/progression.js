export class ProgressionManager {
  constructor(ui, player) {
    this.ui = ui;
    this.player = player;
    this.xp = 0;
    this.rank = 0;
    this.ranks = ['Kitten', 'Curious Cat', 'Backyard Explorer', 'Rooftop Wanderer', 'City Legend'];
    this.thresholds = [0, 30, 80, 150, 250];
    this.messages = {
      1: 'Sprint unlocked! Hold Shift or push joystick to the edge to run.',
      2: 'Jump boost unlocked!',
      3: 'You feel lighter and faster.',
      4: 'Master cat mode!'
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
  }

  load(state) {
    if (!state) return;
    this.xp = state.xp || 0;
    this.rank = state.rank || 0;
    this.applyRankEffects();
    this.refreshHud();
  }
}
