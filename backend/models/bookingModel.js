const mongoose = require("mongoose");

const bookingSchema = mongoose.Schema({
    userId: { type: String, required: true },
    doctorId: { type: String, required: true },
    doctorName: { type: String, required: true },
    userEmail: { type: String, required: true },
    bookingDate: { type: String, required: true },
    bookingSlot: { type: String, required: true }
}, { timestamps: true });

const BookingModel = mongoose.model("booking", bookingSchema);

module.exports = { BookingModel };