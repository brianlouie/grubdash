const path = require("path");
const orders = require(path.resolve("src/data/orders-data"));
// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function list(req, res) {
  res.json({ data: orders });
}

function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Order must include a ${propertyName}` });
  };
}

function propertyHasContent(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName] === "") {
      return next({
        status: 400,
        message: `Dish must include a ${propertyName}`,
      });
    }
    next();
  };
}

function dishesPropertyIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  if (!dishes) {
    return next({ status: 400, message: `Order must include a dish` });
  }
  if (Array.isArray(dishes) === false || dishes.length === 0) {
    return next({
      status: 400,
      message: `Order must include at least one dish`,
    });
  }
  next();
}

function quantityPropertyIsValid(req, res, next) {
  const { data: { dishes } = {} } = req.body;
  const index = dishes.findIndex(
    (dish) =>
      !dish.quantity || dish.quantity <= 0 || !Number.isInteger(dish.quantity)
  );
  if (index !== -1) {
    return next({
      status: 400,
      message: `Dish ${index} must have a quantity that is an integer greater than 0`,
    });
  }
  next();
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}.`,
  });
}

function read(req, res, next) {
  res.json({ data: res.locals.order });
}

function update(req, res, next) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes, id } = {} } =
    req.body;
  if (id && order.id !== id && id !== "" && id !== null && id !== undefined) {
    return next({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${order.id}`,
    });
  }
  if (!status) {
    return next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  }
  if (status === "" || status === "invalid") {
    return next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  }
  if (status === "delivered") {
    return next({
      status: 400,
      message: `A delivered order cannot be changed`,
    });
  }
  // Update the order
  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  res.json({ data: order });
}

function destroy(req, res, next) {
  const currentOrder = res.locals.order;
  if (currentOrder.status !== "pending") {
    return next({
      status: 400,
      message: `An order cannot be deleted unless it is pending`,
    });
  }
  const index = orders.findIndex((order) => order.id === currentOrder.id);
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    propertyHasContent("deliverTo"),
    propertyHasContent("mobileNumber"),
    dishesPropertyIsValid,
    quantityPropertyIsValid,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyDataHas("deliverTo"),
    bodyDataHas("mobileNumber"),
    propertyHasContent("deliverTo"),
    propertyHasContent("mobileNumber"),
    dishesPropertyIsValid,
    quantityPropertyIsValid,
    update,
  ],
  destroy: [orderExists, destroy],
};
