const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware');

function createFileRoutes(fileUploadService) {
  const router = express.Router();
  const FileHandler = require('../fileHandler');
  const fileHandler = new FileHandler(); // No WebSocket dependency
  
  // Import and initialize controller
  const FileUploadController = require('../controllers/fileUploadController');
  const fileUploadController = new FileUploadController(fileUploadService);

  // Configure multer for file uploads
  const storage = multer.memoryStorage(); // Store files in memory
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
      files: 1 // Only one file at a time
    },
    fileFilter: (req, file, cb) => {
      // Only allow PDF files
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'), false);
      }
    }
  });

  // Upload endpoint
  router.post('/files/upload', 
    authenticateToken, 
    upload.single('file'), 
    async (req, res) => {
      await fileHandler.handleHTTPFileUpload(req, res);
    }
  );

  // Upload service health check
  router.get('/files/health', async (req, res) => {
    const isHealthy = await fileHandler.checkUploadServiceHealth();
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'file-upload',
      timestamp: new Date().toISOString()
    });
  });

  // Get file upload history for authenticated patient
  router.get('/files/uploads', authenticateToken, async (req, res) => {
    await fileUploadController.getMyFileUploads(req, res);
  });

  // Get file upload statistics for authenticated patient
  router.get('/files/uploads/stats', authenticateToken, async (req, res) => {
    await fileUploadController.getMyUploadStats(req, res);
  });

  // Delete a file upload record
  router.delete('/files/uploads/:uploadId', authenticateToken, async (req, res) => {
    await fileUploadController.deleteFileUpload(req, res);
  });

  // Handle multer errors
  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: 'File too large. Maximum size is 50MB' 
        });
      } else if (error.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          error: 'Too many files. Upload one file at a time' 
        });
      }
    } else if (error.message === 'Only PDF files are allowed') {
      return res.status(415).json({ 
        error: 'Only PDF files are supported' 
      });
    }
    
    res.status(500).json({ error: 'File upload error' });
  });

  return router;
}

module.exports = createFileRoutes;