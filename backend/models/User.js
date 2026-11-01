const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: function passwordRequired() {
      return !this.googleId && !this.firebaseUid;
    },
  },
  firebaseUid: { type: String, unique: true, sparse: true },
  googleId: { type: String, unique: true, sparse: true },
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
