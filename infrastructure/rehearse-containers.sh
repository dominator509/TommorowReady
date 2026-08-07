#!/usr/bin/env sh
set -eu

[ "${NODE_ENV:-development}" != "production" ] || {
  echo "container rehearsal: FAIL - production is forbidden" >&2
  exit 1
}
set -a
. ./.env
set +a

api_name=tomorrowready-api-rehearsal
web_name=tomorrowready-web-rehearsal
cleanup() {
  docker rm -f "$api_name" "$web_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for name in "$api_name" "$web_name"; do
  if docker inspect "$name" >/dev/null 2>&1; then
    echo "container rehearsal: FAIL - container already exists: $name" >&2
    exit 1
  fi
done

database_url="postgresql://tomorrowready_app:${POSTGRES_APP_PASSWORD}@host.docker.internal:25432/tomorrowready"
docker run --detach --name "$api_name" --add-host host.docker.internal:host-gateway \
  --env-file .env --env HOST=0.0.0.0 --env DATABASE_URL="$database_url" \
  --publish 127.0.0.1:24000:4000 tomorrowready-api:local >/dev/null
docker run --detach --name "$web_name" --publish 127.0.0.1:23000:3000 \
  tomorrowready-web:local >/dev/null

wait_for_url() {
  url=$1
  container_name=$2
  i=0
  until curl -fsS "$url" >/dev/null 2>&1; do
    i=$((i + 1))
    [ "$i" -lt 30 ] || {
      docker logs "$container_name" >&2
      return 1
    }
    sleep 2
  done
}
wait_for_url http://127.0.0.1:24000/health/ready "$api_name"
wait_for_url http://127.0.0.1:23000/ "$web_name"

[ "$(docker inspect --format '{{.Config.User}}' tomorrowready-api:local)" = node ]
[ "$(docker inspect --format '{{.Config.User}}' tomorrowready-web:local)" = node ]
[ "$(docker inspect --format '{{.Config.User}}' tomorrowready-worker:local)" = node ]
echo "container rehearsal: ok"
