const { compareByDisplayOrder, setDisplayOrder } = require('../utils/displayOrder');

const createMockModel = (records) => {
  const Model = {
    find: jest.fn(() => ({
      sort: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue(records),
      })),
    })),
    bulkWrite: jest.fn().mockResolvedValue({}),
  };
  return Model;
};

const getWrittenOrders = (Model) =>
  Object.fromEntries(
    Model.bulkWrite.mock.calls[0][0].map((operation) => [
      String(operation.updateOne.filter._id),
      operation.updateOne.update.$set.displayOrder,
    ]),
  );

describe('display ordering', () => {
  it('sorts ranked records first and leaves other records newest-first', () => {
    const records = [
      { _id: 'recent', createdAt: '2026-03-03T00:00:00Z' },
      { _id: 'rank-two', displayOrder: 2, createdAt: '2026-03-01T00:00:00Z' },
      { _id: 'rank-one', displayOrder: 1, createdAt: '2026-03-02T00:00:00Z' },
      { _id: 'older', createdAt: '2026-03-01T00:00:00Z' },
    ];

    expect(records.sort(compareByDisplayOrder).map((record) => record._id)).toEqual([
      'rank-one',
      'rank-two',
      'recent',
      'older',
    ]);
  });

  it('moves a record to the requested position and shifts existing ranks', async () => {
    const Model = createMockModel([
      { _id: 'newest', createdAt: '2026-03-03T00:00:00Z', displayOrder: null },
      { _id: 'first', createdAt: '2026-03-02T00:00:00Z', displayOrder: 1 },
      { _id: 'second', createdAt: '2026-03-01T00:00:00Z', displayOrder: 2 },
    ]);

    const result = await setDisplayOrder(Model, 'newest', 1, 20);

    expect(result).toEqual({ displayOrder: 1 });
    expect(getWrittenOrders(Model)).toEqual({
      first: 2,
      second: 3,
      newest: 1,
    });
  });

  it('removes a rank and compacts remaining ranked records', async () => {
    const Model = createMockModel([
      { _id: 'first', createdAt: '2026-03-02T00:00:00Z', displayOrder: 1 },
      { _id: 'second', createdAt: '2026-03-01T00:00:00Z', displayOrder: 2 },
    ]);

    const result = await setDisplayOrder(Model, 'first', null, 20);

    expect(result).toEqual({ displayOrder: null });
    expect(getWrittenOrders(Model)).toEqual({
      second: 1,
      first: null,
    });
  });

  it('rejects invalid positions without writing changes', async () => {
    const Model = createMockModel([]);

    const result = await setDisplayOrder(Model, 'missing', 21, 20);

    expect(result.error).toMatch(/1 to 20/);
    expect(Model.find).not.toHaveBeenCalled();
    expect(Model.bulkWrite).not.toHaveBeenCalled();
  });
});
