# InMotion cPanel Git deployment

This uses .cpanel.yml and Passenger restarts, as Fireman does. The deployment
branch defaults to `deploy`; other branches are skipped. React is built and
backend production dependencies are installed on the host before copying files.

## One-time setup

1. **cPanel → Git Version Control → Create**: create a repository in a separate
   folder, e.g. `/home/n66cb45/repositories/bet-knesset`. Record its SSH clone URL.
2. Configure the Node/Passenger app with startup file `index.js`, URL at your
   domain root, and your application root, e.g. `/home/n66cb45/bet-knesset-deploy`.
   The repository and application directories must not overlap.
3. In cPanel Terminal create `$HOME/.config/bet-knesset-deploy.env` with actual values:

   ```sh
   DEPLOY_BRANCH=deploy
   APP_ROOT=/home/n66cb45/bet-knesset-deploy
   NODE_BIN=/opt/cpanel/ea-nodejs16/bin
   ```

   These defaults come from Fireman's account/Node path; confirm them for this app.
   NODE_BIN must contain Node and npm and match the app runtime. Prefer a supported
   Node version when available. Git, Bash, and rsync are required.
4. Configure DATABASE, JWT_SECRET (at least 32 bytes), NODE_ENV=production, and
   mail settings in the app environment or its root .env. Deployment preserves
   the app's existing .env and hosting configuration.
5. Authorize your computer's SSH public key under **cPanel → SSH Access**.

## Push to deploy

InMotion is connected to this GitHub repository and triggers deployment on push,
as configured for Fireman. Configure that integration to track `deploy` and
ensure the cPanel checkout also uses `deploy` so the script's branch guard passes.
No GitHub Actions secrets or additional Git remote are needed.

After committing changes on `deploy`, push to GitHub:

```sh
git push origin deploy
```

Check deployment logs in InMotion/cPanel. The GitHub connection is managed in
hosting settings, outside these repository files.

Only build and node_modules are mirrored with deletion; unrelated hosting files
are preserved. Copy/restart is not atomic. No live deployment has been performed.

See [cPanel's deployment guide](https://docs.cpanel.net/knowledge-base/web-services/guide-to-git-deployment/).
