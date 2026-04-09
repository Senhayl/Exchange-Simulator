#include <cassert>
#include <iostream>

#include "matching.hpp"
#include "order.hpp"
#include "order_book.hpp"
#include "price_level.hpp"

static void test_order_fill() {
    Order o(1, OrderType::Limit, OrderSide::Buy, 10, 100);
    assert(o.IsValid());
    assert(!o.IsFilled());
    o.Fill(4);
    assert(o.getRemainingQuantity() == 6);
    o.Fill(6);
    assert(o.IsFilled());
}

static void test_price_level_fifo() {
    PriceLevel level(100);
    Order o1(1, OrderType::Limit, OrderSide::Buy, 3, 100);
    Order o2(2, OrderType::Limit, OrderSide::Buy, 2, 100);

    level.addOrder(o1);
    level.addOrder(o2);

    assert(level.size() == 2);
    assert(level.getFront().getOrderId() == 1);

    level.popFront();
    assert(level.getFront().getOrderId() == 2);
}

static void test_order_book_best_and_consume() {
    OrderBook book;
    Order ask1(10, OrderType::Limit, OrderSide::Sell, 2, 100);
    Order ask2(11, OrderType::Limit, OrderSide::Sell, 3, 101);

    book.addOrder(ask1);
    book.addOrder(ask2);

    assert(book.hasAsk());
    assert(book.bestAskOrder().getPrice() == 100);

    book.askConsumed(2);
    assert(book.bestAskOrder().getPrice() == 101);
}

static void test_matching_limit_buy_crosses_levels() {
    OrderBook book;
    book.addOrder(Order(100, OrderType::Limit, OrderSide::Sell, 3, 100));
    book.addOrder(Order(101, OrderType::Limit, OrderSide::Sell, 5, 101));

    Matching engine(book);
    Order incoming(200, OrderType::Limit, OrderSide::Buy, 4, 101);

    engine.addTrade(incoming);
    assert(incoming.getRemainingQuantity() == 0);
}

static void test_matching_market_buy_partial_on_thin_book() {
    OrderBook book;
    book.addOrder(Order(300, OrderType::Limit, OrderSide::Sell, 4, 100));

    Matching engine(book);
    Order incoming(400, OrderType::Market, OrderSide::Buy, 10);

    engine.addTrade(incoming);
    assert(incoming.getRemainingQuantity() == 6);
}

static void test_matching_limit_sell_crosses_bid() {
    OrderBook book;
    book.addOrder(Order(500, OrderType::Limit, OrderSide::Buy, 4, 105));

    Matching engine(book);
    Order incoming(600, OrderType::Limit, OrderSide::Sell, 3, 104);

    engine.addTrade(incoming);
    assert(incoming.getRemainingQuantity() == 0);
}

int main() {
    test_order_fill();
    test_price_level_fifo();
    test_order_book_best_and_consume();
    test_matching_limit_buy_crosses_levels();
    test_matching_market_buy_partial_on_thin_book();
    test_matching_limit_sell_crosses_bid();

    std::cout << "All tests passed.\n";
    return 0;
}
