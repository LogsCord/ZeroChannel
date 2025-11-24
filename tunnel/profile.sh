lxc profile create zc-build || true
cat <<'YML' | lxc profile edit zc-build
config:
  limits.cpu: "2"
  limits.memory: 2GB
  security.nesting: "true"       # utile pour user namespaces
  security.privileged: "false"
  raw.lxc: |
    lxc.apparmor.profile = generated
    lxc.apparmor.allow_incomplete = 0
    lxc.cap.drop = audit_control audit_read mac_admin mac_override sys_admin sys_boot sys_module sys_nice sys_pacct sys_ptrace sys_time sys_tty_config
description: ZeroChannel build profile
devices:
  root:
    path: /
    pool: default
    type: disk
YML
