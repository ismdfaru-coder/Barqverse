const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const server = http.createServer((req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (req.url === '/' || req.url === '/app' || req.url === '/app.html') {
        try {
            const filePath = path.join(__dirname, 'app.html');
            const content = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200);
            res.end(content);
        } catch (error) {
            res.writeHead(404);
            res.end('File not found');
        }
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🌐 FRONTEND SERVER RUNNING');
    console.log('='.repeat(60));
    console.log(`📍 Open in browser: http://localhost:${PORT}`);
    console.log('='.repeat(60) + '\n');
});
