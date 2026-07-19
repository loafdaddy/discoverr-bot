# Discoverr — roadmap

High-level history and direction. Day-to-day status: [TODO.md](TODO.md).  
Install / contribute: [SETUP.md](../SETUP.md) · [CONTRIBUTING.md](../CONTRIBUTING.md).  
Version history: [RELEASES.md](RELEASES.md).

## Direction

Stay a **small ARR companion**: Discord recommendations + Seerr request buttons. Prefer better discovery quality and reliable Seerr/Discord behaviour over becoming a full request portal or media manager.

## Themes

1. **Discovery quality** — less blockbuster repetition, clearer category identity
2. **Operator UX** — boring Docker Compose installs (no host Node), honest docs, predictable env
3. **Integrations** — solid Seerr status/request handling; TMDb as the metadata source
4. **Project hygiene** — TypeScript, tests for filter/status logic, SemVer releases

## Milestones

- **Pre-2.0** — unversioned JavaScript bot
- **v2.0.0** — TypeScript rewrite + diversified discovery — see [RELEASES.md](RELEASES.md)
- **v2.1.0** — `POST_TIME` env for daily schedule — see [RELEASES.md](RELEASES.md)
- **Next** — items under **Next** in [TODO.md](TODO.md)

## Non-goals (for now)

- Per-user Discord preference profiles / recommendation accounts
- Replacing Seerr’s UI
- Flatpak / desktop packaging (this is a server-side bot)
