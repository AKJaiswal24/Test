jest.mock("../../models/DeliveryTask", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../../models/Order", () => ({
  find: jest.fn(),
}));

jest.mock("../../models/Product", () => ({
  findById: jest.fn(),
}));

jest.mock("../../utils/notifications", () => ({
  notifyDeliveryAssigned: jest.fn(),
  notifyDeliveryAccepted: jest.fn(),
  notifyRenterDeliveryUpdate: jest.fn().mockResolvedValue(null),
  notifyLenderDeliveryUpdate: jest.fn().mockResolvedValue(null),
  notifyPaymentCollected: jest.fn(),
  notifyRentalExtended: jest.fn(),
  notifyAgentApplication: jest.fn(),
}));

const DeliveryTask = require("../../models/DeliveryTask");
const Order = require("../../models/Order");
const Product = require("../../models/Product");
const {
  generateTasksForExpiredDeliveries,
} = require("../deliveryController");

const orderId = "507f1f77bcf86cd799439011";
const productId = "507f1f77bcf86cd799439012";
const lenderId = "507f1f77bcf86cd799439013";
const renterId = "507f1f77bcf86cd799439014";

const makeExpiredOrder = () => ({
  _id: orderId,
  userId: renterId,
  returnDate: "2020-01-01",
  deliveryAddress: {
    street: "Renter street address",
    city: "Mumbai",
    state: "MH",
    pincode: "400001",
    phone: "9999999999",
  },
  items: [{ productId, returnDate: "2020-01-01" }],
});

const chainResolve = (value) => ({
  sort: jest.fn().mockResolvedValue(value),
  select: jest.fn().mockResolvedValue(value),
});

describe("generateTasksForExpiredDeliveries", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Order.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([makeExpiredOrder()]),
    });
  });

  test("exports a callable cron helper", () => {
    expect(typeof generateTasksForExpiredDeliveries).toBe("function");
  });

  test("creates a waiting return pickup when an expired delivered item has no pickup task", async () => {
    DeliveryTask.findOne
      .mockReturnValueOnce(chainResolve(null))
      .mockReturnValueOnce(chainResolve({
        lenderId,
        status: "Delivered",
        pickupAddress: { street: "Lender address", city: "Pune", state: "MH", pincode: "411001", phone: "8888888888" },
        dropAddress: makeExpiredOrder().deliveryAddress,
      }));

    Product.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ userId: lenderId }),
    });

    DeliveryTask.create.mockResolvedValue({
      _id: "507f1f77bcf86cd799439015",
      orderId,
      productId,
      lenderId,
      renterId,
    });

    const result = await generateTasksForExpiredDeliveries();

    expect(result).toMatchObject({ generated: 1, activated: 0, skipped: 0, errors: [] });
    expect(DeliveryTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId,
        productId,
        lenderId,
        renterId,
        taskType: "pickup",
        status: "Waiting for Agent",
        paymentAmount: 75,
        otp: "",
      })
    );
  });

  test("activates an existing scheduled pickup instead of creating a duplicate", async () => {
    const existingPickup = {
      _id: "507f1f77bcf86cd799439015",
      orderId,
      productId,
      lenderId,
      renterId,
      status: "Pickup Scheduled",
      agentId: "507f1f77bcf86cd799439016",
      trackingLogs: [],
      save: jest.fn().mockResolvedValue(null),
    };

    DeliveryTask.findOne.mockReturnValueOnce(chainResolve(existingPickup));

    const result = await generateTasksForExpiredDeliveries();

    expect(result).toMatchObject({ generated: 0, activated: 1, skipped: 0, errors: [] });
    expect(existingPickup.status).toBe("Waiting for Agent");
    expect(existingPickup.agentId).toBeNull();
    expect(existingPickup.trackingLogs).toHaveLength(1);
    expect(DeliveryTask.create).not.toHaveBeenCalled();
  });
});
