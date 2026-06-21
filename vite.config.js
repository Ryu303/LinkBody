import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // ⚠️ 본인의 깃허브 레포지토리 이름을 여기에 입력하세요 (예: 'obsidian-graph-map')
  const repoName = '평가_위주_플랫폼'; 

  return {
    base: mode === 'production' ? `/${repoName}/` : '/',
    plugins: [
      react(),
    {
      name: 'save-node-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url === '/api/save-node') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { id, content } = JSON.parse(body);
                
                // Overwrite or create the node file
                const filePath = path.join(__dirname, 'QuickShare_2606211040', `${id}.md`);
                fs.writeFileSync(filePath, content, 'utf-8');
                
                // Re-run parse.js to recreate data.json
                execSync('node parse.js', { cwd: __dirname });
                
                // Read fresh data.json
                const updatedData = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf-8');
                
                res.writeHead(200, { 
                  'Content-Type': 'application/json; charset=utf-8' 
                });
                res.end(updatedData);
              } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ]
  }
})
