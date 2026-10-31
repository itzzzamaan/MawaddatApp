const mongoose = require("mongoose");
const { connectToDatabase } = require("./database");
const Event = require("./models/Event");
const HomeFeed = require("./models/HomeFeed");
const Poet = require("./models/Poet");

const eventDate = (daysFromNow) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
};

const events = [
  {
    title: "Evening of Poetry and Reflection",
    subtitle: "A community gathering celebrating words and remembrance",
    category: "Community",
    date: eventDate(14),
    time: "6:00 PM",
    venue: "Community Arts Centre",
    completeAddress: "Karachi, Pakistan",
    host: "Mawaddat Community",
    image:
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=85",
    description:
      "Join the community for an evening of poetry, reflection, and conversation.",
    highlights: ["Live readings", "Community gathering", "Open to all"],
    featured: true,
  },
  {
    title: "Mawaddat Cultural Meetup",
    subtitle: "Poetry, culture, and connection",
    category: "Gathering",
    date: eventDate(28),
    time: "5:30 PM",
    venue: "Heritage Hall",
    completeAddress: "Lahore, Pakistan",
    host: "Mawaddat Community",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=85",
    description:
      "Spend an afternoon sharing poetry and connecting with the local community.",
    highlights: ["Poetry readings", "Refreshments", "Family friendly"],
    featured: false,
  },
];

const posts = [
  {
    title: "A Thought on Kindness",
    poet: "Mawaddat Community",
    poetName: "Mawaddat Community",
    poetId: "mawaddat-community",
    type: "shayari",
    category: "Reflection",
    content: {
      roman: "A kind word can make a difficult day feel lighter.",
      urdu: "ایک مہربان لفظ مشکل دن کو آسان بنا سکتا ہے۔",
      hindi: "एक दयालु शब्द कठिन दिन को आसान बना सकता है।",
    },
    image:
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85",
    avatar:
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=200&q=80",
    tags: ["kindness", "reflection"],
    likes: 0,
    comments: [],
  },
  {
    title: "A Moment of Gratitude",
    poet: "Mawaddat Community",
    poetName: "Mawaddat Community",
    poetId: "mawaddat-community",
    type: "shayari",
    category: "Reflection",
    content: {
      roman: "Pause for a moment; gratitude often begins with noticing what is already here.",
      urdu: "ایک لمحہ ٹھہریے؛ شکرگزاری اکثر موجود نعمتوں کو پہچاننے سے شروع ہوتی ہے۔",
      hindi: "एक पल ठहरें; कृतज्ञता अक्सर उन चीज़ों को पहचानने से शुरू होती है जो हमारे पास हैं।",
    },
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=85",
    avatar:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=200&q=80",
    tags: ["gratitude", "reflection"],
    likes: 0,
    comments: [],
  },
  {
    title: "The Beauty of Patience",
    poet: "Mawaddat Community",
    poetName: "Mawaddat Community",
    poetId: "mawaddat-community",
    type: "shayari",
    category: "Reflection",
    content: {
      roman: "Some paths become clear when we give them time.",
      urdu: "کچھ راستے وقت دینے سے روشن ہو جاتے ہیں۔",
      hindi: "कुछ रास्ते समय देने पर साफ़ दिखाई देने लगते हैं।",
    },
    image:
      "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=85",
    avatar:
      "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=200&q=80",
    tags: ["patience", "reflection"],
    likes: 0,
    comments: [],
  },
];

const poets = [
  {
    name: "Mawaddat Community",
    bio: "A community space for sharing poetry, reflection, and thoughtful words.",
    description:
      "A community space for sharing poetry, reflection, and thoughtful words.",
    location: "Pakistan",
    category: "Association",
    famousFor: "Community poetry and reflection",
    categories: ["Poetry", "Reflection"],
    avatar:
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=400&q=80",
    image:
      "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=800&q=85",
  },
];

const upsertByKey = (Model, records, key = "title") =>
  Model.bulkWrite(
    records.map((record) => ({
      updateOne: {
        filter: { [key]: record[key] },
        update: { $setOnInsert: record },
        upsert: true,
      },
    })),
  );

const seedContent = async () => {
  await connectToDatabase();

  const [eventResult, postResult, poetResult] = await Promise.all([
    upsertByKey(Event, events),
    upsertByKey(HomeFeed, posts),
    upsertByKey(Poet, poets, "name"),
  ]);

  console.log(
    `Sample content ready: ${eventResult.upsertedCount} events added, ` +
      `${events.length - eventResult.upsertedCount} already existed; ` +
      `${postResult.upsertedCount} posts added, ` +
      `${posts.length - postResult.upsertedCount} already existed; ` +
      `${poetResult.upsertedCount} poets added, ` +
      `${poets.length - poetResult.upsertedCount} already existed.`,
  );
};

if (require.main === module) {
  seedContent()
    .catch((error) => {
      console.error("Content seeding failed:", error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = { events, posts, poets, seedContent };
