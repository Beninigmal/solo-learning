const http = require('http');
   const { request } = require('http');

   const server = http.createServer((req, res) => {
     // Redireciona tudo para o Ollama local
     const options = {
       hostname: '127.0.0.1',
       port: 11434,
       path: req.url,
       method: req.method,
       headers: { ...req.headers, host: '127.0.0.1:11434' }
     };

     const proxyReq = request(options, (proxyRes) => {
       res.writeHead(proxyRes.statusCode, proxyRes.headers);
       proxyRes.pipe(res);
     });

     req.pipe(proxyReq);
   });

   server.listen(8080, () => {
     console.log('Proxy interceptor rodando na porta 8080...');
   });
