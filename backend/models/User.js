const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  mobile: String,
  address: String,
  imageUri: String,
  pushTokens: { type: [String], default: [] },
  followedPoets: {
    type: [{ id: { type: String, default: "" }, name: { type: String, default: "" } }],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
