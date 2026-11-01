const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PoetSchema = new Schema({
  name: String,
  bio: String,
  description: String,
  years: String,
  location: String,
  category: String,
  famousFor: String,
  avatar: String,
  image: String,
  categories: [String],
  social: Schema.Types.Mixed,
  displayOrder: { type: Number, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Poet', PoetSchema);
