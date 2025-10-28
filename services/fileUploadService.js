const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

class FileUploadService {
  constructor() {
    this.client = null;
    this.db = null;
    this.fileUploads = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db('chatbot_db');
      this.fileUploads = this.db.collection('file_uploads');
      console.log('FileUploadService connected to MongoDB Atlas');
    } catch (error) {
      console.error('MongoDB connection error in FileUploadService:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('FileUploadService disconnected from MongoDB Atlas');
    }
  }

  /**
   * Save file upload information to MongoDB
   * @param {string} fileName - The name of the uploaded file
   * @param {string} patientId - The patient ID from the decoded token
   * @param {Object} additionalData - Optional additional data (fileSize, status, etc.)
   * @returns {Object} The inserted document
   */
  async saveFileUpload(fileName, patientId, additionalData = {}) {
    try {
      const uploadRecord = {
        fileName,
        patientId: typeof patientId === 'string' ? new ObjectId(patientId) : patientId,
        uploadedAt: new Date(),
        ...additionalData
      };

      const result = await this.fileUploads.insertOne(uploadRecord);
      console.log(`File upload record saved: ${fileName} for patient: ${patientId}`);
      
      return {
        success: true,
        uploadId: result.insertedId,
        ...uploadRecord
      };
    } catch (error) {
      console.error('Error saving file upload record:', error);
      throw error;
    }
  }

  /**
   * Get all file uploads for a specific patient
   * @param {string} patientId - The patient ID
   * @returns {Array} List of file uploads
   */
  async getFileUploadsByPatientId(patientId) {
    try {
      console.log('Fetching file uploads for patient:', patientId);
      
      // Convert string ID to ObjectId if needed
      let objectId;
      if (typeof patientId === 'string') {
        objectId = new ObjectId(patientId);
      } else {
        objectId = patientId;
      }

      const uploads = await this.fileUploads
        .find({ patientId: objectId })
        .sort({ uploadedAt: -1 }) // Most recent first
        .toArray();

      console.log(`Found ${uploads.length} file uploads for patient ${patientId}`);
      
      return uploads;
    } catch (error) {
      console.error('Error fetching file uploads:', error);
      throw error;
    }
  }

  /**
   * Get file upload statistics for a patient
   * @param {string} patientId - The patient ID
   * @returns {Object} Upload statistics
   */
  async getUploadStatsByPatientId(patientId) {
    try {
      let objectId;
      if (typeof patientId === 'string') {
        objectId = new ObjectId(patientId);
      } else {
        objectId = patientId;
      }

      const stats = await this.fileUploads.aggregate([
        { $match: { patientId: objectId } },
        {
          $group: {
            _id: null,
            totalUploads: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            firstUpload: { $min: '$uploadedAt' },
            lastUpload: { $max: '$uploadedAt' }
          }
        }
      ]).toArray();

      return stats.length > 0 ? stats[0] : {
        totalUploads: 0,
        totalSize: 0,
        firstUpload: null,
        lastUpload: null
      };
    } catch (error) {
      console.error('Error fetching upload statistics:', error);
      throw error;
    }
  }

  /**
   * Delete a file upload record
   * @param {string} uploadId - The upload record ID
   * @param {string} patientId - The patient ID (for authorization)
   * @returns {Object} Result of deletion
   */
  async deleteFileUpload(uploadId, patientId) {
    try {
      const result = await this.fileUploads.deleteOne({
        _id: new ObjectId(uploadId),
        patientId: new ObjectId(patientId)
      });

      if (result.deletedCount === 0) {
        throw new Error('Upload record not found or unauthorized');
      }

      console.log(`File upload record deleted: ${uploadId}`);
      return { success: true, deletedCount: result.deletedCount };
    } catch (error) {
      console.error('Error deleting file upload record:', error);
      throw error;
    }
  }
}

module.exports = FileUploadService;
