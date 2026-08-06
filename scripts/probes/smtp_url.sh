#!/usr/bin/env sh
set -eu
case "$SMTP_URL" in smtp://*) exit 0;; *) exit 1;; esac
