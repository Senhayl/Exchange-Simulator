#include "price_level.hpp"

PriceLevel::PriceLevel(uint64_t priceTicks)
{
	_priceTicks = priceTicks;
}

void PriceLevel::addOrder(const Order& order)
{
	if (order.IsValid() && order.getType() == OrderType::Limit && order.getPrice() == _priceTicks)
	{
		_orders.push_back(order);
	}
}

const Order& PriceLevel::getFront() const
{
	return _orders.front();
}

Order& PriceLevel::getFront()
{
	return _orders.front();
}

bool PriceLevel::checkFrontEmpty()
{
	if (!this->empty())
	{
		if (this->getFront().getRemainingQuantity() == 0)
		return true;
	}
	return false;
}

void PriceLevel::popFront()
{
	_orders.pop_front();
}

bool PriceLevel::empty() const
{
	return _orders.empty();
}

size_t PriceLevel::size() const
{
	return _orders.size();
}

void PriceLevel::consumeFrontQuantity(unsigned int quantity)
{
	this->getFront().Fill(quantity);
}

std::uint64_t PriceLevel::getPriceTicks() const
{
	return _priceTicks;
}

