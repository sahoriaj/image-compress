# r2-worker

1. `npm install`
2. `npx wrangler r2 bucket create <YOUR_BUCKET_NAME>`
3. Put your bucket name in `wrangler.jsonc`
4. `npx wrangler secret put AUTH_KEY_SECRET`
5. `npx wrangler deploy`

Test:
```
curl https://<your-worker>.workers.dev/cat-pic.jpg -X PUT \
  --header "X-Custom-Auth-Key: <secret>" --data-binary @cat-pic.jpg
curl https://<your-worker>.workers.dev/cat-pic.jpg
```
Use `--data-binary`, not `-d`, or files get truncated.
