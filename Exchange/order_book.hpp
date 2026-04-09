#pragma once
#include "price_level.hpp"
#include <map>
#include <functional>
#include <stdexcept>

class OrderBook
{
	private:
		std::map<std::uint64_t, PriceLevel> asks;
		std::map<std::uint64_t, PriceLevel, std::greater<std::uint64_t>> bids;
	public:
		OrderBook();
		void addOrder(const Order& order);
		bool hasAsk() const;
		bool hasBid() const;
		const Order& bestAskOrder() const;
		const Order& bestBidOrder() const;
		void askConsumed(unsigned int executedQuantity);
		void bidConsumed(unsigned int executedQuantity);
		void popBestAskOrder();
		void popBestBidOrder();

};
