const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const routes = {
    '/': 'dashboard.html',
    '/dashboard': 'dashboard.html',
    '/dashboard.html': 'dashboard.html',
    '/app': 'app.html',
    '/app.html': 'app.html'
};

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const route = routes[req.url.split('?')[0]];

    if (route) {
        try {
            const filePath = path.join(__dirname, route);
            const content = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('File not found: ' + route);
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('FRONTEND SERVER RUNNING');
    console.log('='.repeat(60));
    console.log(`Dashboard: http://localhost:${PORT}/`);
    console.log(`Chat UI:   http://localhost:${PORT}/app`);
    console.log('='.repeat(60) + '\n');
});
