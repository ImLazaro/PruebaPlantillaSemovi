import { Injectable } from '@angular/core';

export interface AppConfig {
  title: string;
  subtitle?: string;
  logo?: string;
  footerLogo?: string;
  orgName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private config: AppConfig = {
    title: 'Frontend Template',
    subtitle: 'Aplicación web',
    orgName: 'Frontend Template'
  };

  constructor() {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  getAll(): AppConfig {
    return { ...this.config };
  }

  set(config: Partial<AppConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
