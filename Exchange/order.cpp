#include "order.hpp"
#include <stdexcept>

Order::Order(unsigned long long orderID, OrderType type, OrderSide side, unsigned int quantity)
{
	_orderID = orderID;
	_type = type;
	_side = side;
	_quantity = quantity;
	_remainingQuantity = quantity;
	_price = 0;
}

Order::Order(unsigned long long orderID, OrderType type, OrderSide side, unsigned int quantity, std::uint64_t priceTicks)
{
	_orderID = orderID;
	_type = type;
	_side = side;
	_quantity = quantity;
	_remainingQuantity = _quantity;
	_price = priceTicks;
}

bool Order::IsValid() const
{
	if (_quantity == 0)
		return false;
	if (_remainingQuantity > _quantity)
		return false;
	if (_type == OrderType::Limit && _price <= 0)
		return false;
	if (_type == OrderType::Market && _price != 0)
		return false;
	return true;
}

bool Order::IsFilled() const
{
	return _remainingQuantity == 0;
}

void Order::Fill(unsigned int quantity)
{
	if (quantity == 0)
		throw std::invalid_argument("Fill quantity must be > 0");
	if (quantity > _remainingQuantity)
		throw std::invalid_argument("Fill quantity exceeds remaining quantity");

	_remainingQuantity -= quantity;
}

std::uint64_t const Order::getPrice() const
{
	return _price;
}

OrderType const Order::getType() const
{
	return _type;
}

OrderSide const Order::getSide() const
{
	return _side;
}

unsigned long long const Order::getOrderId() const
{
	return _orderID;
}

unsigned int const Order::getRemainingQuantity() const
{
	return _remainingQuantity;
}
