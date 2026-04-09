#pragma once 
#include "order_book.hpp"
#include "price_level.hpp"
#include "order.hpp"
#include "trade.hpp"
#include <chrono>


class Matching
{
	private:
		OrderBook _orderBook;
		std::vector<Trade> _trades;
	public:
		Matching(OrderBook orderBook);
		void addTrade(Order &order);

};
