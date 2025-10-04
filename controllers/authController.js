class AuthController {
  constructor(authService, feedbackService = null) {
    this.authService = authService;
    this.feedbackService = feedbackService;
  }

  login = async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      const result = await this.authService.authenticateUser(username, password);
      
      res.json(result);
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Authentication failed'
      });
    }
  };

  register = async (req, res) => {
    try {
      const { username, password, email } = req.body;
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      await this.authService.createUser(username, password, email);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  };

  verifyToken = async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      console.log(req.headers);
      console.log(token);
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const decoded = this.authService.verifyToken(token);
      console.log('Decoded token:', decoded);
      const user = await this.authService.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prepare user response
      const userResponse = {
        id: user._id,
        username: user.username,
        email: user.email
      };

      // If feedback service is available, include analytics
      if (this.feedbackService) {
        try {
          const analytics = await this.feedbackService.getUserAnalytics(user._id);
          userResponse.analytics = analytics;
        } catch (analyticsError) {
          console.error('Error fetching user analytics:', analyticsError);
          // Continue without analytics if there's an error
          userResponse.analytics = {
            totalQuestions: 0,
            positiveCount: 0,
            negativeCount: 0,
            positivePercentage: 0,
            negativePercentage: 0,
            recentFeedback: []
          };
        }
      }

      res.json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  };

  // Get user profile with analytics (requires authentication)
  getUserProfile = async (req, res) => {
    try {
      const user = req.user; // From JWT middleware
      
      // Get user details
      const userDetails = await this.authService.getUserById(user.userId);
      
      if (!userDetails) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Prepare response
      const profileResponse = {
        success: true,
        user: {
          id: userDetails._id,
          username: userDetails.username,
          email: userDetails.email,
          createdAt: userDetails.createdAt,
          lastLogin: userDetails.lastLogin
        }
      };

      // Include analytics if feedback service is available
      if (this.feedbackService) {
        try {
          const analytics = await this.feedbackService.getUserAnalytics(userDetails._id);
          profileResponse.user.analytics = analytics;
        } catch (analyticsError) {
          console.error('Error fetching user analytics for profile:', analyticsError);
          profileResponse.user.analytics = {
            totalQuestions: 0,
            positiveCount: 0,
            negativeCount: 0,
            positivePercentage: 0,
            negativePercentage: 0,
            recentFeedback: []
          };
        }
      }

      res.json(profileResponse);
      
    } catch (error) {
      console.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get user profile'
      });
    }
  };
}

module.exports = AuthController;