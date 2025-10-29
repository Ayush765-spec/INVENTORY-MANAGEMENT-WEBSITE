import { test, expect } from "@playwright/test";

test.describe("Multi-User Data Isolation", () => {
  // Test Setup: Clear browser state between tests
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies and local storage to start fresh
    await context.clearCookies();
    await page.goto("http://localhost:3004");
  });

  test("User 1 and User 2 have isolated customer data", async ({ browser }) => {
    // Create two separate browser contexts for two different users
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // ===== USER 1: Sign up and create customer =====
      console.log("🧪 Test: User 1 signing up...");
      await page1.goto("http://localhost:3004/handler/sign-up");
      await page1.fill('input[name="email"]', `user1-${Date.now()}@test.com`);
      await page1.fill('input[name="password"]', "TestPass123!");
      await page1.fill('input[name="password_confirm"]', "TestPass123!");
      await page1.click('button[type="submit"]');
      await page1.waitForURL("**/sign-in**", { timeout: 5000 });

      // Navigate to billing
      console.log("🧪 Test: User 1 navigating to billing...");
      await page1.goto("http://localhost:3004/billing");
      await page1.waitForText("Billing Management", { timeout: 10000 });

      // Verify User 1 starts with 0 customers
      console.log("🧪 Test: Verifying User 1 has 0 customers initially...");
      let statsText = await page1.locator("text=Total Customers").evaluate(el => el.parentElement?.textContent);
      expect(statsText).toContain("0");

      // Create a customer for User 1
      console.log("🧪 Test: User 1 creating customer 'Customer A'...");
      await page1.click("button:has-text('Add New Customer')");
      await page1.fill('input[placeholder="Enter customer name"]', "Customer A");
      await page1.fill('input[type="email"]', "customerA@test.com");
      await page1.fill('input[type="tel"]', "1234567890");
      await page1.click("button:has-text('Create Customer')");
      await page1.waitForText("created successfully", { timeout: 5000 });

      // Verify User 1 now has 1 customer
      console.log("🧪 Test: Verifying User 1 now has 1 customer...");
      await page1.reload();
      await page1.waitForText("Billing Management");
      statsText = await page1.locator("text=Total Customers").evaluate(el => el.parentElement?.textContent);
      expect(statsText).toContain("1");

      // ===== USER 2: Sign up (different user) =====
      console.log("🧪 Test: User 2 signing up...");
      await page2.goto("http://localhost:3004/handler/sign-up");
      await page2.fill('input[name="email"]', `user2-${Date.now() + 1000}@test.com`);
      await page2.fill('input[name="password"]', "TestPass123!");
      await page2.fill('input[name="password_confirm"]', "TestPass123!");
      await page2.click('button[type="submit"]');
      await page2.waitForURL("**/sign-in**", { timeout: 5000 });

      // Navigate to billing
      console.log("🧪 Test: User 2 navigating to billing...");
      await page2.goto("http://localhost:3004/billing");
      await page2.waitForText("Billing Management", { timeout: 10000 });

      // ===== CRITICAL TEST: User 2 should see 0 customers (not User 1's customer) =====
      console.log("🧪 Test: Verifying User 2 sees 0 customers (isolated from User 1)...");
      statsText = await page2.locator("text=Total Customers").evaluate(el => el.parentElement?.textContent);
      expect(statsText).toContain("0");

      // User 2 should NOT see "Customer A" in dropdown
      const customerDropdown = await page2.locator('select').first();
      const customerOptions = await customerDropdown.locator("option").allTextContents();
      expect(customerOptions).not.toContain("Customer A");

      // ===== Create a different customer for User 2 =====
      console.log("🧪 Test: User 2 creating customer 'Customer B'...");
      await page2.click("button:has-text('Add New Customer')");
      await page2.fill('input[placeholder="Enter customer name"]', "Customer B");
      await page2.fill('input[type="email"]', "customerB@test.com");
      await page2.fill('input[type="tel"]', "9876543210");
      await page2.click("button:has-text('Create Customer')");
      await page2.waitForText("created successfully", { timeout: 5000 });

      // Verify User 2 now has 1 customer
      console.log("🧪 Test: Verifying User 2 has 1 customer...");
      await page2.reload();
      await page2.waitForText("Billing Management");
      statsText = await page2.locator("text=Total Customers").evaluate(el => el.parentElement?.textContent);
      expect(statsText).toContain("1");

      // ===== FINAL VERIFICATION: User 1 should still see only their customer =====
      console.log("🧪 Test: User 1 should still see only their customer (Customer A)...");
      await page1.reload();
      await page1.waitForText("Billing Management");
      const user1Dropdown = await page1.locator('select').first();
      const user1Options = await user1Dropdown.locator("option").allTextContents();
      expect(user1Options).toContain("Customer A");
      expect(user1Options).not.toContain("Customer B");

      console.log("✅ All tests passed! Data isolation is working correctly.");
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("API endpoints enforce user isolation", async ({ request }) => {
    // This test verifies that API endpoints reject cross-user access
    console.log("🧪 Test: Verifying API endpoints enforce user isolation...");

    // Sign up User 1 and get auth token
    const signupResponse = await request.post(
      "http://localhost:3004/handler/sign-up",
      {
        data: {
          email: `api-user1-${Date.now()}@test.com`,
          password: "TestPass123!",
        },
      }
    );

    // Get cookies from User 1
    const user1Cookies = await request.context().cookies();

    // Create a customer for User 1
    const customerResponse = await request.post(
      "http://localhost:3004/api/customers",
      {
        data: {
          userId: "user1_test_id",
          name: "Test Customer",
          email: "test@example.com",
          phone: "1234567890",
          creditLimit: 5000,
          groupType: "Regular",
        },
      }
    );

    if (customerResponse.status() === 201) {
      const customer = await customerResponse.json();
      console.log(`✅ Customer created: ${customer.id}`);

      // Now attempt to use that customer with a different userId
      // This should fail with the new validation we added
      const invoiceResponse = await request.post(
        "http://localhost:3004/api/invoices",
        {
          data: {
            userId: "different_user_id", // Different user!
            customerId: customer.id,
            lineItems: [],
          },
        }
      );

      // Should get 400 or 403 error due to userId mismatch
      expect([400, 403]).toContain(invoiceResponse.status());
      console.log(`✅ API correctly rejected cross-user access (status: ${invoiceResponse.status()})`);
    }
  });
});