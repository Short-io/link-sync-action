import * as fs from 'fs';
import { parseAllDocuments } from 'yaml';
import type { YamlConfig, YamlDocument, YamlLinkValue } from './types.js';
import { getLinksArray } from './types.js';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function parseConfig(configPath: string): YamlConfig {
  if (!fs.existsSync(configPath)) {
    throw new ConfigError(`Config file not found: ${configPath}`);
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const yamlDocs = parseAllDocuments(content);

  if (yamlDocs.length === 0) {
    throw new ConfigError('Config file is empty');
  }

  const documents: YamlDocument[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < yamlDocs.length; i++) {
    const doc = yamlDocs[i];
    if (doc.errors.length > 0) {
      throw new ConfigError(`YAML parse error in document ${i + 1}: ${doc.errors[0].message}`);
    }
    const parsed = doc.toJS();
    const validated = validateDocument(parsed, i + 1, seen);
    documents.push(validated);
  }

  return { documents };
}

function validateDocument(doc: unknown, docIndex: number, seen: Set<string>): YamlDocument {
  if (!doc || typeof doc !== 'object') {
    throw new ConfigError(`Document ${docIndex} must be an object`);
  }

  const obj = doc as Record<string, unknown>;

  if (typeof obj.domain !== 'string' || obj.domain.trim() === '') {
    throw new ConfigError(`Document ${docIndex} must have a non-empty "domain" string`);
  }

  const domain = obj.domain;

  if (!obj.links || typeof obj.links !== 'object' || Array.isArray(obj.links)) {
    throw new ConfigError(`Document ${docIndex} must have a "links" map (use slug as key)`);
  }

  const linksMap = obj.links as Record<string, unknown>;
  const validatedLinks: Record<string, YamlLinkValue> = {};

  for (const [slug, link] of Object.entries(linksMap)) {
    if (!slug || slug.trim() === '') {
      throw new ConfigError(`Document ${docIndex}: link slug (key) must be a non-empty string`);
    }

    const key = `${domain}/${slug}`;
    if (seen.has(key)) {
      throw new ConfigError(`Duplicate link: ${key}`);
    }
    seen.add(key);

    validatedLinks[slug] = validateLink(link, slug, docIndex);
  }

  return { domain, links: validatedLinks };
}

function validateLink(link: unknown, slug: string, docIndex: number): YamlLinkValue {
  if (!link || typeof link !== 'object') {
    throw new ConfigError(`Document ${docIndex}: link "${slug}" must be an object`);
  }

  const obj = link as Record<string, unknown>;

  if (typeof obj.url !== 'string' || obj.url.trim() === '') {
    throw new ConfigError(`Document ${docIndex}: link "${slug}" must have a non-empty "url" string`);
  }

  try {
    new URL(obj.url);
  } catch {
    throw new ConfigError(`Document ${docIndex}: link "${slug}" has invalid URL: ${obj.url}`);
  }

  if (obj.title !== undefined && typeof obj.title !== 'string') {
    throw new ConfigError(`Document ${docIndex}: link "${slug}" "title" must be a string`);
  }

  if (obj.tags !== undefined) {
    if (!Array.isArray(obj.tags)) {
      throw new ConfigError(`Document ${docIndex}: link "${slug}" "tags" must be an array`);
    }
    for (const tag of obj.tags) {
      if (typeof tag !== 'string') {
        throw new ConfigError(`Document ${docIndex}: link "${slug}" tags must all be strings`);
      }
    }
  }

  return {
    url: obj.url,
    title: obj.title as string | undefined,
    tags: obj.tags as string[] | undefined,
  };
}

export function getUniqueDomains(config: YamlConfig): string[] {
  const domains = new Set<string>();
  for (const link of getLinksArray(config)) {
    domains.add(link.domain);
  }
  return Array.from(domains);
}
