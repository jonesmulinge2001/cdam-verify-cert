import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(title: string, description?: string): void {
    this.push('success', title, description);
  }

  error(title: string, description?: string): void {
    this.push('error', title, description);
  }

  info(title: string, description?: string): void {
    this.push('info', title, description);
  }

  warning(title: string, description?: string): void {
    this.push('warning', title, description);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  private push(variant: ToastVariant, title: string, description?: string): void {
    const toast: Toast = { id: nextId++, variant, title, description };
    this.toasts.update((list) => [...list, toast]);
    setTimeout(() => this.dismiss(toast.id), 4500);
  }
}
