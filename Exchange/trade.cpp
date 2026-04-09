#include "trade.hpp"

Trade::Trade(uint64_t buyId, uint64_t sellId, uint64_t priceTicks, uint32_t qty, uint64_t ts)
{
	this->_buyId = buyId;
	this->_sellId = sellId;
	this->_priceTicks = priceTicks;
	this->_quantity = qty;
	this->_timestamp = ts;
}

uint64_t const Trade::getBuyId() const
{
	return _buyId;
}

uint64_t const Trade::getSellId() const
{
	return _sellId;
}

uint64_t const Trade::getPriceTicks() const
{
	return _priceTicks;
}

uint32_t const Trade::getQuantity() const
{
	return _quantity;
}

uint64_t const Trade::getTimestamp() const
{
	return _timestamp;
}
