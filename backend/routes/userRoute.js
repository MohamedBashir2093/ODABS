const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const fs = require("fs");
require("dotenv").config();
const {Usermodel} = require("../models/userModel");
const multer = require('multer');
const path = require('path');

const userRoute = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Middleware to verify token
const verifyToken = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                msg: "No token provided"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).json({
            success: false,
            msg: "Invalid or expired token"
        });
    }
};

// Get all the doctors
userRoute.get("/doctors", verifyToken, async(req, res) => {
    try {
        const doctors = await Usermodel.find(
            { role: 'doctor' },
            { password: 0 } // Exclude password field
        );

        res.json({
            success: true,
            doctors: doctors
        });
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({
            success: false,
            msg: 'Error fetching doctors'
        });
    }
});

// Get doctors according to location
userRoute.get("/doctors/:location", async(req, res) => {
    let location = req.params.location;
    try {
        let allDoctor = await Usermodel.find({
            role: "doctor",
            location: {"$regex": location, "$options": "i"}
        });
        res.json({
            success: true,
            msg: "All doctors details based on location",
            data: allDoctor
        });
    } catch (error) {
        console.log("error from getting all doctor route", error);
        res.status(500).json({
            success: false,
            msg: "Error while getting all doctors details based on location"
        });
    }
});

// Get doctors based on their specialty
userRoute.get("/doctors/specialty/:value", async(req, res) => {
    let specialty = req.params.value;
    try {
        let allDoctor = await Usermodel.find({role: "doctor", specialty});
        res.json({
            success: true,
            msg: "All doctors details based on specialty",
            data: allDoctor
        });
    } catch (error) {
        console.log("error from getting all doctor route", error);
        res.status(500).json({
            success: false,
            msg: "Error while getting all doctors details based on specialty"
        });
    }
});

// Route to add new user(doctor/patient)
userRoute.post("/register", async(req, res) => {
    const {name, email, password, role, specialty, location} = req.body;

    try {
        if (!name || !email || !password || !role) {
            return res.status(400).json({
                success: false,
                msg: "Please provide all required fields"
            });
        }

        let existingUser = await Usermodel.findOne({email});
        if (existingUser) {
            return res.status(400).json({
                success: false,
                msg: "Email already registered"
            });
        }

        const hash = await bcrypt.hash(password, 10);
        let user = new Usermodel({
            name,
            email,
            password: hash,
            role,
            specialty: specialty || "None",
            location: location || "Not specified"
        });
        
        await user.save();
        
        res.status(201).json({
            success: true,
            msg: "Registration successful"
        });
    } catch (error) {
        console.log("Error in register route:", error);
        res.status(500).json({
            success: false,
            msg: "Error in registering user"
        });
    }
});

// Route to login a user(doctor/patient)
userRoute.post("/login", async (req, res) => {
    const {email, password} = req.body;
    console.log("Login attempt:", {email});
    
    try {
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                msg: "Please provide both email and password"
            });
        }

        // Find user by email
        const user = await Usermodel.findOne({email});
        console.log("User found:", user ? "yes" : "no");
        
        if (!user) {
            return res.status(401).json({
                success: false,
                msg: "Invalid email or password"
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Password match:", isMatch ? "yes" : "no");
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                msg: "Invalid email or password"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send successful response
        res.status(200).json({
            success: true,
            msg: "Login successful",
            token,
            userId: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            specialty: user.specialty,
            location: user.location
        });

    } catch (error) {
        console.error("Error in login route:", error);
        res.status(500).json({
            success: false,
            msg: "Server error during login"
        });
    }
});

// Logout route
userRoute.post("/logout", (req, res) => {
    try {
        res.status(200).json({
            success: true,
            msg: "Logged out successfully"
        });
    } catch (error) {
        console.error("Error in logout:", error);
        res.status(500).json({
            success: false,
            msg: "Error during logout"
        });
    }
});

// Get user profile
userRoute.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await Usermodel.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({
            success: false,
            msg: "Error fetching profile"
        });
    }
});

// Update profile
userRoute.put('/update', verifyToken, upload.single('profilePicture'), async (req, res) => {
    try {
        const updates = {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address
        };

        if (req.file) {
            // Delete old profile picture if it exists
            const user = await Usermodel.findById(req.user.userId);
            if (user.profilePicture) {
                const oldPicturePath = path.join(__dirname, '..', user.profilePicture);
                if (fs.existsSync(oldPicturePath)) {
                    fs.unlinkSync(oldPicturePath);
                }
            }
            updates.profilePicture = '/uploads/' + req.file.filename;
        }

        const updatedUser = await Usermodel.findByIdAndUpdate(
            req.user.userId,
            updates,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        res.json({
            success: true,
            msg: "Profile updated successfully",
            data: updatedUser
        });
    } catch (error) {
        console.error("Error in profile update:", error);
        res.status(500).json({
            success: false,
            msg: "Error updating profile"
        });
    }
});

// Update user profile
userRoute.put("/profile", verifyToken, async (req, res) => {
    try {
        const updates = { ...req.body };
        delete updates.password; // Prevent password update through this route
        delete updates.email; // Prevent email update through this route
        delete updates.role; // Prevent role update through this route

        const user = await Usermodel.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        res.json({
            success: true,
            msg: "Profile updated successfully",
            data: user
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({
            success: false,
            msg: "Error updating profile"
        });
    }
});

// Change password
userRoute.put("/change-password", verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                msg: "Please provide both current and new password"
            });
        }

        const user = await Usermodel.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "User not found"
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                msg: "Current password is incorrect"
            });
        }

        // Hash new password
        const hash = await bcrypt.hash(newPassword, 10);
        user.password = hash;
        await user.save();

        res.json({
            success: true,
            msg: "Password updated successfully"
        });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({
            success: false,
            msg: "Error changing password"
        });
    }
});

// Reset password without email verification
userRoute.post("/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        // Find user by email
        const user = await Usermodel.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: "No account found with this email"
            });
        }

        // Hash new password
        const hash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password = hash;
        await user.save();

        res.json({
            success: true,
            msg: "Password reset successful"
        });
    } catch (error) {
        console.error("Error in reset password:", error);
        res.status(500).json({
            success: false,
            msg: "Error resetting password"
        });
    }
});

// Serve uploaded files
userRoute.use('/uploads', express.static(path.join(__dirname, '../uploads')));

module.exports = {userRoute};