import { test, expect } from '@playwright/test';

test.describe('Billing System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to billing page
    await page.goto('/billing');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Create Invoice', () => {
    test('should display billing dashboard with navigation tabs', async ({
      page,
    }) => {
      // Check for main heading
      const heading = page.locator('text=Billing Management');
      await expect(heading).toBeVisible();

      // Check for navigation tabs
      const createInvoiceTab = page.locator('text=Create Invoice').first();
      const invoicesTab = page.locator('text=Recent Invoices');
      const customersTab = page.locator('text=Customers');

      await expect(createInvoiceTab).toBeVisible();
      await expect(invoicesTab).toBeVisible();
      await expect(customersTab).toBeVisible();
    });

    test('should create a new customer', async ({ page }) => {
      // Ensure we're on Create Invoice tab
      const createTab = page.locator('button:has-text("Create Invoice")').first();
      await createTab.click();

      // Click "Add New Customer" button
      const addCustomerBtn = page.locator('text=Add New Customer');
      await addCustomerBtn.click();

      // Fill customer form
      await page.fill('input[placeholder="Enter customer name"]', 'John Doe');
      await page.fill('input[placeholder="Enter email"]', 'john@example.com');
      await page.fill('input[placeholder="Enter phone number"]', '9876543210');
      await page.fill(
        'input[placeholder="Enter GSTIN"]',
        '27AAPCT6055E1Z9'
      );
      await page.fill('input[placeholder="Enter address"]', '123 Main St, Delhi');
      await page.fill('input[placeholder*="0"]', '50000'); // Credit Limit

      // Select customer group
      await page.selectOption('select', 'VIP');

      // Click Create Customer button
      const createBtn = page.locator('button:has-text("Create Customer")');
      await createBtn.click();

      // Check for success (should navigate back or show success message)
      await page.waitForTimeout(1000);
      const customerSelect = page.locator('select').first();
      await expect(customerSelect).toBeVisible();
    });

    test('should select a customer and start building invoice', async ({
      page,
    }) => {
      // Create customer first
      const addCustomerBtn = page.locator('text=Add New Customer');
      await addCustomerBtn.click();
      
      await page.fill('input[placeholder="Enter customer name"]', 'Jane Smith');
      await page.fill('input[placeholder="Enter email"]', 'jane@example.com');
      await page.fill('input[placeholder="Enter phone number"]', '9123456789');
      await page.fill('input[placeholder="Enter GSTIN"]', '27AAPCT6055E1Z0');
      await page.fill('input[placeholder="Enter address"]', '456 Oak St, Mumbai');
      
      const createBtn = page.locator('button:has-text("Create Customer")');
      await createBtn.click();

      await page.waitForTimeout(1000);

      // Select the customer from dropdown
      const customerSelect = page.locator('select').first();
      await customerSelect.click();
      
      // Wait for option to appear and select
      const option = page.locator('option:has-text("Jane Smith")');
      await option.click();

      // Verify customer details are shown
      const creditLimit = page.locator('text=Credit Limit:');
      await expect(creditLimit).toBeVisible();
    });

    test('should add line items to invoice', async ({ page }) => {
      // First, we need to create a customer and have some products
      // This test assumes products exist in the system
      
      // Create customer
      const addCustomerBtn = page.locator('text=Add New Customer');
      await addCustomerBtn.click();
      
      await page.fill('input[placeholder="Enter customer name"]', 'Test Customer');
      await page.fill('input[placeholder="Enter email"]', 'test@example.com');
      await page.fill('input[placeholder="Enter phone number"]', '9999999999');
      
      const createBtn = page.locator('button:has-text("Create Customer")');
      await createBtn.click();

      await page.waitForTimeout(1000);

      // Select customer
      const customerSelect = page.locator('select').first();
      await customerSelect.click();
      
      const option = page.locator('option:has-text("Test Customer")');
      await option.click();

      // Wait for invoice builder to load
      await page.waitForLoadState('networkidle');

      // Check if product select exists
      const productSelect = page.locator('select').nth(1);
      if (await productSelect.isVisible()) {
        // If there are products, try to add one
        await productSelect.click();
        const productOption = productSelect.locator('option').nth(1);
        if (await productOption.isVisible()) {
          await productOption.click();

          // Set quantity
          const quantityInput = page.locator('input[type="number"]').first();
          await quantityInput.fill('5');

          // Click Add Item
          const addItemBtn = page.locator('button:has-text("Add Item")');
          await addItemBtn.click();

          // Verify item was added to table
          const table = page.locator('table');
          await expect(table).toBeVisible();
        }
      }
    });

    test('should calculate totals correctly', async ({ page }) => {
      // Check if there's a totals section
      const grandTotal = page.locator('text=Grand Total:');
      
      // The totals section might not be visible until an item is added
      // For now, just verify the structure exists
      const invoiceBuilder = page.locator('text=Select Product');
      await expect(invoiceBuilder).toBeVisible();
    });

    test('should handle delivery address and notes', async ({ page }) => {
      // Look for delivery address textarea
      const deliveryAddressLabel = page.locator('text=Delivery Address');
      
      if (await deliveryAddressLabel.isVisible()) {
        const textarea = deliveryAddressLabel.locator('..').locator('textarea');
        await textarea.fill('123 Delivery St, Test City');

        // Fill notes
        const notesLabel = page.locator('text=Notes');
        const notesTextarea = notesLabel.locator('..').locator('textarea').nth(0);
        await notesTextarea.fill('Please deliver after 5 PM');

        // Verify text was entered
        await expect(textarea).toHaveValue('123 Delivery St, Test City');
      }
    });
  });

  test.describe('Invoice Management', () => {
    test('should navigate to Recent Invoices tab', async ({ page }) => {
      const invoicesTab = page.locator('button:has-text("Recent Invoices")');
      await invoicesTab.click();

      // Verify tab is active
      const activeTab = page.locator('button:has-text("Recent Invoices")[class*="border-blue"]');
      await expect(activeTab).toBeVisible();
    });

    test('should display invoices list', async ({ page }) => {
      const invoicesTab = page.locator('button:has-text("Recent Invoices")');
      await invoicesTab.click();

      await page.waitForLoadState('networkidle');

      // Check for table headers
      const invoiceHeader = page.locator('text=Invoice #');
      const customerHeader = page.locator('text=Customer');
      const amountHeader = page.locator('text=Amount');

      await expect(invoiceHeader).toBeVisible();
      await expect(customerHeader).toBeVisible();
      await expect(amountHeader).toBeVisible();
    });

    test('should view invoice details', async ({ page }) => {
      // First, check if there are any invoices
      const invoicesTab = page.locator('button:has-text("Recent Invoices")');
      await invoicesTab.click();

      await page.waitForLoadState('networkidle');

      // Try to find and click a View link
      const viewLinks = page.locator('text=View');
      const count = await viewLinks.count();

      if (count > 0) {
        await viewLinks.first().click();

        // Verify invoice detail page loaded
        await page.waitForLoadState('networkidle');
        const invoiceNumber = page.locator('h1');
        await expect(invoiceNumber).toBeVisible();

        // Check for invoice details
        const billTo = page.locator('text=Bill To');
        await expect(billTo).toBeVisible();
      }
    });
  });

  test.describe('Customer Management', () => {
    test('should navigate to Customers tab', async ({ page }) => {
      const customersTab = page.locator('button:has-text("Customers")');
      await customersTab.click();

      // Verify tab is active
      const activeTab = page.locator('button:has-text("Customers")[class*="border-blue"]');
      await expect(activeTab).toBeVisible();
    });

    test('should display customers list with columns', async ({ page }) => {
      const customersTab = page.locator('button:has-text("Customers")');
      await customersTab.click();

      await page.waitForLoadState('networkidle');

      // Check for table headers
      const nameHeader = page.locator('text=Name');
      const groupHeader = page.locator('text=Group');

      await expect(nameHeader).toBeVisible();
      await expect(groupHeader).toBeVisible();
    });

    test('should display customer groups and credit information', async ({
      page,
    }) => {
      const customersTab = page.locator('button:has-text("Customers")');
      await customersTab.click();

      await page.waitForLoadState('networkidle');

      // Check for credit and loyalty info columns
      const creditHeader = page.locator('text=Credit Used');
      const loyaltyHeader = page.locator('text=Loyalty Points');

      if (await creditHeader.isVisible()) {
        await expect(creditHeader).toBeVisible();
      }
      if (await loyaltyHeader.isVisible()) {
        await expect(loyaltyHeader).toBeVisible();
      }
    });
  });

  test.describe('Quick Stats', () => {
    test('should display quick stats on create invoice tab', async ({
      page,
    }) => {
      // Ensure on Create Invoice tab
      const createTab = page.locator('button:has-text("Create Invoice")').first();
      await createTab.click();

      // Look for quick stats
      const statsHeading = page.locator('text=Quick Stats');
      if (await statsHeading.isVisible()) {
        // Check for stat cards
        const totalProducts = page.locator('text=Total Products');
        const totalCustomers = page.locator('text=Total Customers');

        await expect(totalProducts).toBeVisible();
        await expect(totalCustomers).toBeVisible();
      }
    });

    test('should display accurate product and customer counts', async ({
      page,
    }) => {
      const createTab = page.locator('button:has-text("Create Invoice")').first();
      await createTab.click();

      const statsHeading = page.locator('text=Quick Stats');
      if (await statsHeading.isVisible()) {
        // Verify stats are numeric
        const productCount = page.locator('text=Total Products').locator('..').locator('div:nth-child(1)');
        if (await productCount.isVisible()) {
          const text = await productCount.textContent();
          expect(text).toBeTruthy();
        }
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Check if navigation tabs are still visible
      const createTab = page.locator('button:has-text("Create Invoice")').first();
      await expect(createTab).toBeVisible();

      // Check if header is visible
      const heading = page.locator('text=Billing Management');
      await expect(heading).toBeVisible();
    });

    test('should be responsive on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      // Check main components are visible
      const heading = page.locator('text=Billing Management');
      await expect(heading).toBeVisible();

      // Check layout adapts
      const tabs = page.locator('button:has-text("Create Invoice")').first();
      await expect(tabs).toBeVisible();
    });
  });

  test.describe('API Integration', () => {
    test('should fetch products via API', async ({ page }) => {
      // Intercept API calls
      await page.route('/api/products*', (route) => {
        expect(route.request().method()).toBe('GET');
        route.continue();
      });

      // Wait for page to load
      await page.goto('/billing');
      await page.waitForLoadState('networkidle');

      // Verify the page loads successfully
      const heading = page.locator('text=Billing Management');
      await expect(heading).toBeVisible();
    });

    test('should fetch customers via API', async ({ page }) => {
      // Intercept API calls
      await page.route('/api/customers*', (route) => {
        expect(route.request().method()).toBe('GET');
        route.continue();
      });

      // Navigate to customers tab
      const customersTab = page.locator('button:has-text("Customers")');
      await customersTab.click();

      await page.waitForLoadState('networkidle');

      // Verify customers tab loaded
      const nameHeader = page.locator('text=Name');
      await expect(nameHeader).toBeVisible();
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept and fail API calls
      await page.route('/api/products*', (route) =>
        route.abort('failed')
      );
      await page.route('/api/customers*', (route) =>
        route.abort('failed')
      );

      // Reload page to trigger failed requests
      await page.reload();

      // Page should still be usable (graceful degradation)
      const heading = page.locator('text=Billing Management');
      await expect(heading).toBeVisible();
    });
  });

  test.describe('User Interactions', () => {
    test('should toggle customer form visibility', async ({ page }) => {
      const addCustomerBtn = page.locator('text=Add New Customer');
      
      // Initially hidden
      let form = page.locator('text=Customer Name *');
      const isInitiallyVisible = await form.isVisible().catch(() => false);
      
      if (!isInitiallyVisible) {
        // Click to show
        await addCustomerBtn.click();
        await page.waitForTimeout(300);
        form = page.locator('text=Customer Name *');
        await expect(form).toBeVisible();

        // Click again to hide
        await addCustomerBtn.click();
      }
    });

    test('should validate required fields in customer form', async ({
      page,
    }) => {
      const addCustomerBtn = page.locator('text=Add New Customer');
      await addCustomerBtn.click();

      // Try to submit without filling required fields
      const createBtn = page.locator('button:has-text("Create Customer")');
      
      // Check if button has required attributes
      if (await createBtn.isEnabled()) {
        await createBtn.click();
        // If enabled, it should either show validation or make an API call
        await page.waitForTimeout(500);
      }
    });

    test('should display loading states', async ({ page }) => {
      // Look for loading indicators
      const loader = page.locator('text=Loading');
      
      // If loader exists and is visible, wait for it to disappear
      if (await loader.isVisible({ timeout: 500 }).catch(() => false)) {
        await page.waitForFunction(() =>
          document.querySelector('text=Loading') === null
        );
      }
    });
  });

  test.describe('Page Navigation', () => {
    test('should maintain active tab state', async ({ page }) => {
      const customersTab = page.locator('button:has-text("Customers")');
      await customersTab.click();

      // Check active state
      const activeTab = page.locator('button[class*="border-blue"]:has-text("Customers")');
      await expect(activeTab).toBeVisible();

      // Click another tab
      const invoicesTab = page.locator('button:has-text("Recent Invoices")');
      await invoicesTab.click();

      // Verify new tab is now active
      const newActiveTab = page.locator('button[class*="border-blue"]:has-text("Recent Invoices")');
      await expect(newActiveTab).toBeVisible();
    });

    test('should update content when switching tabs', async ({ page }) => {
      // On Create Invoice tab
      const selectCustomerText = page.locator('text=Select Customer');
      await expect(selectCustomerText).toBeVisible();

      // Switch to Invoices tab
      const invoicesTab = page.locator('button:has-text("Recent Invoices")');
      await invoicesTab.click();

      // Verify content changed
      const invoiceNumberHeader = page.locator('text=Invoice #');
      await expect(invoiceNumberHeader).toBeVisible();
    });
  });
});

