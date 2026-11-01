const compareByDisplayOrder = (left, right) => {
  const leftOrder = Number.isInteger(left.displayOrder) && left.displayOrder > 0
    ? left.displayOrder
    : Number.POSITIVE_INFINITY;
  const rightOrder = Number.isInteger(right.displayOrder) && right.displayOrder > 0
    ? right.displayOrder
    : Number.POSITIVE_INFINITY;

  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
};

const setDisplayOrder = async (Model, id, requestedOrder, maxOrder) => {
  const clearOrder = requestedOrder === null || requestedOrder === "";
  const order = clearOrder ? null : Number(requestedOrder);
  if (
    !clearOrder &&
    (!Number.isInteger(order) || order < 1 || order > maxOrder)
  ) {
    return { error: `Order must be a whole number from 1 to ${maxOrder}, or blank for automatic order.` };
  }

  const records = await Model.find({}, { _id: 1, displayOrder: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .lean();
  const selected = records.find((record) => String(record._id) === String(id));
  if (!selected) return { notFound: true };

  const rankedRecords = records
    .filter(
      (record) =>
        String(record._id) !== String(id) &&
        Number.isInteger(record.displayOrder) &&
        record.displayOrder > 0 &&
        record.displayOrder <= maxOrder,
    )
    .sort(compareByDisplayOrder);
  const recordsToUpdate = [...rankedRecords];

  if (order !== null) {
    const maxAvailableOrder = Math.min(maxOrder, rankedRecords.length + 1);
    if (order > maxAvailableOrder) {
      return {
        error: `Choose a position from 1 to ${maxAvailableOrder}, or leave blank for automatic order.`,
      };
    }
    rankedRecords.splice(order - 1, 0, selected);
  }

  const orderedRecords = rankedRecords.slice(0, maxOrder);
  const orderById = new Map(
    orderedRecords.map((record, index) => [String(record._id), index + 1]),
  );
  const changedRecords = new Map(
    [...recordsToUpdate, selected].map((record) => [String(record._id), record]),
  );

  await Model.bulkWrite(
    [...changedRecords.values()].map((record) => ({
      updateOne: {
        filter: { _id: record._id },
        update: { $set: { displayOrder: orderById.get(String(record._id)) || null } },
      },
    })),
  );

  return { displayOrder: orderById.get(String(id)) || null };
};

module.exports = { compareByDisplayOrder, setDisplayOrder };
