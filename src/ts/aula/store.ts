/* Cambios del docente guardados en este navegador (hasta conectar la base de datos). */
import type { Activity, Course, Week } from './types';

interface Changes {
  added: Record<string, Activity[]>;   // por semana
  removed: string[];
  hidden: Record<string, boolean>;
  renamed: Record<string, string>;
}

const empty = (): Changes => ({ added: {}, removed: [], hidden: {}, renamed: {} });

export class Store {
  private key: string;
  private ch: Changes;

  constructor(courseId: string) {
    this.key = `ef-aula-${courseId}`;
    this.ch = empty();
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) this.ch = { ...empty(), ...JSON.parse(raw) };
    } catch { /* sin almacenamiento disponible */ }
  }

  private save(): void {
    try { localStorage.setItem(this.key, JSON.stringify(this.ch)); } catch { /* ignorar */ }
  }

  /** Aplica los cambios guardados sobre los datos del curso. */
  apply(c: Course): void {
    for (const w of allWeeks(c)) {
      w.activities = w.activities.filter((a) => !this.ch.removed.includes(a.id));
      w.activities.push(...(this.ch.added[w.id] ?? []).filter((a) => !this.ch.removed.includes(a.id)));
      for (const a of w.activities) {
        if (a.id in this.ch.hidden) a.hidden = this.ch.hidden[a.id];
        if (a.id in this.ch.renamed) a.name = this.ch.renamed[a.id];
      }
    }
  }

  add(weekId: string, a: Activity): void { (this.ch.added[weekId] ??= []).push(a); this.save(); }
  remove(id: string): void { this.ch.removed.push(id); this.save(); }
  setHidden(id: string, v: boolean): void { this.ch.hidden[id] = v; this.save(); }
  rename(id: string, name: string): void {
    this.ch.renamed[id] = name;
    for (const list of Object.values(this.ch.added)) for (const a of list) if (a.id === id) a.name = name;
    this.save();
  }
  reset(): void { this.ch = empty(); this.save(); }
  get count(): number { return Object.values(this.ch.added).reduce((n, l) => n + l.length, 0); }
}

export function allWeeks(c: Course): Week[] {
  return [c.intro, ...c.periods.flatMap((p) => p.units.flatMap((u) => u.weeks))];
}
