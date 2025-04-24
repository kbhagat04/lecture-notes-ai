import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import routes from './api/routes';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5002;

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// For production: Serve static files from the React build
if (process.env.NODE_ENV === 'production') {
  // Check possible build directory locations
  const buildPath = path.join(__dirname, '../../build');
  const altBuildPath = path.join(process.cwd(), 'build');
  
  let staticPath = '';
  
  if (fs.existsSync(buildPath)) {
    console.log('Using build path: ', buildPath);
    staticPath = buildPath;
  } else if (fs.existsSync(altBuildPath)) {
    console.log('Using alternative build path: ', altBuildPath);
    staticPath = altBuildPath;
  } else {
    console.error('Could not find build directory!');
    console.log('Current directory structure:');
    console.log(fs.readdirSync(process.cwd()));
  }
  
  if (staticPath) {
    // Serve the static files from the React app build directory
    app.use(express.static(staticPath));
    
    // For any request that doesn't match an API route, send the React app
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'));
    });
  }
  
  console.log('Running in production mode - serving static React app');
} else {
  console.log('Running in development mode');
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});