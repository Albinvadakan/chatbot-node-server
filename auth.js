const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

class AuthService {
  constructor() {
    this.client = null;
    this.db = null;
    this.users = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
      this.db = this.client.db('chatbot_db');
      this.users = this.db.collection('users');
      console.log('Connected to MongoDB Atlas - Database: chatbot_db');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('Disconnected from MongoDB Atlas');
    }
  }

  async createUser(username, password, email = null) {
    try {
      const existingUser = await this.users.findOne({ username });
      if (existingUser) {
        throw new Error('User already exists');
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = {
        username,
        password: hashedPassword,
        email,
        createdAt: new Date(),
        lastLogin: null,
        isActive: true
      };

      const result = await this.users.insertOne(user);
      console.log('User created successfully:', username);
      return result;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async authenticateUser(username, password) {
    try {
      const user = await this.users.findOne({ username, isActive: true });
      if (!user) {
        throw new Error('Invalid username or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      await this.users.updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date() } }
      );

      const token = this.generateToken(user);

      return {
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          lastLogin: user.lastLogin
        }
      };
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  generateToken(user) {
    const payload = {
      userId: user._id,
      username: user.username,
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getUserById(userId) {
    try {
      console.log('Looking for user with ID:', userId);
      
      let objectId;
      if (typeof userId === 'string') {
        objectId = new ObjectId(userId);
      } else {
        objectId = userId;
      }
      
      const user = await this.users.findOne(
        { _id: objectId, isActive: true },
        { projection: { password: 0 } }
      );
      
      console.log('Found user:', user);
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }
}

module.exports = AuthService;