# ZeroChannel — Zero Trust Tunnels for Developers

## 🔓 Instant access to your internal services, without compromising your infrastructure.

Tired of setting up VPNs, SSH tunnels, or fragile dev proxies just to test a feature?

**ZeroChannel** gives developers what they really want:  
- 🚀 **fast, secure, ephemeral access** to internal services like Redis, PostgreSQL, MongoDB —  
- 💡 without giving them full access to your servers.

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
