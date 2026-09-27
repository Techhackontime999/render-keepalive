# Shop Seed Art Render Keepalive

A minimal Vercel serverless endpoint that checks the Render service's `/healthz` endpoint when called. An external scheduler can call this endpoint every 10 minutes to help keep the Render Free Tier service active. This project does not run its own scheduler.

## Project Structure

```text
shop-seed-art-render-keepalive/
|-- api/
|   `-- keep-alive.js
|-- .gitignore
|-- package.json
`-- README.md
```

## Configuration

Set these variables in the Vercel project under **Settings > Environment Variables**:

| Variable | Purpose |
| --- | --- |
| `RENDER_URL` | Render health URL. Defaults to `https://shop-seed-art.onrender.com/healthz` when omitted. |
| `KEEPALIVE_SECRET` | Optional bearer token required by the endpoint when configured. Set a long, random value before enabling the external scheduler. |

Redeploy after changing environment variables so the deployment receives the updated values. Never put the secret in a URL or commit it to Git.

## Local Testing

Use Node.js 18 or newer and the Vercel CLI. From this project directory, run:

```sh
npx vercel dev
```

For an authenticated local test, set variables in the shell before starting the dev server. In PowerShell:

```powershell
$env:KEEPALIVE_SECRET = "replace-with-a-long-random-value"
$env:RENDER_URL = "https://shop-seed-art.onrender.com/healthz"
npx vercel dev
```

Then call the local endpoint in a second terminal:

```powershell
curl.exe -i http://localhost:3000/api/keep-alive -H "Authorization: Bearer replace-with-a-long-random-value"
```

If `KEEPALIVE_SECRET` is unset, omit the Authorization header. A successful check returns HTTP 200 and JSON with `success`, `target`, `renderStatus`, `responseTimeMs`, and `timestamp`. Non-2xx Render responses and network failures return an unsuccessful JSON response; a timeout returns HTTP 504.

## Deploy to Vercel

1. Push this project to a GitHub repository (commands below).
2. In Vercel, select **Add New... > Project** and import that GitHub repository.
3. Keep the project root as the Root Directory and select the **Other** framework preset if Vercel does not detect it automatically.
4. Add `RENDER_URL` and, preferably, a long random `KEEPALIVE_SECRET` in the project's environment variables. `RENDER_URL` may be omitted to use the default shown above. Apply variables to the environments you intend to use.
5. Select **Deploy**. Vercel exposes the function at `https://<your-vercel-domain>/api/keep-alive`.

No database, frontend, background worker, or Vercel Cron configuration is needed. Vercel Hobby Cron is intentionally not used; its schedule limitations do not provide the requested 10-minute interval.

## Push to GitHub

Create the GitHub repository at `https://github.com/Techhackontime999/render-keepalive`, then run these commands from this project directory:

```sh
git init
git add .
git commit -m "Add Render keepalive endpoint"
git branch -M main
git remote add origin https://github.com/Techhackontime999/render-keepalive.git
git push -u origin main
```

## Test the Deployed Endpoint

With `KEEPALIVE_SECRET` configured, use:

```sh
curl -i https://<your-vercel-domain>/api/keep-alive \
  -H "Authorization: Bearer <your-keepalive-secret>"
```

Without a configured secret, test without the header:

```sh
curl -i https://<your-vercel-domain>/api/keep-alive
```

The response reports whether the Render health request succeeded, its HTTP status, the elapsed time in milliseconds, and when the check completed. The secret is never included in a response.

## External 10-Minute Schedule

Configure an external cron or uptime service to send a **GET** request to `https://<your-vercel-domain>/api/keep-alive` every 10 minutes. For example, create a job in a service such as cron-job.org and set its schedule to every 10 minutes.

If `KEEPALIVE_SECRET` is set in Vercel, configure the external service to send this HTTP header with each request:

```text
Authorization: Bearer <your-keepalive-secret>
```

Keep the secret in the scheduler's protected header/credential settings, not in the request URL. Configure the scheduler to treat HTTP 200 as success and alert on repeated failures. The request flow is:

```text
External scheduler (every 10 minutes)
  -> Vercel /api/keep-alive
  -> Render /healthz
```