#pragma once
#include <deque>
#include "order.hpp"

class PriceLevel 
{
	private:
		std::uint64_t _priceTicks;
		std::deque<Order> _orders;
	public:
		PriceLevel(std::uint64_t priceTicks);
		void addOrder(const Order& order);
		const Order& getFront() const;
		Order& getFront();
		std::uint64_t getPriceTicks() const;
		void consumeFrontQuantity(unsigned int quantity);
		void popFront();
		bool checkFrontEmpty();
		bool empty() const;
		size_t size() const;


};
