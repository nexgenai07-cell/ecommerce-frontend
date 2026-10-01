// ============================================================
// getCartStockIssues
// ============================================================
// Returns the cart lines whose requested quantity is higher than the stock
// that is currently available for purchase (available_stock is the total
// stock minus the units reserved by pending orders).
//
// A line is only reported when the stock figure is known. Lines without an
// available_stock number are never treated as a problem, so partial or
// legacy payloads cannot block a customer by mistake.
//
// Each returned issue has the shape:
// { itemId, productId, name, quantity, available }
//
// An empty array means every line can be fulfilled.

const getCartStockIssues = (items) => {
  if (!Array.isArray(items)) return [];

  return items.reduce((issues, item) => {
    const available = item?.product?.available_stock;

    if (typeof available !== "number") return issues;

    const quantity = Number(item?.quantity) || 0;

    if (quantity > available) {
      issues.push({
        itemId: item.id,
        productId: item.product.id,
        name: item.product.name,
        quantity,
        available,
      });
    }

    return issues;
  }, []);
};

export default getCartStockIssues;
