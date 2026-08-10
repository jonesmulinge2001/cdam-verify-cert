import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-rows',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2.5">
      @for (row of rowsArray; track $index) {
        <div class="skeleton h-12 rounded-lg"></div>
      }
    </div>
  `,
})
export class SkeletonRowsComponent {
  @Input() rows = 5;

  get rowsArray(): number[] {
    return Array.from({ length: this.rows });
  }
}
