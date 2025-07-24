const jwt = require("jsonwebtoken");
require("dotenv").config();

const authentication = async(req, res, next) => {
    try {
        const token = req.headers.authorization;
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                msg: "No token provided. Please login." 
            });
        }

        // Remove 'Bearer ' if present
        const tokenString = token.startsWith('Bearer ') ? token.slice(7) : token;

        try {
            const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);
            
            if (!decoded) {
                return res.status(401).json({ 
                    success: false,
                    msg: "Invalid token" 
                });
            }

            // Add user info to request
            req.body.userId = decoded.userId;
            req.body.role = decoded.role;
            req.body.userEmail = decoded.email;
            
            next();
        } catch (jwtError) {
            console.error("JWT verification error:", jwtError);
            
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    success: false,
                    msg: "Token has expired. Please login again." 
                });
            }
            
            return res.status(401).json({ 
                success: false,
                msg: "Invalid token. Please login again." 
            });
        }
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({ 
            success: false,
            msg: "Internal server error during authentication" 
        });
    }
}

module.exports = { authentication };