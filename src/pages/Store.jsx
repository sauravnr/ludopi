// src/pages/Store.jsx
import React from "react";

const COIN_BUNDLES = [
  { id: 1, amount: 100, price: "$0.99" },
  { id: 2, amount: 550, price: "$4.99" },
  { id: 3, amount: 1200, price: "$9.49" },
  { id: 4, amount: 2500, price: "$18.99" },
];

export default function Store() {
  return (
    <div className="py-5 px-2 h-full flex flex-col">
      <div className="bg-[#fff8e6] border border-[#e0c08b] rounded-2xl shadow-[0_3px_0_#c7994a,0_8px_2px_rgba(0,0,0,0.5)] text-gray-900 py-6 px-3 flex flex-col flex-1 overflow-hidden">
        <h2 className="text-center text-xl font-bold mb-4">Store</h2>
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {COIN_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-[#fff8e6] border border-[#e0c08b] rounded-xl shadow-[0_2px_0_#c7994a,0_5px_2px_rgba(0,0,0,0.3)] flex flex-col items-center p-4"
              >
                <img
                  src="/icons/coin.png"
                  alt="Coins"
                  className="w-16 h-16 object-contain mb-2"
                />
                <div className="font-semibold text-lg mb-1">
                  {bundle.amount} Coins
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
