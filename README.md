# Short.io Link Sync Action

A GitHub Action that syncs short links from a `shortio.yaml` file in your repository to [Short.io](https://short.io).

## Features

- **Full sync** - Creates, updates, and deletes links to match your YAML config
- **Multiple domains** - Support for multiple Short.io domains in a single repository
- **Dry-run mode** - Preview changes before applying them
- **Git-driven** - Manage your short links with version control

## Usage

### 1. Create your Short.io API key

1. Go to [Short.io Integrations](https://app.short.io/settings/integrations/api-key)
2. Create a new API key with read/write permissions
3. Add it to your repository secrets as `SHORTIO_API_KEY`

### 2. Create `shortio.yaml` in your repository

```yaml
# shortio.yaml
domain: "short.example.com"

links:
  docs:
    url: "https://documentation.example.com/v2"
    title: "Documentation"
    tags:
      - docs
      - public

  api:
    url: "https://api.example.com"
    title: "API Reference"
```

For multiple domains, use YAML document streams (separated by `---`):

```yaml
# shortio.yaml
domain: "short.example.com"

links:
  docs:
    url: "https://documentation.example.com/v2"
  api:
    url: "https://api.example.com"

---

domain: "links.company.io"

links:
  blog:
    url: "https://blog.example.com"
    title: "Company Blog"
```

### 3. Create the workflow

```yaml
# .github/workflows/sync-links.yml
name: Sync Short Links

on:
  push:
    branches: [main]
    paths:
      - 'shortio.yaml'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shortio/link-sync-action@v1
        with:
          api_key: ${{ secrets.SHORTIO_API_KEY }}
```

## Configuration

### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `api_key` | Short.io API key | Yes | - |
| `config_path` | Path to shortio.yaml file | No | `shortio.yaml` |
| `dry_run` | Preview changes without applying | No | `false` |

### Action Outputs

| Output | Description |
|--------|-------------|
| `created` | Number of links created |
| `updated` | Number of links updated |
| `deleted` | Number of links deleted |
| `summary` | Summary of all changes |

### YAML Schema

The config file supports YAML streams (multiple documents separated by `---`). Each document represents a domain and its links.

**Document fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `domain` | string | Yes | Short.io domain for all links in this document |
| `links` | map | Yes | Map of slug → link configuration |

**Link fields** (within `links` map):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| *(key)* | string | Yes | The slug/short path (e.g., `docs` → short.example.com/docs) |
| `url` | string | Yes | Destination URL |
| `title` | string | No | Link title for organization |
| `tags` | string[] | No | Tags for categorization |

## Examples

### Dry-run mode

Preview what changes would be made without actually applying them:

```yaml
- uses: shortio/link-sync-action@v1
  with:
    api_key: ${{ secrets.SHORTIO_API_KEY }}
    dry_run: 'true'
```

### Custom config path

Use a different config file location:

```yaml
- uses: shortio/link-sync-action@v1
  with:
    api_key: ${{ secrets.SHORTIO_API_KEY }}
    config_path: 'config/links.yaml'
```

### Using outputs

Access the sync results in subsequent steps:

```yaml
- uses: shortio/link-sync-action@v1
  id: sync
  with:
    api_key: ${{ secrets.SHORTIO_API_KEY }}

- run: |
    echo "Created: ${{ steps.sync.outputs.created }}"
    echo "Updated: ${{ steps.sync.outputs.updated }}"
    echo "Deleted: ${{ steps.sync.outputs.deleted }}"
```

## Sync Behavior

The action performs a **full sync** between your YAML config and Short.io:

1. **Create** - Links in YAML but not in Short.io are created
2. **Update** - Links where URL, title, or tags differ are updated
3. **Delete** - Links in Short.io but not in YAML are deleted

Links are identified by the combination of `domain` and `slug`. Changing a slug will result in the old link being deleted and a new one created.

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build

# Run tests
npm test
```

## License

MIT
