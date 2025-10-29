"use client";

import { useEffect, useState } from "react";
import InvoiceBuilder from "@/components/billing/invoice-builder";
import CustomerForm from "@/components/billing/customer-form";
import { Plus, Eye, MessageSquare } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  groupType: string;
  creditLimit: number;
  creditUsed: number;
  loyaltyPoints: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function BillingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "invoices" | "customers">(
    "create"
  );
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // First, get the authenticated user's ID from the server
        const userRes = await fetch("/api/auth/me");
        if (userRes.status === 401) {
          // User not authenticated, redirect to login
          window.location.href = "/sign-in";
          return;
        }
        if (!userRes.ok) {
          throw new Error("Failed to get user ID");
        }
        const userData = await userRes.json();
        const currentUserId = userData.userId;
        setUserId(currentUserId);

        // Now fetch products, customers, and invoices with the authenticated user's ID
        const [productsRes, customersRes, invoicesRes] = await Promise.all([
          fetch(`/api/products?userId=${currentUserId}&limit=100`),
          fetch(`/api/customers?userId=${currentUserId}&limit=100`),
          fetch(`/api/invoices?userId=${currentUserId}&limit=10`),
        ]);

        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data.data || data);
        }
        if (customersRes.ok) {
          const data = await customersRes.json();
          setCustomers(data.data || data);
        }
        if (invoicesRes.ok) {
          const data = await invoicesRes.json();
          setInvoices(data.data || data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers([...customers, customer]);
    setShowCustomerForm(false);
    setSelectedCustomer(customer.id);
  };

  const handleInvoiceCreated = (invoice: Invoice) => {
    setInvoices([invoice, ...invoices]);
    setShowBuilder(false);
    setSelectedCustomer("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading billing system...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Billing Management
          </h1>
          <p className="text-gray-600">
            Create invoices, manage customers, and track payments
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "create"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Create Invoice
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "invoices"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Recent Invoices
          </button>
          <button
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "customers"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Customers
          </button>
        </div>

        {/* Create Invoice Tab */}
        {activeTab === "create" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Selection */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
                <h2 className="text-lg font-semibold">Select Customer</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer
                  </label>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Choose a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.groupType})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowCustomerForm(!showCustomerForm)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4" /> Add New Customer
                </button>

                {selectedCustomer && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    {customers.find((c) => c.id === selectedCustomer) && (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Group:</span>
                          <span className="font-medium">
                            {
                              customers.find((c) => c.id === selectedCustomer)
                                ?.groupType
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Credit Limit:</span>
                          <span className="font-medium">
                            ₹
                            {customers
                              .find((c) => c.id === selectedCustomer)
                              ?.creditLimit.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Loyalty Points:</span>
                          <span className="font-medium">
                            {customers.find((c) => c.id === selectedCustomer)
                              ?.loyaltyPoints || 0}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Quick Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {products.length}
                    </div>
                    <div className="text-xs text-gray-600">Total Products</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {customers.length}
                    </div>
                    <div className="text-xs text-gray-600">Total Customers</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {invoices.length}
                    </div>
                    <div className="text-xs text-gray-600">Recent Invoices</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {products.reduce((sum, p) => sum + p.quantity, 0)}
                    </div>
                    <div className="text-xs text-gray-600">Total Stock</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Form */}
            {showCustomerForm && (
              <CustomerForm
                userId={userId}
                onCustomerCreated={handleCustomerCreated}
                onClose={() => setShowCustomerForm(false)}
              />
            )}

            {/* Invoice Builder */}
            {selectedCustomer && !showCustomerForm && (
              <InvoiceBuilder
                customerId={selectedCustomer}
                userId={userId}
                onCreateInvoice={handleInvoiceCreated}
                products={products}
              />
            )}

            {!selectedCustomer && !showCustomerForm && (
              <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg text-center">
                <p className="text-blue-900 font-medium">
                  Select or create a customer to start building an invoice
                </p>
              </div>
            )}
          </div>
        )}

        {/* Recent Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {invoices.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                No invoices yet. Create your first invoice!
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Invoice #
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {
                          customers.find((c) => c.id === invoice.customerId)
                            ?.name
                        }
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ₹{invoice.total.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invoice.status === "Paid"
                              ? "bg-green-100 text-green-800"
                              : invoice.status === "Partial"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/billing/invoice/${invoice.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === "customers" && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {customers.length === 0 ? (
              <div className="p-6 text-center text-gray-600">
                No customers yet. Create your first customer!
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Group
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Credit Used
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Loyalty Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.groupType === "VIP"
                              ? "bg-purple-100 text-purple-800"
                              : customer.groupType === "Wholesale"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {customer.groupType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {customer.phone || customer.email || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        ₹{customer.creditUsed.toLocaleString()} /{" "}
                        ₹{customer.creditLimit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-orange-600">
                        {customer.loyaltyPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}