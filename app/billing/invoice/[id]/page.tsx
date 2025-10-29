"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Plus, Truck, DollarSign } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    gstin?: string;
    address?: string;
  };
  lineItems: Array<{
    id: string;
    product: { name: string; sku?: string };
    quantity: number;
    unitPrice: number;
    discount: number;
    sgst: number;
    cgst: number;
    igst: number;
    lineTotal: number;
  }>;
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  tds: number;
  tcs: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: string;
  profitMargin: number;
  profitPercent: number;
  payments: Array<{
    id: string;
    amount: number;
    paymentMethod: string;
    createdAt: string;
  }>;
  invoiceDate: string;
  dueDate?: string;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.id as string;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: "Cash",
    transactionId: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUserAndInvoice = async () => {
      try {
        // Fetch authenticated user ID
        const authResponse = await fetch("/api/auth/me");
        if (authResponse.ok) {
          const authData = await authResponse.json();
          setUserId(authData.userId);
        }

        // Fetch invoice
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) throw new Error("Failed to fetch invoice");
        const data = await response.json();
        setInvoice(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndInvoice();
  }, [invoiceId]);

  const handlePayment = async () => {
    if (!invoice || paymentData.amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          customerId: invoice.customer.name,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionId,
          notes: paymentData.notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to record payment");

      alert("Payment recorded successfully!");
      setShowPaymentForm(false);
      setPaymentData({ amount: 0, paymentMethod: "Cash", transactionId: "", notes: "" });

      // Refresh invoice
      const invoiceResponse = await fetch(`/api/invoices/${invoiceId}`);
      if (invoiceResponse.ok) {
        const updatedInvoice = await invoiceResponse.json();
        setInvoice(updatedInvoice);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateChallan = async () => {
    if (!invoice || !userId) {
      alert("Please wait for authentication to complete");
      return;
    }

    try {
      const response = await fetch("/api/delivery-challan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          invoiceId: invoice.id,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate challan");

      const challan = await response.json();
      alert(`Delivery Challan generated: ${challan.challanNumber}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to generate challan");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 font-medium">Invoice not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {invoice.invoiceNumber}
              </h1>
              <p className="text-gray-600">
                Invoice Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-4 py-2 rounded-full font-medium ${
                  invoice.status === "Paid"
                    ? "bg-green-100 text-green-800"
                    : invoice.status === "Partial"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {invoice.status}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Bill Details */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Bill To</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-gray-900">{invoice.customer.name}</p>
              {invoice.customer.email && <p>{invoice.customer.email}</p>}
              {invoice.customer.phone && <p>{invoice.customer.phone}</p>}
              {invoice.customer.gstin && <p>GSTIN: {invoice.customer.gstin}</p>}
              {invoice.customer.address && <p>{invoice.customer.address}</p>}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Invoice Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date:</span>
                <span className="font-medium">
                  {new Date(invoice.invoiceDate).toLocaleDateString()}
                </span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Due Date:</span>
                  <span className="font-medium">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Profit Margin:</span>
                <span className="font-medium text-green-600">
                  ₹{parseFloat(String(invoice.profitMargin)).toFixed(2)} ({parseFloat(String(invoice.profitPercent)).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-900">
                  Product
                </th>
                <th className="px-6 py-3 text-center font-semibold text-gray-900">
                  Qty
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">
                  Tax
                </th>
                <th className="px-6 py-3 text-right font-semibold text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      {item.product.sku && (
                        <p className="text-xs text-gray-600">SKU: {item.product.sku}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">{item.quantity}</td>
                  <td className="px-6 py-4 text-right">
                    ₹{parseFloat(String(item.unitPrice)).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ₹
                    {(
                      parseFloat(String(item.sgst)) +
                      parseFloat(String(item.cgst)) +
                      parseFloat(String(item.igst))
                    ).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    ₹{parseFloat(String(item.lineTotal)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Tax Summary */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div></div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₹{parseFloat(String(invoice.subtotal)).toFixed(2)}</span>
            </div>
            {parseFloat(String(invoice.sgst)) > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">SGST (9%):</span>
                <span className="font-medium">₹{parseFloat(String(invoice.sgst)).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(String(invoice.cgst)) > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">CGST (9%):</span>
                <span className="font-medium">₹{parseFloat(String(invoice.cgst)).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(String(invoice.igst)) > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">IGST (18%):</span>
                <span className="font-medium">₹{parseFloat(String(invoice.igst)).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(String(invoice.tds)) > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">TDS:</span>
                <span className="font-medium">-₹{parseFloat(String(invoice.tds)).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(String(invoice.tcs)) > 0 && (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-600">TCS:</span>
                <span className="font-medium">-₹{parseFloat(String(invoice.tcs)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-gray-200 text-lg font-bold">
              <span>Total:</span>
              <span>₹{parseFloat(String(invoice.total)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Payment Status</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-600 text-sm">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{parseFloat(String(invoice.amountPaid)).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Amount Due</p>
              <p className="text-2xl font-bold text-red-600">
                ₹{parseFloat(String(invoice.amountDue)).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-sm">Progress</p>
              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600"
                    style={{
                      width: `${(parseFloat(String(invoice.amountPaid)) / parseFloat(String(invoice.total))) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-sm font-medium mt-1">
                  {((parseFloat(String(invoice.amountPaid)) / parseFloat(String(invoice.total))) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        {invoice.payments.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Payment History</h2>
            <div className="space-y-3">
              {invoice.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {payment.paymentMethod}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-medium text-green-600">
                    +₹{parseFloat(String(payment.amount)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" /> Print / Download
          </button>

          {invoice.status !== "Paid" && (
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <DollarSign className="w-4 h-4" /> Record Payment
            </button>
          )}

          <button
            onClick={handleGenerateChallan}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Truck className="w-4 h-4" /> Generate Challan
          </button>
        </div>

        {/* Payment Form */}
        {showPaymentForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Record Payment</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  max={parseFloat(String(invoice.amountDue))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder={`Max: ₹${parseFloat(String(invoice.amountDue)).toFixed(2)}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      paymentMethod: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction ID (Optional)
              </label>
              <input
                type="text"
                value={paymentData.transactionId}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    transactionId: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter transaction ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={paymentData.notes}
                onChange={(e) =>
                  setPaymentData({
                    ...paymentData,
                    notes: e.target.value,
                  })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handlePayment}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? "Recording..." : "Record Payment"}
              </button>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media print {
          .flex.gap-4 {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}