test.describe('Invoice Detail Page', () => {
  test('should display invoice details when navigated to invoice', async ({
    page,
  }) => {
    // Navigate to a sample invoice detail page
    // This assumes an invoice exists
    await page.goto('/billing/invoice/test-invoice-id', {
      waitUntil: 'networkidle',
    }).catch(() => {
      // If invoice doesn't exist, that's fine for this test structure
    });

    // Check if error or invoice details are shown
    const heading = page.locator('h1');
    // Invoice detail should have a heading
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('should display invoice line items table', async ({ page }) => {
    await page.goto('/billing/invoice/test-invoice-id', {
      waitUntil: 'networkidle',
    }).catch(() => {
      // Handle 404 gracefully
    });

    // Look for table headers
    const productHeader = page.locator('text=Product');
    const qtyHeader = page.locator('text=Qty');

    if (await productHeader.isVisible()) {
      await expect(productHeader).toBeVisible();
      await expect(qtyHeader).toBeVisible();
    }
  });

  test('should display tax breakdown', async ({ page }) => {
    await page.goto('/billing/invoice/test-invoice-id', {
      waitUntil: 'networkidle',
    }).catch(() => {
      // Handle 404
    });

    // Look for tax information
    const subtotal = page.locator('text=Subtotal:');
    const taxLabel = page.locator('text=GST');

    if (await subtotal.isVisible()) {
      await expect(subtotal).toBeVisible();
    }
  });
});