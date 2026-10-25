const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || '0.0.0.0';

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mawaddat')
  .then(() => {
    console.log('Mongo connected');
    app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
  })
  .catch((err) => console.error(err));
