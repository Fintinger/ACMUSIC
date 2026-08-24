// Vercel Serverless 音频代理
// 浏览器请求本函数, 由 Vercel 服务器代为访问网易云 CDN 并流式转发
// 绕过公司/本地网络对 m*.music.126.net 的屏蔽
export default async function handler(req, res) {
  const { url } = req.query
  if (!url) {
    res.status(400).send('missing url')
    return
  }
  try {
    const upstream = await fetch(url, {
      headers: { 'Referer': 'https://music.163.com/', 'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0' }
    })
    if (!upstream.ok) {
      res.status(upstream.status).send('upstream ' + upstream.status)
      return
    }
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'audio/mpeg')
    res.setHeader('Cache-Control', 'public, max-age=300')
    const reader = upstream.body.getReader()
    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) { controller.close(); return }
        controller.enqueue(value)
      }
    })
    stream.pipeTo(new WritableStream({
      write(chunk) { res.write(Buffer.from(chunk)) }
    })).then(() => res.end()).catch(() => res.end())
  } catch (e) {
    res.status(502).send('proxy error: ' + e.message)
  }
}
