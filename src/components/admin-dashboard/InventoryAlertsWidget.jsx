import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AiOutlineWarning } from "react-icons/ai";
import { BsBoxSeam } from "react-icons/bs";

import { getInventoryAlerts } from "../../api/analytics.api";
// getInventoryAlerts — API 89: GET /api/v1/analytics/inventory/alerts/
// returns [{ product_id, name, total_stock, reserved_stock,
// available_stock, low_stock_threshold }]

import { ROUTES } from "../../constants/routes";
import extractListData from "../../utils/extractListData";
import EmptyState from "../ui/EmptyState";
import Spinner from "../ui/Spinner";
import Button from "../ui/Button";

// Builds the varying description text ("Only 2 left in stock" /
// "8 units remaining" / "Out of stock"), derived entirely from the
// real available_stock + threshold numbers the API returns — no
// hardcoded/fake copy. available_stock (not total_stock) is what's
// actually left to sell to a new customer right now.
const getStockMessage = (item) => {
  const available = item.available_stock ?? 0;
  if (available === 0) return "Out of stock";
  if (available <= item.low_stock_threshold) {
    return `Only ${available} left in stock`;
  }
  return `${available} units remaining`;
};

const InventoryAlertsWidget = () => {
  const navigate = useNavigate();

  const { data: alertsResponse, isLoading } = useQuery({
    queryKey: ["adminDashboard", "inventoryAlerts"],
    queryFn: ({ signal }) => getInventoryAlerts(signal),
    staleTime: 1000 * 60 * 2,
  });

  const alerts = extractListData(alertsResponse).slice(0, 5);
  // Dashboard preview only needs the first handful — the full list
  // lives on ROUTES.ADMIN_ANALYTICS_INVENTORY (InventoryAlerts.jsx)

  return (
    <div
      className="
        bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4
        shadow-[0_2px_10px_-3px_rgba(16,24,40,0.08)]
        hover:shadow-[0_4px_14px_-4px_rgba(16,24,40,0.10)]
        transition-shadow duration-300
      "
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          Inventory Alerts
        </h2>
        {alerts.length > 0 && (
          <AiOutlineWarning className="w-5 h-5 text-danger" />
        )}
      </div>

      {isLoading ? (
        <div className="py-8 flex items-center justify-center">
          <Spinner size="sm" />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          variant="noResults"
          title="All Stocked Up"
          description="No products are currently running low."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {alerts.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
            >
              {/* Generic box icon — the inventory alerts API doesn't
                  return a product image or category, so a consistent
                  neutral icon is used instead of guessing one per item */}
              <span className="w-9 h-9 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                <BsBoxSeam className="w-4 h-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </p>
                <p
                  className={`text-xs ${(item.available_stock ?? 0) === 0 ? "text-danger" : "text-warning"}`}
                >
                  {getStockMessage(item)}
                </p>
              </div>

              <Button
                size="sm"
                variant="primary"
                onClick={() =>
                  navigate(
                    ROUTES.ADMIN_PRODUCT_EDIT.replace(":id", item.product_id),
                  )
                }
              >
                Restock
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InventoryAlertsWidget;
