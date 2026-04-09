#pragma once
#include <cstdint>


enum class OrderType {Market, Limit};
enum class OrderSide {Buy, Sell};

class Order 
{
	private: 
		unsigned long long _orderID;
		OrderType _type;
		OrderSide _side;
		unsigned int _quantity;
		unsigned int _remainingQuantity;
		std::uint64_t _price;
	public:
		Order(unsigned long long orderID, OrderType type, OrderSide side, 
		unsigned int quantity);
		Order(unsigned long long orderID, OrderType type, OrderSide side, 
		unsigned int quantity, std::uint64_t priceTicks);
		bool IsValid() const;
		bool IsFilled() const;

		void Fill(unsigned int quantity);
		std::uint64_t const getPrice() const;
		OrderType const getType() const;
		OrderSide const getSide() const;
		unsigned long long const getOrderId() const;
		unsigned int const getRemainingQuantity() const;
	

};