import express from 'express';
import { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
const multer = require('multer');
import path from 'path';
import fs from 'fs';
// Update to use the default export from routes
import routes from './api/routes';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Process error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  console.error(error.stack);
  // Don't exit the process to keep the container running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  // Don't exit the process to keep the container running
});

const app = express();
const PORT = process.env.PORT || 5003;

// Log environment variables (excluding sensitive ones)
console.log('Environment variables:');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PWD:', process.cwd());
console.log('__dirname:', __dirname);

// Configure multer for file uploads with limits
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Basic error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// API routes
app.use('/api', routes);

// Log directory structures to help debug paths
console.log('Current directory structure:');
try {
  console.log(fs.readdirSync(process.cwd()));
} catch (error) {
  console.error('Error reading current directory:', error);
}

// For production: Serve static files from the React build
if (process.env.NODE_ENV === 'production') {
  // Check possible build directory locations
  const buildPath = path.join(__dirname, '../../build');
  const altBuildPath = path.join(process.cwd(), 'build');
  const dockerBuildPath = '/usr/src/app/build';
  
  let staticPath = '';
  
  if (fs.existsSync(buildPath)) {
    console.log('Using build path: ', buildPath);
    staticPath = buildPath;
  } else if (fs.existsSync(altBuildPath)) {
    console.log('Using alternative build path: ', altBuildPath);
    staticPath = altBuildPath;
  } else if (fs.existsSync(dockerBuildPath)) {
    console.log('Using Docker build path: ', dockerBuildPath);
    staticPath = dockerBuildPath;
  } else {
    console.error('Could not find build directory!');
    
    // Try to list all directories to help debug
    console.log('Directories in current directory:');
    fs.readdirSync(process.cwd()).forEach(file => {
      console.log(file, fs.statSync(path.join(process.cwd(), file)).isDirectory() ? '(dir)' : '(file)');
    });
    
    if (fs.existsSync('/usr/src/app')) {
      console.log('Contents of /usr/src/app:');
      fs.readdirSync('/usr/src/app').forEach(file => {
        console.log(file);
      });
    }
  }
  
  if (staticPath) {
    // Serve the static files from the React app build directory
    try {
      // Ignore TypeScript error for static method
      // @ts-ignore
      app.use(express.static(staticPath));
      
      // For any request that doesn't match an API route, send the React app
      app.get('*', (req: Request, res: Response) => {
        if (fs.existsSync(path.join(staticPath, 'index.html'))) {
          res.sendFile(path.join(staticPath, 'index.html'));
        } else {
          res.status(404).send('Frontend build not found');
        }
      });
      
      console.log('Static file serving configured successfully');
    } catch (error) {
      console.error('Error setting up static file serving:', error);
    }
  } else {
    // Fallback route if no static path is found
    app.get('*', (req: Request, res: Response) => {
      res.status(404).send('Application is still initializing or build files are missing');
    });
  }
  
  console.log('Running in production mode - serving static React app');
} else {
  console.log('Running in development mode');
}

// Start the server with error handling
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (error: Error) => {
    console.error('Error starting server:', error);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});