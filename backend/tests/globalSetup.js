// Runs the suite against a throwaway in-memory MongoDB so tests never touch the
// Atlas database configured in backend/.env.
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const server = await MongoMemoryServer.create();
  process.env.MONGO_URI = server.getUri();
  global.__MONGO_MEMORY_SERVER__ = server;
};
