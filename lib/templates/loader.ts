/**
 * Template loader — deep-merges defaults with user overrides from hooks.config.json.
 */

import type { AllTemplates, TemplateVars } from './types';
import { DEFAULT_TEMPLATES, TONE_TEMPLATES } from './defaults';
import { loadConfig } from '../config';

let cachedTemplates: AllTemplates | null = null;

/**
 * Deep merge source into target.
 */
function deepMerge(target: unknown, source: unknown): unknown {
  if (
    source && typeof source === 'object' && !Array.isArray(source) &&
    target && typeof target === 'object' && !Array.isArray(target)
  ) {
    const result = { ...(target as Record<string, unknown>) };
    for (const key of Object.keys(source as Record<string, unknown>)) {
      result[key] = deepMerge(
        (target as Record<string, unknown>)[key],
        (source as Record<string, unknown>)[key],
      );
    }
    return result;
  }
  return source !== undefined ? source : target;
}

/**
 * Load templates, merging user overrides with defaults.
 */
export function loadTemplates(): AllTemplates {
  if (cachedTemplates) return cachedTemplates;

  const config = loadConfig();
  const tone = config.tts?.templateTone ?? 'default';
  const baseTemplates = TONE_TEMPLATES[tone] ?? DEFAULT_TEMPLATES;
  const userTemplates = config.templates ?? {};

  cachedTemplates = deepMerge(baseTemplates, userTemplates) as AllTemplates;
  return cachedTemplates;
}

/**
 * Substitute {{variable}} placeholders in a template string.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{\{projectName\}\}/g, vars.projectName)
    .replace(/\{\{userName\}\}/g, vars.userName)
    .replace(/\{\{activity\}\}/g, vars.activity ?? '')
    .replace(/\{\{lastActivity\}\}/g, vars.lastActivity ?? '')
    .replace(/\{\{count\}\}/g, String(vars.count ?? 0))
    .replace(/\{\{agentName\}\}/g, vars.agentName ?? '')
    .replace(/\{\{description\}\}/g, vars.description ?? '');
}

/**
 * Pick a random template from an array and render it.
 */
export function pickAndRender(templates: string[], vars: TemplateVars): string {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return renderTemplate(template, vars);
}

/**
 * Reset template cache (for testing).
 */
export function resetTemplateCache(): void {
  cachedTemplates = null;
}
