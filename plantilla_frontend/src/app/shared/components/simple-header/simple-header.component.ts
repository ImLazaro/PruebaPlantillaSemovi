import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { InstitutionalButtonComponent } from '../buttons/institutional-button/institutional-button.component';

export interface ActionButton {
  text: string;
  route?: string;
  icon?: string;
  iconType?: 'material' | 'bootstrap';
  disabled?: boolean;
}

@Component({
  selector: 'app-simple-header',
  standalone: true,
  imports: [InstitutionalButtonComponent],
  templateUrl: './simple-header.component.html',
  styleUrl: './simple-header.component.css',
})
export class SimpleHeaderComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() showBackButton: boolean = false;
  @Input() backRoute: string = '/';
  @Input() backText: string = 'Regresar';
  @Input() backToHistory: boolean = false;
  @Input() actionButton?: ActionButton;
  @Output() actionClick = new EventEmitter<void>();

  constructor(private router: Router, private location: Location) {}

  navigateBack(): void {
    if (this.backToHistory) { this.location.back(); return; }
    try { this.router.navigate([this.backRoute]); } catch { /* noop */ }
  }

  onActionButton(): void {
    if (!this.actionButton) return;
    if (this.actionButton.route) {
      try { this.router.navigate([this.actionButton.route]); } catch { /* noop */ }
      return;
    }
    this.actionClick.emit();
  }
}
