import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseConfig, getUniqueDomains, ConfigError } from './config.js';

const TEST_DIR = path.join(process.cwd(), '.test-config');
const TEST_FILE = path.join(TEST_DIR, 'test-config.yaml');

function writeTestConfig(content: string): void {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(TEST_FILE, content);
}

describe('parseConfig', () => {
  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('parses valid single document config', () => {
    writeTestConfig(`
domain: short.io
links:
  my-link:
    url: https://example.com
  another-link:
    url: https://test.com
    title: Test Link
    tags:
      - tag1
      - tag2
`);
    const config = parseConfig(TEST_FILE);
    expect(config.documents).toHaveLength(1);
    expect(config.documents[0].domain).toBe('short.io');
    expect(Object.keys(config.documents[0].links)).toHaveLength(2);
    expect(config.documents[0].links['my-link']).toEqual({
      url: 'https://example.com',
      title: undefined,
      tags: undefined,
    });
    expect(config.documents[0].links['another-link']).toEqual({
      url: 'https://test.com',
      title: 'Test Link',
      tags: ['tag1', 'tag2'],
    });
  });

  it('parses multiple YAML documents (stream)', () => {
    writeTestConfig(`
domain: first.io
links:
  link1:
    url: https://first.com
---
domain: second.io
links:
  link2:
    url: https://second.com
`);
    const config = parseConfig(TEST_FILE);
    expect(config.documents).toHaveLength(2);
    expect(config.documents[0].domain).toBe('first.io');
    expect(config.documents[1].domain).toBe('second.io');
    expect(config.documents[0].links['link1'].url).toBe('https://first.com');
    expect(config.documents[1].links['link2'].url).toBe('https://second.com');
  });

  it('throws ConfigError for missing file', () => {
    expect(() => parseConfig('/nonexistent/path.yaml')).toThrow(ConfigError);
    expect(() => parseConfig('/nonexistent/path.yaml')).toThrow('Config file not found');
  });

  it('throws ConfigError for empty file', () => {
    writeTestConfig('');
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Config file is empty');
  });

  it('throws ConfigError for non-object document', () => {
    writeTestConfig('just a string');
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1 must be an object');
  });

  it('throws ConfigError when links is an array (old format)', () => {
    writeTestConfig(`
domain: short.io
links:
  - slug: my-link
    url: https://example.com
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1 must have a "links" map');
  });

  it('throws ConfigError for missing links', () => {
    writeTestConfig(`
domain: short.io
other_key: value
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1 must have a "links" map');
  });

  it('throws ConfigError for missing domain', () => {
    writeTestConfig(`
links:
  my-link:
    url: https://example.com
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1 must have a non-empty "domain" string');
  });

  it('throws ConfigError for empty domain', () => {
    writeTestConfig(`
domain: ""
links:
  my-link:
    url: https://example.com
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1 must have a non-empty "domain" string');
  });

  it('throws ConfigError for missing url', () => {
    writeTestConfig(`
domain: short.io
links:
  my-link:
    title: Missing URL
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1: link "my-link" must have a non-empty "url" string');
  });

  it('throws ConfigError for invalid URL', () => {
    writeTestConfig(`
domain: short.io
links:
  my-link:
    url: not-a-valid-url
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1: link "my-link" has invalid URL');
  });

  it('throws ConfigError for non-string title', () => {
    writeTestConfig(`
domain: short.io
links:
  my-link:
    url: https://example.com
    title: 123
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1: link "my-link" "title" must be a string');
  });

  it('throws ConfigError for non-array tags', () => {
    writeTestConfig(`
domain: short.io
links:
  my-link:
    url: https://example.com
    tags: not-an-array
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1: link "my-link" "tags" must be an array');
  });

  it('throws ConfigError for non-string tag values', () => {
    writeTestConfig(`
domain: short.io
links:
  my-link:
    url: https://example.com
    tags:
      - valid
      - 123
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 1: link "my-link" tags must all be strings');
  });

  it('throws ConfigError for duplicate slug within same domain', () => {
    writeTestConfig(`
domain: short.io
links:
  my-link:
    url: https://example.com
---
domain: short.io
links:
  my-link:
    url: https://other.com
`);
    expect(() => parseConfig(TEST_FILE)).toThrow(ConfigError);
    expect(() => parseConfig(TEST_FILE)).toThrow('Duplicate link: short.io/my-link');
  });

  it('allows same slug on different domains', () => {
    writeTestConfig(`
domain: first.io
links:
  my-link:
    url: https://first.com
---
domain: second.io
links:
  my-link:
    url: https://second.com
`);
    const config = parseConfig(TEST_FILE);
    expect(config.documents).toHaveLength(2);
  });

  it('reports errors in correct document number', () => {
    writeTestConfig(`
domain: first.io
links:
  link1:
    url: https://valid.com
---
domain: second.io
links:
  link2:
    url: invalid-url
`);
    expect(() => parseConfig(TEST_FILE)).toThrow('Document 2: link "link2" has invalid URL');
  });
});

describe('getUniqueDomains', () => {
  it('returns unique domains from single document', () => {
    const config = {
      documents: [{
        domain: 'short.io',
        links: {
          'link1': { url: 'https://example.com' },
          'link2': { url: 'https://test.com' },
        },
      }],
    };
    const domains = getUniqueDomains(config);
    expect(domains).toHaveLength(1);
    expect(domains).toContain('short.io');
  });

  it('returns unique domains from multiple documents', () => {
    const config: Parameters<typeof getUniqueDomains>[0] = {
      documents: [
        { domain: 'first.io', links: { 'a': { url: 'https://a.com' } } },
        { domain: 'second.io', links: { 'b': { url: 'https://b.com' } } },
        { domain: 'first.io', links: { 'c': { url: 'https://c.com' } } },
      ],
    };
    const domains = getUniqueDomains(config);
    expect(domains).toHaveLength(2);
    expect(domains).toContain('first.io');
    expect(domains).toContain('second.io');
  });

  it('returns empty array for empty documents', () => {
    const config = { documents: [] };
    const domains = getUniqueDomains(config);
    expect(domains).toEqual([]);
  });
});
