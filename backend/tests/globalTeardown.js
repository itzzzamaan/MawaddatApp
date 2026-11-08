module.exports = async () => {
  await global.__MONGO_MEMORY_SERVER__?.stop();
};
