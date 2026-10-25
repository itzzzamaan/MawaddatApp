const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CarouselSlideSchema = new Schema({
  title: String,
  subtitle: String,
  description: String,
  label: String,
  image: String,
  order: Number,
  socialLinks: Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('CarouselSlide', CarouselSlideSchema);
