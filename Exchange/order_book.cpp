#include "order_book.hpp"

OrderBook::OrderBook(){}

void OrderBook::addOrder(const Order& order)
{
	if (order.getType() == OrderType::Market || !order.IsValid())
		return ;

	uint64_t price(order.getPrice());
	if (order.getSide() == OrderSide::Buy)
	{
		auto it = bids.find(price);
		if (it == bids.end()) 
		{
    		auto inserted = bids.emplace(price, PriceLevel(price));
    		it = inserted.first;
		}
		it->second.addOrder(order);
	}
	else 
	{
		auto it = asks.find(price);
		if (it == asks.end()) 
		{
    		auto inserted = asks.emplace(price, PriceLevel(price));
    		it = inserted.first;
		}
		it->second.addOrder(order);
	}	
}

bool OrderBook::hasAsk() const
{
	return !asks.empty();
}

bool OrderBook::hasBid() const
{
	return !bids.empty();
}

const Order& OrderBook::bestAskOrder() const
{
	if (hasAsk())
		return asks.begin()->second.getFront();
	throw std::invalid_argument("No Ask Order");
}

const Order& OrderBook::bestBidOrder() const
{
	if (hasBid())
		return bids.begin()->second.getFront();
	throw std::invalid_argument("No Bid Order");
}

void OrderBook::popBestAskOrder()
{
	if (asks.empty())
		return;

	auto it = asks.begin();
	it->second.popFront();

	if (it->second.empty())
		asks.erase(it);
		
}

void OrderBook::popBestBidOrder()
{
	if (bids.empty()) 
		return;
	auto it = bids.begin();
	it->second.popFront();

	if (it->second.empty())
		bids.erase(it);
	
}

void OrderBook::askConsumed(unsigned int executedQuantity)
{
	if (executedQuantity == 0)
		return ;
	if (asks.empty())
		return;

	auto it = asks.begin();
	it->second.consumeFrontQuantity(executedQuantity);
	if (it->second.checkFrontEmpty())
	{
		it->second.popFront();
    	if (it->second.empty())
			asks.erase(it);
	}
}

void OrderBook::bidConsumed(unsigned int executedQuantity)
{
	if (executedQuantity == 0)
		return;
	if (bids.empty())
		return;

	auto it = bids.begin();
	it->second.consumeFrontQuantity(executedQuantity);
	if (it->second.checkFrontEmpty())
	{
		it->second.popFront();
		if (it->second.empty())
			bids.erase(it);
	}
}

