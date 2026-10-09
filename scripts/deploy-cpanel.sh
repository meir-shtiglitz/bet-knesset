#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd "$(dirname "$0")/.." && pwd -P)
cd "$repo_root"
config_file="$HOME/.config/bet-knesset-deploy.env"
if [[ -f "$config_file" ]]; then source "$config_file"; fi
DEPLOY_BRANCH=${DEPLOY_BRANCH:-deploy}
APP_ROOT=${APP_ROOT:-/home/n66cb45/bet-knesset-deploy}
NODE_BIN=${NODE_BIN:-/opt/cpanel/ea-nodejs16/bin}
branch=$(git symbolic-ref --short HEAD)
if [[ "$branch" != "$DEPLOY_BRANCH" ]]; then
    printf 'Skipping branch %s; deployment branch is %s.\n' "$branch" "$DEPLOY_BRANCH"
    exit 0
fi
[[ "$APP_ROOT" =~ ^/home/[^/]+/.+ && "$APP_ROOT" != *'/../'* && "$APP_ROOT" != */.. ]]
mkdir -p "$APP_ROOT"
app_root=$(cd "$APP_ROOT" && pwd -P)
if [[ "$app_root" == "$repo_root" || "$app_root" == "$repo_root/"* || "$repo_root" == "$app_root/"* ]]; then
    echo 'Repository and application directories must not overlap.' >&2
    exit 1
fi
[[ -x "$NODE_BIN/node" && -x "$NODE_BIN/npm" ]]
export PATH="$NODE_BIN:$PATH"
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
    CI=false REACT_APP_API_URL=/api BUILD_PATH="$staging/build" node node_modules/react-scripts/scripts/build.js
)
rsync -a --exclude=node_modules --exclude=build --exclude=.env --exclude='.env.*' --exclude=test server/ "$staging/"
npm ci --omit=dev --prefix "$staging"
# Only copy app files after build and dependency installation succeed.
rsync -a --exclude=build --exclude=node_modules "$staging/" "$app_root/"
mkdir -p "$app_root/build" "$app_root/node_modules" "$app_root/tmp"
rsync -a --delete "$staging/build/" "$app_root/build/"
rsync -a --delete "$staging/node_modules/" "$app_root/node_modules/"
touch "$app_root/tmp/restart.txt"
echo 'Deployment complete; Passenger restart requested.'
