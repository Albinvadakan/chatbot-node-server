const FileUploadService = require('../services/fileUploadService');

class FileUploadController {
  constructor(fileUploadService) {
    this.fileUploadService = fileUploadService;
  }

  /**
   * Get all file uploads for the authenticated patient
   */
  async getMyFileUploads(req, res) {
    try {
      const patientId = req.user.userId;

      const uploads = await this.fileUploadService.getFileUploadsByPatientId(patientId);

      res.status(200).json({
        success: true,
        count: uploads.length,
        patientId: patientId,
        uploads: uploads.map(upload => ({
          uploadId: upload._id,
          fileName: upload.fileName,
          fileSize: upload.fileSize,
          mimeType: upload.mimeType,
          uploadedAt: upload.uploadedAt,
          status: upload.status
        }))
      });
    } catch (error) {
      console.error('Error fetching file uploads:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch file uploads',
        message: error.message
      });
    }
  }

  /**
   * Get file upload statistics for the authenticated patient
   */
  async getMyUploadStats(req, res) {
    try {
      const patientId = req.user.userId;

      const stats = await this.fileUploadService.getUploadStatsByPatientId(patientId);

      res.status(200).json({
        success: true,
        patientId: patientId,
        statistics: {
          totalUploads: stats.totalUploads,
          totalSize: stats.totalSize,
          totalSizeMB: stats.totalSize ? (stats.totalSize / (1024 * 1024)).toFixed(2) : 0,
          firstUpload: stats.firstUpload,
          lastUpload: stats.lastUpload
        }
      });
    } catch (error) {
      console.error('Error fetching upload statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch upload statistics',
        message: error.message
      });
    }
  }

  /**
   * Delete a file upload record
   */
  async deleteFileUpload(req, res) {
    try {
      const patientId = req.user.userId;
      const { uploadId } = req.params;

      if (!uploadId) {
        return res.status(400).json({
          success: false,
          error: 'Upload ID is required'
        });
      }

      const result = await this.fileUploadService.deleteFileUpload(uploadId, patientId);

      res.status(200).json({
        success: true,
        message: 'File upload record deleted successfully',
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error deleting file upload record:', error);
      
      const statusCode = error.message.includes('not found') || error.message.includes('unauthorized') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        error: 'Failed to delete file upload record',
        message: error.message
      });
    }
  }
}

module.exports = FileUploadController;
