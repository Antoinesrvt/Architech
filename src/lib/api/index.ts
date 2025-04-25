import { LocalTemplateService } from './local';
import { TemplateService } from './types';

let apiInstance: TemplateService | null = null;

export function getApiService(): TemplateService {
  if (!apiInstance) {
    apiInstance = new LocalTemplateService();
  }
  return apiInstance;
}

export * from './types'; 