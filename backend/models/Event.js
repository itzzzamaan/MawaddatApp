const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  title: String,
  subtitle: String,
  category: String,
  date: String,
  time: String,
  venue: String,
  completeAddress: String,
  mapsLink: String,
  host: String,
  image: String,
  description: String,
  highlights: [String],
  featured: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Event', EventSchema);
