## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## OpenSpec (spec-driven workflow)

This project uses OpenSpec (`openspec/`, schema `spec-driven`, artifacts in Chinese).

- Before implementing a feature (steps 3–10 of the blog upgrade), create a change under
  `openspec/changes/<change-name>/` with `proposal.md`, `specs/<capability>/spec.md`
  (delta: ADDED Requirements + GIVEN/WHEN/THEN scenarios), `design.md`, and `tasks.md`.
- Get approval on the spec, then implement against `tasks.md`; archive the change afterward so
  the delta merges into `openspec/specs/`.
- Commands: `npx @fission-ai/openspec@latest {new,list,status,validate,archive}` and the
  `/opsx-*` Trae commands in `.trae/commands/`.
- CI runs `openspec validate --strict`; specs must stay in sync with implemented behavior.
- New UI strings must be added to both `src/i18n/lang/zh.ts` and `src/i18n/lang/en.ts`
  (and the `UIStrings` type). Every page needs zh + en thin wrapper pages or it 404s.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
