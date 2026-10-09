# InMotion cPanel deployment

The Git repository and Node application share the folder
`/home/n66cb45/bet-knesset-deploy`, matching the current hosting setup.
Startup file: `index.js`. It starts the backend under `server/`.
Builds and backend dependencies stay under `server/build` and
`server/node_modules`. Deployment does not flatten source or overwrite tracked
package files, and leaves cPanel's root node_modules symlink untouched.

InMotion's existing GitHub integration should track the `deploy` branch.
Push changes using `git push origin deploy`. The cPanel Git checkout must also
use `deploy`; other branches are skipped.

## Current hosting settings

The defaults match the screenshots:

- Application root: `bet-knesset-deploy`
- Startup file: `index.js`
- Application URL path: `/bet`
- Node activation: `$HOME/nodevenv/bet-knesset-deploy/16/bin/activate`

Set DATABASE, JWT_SECRET (at least 32 bytes), NODE_ENV=production, and mail
settings in the Node app's environment variables. Existing environment variables
take priority over root/server .env files. No .env files are uploaded by Git.

Optional overrides belong in `$HOME/.config/bet-knesset-deploy.env`:

```sh
DEPLOY_BRANCH=deploy
APP_ROOT=/home/n66cb45/bet-knesset-deploy
APP_BASE_PATH=/bet
NODE_ACTIVATE=/home/n66cb45/nodevenv/bet-knesset-deploy/16/bin/activate
```

For a domain-root URL use `APP_BASE_PATH=`. For a different subpath, set
APP_BASE_PATH in both this deployment config and the Node app environment.
Rebuild after changing URL paths.
Alternatively set NODE_BIN to a directory containing the correct Node and npm.
The hosting server needs rsync and enough resources to build React.

## Replacing the cPanel starter app

cPanel created a starter root index.js, which is now a tracked application file.
Before pulling this commit, use File Manager to rename the existing starter
index.js to index.js.cpanel-starter so Git can place the real entry point there.
In Git Version Control select Update from Remote, then Deploy HEAD Commit.
In Setup Node.js App select Save and Restart. Check deployment/Passenger logs
if the build or app fails. Do not delete the repository or environment variables.

Only the ignored server/build and server/node_modules directories are mirrored
with deletion. Existing hosting files and Git source are retained.
Dependency installation/build failures stop before replacing those directories;
file synchronization and restart are not atomic.

See [cPanel's deployment guide](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/).
