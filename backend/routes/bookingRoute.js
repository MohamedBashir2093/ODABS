const express = require("express");
const { BookingModel } = require("../models/bookingModel");
const { authentication } = require("../middlewares/authenticationMiddleware");
const { authorisation } = require("../middlewares/authorizationMiddleware");
const { ScheduleModel } = require("../models/scheduleModel");
const bookingRoutes = express.Router();
require("dotenv").config()

// Get particular user booking data
bookingRoutes.get("/paticularUser", authentication, authorisation(["patient","doctor"]), async (req, res) => {
    try {
        console.log('Fetching appointments for user:', {
            userId: req.body.userId,
            role: req.body.role,
            email: req.body.userEmail
        });

        if(!req.body.userId || !req.body.role) {
            console.log('Missing user information');
            return res.status(400).json({ 
                success: false,
                msg: "User information not found",
                debug: { body: req.body }
            });
        }

        let query = {};
        if(req.body.role === "patient"){
            query = { userId: req.body.userId };
        } else {
            query = { doctorId: req.body.userId };
        }

        console.log('Query:', query);
        const appointments = await BookingModel.find(query).sort({ bookingDate: -1 });
        console.log('Found appointments:', appointments);

        res.status(200).json({ 
            success: true,
            msg: "Appointments retrieved successfully",
            Data: appointments,
            debug: {
                query,
                resultCount: appointments.length
            }
        });
        
    } catch (error) {
        console.error("Error fetching appointments:", error);
        res.status(500).json({ 
            success: false,
            msg: "Error in getting appointments", 
            error: error.message,
            debug: { body: req.body }
        });
    }
});

// Create new booking
bookingRoutes.post("/create", authentication, authorisation(["patient"]), async (req, res) => {
    try {
        const { doctorId, doctorName, bookingDate, bookingSlot } = req.body;
        const userId = req.body.userId;
        const userEmail = req.body.userEmail;

        if (!doctorId || !bookingDate || !bookingSlot || !doctorName) {
            return res.status(400).json({
                success: false,
                msg: "Missing required booking information"
            });
        }

        // Check if slot is available
        const existingBooking = await BookingModel.findOne({
            doctorId,
            bookingDate,
            bookingSlot
        });

        if (existingBooking) {
            return res.status(400).json({
                success: false,
                msg: "This time slot is already booked"
            });
        }

        const newBooking = new BookingModel({
            userId,
            doctorId,
            doctorName,
            userEmail,
            bookingDate,
            bookingSlot
        });

        await newBooking.save();

        res.status(201).json({
            success: true,
            msg: "Appointment booked successfully",
            data: newBooking
        });

    } catch (error) {
        console.error("Error creating booking:", error);
        res.status(500).json({
            success: false,
            msg: "Error creating booking",
            error: error.message
        });
    }
});

// Check if a time slot is already booked
bookingRoutes.get("/check/:doctorId/:date/:slot", authentication, authorisation(["patient"]), async (req, res) => {
    try {
        const { doctorId, date, slot } = req.params;

        // Check if slot is available
        const existingBooking = await BookingModel.findOne({
            doctorId,
            bookingDate: date,
            bookingSlot: slot
        });

        res.status(200).json({
            success: true,
            isBooked: !!existingBooking,
            msg: existingBooking ? "Time slot is already booked" : "Time slot is available"
        });

    } catch (error) {
        console.error("Error checking booking availability:", error);
        res.status(500).json({
            success: false,
            msg: "Error checking booking availability",
            error: error.message
        });
    }
});

// Get doctor's bookings for a specific date
bookingRoutes.get("/doctor/:doctorId/:date", authentication, authorisation(["patient", "doctor"]), async (req, res) => {
    try {
        const { doctorId, date } = req.params;

        const bookings = await BookingModel.find({
            doctorId,
            bookingDate: date
        }).select('bookingSlot');

        res.status(200).json({
            success: true,
            bookings: bookings
        });

    } catch (error) {
        console.error("Error fetching doctor's bookings:", error);
        res.status(500).json({
            success: false,
            msg: "Error fetching doctor's bookings",
            error: error.message
        });
    }
});

// Delete booking
bookingRoutes.delete("/remove/:id", authentication, authorisation(["patient","doctor"]), async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userId = req.body.userId;
        const role = req.body.role;

        // Find the booking
        const booking = await BookingModel.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                msg: "Booking not found"
            });
        }

        // Check if user is authorized to delete this booking
        if (role === "patient" && booking.userId !== userId) {
            return res.status(403).json({
                success: false,
                msg: "Not authorized to delete this booking"
            });
        }

        if (role === "doctor" && booking.doctorId !== userId) {
            return res.status(403).json({
                success: false,
                msg: "Not authorized to delete this booking"
            });
        }

        await BookingModel.findByIdAndDelete(bookingId);

        res.status(200).json({
            success: true,
            msg: "Booking deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting booking:", error);
        res.status(500).json({
            success: false,
            msg: "Error deleting booking",
            error: error.message
        });
    }
});

module.exports = { bookingRoutes };
