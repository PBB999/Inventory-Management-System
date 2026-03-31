/**
 * Unit tests for Inventory logic
 */

describe('Cart Store Logic (pure functions)', () => {
  const buildItem = (sku: string, price: number, qty: number, discount = 0, taxRate = 18) => ({
    productId: 'prod1',
    variantSku: sku,
    productName: 'Test Product',
    variantAttributes: {},
    unitPrice: price,
    quantity: qty,
    discountAmount: discount,
    taxRate,
  });

  const computeTotals = (items: ReturnType<typeof buildItem>[]) => {
    let subtotal = 0, discountTotal = 0, taxTotal = 0;
    items.forEach(item => {
      const lineSubtotal = item.unitPrice * item.quantity;
      const lineDiscount = item.discountAmount * item.quantity;
      const lineTax = (lineSubtotal - lineDiscount) * (item.taxRate / 100);
      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    });
    return { subtotal, discountTotal, taxTotal, grandTotal: subtotal - discountTotal + taxTotal };
  };

  it('computes correct subtotal for single item', () => {
    const items = [buildItem('SKU-001', 100, 3)];
    const { subtotal } = computeTotals(items);
    expect(subtotal).toBe(300);
  });

  it('applies discount correctly', () => {
    const items = [buildItem('SKU-001', 200, 2, 20)]; // 20 discount per unit
    const { discountTotal, subtotal } = computeTotals(items);
    expect(subtotal).toBe(400);
    expect(discountTotal).toBe(40);
  });

  it('computes tax on post-discount amount', () => {
    const items = [buildItem('SKU-001', 100, 1, 10, 10)]; // ₹100 - ₹10 discount = ₹90 taxable at 10%
    const { taxTotal } = computeTotals(items);
    expect(taxTotal).toBe(9);
  });

  it('computes grandTotal correctly end-to-end', () => {
    const items = [
      buildItem('SKU-001', 1000, 2, 0,   18), // 2000, tax 360
      buildItem('SKU-002',  500, 1, 50,  12), // 500 - 50 = 450, tax 54
    ];
    const { grandTotal } = computeTotals(items);
    // subtotal = 2500, discount = 50, taxable1 = 2000, tax1 = 360, taxable2 = 450, tax2 = 54
    expect(grandTotal).toBeCloseTo(2500 - 50 + 360 + 54, 5);
  });

  it('handles zero-tax items correctly', () => {
    const items = [buildItem('SKU-EX', 200, 2, 0, 0)];
    const { taxTotal, grandTotal } = computeTotals(items);
    expect(taxTotal).toBe(0);
    expect(grandTotal).toBe(400);
  });
});

describe('Order Number generation logic', () => {
  it('generates unique-looking order numbers', () => {
    const generate = (count: number) =>
      `ORD-${Date.now()}-${String(count).padStart(5, '0')}`;

    const a = generate(1);
    const b = generate(2);
    expect(a).toMatch(/^ORD-\d+-00001$/);
    expect(b).toMatch(/^ORD-\d+-00002$/);
    expect(a).not.toBe(b);
  });
});

describe('Stock Status thresholds', () => {
  const getStatus = (onHand: number, reorderPoint: number) => {
    if (onHand === 0) return 'out_of_stock';
    if (onHand <= reorderPoint) return 'low_stock';
    return 'in_stock';
  };

  it('returns out_of_stock when onHand is 0', () => {
    expect(getStatus(0, 10)).toBe('out_of_stock');
  });

  it('returns low_stock when onHand <= reorderPoint', () => {
    expect(getStatus(5, 10)).toBe('low_stock');
    expect(getStatus(10, 10)).toBe('low_stock');
  });

  it('returns in_stock when onHand > reorderPoint', () => {
    expect(getStatus(11, 10)).toBe('in_stock');
    expect(getStatus(100, 10)).toBe('in_stock');
  });
});
