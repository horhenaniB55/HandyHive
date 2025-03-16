import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const distPath = join(__dirname, 'dist');

// Set up MIME types explicitly
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Add a debug endpoint to see environment variables
app.get('/debug-env', (req, res) => {
  res.json({
    hasEnvVars: {
      VITE_FIREBASE_API_KEY: !!process.env.VITE_FIREBASE_API_KEY,
      VITE_FIREBASE_AUTH_DOMAIN: !!process.env.VITE_FIREBASE_AUTH_DOMAIN,
      VITE_FIREBASE_PROJECT_ID: !!process.env.VITE_FIREBASE_PROJECT_ID,
      VITE_FIREBASE_STORAGE_BUCKET: !!process.env.VITE_FIREBASE_STORAGE_BUCKET,
      VITE_FIREBASE_MESSAGING_SENDER_ID: !!process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      VITE_FIREBASE_APP_ID: !!process.env.VITE_FIREBASE_APP_ID,
      VITE_FIREBASE_MEASUREMENT_ID: !!process.env.VITE_FIREBASE_MEASUREMENT_ID
    }
  });
});

// Explicit handler for assets directory
app.get('/assets/*', (req, res) => {
  const filePath = join(distPath, req.url);
  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  try {
    const content = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.end(content, 'utf-8');
  } catch (error) {
    console.error(`Error serving static file: ${filePath}`, error);
    res.status(404).send('File not found');
  }
});

// Serve static files from dist with proper content types
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    const extname = path.extname(filePath);
    res.setHeader('Content-Type', mimeTypes[extname] || 'application/octet-stream');
  }
}));

// Read the index.html file once at startup
const indexPath = join(distPath, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

// For any other requests, send the index.html file with environment variables injected
app.get('*', (req, res) => {
  // Skip if request is for a static asset (already handled above)
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return;
  }

  // Create a script with the environment variables
  const envVars = {
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID: process.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  // Inject the environment variables into the index.html file
  const html = indexHtml.replace(
    '</head>',
    `<script>window.env = ${JSON.stringify(envVars)};</script></head>`
  );

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Create HTTP server
const server = createServer(app);

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 