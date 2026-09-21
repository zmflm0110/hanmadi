// 스위치 스캐닝: 화면을 직접 누르기 어려운 사용자를 위해 강조 표시가 차례로 옮겨 가고, 스위치(아무 키·화면 아무 곳)를 누르면 고른다.
// 1단계는 묶음(후보 줄, 탭 줄, 카드 한 줄 …)을 돌고, 묶음을 고르면 2단계에서 그 안의 칸을 하나씩 돈다.
export class Scanner {
  private timer: number | null = null;
  private groups: HTMLElement[][] = [];
  private gi = -1;
  private ii = -1;
  private level: 1 | 2 = 1;
  private idleLaps = 0;

  constructor(
    private collect: () => HTMLElement[][],
    private ms: () => number,
  ) {}

  get running() {
    return this.timer !== null;
  }

  start() {
    this.stop();
    this.level = 1;
    this.gi = -1;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), this.ms());
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.clear();
  }

  /** 화면이 다시 그려졌을 때: 묶음 단계부터 다시 */
  refresh() {
    if (!this.running) return;
    this.start();
  }

  press() {
    if (!this.running) return;
    if (this.level === 1) {
      const g = this.groups[this.gi];
      if (!g?.length) return;
      if (g.length === 1) {
        this.activate(g[0]!);
        return;
      }
      this.level = 2;
      this.ii = -1;
      this.idleLaps = 0;
      this.restartTimer();
      this.tick();
      return;
    }
    const el = this.groups[this.gi]?.[this.ii];
    if (el) this.activate(el);
  }

  private activate(el: HTMLElement) {
    this.clear();
    this.level = 1;
    this.gi = -1;
    el.click();
    this.restartTimer();
  }

  private restartTimer() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = window.setInterval(() => this.tick(), this.ms());
  }

  private tick() {
    this.clear();
    this.groups = this.collect().filter((g) => g.length);
    if (!this.groups.length) return;
    if (this.level === 1) {
      this.gi = (this.gi + 1) % this.groups.length;
      for (const el of this.groups[this.gi]!) el.classList.add('scan-group');
      this.groups[this.gi]![0]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    const g = this.groups[this.gi] ?? [];
    this.ii += 1;
    if (this.ii >= g.length) {
      this.ii = 0;
      this.idleLaps += 1;
      if (this.idleLaps >= 2) {
        // 두 바퀴 동안 안 고르면 묶음 단계로 돌아간다
        this.level = 1;
        this.tick();
        return;
      }
    }
    g[this.ii]?.classList.add('scan-item');
    g[this.ii]?.scrollIntoView({ block: 'nearest' });
  }

  private clear() {
    document.querySelectorAll('.scan-group, .scan-item').forEach((el) => el.classList.remove('scan-group', 'scan-item'));
  }
}
