import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MatrixRole {
  id: string;
  label: string;
}

export interface MatrixPermission {
  id: string;
  label: string;
}

export interface MatrixGrant {
  roleId: string;
  permissionId: string;
}

@Component({
  selector: 'app-permission-matrix-lite',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  styles: [`
    :host { display: block; }
    .pml-wrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: var(--radius-lg); background: #fff; }
    table { width: 100%; border-collapse: collapse; min-width: 640px; }
    th, td { border-bottom: 1px solid #f3f4f6; padding: 10px 12px; font-size: var(--font-size-sm); }
    th { background: #f9fafb; text-align: left; color: #374151; font-weight: 700; }
    td { color: #111827; }
    .pml-check { color: #16a34a; font-family: 'Material Symbols Outlined'; font-size: 1.1rem; }
    .pml-empty { color: #d1d5db; font-size: 1.1rem; }
    .pml-role { font-weight: 700; white-space: nowrap; }
  `],
  template: `
    <div class="pml-wrap">
      <table>
        <thead>
          <tr>
            <th>Rol</th>
            <th *ngFor="let p of permissions">{{ p.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of roles">
            <td class="pml-role">{{ r.label }}</td>
            <td *ngFor="let p of permissions" style="text-align:center;">
              <span *ngIf="has(r.id, p.id)" class="pml-check">check_circle</span>
              <span *ngIf="!has(r.id, p.id)" class="pml-empty">-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `
})
export class PermissionMatrixLiteComponent {
  @Input() roles: MatrixRole[] = [];
  @Input() permissions: MatrixPermission[] = [];
  @Input() grants: MatrixGrant[] = [];

  private cache = new Set<string>();

  ngOnChanges(): void {
    this.cache = new Set(this.grants.map((g) => `${g.roleId}:${g.permissionId}`));
  }

  has(roleId: string, permissionId: string): boolean {
    return this.cache.has(`${roleId}:${permissionId}`);
  }
}
