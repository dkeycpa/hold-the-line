const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

http.createServer(async (request, response) => {
  if (!['/', '/grunt', '/roster', '/roster.js'].includes(request.url)) {
    response.writeHead(404).end();
    return;
  }
  try {
    if (request.url === '/roster.js') {
      const script = await readFile(path.join(__dirname, 'roster.js'), 'utf8');
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }).end(script);
      return;
    }
    const isGrunt = request.url === '/grunt';
    const preview = await readFile(path.join(__dirname, isGrunt ? 'grunt.html' : 'roster.html'), 'utf8');
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hold The Line | ${isGrunt ? 'Grunt Preview' : 'Briefing Room Roster'}</title>
<style>
  :root { color-scheme: dark light; }
  body { font: 16px system-ui; margin: 24px auto; padding: 0 16px; max-width: 820px; }
  h2, p { margin: 0; }
  canvas { border-radius: 8px; }
  .viz-controls { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn { font: inherit; min-height: 44px; padding: 6px 14px; border: 1px solid GrayText;
    border-radius: 6px; background: ButtonFace; color: ButtonText; }
  .btn-primary { background: #94e5cc; color: #182c28; border-color: transparent; }
  .text-small { font-size: .875rem; }
  .tabular-nums { font-variant-numeric: tabular-nums; }
</style></head><body>${isGrunt ? '<nav style="margin-bottom:16px"><a href="/roster">Briefing Room roster</a></nav>' : ''}${preview}</body></html>`);
  } catch (error) {
    console.error(error);
    response.writeHead(500).end('Preview unavailable');
  }
}).listen(4372, '127.0.0.1', () => console.log('Grunt preview on http://127.0.0.1:4372/grunt'));
