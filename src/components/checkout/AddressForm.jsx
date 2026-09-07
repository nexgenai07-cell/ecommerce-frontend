// ============================================================
// DELIVERY ADDRESS SECTION — CHECKOUT
// ============================================================
// Previously this section collected a full manual address (name,
// street, city, province, postal code) directly on the checkout
// form. Delivery addresses now live in the customer's Address Book
// (see api/addresses.api.js + pages/customer/AddressBook.jsx), so
// this section instead lets the customer PICK one of their saved
// addresses — or add a new one on the spot without leaving checkout.
// Whichever address is selected is passed back up to the Checkout
// page as an id, to be sent as "address_id" in the checkout request.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HiOutlinePlus } from "react-icons/hi2";
import { QUERY_KEYS } from "../../constants/queryKeys";
import { getAddresses } from "../../api/addresses.api";
import extractListData from "../../utils/extractListData";
import AddressCard from "../address-book/AddressCard";
import AddressFormModal from "../address-book/AddressFormModal";
import { Skeleton } from "../ui/Skeleton";

// selectedAddressId / onSelectAddress — controlled from the Checkout
// page, since the choice needs to be read from there when the order
// is submitted. error — validation message shown when the customer
// tries to continue without picking an address.
const AddressForm = ({ selectedAddressId, onSelectAddress, error }) => {
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ADDRESSES,
    queryFn: ({ signal }) => getAddresses(signal),
    staleTime: 1000 * 60 * 2,
  });

  const addresses = extractListData(data);

  // The moment the saved addresses load, default to whichever one is
  // marked is_default — matching the same fallback rule the backend
  // itself applies when no address_id is sent at all. The customer
  // can still change this selection freely afterwards.
  useEffect(() => {
    if (selectedAddressId || addresses.length === 0) return;
    const defaultAddress = addresses.find((a) => a.is_default);
    onSelectAddress((defaultAddress || addresses[0]).id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">Delivery Address</h2>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add New Address
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-gray-500">
            You don't have any saved addresses yet.
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
          >
            Add Your First Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selectable
              selected={selectedAddressId === address.id}
              onSelect={() => onSelectAddress(address.id)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Lets the customer save a brand-new address without leaving
          checkout — the new address is selected immediately once
          saved, via the onSaved callback below. */}
      <AddressFormModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSaved={(newAddress) => onSelectAddress(newAddress.id)}
      />
    </div>
  );
};

export default AddressForm;
