// ============================================================
// ADDRESS BOOK PAGE
// ============================================================
// Full management screen for the customer's saved delivery
// addresses — list, add, edit, delete, and set-default. Replaces the
// old single-address "Delivery Address" card that used to live on
// the Profile Settings page, since a customer can now save more than
// one address here.

import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlinePlus } from "react-icons/hi2";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Container from "../../components/layouts/Container";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";
import EmptyState from "../../components/ui/EmptyState";
import { Skeleton } from "../../components/ui/Skeleton";
import AddressCard from "../../components/address-book/AddressCard";
import AddressFormModal from "../../components/address-book/AddressFormModal";
import { QUERY_KEYS } from "../../constants/queryKeys";
import {
  getAddresses,
  deleteAddress,
  setDefaultAddress,
} from "../../api/addresses.api";
import { showSuccess, showError } from "../../components/ui/Toast";
import extractListData from "../../utils/extractListData";

const AddressBook = () => {
  const queryClient = useQueryClient();

  // Which address (if any) is currently loaded into the Add/Edit
  // modal. null with the modal open means "create new".
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState(null);
  // The address pending deletion — driving the "Are you sure?" modal.
  const [addressToDelete, setAddressToDelete] = useState(null);
  // Tracks which address's "Set as Default" button is mid-request, so
  // only that one card shows a loading state instead of the whole page.
  const [settingDefaultId, setSettingDefaultId] = useState(null);

  // =============================================
  // GET ADDRESSES — GET /api/v1/addresses/
  // =============================================
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.ADDRESSES,
    queryFn: ({ signal }) => getAddresses(signal),
    staleTime: 1000 * 60 * 2,
  });

  // extractListData defensively handles either a plain array or a
  // paginated { results: [...] } shape — same normalizer already used
  // elsewhere in the app for list endpoints.
  const addresses = extractListData(data);

  // =============================================
  // DELETE ADDRESS — DELETE /api/v1/addresses/{id}/
  // =============================================
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESSES });
      showSuccess("Address deleted.");
      setAddressToDelete(null);
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message || "Failed to delete this address.",
      );
    },
  });

  // =============================================
  // SET DEFAULT ADDRESS — PUT /api/v1/addresses/{id}/set-default/
  // =============================================
  const setDefaultMutation = useMutation({
    mutationFn: (id) => setDefaultAddress(id),
    onMutate: (id) => setSettingDefaultId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADDRESSES });
      showSuccess("Default address updated.");
    },
    onError: (error) => {
      showError(
        error?.response?.data?.message ||
          "Failed to update your default address.",
      );
    },
    onSettled: () => setSettingDefaultId(null),
  });

  const openAddModal = () => {
    setAddressToEdit(null);
    setFormModalOpen(true);
  };

  const openEditModal = (address) => {
    setAddressToEdit(address);
    setFormModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Container className="py-6 sm:py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Address Book
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage the addresses your orders can ship to
              </p>
            </div>
            <Button
              leftIcon={<HiOutlinePlus className="w-4 h-4" />}
              onClick={openAddModal}
            >
              Add New Address
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-36 rounded-2xl" />
              ))}
            </div>
          ) : addresses.length === 0 ? (
            <EmptyState
              variant="noResults"
              title="No saved addresses yet"
              description="Add an address to speed up checkout next time."
              actionLabel="Add New Address"
              onAction={openAddModal}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={() => openEditModal(address)}
                  onDelete={() => setAddressToDelete(address)}
                  onSetDefault={() => setDefaultMutation.mutate(address.id)}
                  isSettingDefault={settingDefaultId === address.id}
                />
              ))}
            </div>
          )}
        </div>
      </Container>

      {/* Add / Edit modal */}
      <AddressFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        addressToEdit={addressToEdit}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={!!addressToDelete}
        onClose={() => setAddressToDelete(null)}
        onConfirm={() => deleteMutation.mutate(addressToDelete.id)}
        title="Delete this address?"
        message={`"${addressToDelete?.label}" will be permanently removed from your address book.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </motion.div>
  );
};

export default AddressBook;
