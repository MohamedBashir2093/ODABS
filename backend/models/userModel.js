const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["doctor", "patient"], default: "patient", required: true },
  specialty: String,
  bio: String,
  phone: String,
  address: String,
  profilePicture: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true }
});

const Usermodel = mongoose.model('user', userSchema);

module.exports = {
    Usermodel
};
