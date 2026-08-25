export class QuestManager {
  constructor(ui, onComplete = null) {
    this.ui = ui;
    this.onComplete = onComplete;
    this.active = null;
    this.completed = [];
  }

  start(quest) {
    this.active = { ...quest, current: 0 };
    this.ui.setQuest(`${quest.name} — 0/${quest.target}`, 0, quest.target);
  }

  onCollect(type) {
    if (!this.active || this.active.type !== type) return;
    this.active.current++;
    this.ui.setQuest(`${this.active.name} — ${this.active.current}/${this.active.target}`, this.active.current, this.active.target);
    if (this.active.current >= this.active.target) {
      this.complete(this.active);
    }
  }

  complete(quest) {
    this.active = null;
    this.completed.push({ ...quest, rewardClaimed: false });
    this.ui.setQuest('Quest complete! Talk to Luna.');
  }

  hasCompleted(type) {
    return this.completed.some((quest) => quest.type === type);
  }

  hasPendingReward(type) {
    return this.completed.some((quest) => quest.type === type && !quest.rewardClaimed);
  }

  claimReward(type) {
    const quest = this.completed.find((entry) => entry.type === type && !entry.rewardClaimed);
    if (!quest) return false;
    // Saves from builds before the Luna turn-in flow have no rewardClaimed
    // field because their 50 XP was granted immediately on quest completion.
    const shouldGrantReward = quest.rewardClaimed === false;
    quest.rewardClaimed = true;
    this.ui.setQuest('Luna rewarded you! Explore the bamboo corral.');
    if (shouldGrantReward && this.onComplete) this.onComplete(quest);
    return { quest, granted: shouldGrantReward };
  }
}
