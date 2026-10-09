#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd "$(dirname "$0")/.." && pwd -P)
cd "$repo_root"
config_file="$HOME/.config/bet-knesset-deploy.env"
if [[ -f "$config_file" ]]; then source "$config_file"; fi
DEPLOY_BRANCH=${DEPLOY_BRANCH:-deploy}
APP_ROOT=${APP_ROOT:-$repo_root}
APP_BASE_PATH=${APP_BASE_PATH:-/bet}
NODE_ACTIVATE=${NODE_ACTIVATE:-$HOME/nodevenv/bet-knesset-deploy/16/bin/activate}
branch=$(git symbolic-ref --short HEAD)
if [[ "$branch" != "$DEPLOY_BRANCH" ]]; then
    printf 'Skipping branch %s; deployment branch is %s.\n' "$branch" "$DEPLOY_BRANCH"
    exit 0
fi
app_root=$(cd "$APP_ROOT" && pwd -P)
if [[ "$app_root" != "$repo_root" ]]; then
    echo 'This deployment expects the cPanel app root to be the Git repository.' >&2
    exit 1
fi
APP_BASE_PATH=${APP_BASE_PATH%/}
[[ -z "$APP_BASE_PATH" || "$APP_BASE_PATH" =~ ^(/[a-zA-Z0-9_-]+)+$ ]]
if [[ -n "${NODE_BIN:-}" ]]; then
    [[ -x "$NODE_BIN/node" && -x "$NODE_BIN/npm" ]]
    export PATH="$NODE_BIN:$PATH"
else
    [[ -f "$NODE_ACTIVATE" ]]
    set +u
    source "$NODE_ACTIVATE"
    set -u
fi
command -v node >/dev/null
command -v npm >/dev/null
command -v rsync >/dev/null
staging=$(mktemp -d)
trap 'rm -rf "$staging"' EXIT
npm ci --prefix client
node_major=$(node -p 'process.versions.node.split(".")[0]')
if (( node_major >= 17 )); then
    export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--openssl-legacy-provider"
fi
(
    cd client
    CI=false PUBLIC_URL="$APP_BASE_PATH" REACT_APP_API_URL="$APP_BASE_PATH/api" BUILD_PATH="$staging/build" node node_modules/react-scripts/scripts/build.js
)
# Install in staging before replacing the app's existing dependencies/build.
cp server/package.json server/package-lock.json "$staging/"
npm ci --omit=dev --prefix "$staging"
mkdir -p server/build server/node_modules tmp
rsync -a --delete "$staging/build/" server/build/
rsync -a --delete "$staging/node_modules/" server/node_modules/
touch tmp/restart.txt
echo 'Deployment complete; Passenger restart requested.'
