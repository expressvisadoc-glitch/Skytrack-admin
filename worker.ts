interface Env {
  ASSETS: {
    fetch: typeof fetch
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Proxy SkyTrack API requests server-to-server to avoid browser CORS and network barriers
    if (url.pathname.startsWith('/api/skytrack')) {
      const targetUrl = 'https://cwtrrtbodqctntkpnjlv.supabase.co/functions/v1/skytrack-api'

      if (request.method === 'OPTIONS') {
        return new Response('ok', {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
          },
        })
      }

      const headers = new Headers(request.headers)
      headers.delete('host')

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.body,
      })

      const responseHeaders = new Headers(response.headers)
      responseHeaders.set('Access-Control-Allow-Origin', '*')

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      })
    }

    // Serve static frontend assets for single-page application
    return env.ASSETS.fetch(request)
  },
}
