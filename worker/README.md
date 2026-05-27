# Holdover Notify Worker

Cloudflare Worker that handles email signup form submissions and stores them in KV.

## Setup

1. Install Wrangler CLI:
   ```
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```
   wrangler login
   ```

3. Create the KV namespace:
   ```
   wrangler kv:namespace create SIGNUPS
   ```

4. Update the `id` in `wrangler.toml` with the namespace ID returned from step 3.

5. Deploy:
   ```
   wrangler deploy
   ```

6. The worker will be available at:
   ```
   https://holdover-notify.<your-subdomain>.workers.dev/notify
   ```

7. Add a custom route in the Cloudflare dashboard to map:
   ```
   api.holdoversoftware.com/notify -> this worker
   ```
   Or configure a route in `wrangler.toml`:
   ```toml
   routes = [
     { pattern = "api.holdoversoftware.com/notify", zone_name = "holdoversoftware.com" }
   ]
   ```

## Viewing Collected Emails

List all stored email keys:
```
wrangler kv:key list --namespace-id=<your-namespace-id>
```

Read a specific entry:
```
wrangler kv:get --namespace-id=<your-namespace-id> "user@example.com"
```

## How It Works

- Accepts POST to `/notify` with an `email` field (form-encoded or JSON)
- Validates email format
- Stores email as the KV key (natural deduplication) with a JSON value containing timestamp and metadata
- Redirects to `/?subscribed=true` on success
- Redirects to `/?error=invalid` on bad email format
- Duplicates silently succeed (does not reveal whether an email is already registered)
- CORS configured for `https://holdoversoftware.com`
