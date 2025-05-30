# ZeroChannel — Tunneling sécurisé Zero Trust pour environnements de développement

**ZeroChannel** est un serveur de contrôle et de tunneling sécurisé permettant aux développeurs d'accéder à des services internes (Redis, PostgreSQL, etc.) à distance, **sans jamais exposer l'infrastructure complète**.

💡 Conçu pour remplacer les VPNs ou SSH bastions dans des contextes de développement distribué, ZeroChannel permet un accès **éphémère, granulaire, et entièrement journalisé** à des environnements internes.

## ✨ Fonctionnalités principales

- 🔐 Authentification par mot de passe sécurisé (SHA256 + JWT)
- 🛡️ Accès Zero Trust scoped à des environnements/services définis
- 📦 Fichier de configuration YAML centralisé
- 📡 Tunnel WebSocket full binaire vers des services TCP (ex: Redis)
- 🧰 Serveur TCP local auto-proxyé par le client CLI (à venir)
- 📜 Logs et auditabilité des connexions possibles (future V2)

## 📁 Exemple d'usage

Un développeur exécute :

```bash
$ zerochannel login --server https://zero.logscord.xyz
$ zerochannel start dev
```
