const express = require("express");
const { ScheduleModel } = require("../models/scheduleModel");
const { auth } = require("../middleware/auth.middleware");
const { UserModel } = require("../models/userModel");

const scheduleRouter = express.Router();

// Get doctor's schedule
scheduleRouter.get("/:doctorId", async (req, res) => {
    try {
        const { doctorId } = req.params;
        const schedule = await ScheduleModel.find({ doctorId });
        res.status(200).json({ success: true, data: schedule });
    } catch (error) {
        res.status(500).json({ success: false, msg: error.message });
    }
});

// Update doctor's schedule
scheduleRouter.post("/update", auth, async (req, res) => {
    try {
        const { doctorId, date, timeSlots } = req.body;

        // Verify doctor exists and user is authorized
        const doctor = await UserModel.findById(doctorId);
        if (!doctor || doctor.role !== "doctor") {
            return res.status(400).json({ success: false, msg: "Invalid doctor ID" });
        }

        if (req.user.role !== "doctor" || req.user._id.toString() !== doctorId) {
            return res.status(403).json({ success: false, msg: "Unauthorized to update schedule" });
        }

        // Update or create schedule
        const schedule = await ScheduleModel.findOneAndUpdate(
            { doctorId, date },
            { timeSlots },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, data: schedule });
    } catch (error) {
        res.status(500).json({ success: false, msg: error.message });
    }
});

// Get available time slots for a specific date and doctor
scheduleRouter.get("/slots/:doctorId/:date", async (req, res) => {
    try {
        const { doctorId, date } = req.params;
        const schedule = await ScheduleModel.findOne({ doctorId, date });
        
        // Default time slots if none are set
        const defaultTimeSlots = [
            "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
            "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"
        ];

        // If no schedule exists, create one with default slots
        if (!schedule) {
            const newSchedule = new ScheduleModel({
                doctorId,
                date,
                timeSlots: defaultTimeSlots
            });
            await newSchedule.save();
            return res.status(200).json({ 
                success: true, 
                data: { timeSlots: defaultTimeSlots }
            });
        }

        res.status(200).json({ 
            success: true, 
            data: { timeSlots: schedule.timeSlots }
        });
    } catch (error) {
        res.status(500).json({ success: false, msg: error.message });
    }
});

// Delete schedule for a specific date
scheduleRouter.delete("/:date", auth, async (req, res) => {
    try {
        const { date } = req.params;
        const doctorId = req.user._id;

        if (req.user.role !== "doctor") {
            return res.status(403).json({ success: false, msg: "Unauthorized to delete schedule" });
        }

        const result = await ScheduleModel.findOneAndDelete({ doctorId, date });
        
        if (!result) {
            return res.status(404).json({ success: false, msg: "Schedule not found" });
        }

        res.status(200).json({ success: true, msg: "Schedule deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, msg: error.message });
    }
});

module.exports = { scheduleRouter };
