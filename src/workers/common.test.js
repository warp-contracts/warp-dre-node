const { partition } = require("./common.js");

test("should properly partition interactions", () => {
  expect(partition([])).toEqual([]);

  expect(partition([
    { contractTxId: "A", id: "A1" },
    { contractTxId: "B", id: "B1" },
    { contractTxId: "C", id: "C1" }
  ])).toEqual([
    [{ contractTxId: "A", id: "A1" }],
    [{ contractTxId: "B", id: "B1" }],
    [{ contractTxId: "C", id: "C1" }]
  ]);

  expect(partition([
    { contractTxId: "A", id: "A1" },
    { contractTxId: "A", id: "A2" },
    { contractTxId: "A", id: "A3" }
  ])).toEqual([
    [
      { contractTxId: "A", id: "A1" },
      { contractTxId: "A", id: "A2" },
      { contractTxId: "A", id: "A3" }
    ]
  ]);

  expect(partition([
    { contractTxId: "A", id: "A1" },
    { contractTxId: "B", id: "B1" },
    { contractTxId: "B", id: "B2" },
    { contractTxId: "C", id: "C1" },
    { contractTxId: "C", id: "C2" },
    { contractTxId: "C", id: "C3" }
  ])).toEqual([
    [{ contractTxId: "A", id: "A1" }],
    [
      { contractTxId: "B", id: "B1" },
      { contractTxId: "B", id: "B2" }
    ],
    [
      { contractTxId: "C", id: "C1" },
      { contractTxId: "C", id: "C2" },
      { contractTxId: "C", id: "C3" }
    ]
  ]);

  expect(partition([
    { contractTxId: "A", id: "A1" },
    { contractTxId: "B", id: "B1" },
    { contractTxId: "B", id: "B2" },
    { contractTxId: "C", id: "C1" },
    { contractTxId: "C", id: "C2" },
    { contractTxId: "C", id: "C3" },
    { contractTxId: "B", id: "B3" },
    { contractTxId: "A", id: "A2" }
  ])).toEqual([
    [{ contractTxId: "A", id: "A1" }],
    [
      { contractTxId: "B", id: "B1" },
      { contractTxId: "B", id: "B2" }
    ],
    [
      { contractTxId: "C", id: "C1" },
      { contractTxId: "C", id: "C2" },
      { contractTxId: "C", id: "C3" }
    ],
    [{ contractTxId: "B", id: "B3" }],
    [{ contractTxId: "A", id: "A2" }],
  ]);

});