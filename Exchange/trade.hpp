#pragma once
#include <cstdint>
#include "order.hpp"

class Trade
{
	private:
		uint64_t _buyId;
		uint64_t _sellId;
		uint64_t _priceTicks;
		uint32_t _quantity;
		uint64_t _timestamp;

	public:
		Trade(uint64_t _buyId, uint64_t _sellId, uint64_t _priceTicks, uint32_t _qty, uint64_t _ts);
		uint64_t const getBuyId() const;
		uint64_t const getSellId() const;
		uint64_t const getPriceTicks() const;
		uint32_t const getQuantity() const;
		uint64_t const getTimestamp() const;

};
