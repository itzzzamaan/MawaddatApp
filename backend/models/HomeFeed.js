const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  text: { type: String, required: true },
  userId: { type: String, default: '' },
  userName: { type: String, default: 'User' },
  userAvatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const HomeFeedSchema = new Schema({
  title: String,
  content: Schema.Types.Mixed,
  poet: Schema.Types.Mixed,
  poetId: String,
  poetName: String,
  language: String,
  image: String,
  avatar: String,
  tags: [String],
  type: String,
  category: String,
  likes: { type: Number, default: 0 },
  comments: {
    type: [CommentSchema],
    default: [],
    set: (value) => (Array.isArray(value) ? value : []),
  },
  liked: { type: Boolean, default: false },
  following: { type: Boolean, default: false },
  saved: { type: Boolean, default: false },
  born: String,
  displayOrder: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('HomeFeed', HomeFeedSchema);
