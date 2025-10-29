"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Download, Send } from "lucide-react";

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  total: number;
}

interface InvoiceBuilderProps {
  customerId: string;
  userId: string;
  onCreateInvoice?: (data: any) => void;
  products: Array<{ id: string; name: string; price: number; quantity: number }>;
}

export default function InvoiceBuilder({
  customerId,
  userId,
  onCreateInvoice,
  products,
}: InvoiceBuilderProps) {
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState<{
    basePrice: number;
    discountedPrice: number;
    discountAmount: number;
    discountPercent: number;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // Calculate price when product or quantity changes
  useEffect(() => {
    if (!selectedProduct || !customerId) {
      setCalculatedPrice(null);
      return;
    }

    const calculatePrice = async () => {
      setPriceLoading(true);
      try {
        const response = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProduct,
            customerId,
            quantity,
            userId,
          }),
        });

        if (!response.ok) throw new Error("Failed to calculate price");
        const pricing = await response.json();
        setCalculatedPrice(pricing);
      } catch (error) {
        console.error("Price calculation error:", error);
        // Fall back to base price if calculation fails
        const product = products.find((p) => p.id === selectedProduct);
        if (product) {
          setCalculatedPrice({
            basePrice: product.price,
            discountedPrice: product.price,
            discountAmount: 0,
            discountPercent: 0,
          });
        }
      } finally {
        setPriceLoading(false);
      }
    };

    calculatePrice();
  }, [selectedProduct, quantity, customerId, products]);

  const handleAddItem = () => {
    if (!selectedProduct) return;

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    if (quantity > product.quantity) {
      alert(`Insufficient stock. Available: ${product.quantity}`);
      return;
    }

    // Use calculated price if available, otherwise use base price
    const unitPrice = calculatedPrice?.discountedPrice || product.price;
    const taxAmount = unitPrice * quantity * 0.18;

    const newItem: InvoiceItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice,
      discount: calculatedPrice?.discountAmount || 0,
      tax: taxAmount,
      total: unitPrice * quantity + taxAmount,
    };

    setItems([...items, newItem]);
    setSelectedProduct("");
    setQuantity(1);
    setCalculatedPrice(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateInvoice = async () => {
    if (items.length === 0) {
      alert("Please add at least one item");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          customerId,
          lineItems: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            discount: item.discount,
          })),
          deliveryAddress,
          notes,
          isSameState: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to create invoice");

      const invoice = await response.json();
      alert("Invoice created successfully!");
      onCreateInvoice?.(invoice);
      
      // Reset form
      setItems([]);
      setDeliveryAddress("");
      setNotes("");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalTax = items.reduce((sum, item) => sum + item.tax, 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const grandTotal = subtotal + totalTax - totalDiscount;

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Product
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Choose a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (Available: {product.quantity})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {selectedProduct && calculatedPrice && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Base Price (per unit):</p>
              <p className="text-lg font-semibold text-gray-900">
                ₹{calculatedPrice.basePrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Discounted Price (per unit):</p>
              <p className="text-lg font-semibold text-green-600">
                ₹{calculatedPrice.discountedPrice.toFixed(2)}
              </p>
            </div>
            {calculatedPrice.discountPercent > 0 && (
              <div>
                <p className="text-sm text-gray-600">Discount:</p>
                <p className="text-lg font-semibold text-orange-600">
                  {calculatedPrice.discountPercent.toFixed(1)}% OFF
                </p>
              </div>
            )}
          </div>
          {calculatedPrice.discountPercent > 0 && (
            <p className="text-xs text-gray-600">
              You save ₹{calculatedPrice.discountAmount.toFixed(2)} per unit
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleAddItem}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Plus className="w-4 h-4" /> Add Item
      </button>

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Product</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Unit Price</th>
                <th className="px-4 py-2 text-right">Discount</th>
                <th className="px-4 py-2 text-right">Tax</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="px-4 py-2">{item.productName}</td>
                  <td className="px-4 py-2 text-right">{item.quantity}</td>
                  <td className="px-4 py-2 text-right">₹{item.unitPrice}</td>
                  <td className="px-4 py-2 text-right">₹{item.discount}</td>
                  <td className="px-4 py-2 text-right">₹{item.tax.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-medium">
                    ₹{item.total.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax (18% GST):</span>
          <span>₹{totalTax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount:</span>
          <span>-₹{totalDiscount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>Grand Total:</span>
          <span>₹{grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Address
          </label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Enter delivery address"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Add any special notes"
          />
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button
          onClick={handleCreateInvoice}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "Creating..." : "Create Invoice"}
        </button>
      </div>
    </div>
  );
}