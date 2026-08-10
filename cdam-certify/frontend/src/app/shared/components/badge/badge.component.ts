import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeTone = 'emerald' | 'clay' | 'sand' | 'red';

const TONE_CLASSES: Record<BadgeTone, string> = {
  emerald: 'bg-emerald-50 text-emerald-800',
  clay: 'bg-clay-50 text-clay-800',
  sand: 'bg-sand-100 text-sand-800',
  red: 'bg-red-50 text-red-800',
};

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" [ngClass]="toneClass">
      <ng-content></ng-content>
    </span>
  `,
})
export class BadgeComponent {
  @Input() tone: BadgeTone = 'sand';

  get toneClass(): string {
    return TONE_CLASSES[this.tone];
  }
}
