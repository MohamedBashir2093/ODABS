const mongoose = require("mongoose");

const scheduleSchema = mongoose.Schema({
    doctorId: { type: String, required: true },
    date: { type: String, required: true },
    timeSlots: [{ type: String, required: true }]
}, { timestamps: true });

const ScheduleModel = mongoose.model("schedule", scheduleSchema);

module.exports = { ScheduleModel };
