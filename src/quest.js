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
    this.completed.push(quest);
    this.ui.setQuest('Quest complete! Talk to Luna.');
    if (this.onComplete) this.onComplete(quest);
  }
}
