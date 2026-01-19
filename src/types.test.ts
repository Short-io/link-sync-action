import { describe, it, expect } from 'vitest';
import { getLinkKey, getLinksArray } from './types.js';
import type { YamlConfig } from './types.js';

describe('getLinkKey', () => {
  it('creates correct key from domain and slug', () => {
    expect(getLinkKey('example.com', 'my-slug')).toBe('example.com/my-slug');
  });

  it('handles empty slug', () => {
    expect(getLinkKey('example.com', '')).toBe('example.com/');
  });

  it('handles special characters', () => {
    expect(getLinkKey('sub.domain.com', 'path/to/resource')).toBe('sub.domain.com/path/to/resource');
  });
});

describe('getLinksArray', () => {
  it('converts single document to array with slugs and domain', () => {
    const config: YamlConfig = {
      documents: [{
        domain: 'short.io',
        links: {
          'link-a': { url: 'https://a.com' },
          'link-b': { url: 'https://b.com', title: 'Link B' },
        },
      }],
    };
    const links = getLinksArray(config);
    expect(links).toHaveLength(2);
    expect(links).toContainEqual({
      slug: 'link-a',
      url: 'https://a.com',
      domain: 'short.io',
      title: undefined,
      tags: undefined,
    });
    expect(links).toContainEqual({
      slug: 'link-b',
      url: 'https://b.com',
      domain: 'short.io',
      title: 'Link B',
      tags: undefined,
    });
  });

  it('returns empty array for empty documents', () => {
    const config: YamlConfig = { documents: [] };
    const links = getLinksArray(config);
    expect(links).toEqual([]);
  });

  it('returns empty array for document with empty links', () => {
    const config: YamlConfig = {
      documents: [{ domain: 'short.io', links: {} }],
    };
    const links = getLinksArray(config);
    expect(links).toEqual([]);
  });

  it('preserves tags', () => {
    const config: YamlConfig = {
      documents: [{
        domain: 'short.io',
        links: {
          'tagged-link': {
            url: 'https://example.com',
            tags: ['tag1', 'tag2'],
          },
        },
      }],
    };
    const links = getLinksArray(config);
    expect(links[0].tags).toEqual(['tag1', 'tag2']);
  });

  it('combines links from multiple documents', () => {
    const config: YamlConfig = {
      documents: [
        {
          domain: 'first.io',
          links: {
            'link-a': { url: 'https://a.com' },
          },
        },
        {
          domain: 'second.io',
          links: {
            'link-b': { url: 'https://b.com' },
          },
        },
      ],
    };
    const links = getLinksArray(config);
    expect(links).toHaveLength(2);
    expect(links[0].domain).toBe('first.io');
    expect(links[1].domain).toBe('second.io');
  });

  it('assigns correct domain from each document', () => {
    const config: YamlConfig = {
      documents: [
        {
          domain: 'domain-a.io',
          links: {
            'link1': { url: 'https://1.com' },
            'link2': { url: 'https://2.com' },
          },
        },
        {
          domain: 'domain-b.io',
          links: {
            'link3': { url: 'https://3.com' },
          },
        },
      ],
    };
    const links = getLinksArray(config);
    expect(links).toHaveLength(3);
    expect(links.filter(l => l.domain === 'domain-a.io')).toHaveLength(2);
    expect(links.filter(l => l.domain === 'domain-b.io')).toHaveLength(1);
  });
});
