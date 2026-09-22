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
//
// The list always shows the default address first and selects it
// automatically. Every card offers an Edit action that opens the shared
// address modal, and a selected address that has no city (for example an
// address saved at registration where no city could be detected) is
// flagged, because checkout cannot ship to an address without a city.

import { useEffect, useMemo, useState } from "react";
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

  // Edit modal state. The address being edited is stored separately from
  // the open flag, so the modal keeps its "Edit Address" content while it
  // plays its closing transition.
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addressBeingEdited, setAddressBeingEdited] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ADDRESSES,
    queryFn: ({ signal }) => getAddresses(signal),
    staleTime: 1000 * 60 * 2,
  });

  // The saved addresses with the default one first; every other address
  // keeps the order returned by the backend (Array.prototype.sort is
  // stable).
  const addresses = useMemo(
    () =>
      [...extractListData(data)].sort(
        (a, b) => Number(!!b.is_default) - Number(!!a.is_default),
      ),
    [data],
  );

  // The currently selected address object, and whether it lacks a city.
  // An address without a city cannot be used for checkout until the
  // customer adds one.
  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) || null;
  const isSelectedCityMissing =
    !!selectedAddress && !selectedAddress.city?.trim();

  // Opens the shared address modal in edit mode for one saved address.
  const handleEditAddress = (address) => {
    setAddressBeingEdited(address);
    setEditModalOpen(true);
  };

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
              onEdit={() => handleEditAddress(address)}
            />
          ))}
        </div>
      )}

      {/* The selected address has no city, so checkout cannot use it yet.
          The Add City button opens the edit modal for that address. */}
      {isSelectedCityMissing && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-warning/30 bg-warning-light px-4 py-3"
        >
          <p className="text-sm text-gray-700">
            The selected address has no city. Add the city to this address
            before placing your order.
          </p>
          <button
            type="button"
            onClick={() => handleEditAddress(selectedAddress)}
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            Add City
          </button>
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

      {/* Edits one saved address through the same modal. The selection is
          left unchanged; the address list refreshes automatically once the
          change is saved. */}
      <AddressFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        addressToEdit={addressBeingEdited}
      />
    </div>
  );
};

export default AddressForm;
