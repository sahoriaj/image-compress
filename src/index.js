const ALLOW_LIST = ["cat-pic.jpg"];

// Check requests for a pre-shared secret
const hasValidHeader = (request, env) =>
  request.headers.get("X-Custom-Auth-Key") === env.AUTH_KEY_SECRET;

function authorizeRequest(request, env, key) {
  switch (request.method) {
    case "PUT":
    case "DELETE":
      return hasValidHeader(request, env);
    case "GET":
      return ALLOW_LIST.includes(key);
    default:
      return false;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (!authorizeRequest(request, env, key)) {
      return new Response("Forbidden", { status: 403 });
    }

    switch (request.method) {
      case "PUT": {
        await env.MY_BUCKET.put(key, request.body, {
          onlyIf: request.headers,
          httpMetadata: request.headers,
        });
        return new Response(`Put ${key} successfully!`);
      }
      case "GET": {
        const object = await env.MY_BUCKET.get(key, {
          onlyIf: request.headers,
          range: request.headers,
        });

        if (object === null) {
          return new Response("Object Not Found", { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);

        // When no body is present, preconditions have failed
        return new Response("body" in object ? object.body : undefined, {
          status: "body" in object ? 200 : 412,
          headers,
        });
      }
      case "DELETE": {
        await env.MY_BUCKET.delete(key);
        return new Response("Deleted!");
      }
      default:
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "PUT, GET, DELETE" },
        });
    }
  },
};
