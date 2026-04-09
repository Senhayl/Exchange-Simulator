#include "matching.hpp"
#include <algorithm>

Matching::Matching(OrderBook orderBook) : _orderBook(orderBook){}


static std::uint64_t nowTsMicros()
{
	using namespace std::chrono;
	return static_cast<std::uint64_t>(duration_cast<microseconds>(system_clock::now().time_since_epoch()).count());
}

void Matching::addTrade(Order &order)
{
	if (order.getSide() == OrderSide::Buy)
	{
		if (order.getType() == OrderType::Limit)
		{
			while (_orderBook.hasAsk() && order.getRemainingQuantity() > 0 && _orderBook.bestAskOrder().getPrice() <= order.getPrice())
			{
				Order matchedOrder = _orderBook.bestAskOrder();
				unsigned int execQty = std::min(order.getRemainingQuantity(), matchedOrder.getRemainingQuantity());
				_orderBook.askConsumed(execQty);
				order.Fill(execQty);
				Trade trade(order.getOrderId(), matchedOrder.getOrderId(), matchedOrder.getPrice(), execQty, nowTsMicros());
				_trades.push_back(trade);
			}
			if (order.getRemainingQuantity() > 0)
				_orderBook.addOrder(order);
		}
		else 
		{
			while (_orderBook.hasAsk() && order.getRemainingQuantity() > 0)
			{
				Order matchedOrder = _orderBook.bestAskOrder();
				unsigned int execQty = std::min(order.getRemainingQuantity(), matchedOrder.getRemainingQuantity());
				_orderBook.askConsumed(execQty);
				order.Fill(execQty);
				Trade trade(order.getOrderId(), matchedOrder.getOrderId(), matchedOrder.getPrice(), execQty, nowTsMicros());
				_trades.push_back(trade);
			}
		}
	}
	else 
	{
		if (order.getType() == OrderType::Limit)
		{
			while (_orderBook.hasBid() && order.getRemainingQuantity() > 0 && _orderBook.bestBidOrder().getPrice() >= order.getPrice())
			{
				Order matchedOrder = _orderBook.bestBidOrder();
				unsigned int execQty = std::min(order.getRemainingQuantity(), matchedOrder.getRemainingQuantity());
				_orderBook.bidConsumed(execQty);
				order.Fill(execQty);
				Trade trade(matchedOrder.getOrderId(), order.getOrderId(), matchedOrder.getPrice(), execQty, nowTsMicros());
				_trades.push_back(trade);
			}
			if (order.getRemainingQuantity() > 0)
				_orderBook.addOrder(order);
		}
		else 
		{
			while (_orderBook.hasBid() && order.getRemainingQuantity() > 0)
			{
				Order matchedOrder = _orderBook.bestBidOrder();
				unsigned int execQty = std::min(order.getRemainingQuantity(), matchedOrder.getRemainingQuantity());
				_orderBook.bidConsumed(execQty);
				order.Fill(execQty);
				Trade trade(matchedOrder.getOrderId(), order.getOrderId(), matchedOrder.getPrice(), execQty, nowTsMicros());
				_trades.push_back(trade);
			}
		}
	}
}