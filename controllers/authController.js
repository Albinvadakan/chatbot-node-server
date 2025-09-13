class AuthController {
  constructor(authService) {
    this.authService = authService;
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

      res.json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  };
}

module.exports = AuthController;