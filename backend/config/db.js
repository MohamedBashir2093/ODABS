const mongoose=require("mongoose");
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, '../../.env') });

const connection = mongoose.connect(process.env.MONGODB_URI);

module.exports={
    connection
}