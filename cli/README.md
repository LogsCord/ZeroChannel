# ZeroChannel — Zero Trust Tunnels for Developers

## 🔓 Instant access to your internal services, without compromising your infrastructure.

Tired of setting up VPNs, SSH tunnels, or fragile dev proxies just to test a feature?

**ZeroChannel** gives developers what they really want:  
🚀 **fast, secure, ephemeral access** to internal services like Redis, PostgreSQL, MongoDB —  
💡 without giving them full access to your servers.

## 💥 Why use ZeroChannel?

- You want to let developers **test against real services**, but **not your prod**.
- You don’t want to waste hours creating and syncing Docker setups for each new contributor.
- You don’t want to maintain **complex VPNs, bastion hosts, or hand-crafted port forwarding**.
- You need to **control, log, and expire access** — without making it painful.

## ✅ With ZeroChannel, you get:

- 🔐 **Secure tunnels scoped per user, per environment, per service**
- 📡 **WebSocket-based full-duplex TCP proxying** (Redis, MongoDB, etc.)
- 🛠️ **A simple CLI** to log in and start tunnels in seconds
- 🧾 **YAML config**, no JSON, no vendor lock-in
- 🧼 **Ephemeral tunnels** that clean up automatically
- 📍 Support for **user-defined port mapping** via project YAML files
- ⚙️ Ready for team usage, CI pipelines, and self-hosting

## 🛠️ How it works

A developer runs:

```bash
$ zerochannel login --server https://zero.animeo.dev
$ zerochannel start dev
```

And gets local ports auto-assigned (or mapped explicitly):

```
✔ Connected to environment: dev
🌐 redis ➝ localhost:6379
🌐 nginx ➝ localhost:8080
```

Each tunnel is authenticated, scoped, and automatically shut down after inactivity.

## 📦 No VPN. No SSH. No nonsense.

ZeroChannel is your **zero trust gateway for internal developer access**:

* Replace your fragile SSH setup with a secure, traceable system.
* Empower contributors to work faster, without compromising your infra.
* Keep control over what runs, when, and who has access — always.

## 🚧 Status

* ✅ Backend ready (auth + WebSocket tunnels)
* ✅ CLI implemented (`@zerochannel/cli`)
* 🛠️ YAML config support for port overrides
* 🔐 Password-based auth (OAuth2 coming soon)
* 🧪 Full CI-ready flows and team-level policies (planned)

## 🧠 Built for:

* Dev teams who need internal service access **without risk**
* Self-hosted tools like Redis, MongoDB, Postgres
* Solo founders & open source maintainers who want to collaborate safely

## ✨ Coming next

* OAuth2 / SSO login
* Tunnel observability & logs
* Automatic container provisioning per user
* Encrypted audit trails
* Browser-compatible tunnel client (WIP)

## 🛡️ Stay secure. Stay productive.

Use ZeroChannel.
Focus on building. We'll handle the access.

> Made with ❤️ for [Animeo](https://animeo.tv), [Discordless](https://discordless.dev), and any team that values security **and** velocity.
