const axios = require('axios');
const FormData = require('form-data');

class FileHandler {
  constructor() {
    this.fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
  }

  // HTTP endpoint handler for file uploads
  async handleHTTPFileUpload(req, res) {
    try {
      const user = req.user; // From JWT middleware
      const file = req.file; // From multer middleware

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (file.mimetype !== 'application/pdf') {
        return res.status(415).json({ error: 'Only PDF files are supported' });
      }

      console.log(`Uploading file to FastAPI: ${file.originalname} for user: ${user.userId}`);

      // Create FormData for FastAPI
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      formData.append('user_id', user.userId);
      formData.append('session_info', JSON.stringify({
        uploadedAt: new Date().toISOString(),
        originalName: file.originalname,
        fileSize: file.size
      }));

      // Upload to FastAPI
      const response = await axios({
        method: 'POST',
        url: `${this.fastApiUrl}/upload`,
        data: formData,
        headers: {
          ...formData.getHeaders(),
          'Authorization': req.headers.authorization // Forward auth token
        },
        timeout: 120000, // 2 minutes
        maxContentLength: 50 * 1024 * 1024, // 50MB
        maxBodyLength: 50 * 1024 * 1024
      });

      const result = {
        fileId: response.data.file_id,
        filename: file.originalname,
        status: response.data.status,
        message: 'File uploaded successfully',
        processingStatus: response.data.processing_status || 'processing',
        uploadedAt: new Date().toISOString()
      };

      console.log(`File upload completed: ${file.originalname} -> ID: ${result.fileId}`);
      res.status(200).json(result);

    } catch (error) {
      console.error('Error in HTTP file upload:', error);
      
      let errorMessage = 'File upload failed';
      let statusCode = 500;

      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Upload service is currently unavailable';
        statusCode = 503;
      } else if (error.response?.status === 413) {
        errorMessage = 'File too large. Maximum size is 50MB';
        statusCode = 413;
      } else if (error.response?.status === 415) {
        errorMessage = 'Unsupported file type. Please upload PDF files only';
        statusCode = 415;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
        statusCode = error.response.status;
      }

      res.status(statusCode).json({ error: errorMessage });
    }
  }

  // HTTP endpoint handler for checking upload status
  async getHTTPUploadStatus(req, res) {
    try {
      const { fileId } = req.params;
      const user = req.user;

      console.log(`Checking upload status for file: ${fileId}, user: ${user.userId}`);

      const response = await axios.get(
        `${this.fastApiUrl}/upload/status/${fileId}`,
        {
          headers: {
            'Authorization': req.headers.authorization
          },
          timeout: 10000
        }
      );

      res.status(200).json({
        fileId: fileId,
        status: response.data.status,
        progress: response.data.progress,
        processingStage: response.data.processing_stage,
        vectorCount: response.data.vector_count,
        lastUpdated: response.data.last_updated
      });

    } catch (error) {
      console.error('Error checking upload status:', error);
      
      if (error.response?.status === 404) {
        res.status(404).json({ error: 'File not found' });
      } else {
        res.status(500).json({ error: 'Failed to check upload status' });
      }
    }
  }

  // HTTP endpoint handler for listing user's uploaded files
  async getUserFiles(req, res) {
    try {
      const user = req.user;

      console.log(`Fetching files for user: ${user.userId}`);

      const response = await axios.get(
        `${this.fastApiUrl}/upload/files/${user.userId}`,
        {
          headers: {
            'Authorization': req.headers.authorization
          },
          timeout: 10000
        }
      );

      res.status(200).json({
        files: response.data.files,
        totalCount: response.data.total_count
      });

    } catch (error) {
      console.error('Error fetching user files:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  }

  // Health check for FastAPI upload service
  async checkUploadServiceHealth() {
    try {
      const response = await axios.get(`${this.fastApiUrl}/upload/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Upload service health check failed:', error.message);
      return false;
    }
  }
}

module.exports = FileHandler;