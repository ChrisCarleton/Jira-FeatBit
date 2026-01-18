# featbit-jira

FeatBit integration for Jira using Atlassian Forge.

## Prerequisites

- Node.js (v18 or later)
- Yarn package manager
- Atlassian Forge CLI

## Setup

1. Install dependencies:

```bash
yarn install
```

2. Log in to Forge:

```bash
forge login
```

3. Register the app:

```bash
forge register
```

4. Update the `app.id` in `manifest.yml` with your registered app ID.

## Development

Build the TypeScript code:

```bash
yarn build
```

Deploy to Forge:

```bash
yarn deploy
```

Install the app in your Jira site:

```bash
forge install
```

Use tunnel for local development:

```bash
yarn tunnel
```

## Project Structure

- `src/index.ts` - Main resolver functions
- `manifest.yml` - Forge app configuration
- `tsconfig.json` - TypeScript configuration

## Resources

- [Forge Documentation](https://developer.atlassian.com/platform/forge/)
- [Forge API Reference](https://developer.atlassian.com/platform/forge/apis/)
