const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mawaddat';
const dryRun = process.argv.includes('--dry-run');
const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

const validExt = /\.(jpe?g|png|webp)$/i;

const isValidUploadFilename = (value) => {
  if (!value || typeof value !== 'string') return false;
  const filename = value.split('/').filter(Boolean).pop() || '';
  return validExt.test(filename);
};

const isBrokenPath = (value) => {
  if (!value || typeof value !== 'string') return false;
  const normalized = value.replace(/\\/g, '/').trim();
  if (!normalized) return false;
  if (/^https?:\/\//i.test(normalized)) {
    const fileName = normalized.split('/').filter(Boolean).pop() || '';
    return !validExt.test(fileName);
  }
  if (normalized.startsWith('/uploads/')) {
    return !isValidUploadFilename(normalized);
  }
  return /[A-Za-z]:\//.test(normalized) || /\/uploads\/C:/i.test(normalized) || /uploads\/[A-Za-z]:/i.test(normalized);
};

const normalizeImagePath = (value) => {
  if (!value || typeof value !== 'string') return '';
  const normalized = value.replace(/\\/g, '/').trim();
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) {
    const fileName = normalized.split('/').filter(Boolean).pop() || '';
    return validExt.test(fileName) ? `/uploads/${fileName}` : '';
  }
  if (normalized.startsWith('/uploads/')) {
    const fileName = normalized.split('/uploads/').pop() || '';
    return validExt.test(fileName) ? `/uploads/${fileName}` : '';
  }
  const fileName = normalized.split('/').filter(Boolean).pop() || '';
  return validExt.test(fileName) ? `/uploads/${fileName}` : '';
};

const deleteInvalidUploadedFiles = () => {
  if (!fs.existsSync(uploadDir)) return { removed: 0, files: [] };
  const files = fs.readdirSync(uploadDir);
  const removed = [];

  for (const file of files) {
    const fullPath = path.join(uploadDir, file);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile()) continue;

    const buffer = fs.readFileSync(fullPath);
    const text = buffer.toString('utf8', 0, 100).toLowerCase();
    const isImage =
      buffer.length > 0 &&
      ((buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ||
        (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
        (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50));

    const placeholder = text.includes('file not found') || text.includes('not found') || text.includes('error');
    if (!isImage || placeholder || !validExt.test(file)) {
      removed.push(file);
      if (!dryRun) fs.unlinkSync(fullPath);
    }
  }

  return { removed, files };
};

const collectionPolicies = {
  homefeeds: ['image', 'avatar'],
  events: ['image'],
  poets: ['image', 'avatar'],
  carousels: ['image'],
};

const repairCollection = async (name) => {
  const collection = mongoose.connection.db.collection(name);
  const docs = await collection.find({}).toArray();
  let brokenCount = 0;
  let fixedCount = 0;

  for (const doc of docs) {
    const fields = collectionPolicies[name] || ['image'];
    const update = {};

    for (const field of fields) {
      const original = doc[field];
      if (!isBrokenPath(original)) continue;
      brokenCount++;
      const fixed = normalizeImagePath(original);
      update[field] = fixed || '';
    }

    if (Object.keys(update).length) {
      fixedCount++;
      if (!dryRun) {
        await collection.updateOne({ _id: doc._id }, { $set: update });
      }
      console.log(`[${name}] ${doc._id} -> ${JSON.stringify(update)}`);
    }
  }

  console.log(`Collection ${name}: broken rows found=${brokenCount}, ${dryRun ? 'would fix' : 'fixed'}=${fixedCount}`);
};

(async () => {
  const cleanup = deleteInvalidUploadedFiles();
  console.log(`Upload cleanup: removed=${cleanup.removed.length} files`, cleanup.removed.slice(0, 10));

  await mongoose.connect(MONGO_URI);
  console.log(`Mongo connected: ${MONGO_URI}`);

  for (const name of Object.keys(collectionPolicies)) {
    await repairCollection(name);
  }

  console.log(dryRun ? 'Dry run complete.' : 'Cleanup complete.');
  process.exit(0);
})().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
