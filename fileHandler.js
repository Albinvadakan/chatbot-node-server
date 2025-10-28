const axios = require('axios');
const FormData = require('form-data');
const FileUploadService = require('./services/fileUploadService');

class FileHandler {
  constructor() {
    this.fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    this.fileUploadService = new FileUploadService();
    this.initializeService();
  }

  async initializeService() {
    try {
      await this.fileUploadService.connect();
    } catch (error) {
      console.error('Failed to initialize FileUploadService:', error);
    }
  }

  async handleHTTPFileUpload(req, res) {
    try {
      const user = req.user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (file.mimetype !== 'application/pdf') {
        return res.status(415).json({ error: 'Only PDF files are supported' });
      }

      console.log(`Uploading PDF to Python API: ${file.originalname} for patient: ${user.userId}`);

      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });

      formData.append('patient_id', user.userId);
      formData.append('content_type', 'patient_private');

      const response = await axios({
        method: 'POST',
        url: `${this.fastApiUrl}/api/v1/upload/pdf`,
        data: formData,
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json'
        },
        timeout: 300000,
        maxContentLength: 50 * 1024 * 1024,
        maxBodyLength: 50 * 1024 * 1024
      });

      console.log('Python API Response:', response.data);

      try {
        await this.fileUploadService.saveFileUpload(
          file.originalname,
          user.userId,
          {
            fileSize: file.size,
            mimeType: file.mimetype,
            status: 'success',
            pythonApiResponse: response.data
          }
        );
      } catch (dbError) {
        console.error('Failed to save file upload record to database:', dbError);
      }

      const result = {
        success: true,
        filename: file.originalname,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        userId: user.userId,
        ...response.data
      };

      console.log(`PDF upload completed: ${file.originalname} - Status: ${response.status}`);
      res.status(200).json(result);

    } catch (error) {
      console.error('Error in Python PDF upload:', error);
      
      let errorMessage = 'PDF upload failed';
      let statusCode = 500;
      let errorDetails = null;

      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Python upload service is currently unavailable';
        statusCode = 503;
      } else if (error.code === 'TIMEOUT') {
        errorMessage = 'Upload timeout - file may be too large or processing is taking too long';
        statusCode = 408;
      } else if (error.response) {
        statusCode = error.response.status;
        errorDetails = error.response.data;
        
        switch (statusCode) {
          case 413:
            errorMessage = 'File too large. Maximum size is 50MB';
            break;
          case 415:
            errorMessage = 'Unsupported file type. Please upload PDF files only';
            break;
          case 422:
            errorMessage = error.response.data?.detail || 'Invalid file format or content';
            break;
          default:
            errorMessage = error.response.data?.detail || error.response.data?.message || 'Upload service error';
        }
      }

      const errorResponse = {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };

      if (errorDetails) {
        errorResponse.details = errorDetails;
      }

      res.status(statusCode).json(errorResponse);
    }
  }

  async checkUploadServiceHealth() {
    try {
      const response = await axios.get(`${this.fastApiUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.error('Python upload service health check failed:', error.message);
      return false;
    }
  }
}

module.exports = FileHandler;