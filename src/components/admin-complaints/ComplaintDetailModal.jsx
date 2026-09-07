// // // import { useState, useEffect } from "react";
// // // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // // import {
// // //   AiOutlineMail,
// // //   AiOutlinePhone,
// // //   AiOutlineEnvironment,
// // //   AiOutlineTag,
// // //   AiOutlineCalendar,
// // //   AiOutlinePaperClip,
// // // } from "react-icons/ai";

// // // import {
// // //   updateComplaintStatus,
// // //   respondToComplaint,
// // // } from "../../api/complaints.api";
// // // import { getCustomerDetail } from "../../api/customers.api";
// // // // getCustomerDetail — API 102: GET /api/v1/admin/customers/{id}/
// // // // Used ONLY when the admin opens this modal for a specific complaint.
// // // // The complaint object itself (from API 55) only gives back a bare
// // // // customer id and a customer_name string — no email/phone/address.
// // // // Rather than inventing those fields, this modal fetches the real
// // // // customer profile (which genuinely does have email/phone/address/
// // // // total_orders/total_spent) the moment it opens, using the exact same
// // // // endpoint the Returns detail modal and the Customer Management page
// // // // already rely on.

// // // import { QUERY_KEYS } from "../../constants/queryKeys";
// // // import { COMPLAINT_STATUS } from "../../constants/statusTypes";
// // // import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
// // // import formatDate from "../../utils/formatDate";
// // // import formatPrice from "../../utils/formatPrice";
// // // import { showSuccess, showError } from "../ui/Toast";
// // // import Modal from "../ui/Modal";
// // // import Select from "../ui/Select";
// // // import Textarea from "../ui/Textarea";
// // // import Badge from "../ui/Badge";
// // // import Button from "../ui/Button";
// // // import Avatar from "../ui/Avatar";
// // // import Spinner from "../ui/Spinner";

// // // const STATUS_OPTIONS = [
// // //   { value: COMPLAINT_STATUS.OPEN, label: "Open" },
// // //   { value: COMPLAINT_STATUS.IN_PROGRESS, label: "In Review" },
// // //   { value: COMPLAINT_STATUS.RESOLVED, label: "Resolved" },
// // //   { value: COMPLAINT_STATUS.CLOSED, label: "Closed" },
// // // ];

// // // const ComplaintDetailModal = ({ isOpen, onClose, complaint }) => {
// // //   const queryClient = useQueryClient();
// // //   const [status, setStatus] = useState("");
// // //   const [responseText, setResponseText] = useState("");

// // //   useEffect(() => {
// // //     if (complaint) {
// // //       setStatus(complaint.status);
// // //       setResponseText("");
// // //     }
// // //   }, [complaint]);

// // //   // Fetches the real customer profile the moment a complaint is
// // //   // opened — only runs when the modal is actually open and the
// // //   // complaint has a real customer id attached to it.
// // //   const {
// // //     data: customerResponse,
// // //     isLoading: isCustomerLoading,
// // //     isError: isCustomerError,
// // //   } = useQuery({
// // //     queryKey: QUERY_KEYS.CUSTOMER_DETAIL(complaint?.customer),
// // //     queryFn: ({ signal }) => getCustomerDetail(complaint.customer, signal),
// // //     enabled: isOpen && !!complaint?.customer,
// // //     // enabled — TanStack Query never fires this request until the
// // //     // modal is open on a complaint that actually has a customer id.
// // //   });

// // //   const customer = customerResponse?.data;

// // //   const statusMutation = useMutation({
// // //     mutationFn: () => updateComplaintStatus(complaint.id, { status }),
// // //     onSuccess: () => {
// // //       showSuccess("Status updated.");
// // //       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
// // //     },
// // //     onError: () => showError("Failed to update status."),
// // //   });

// // //   const respondMutation = useMutation({
// // //     mutationFn: () =>
// // //       respondToComplaint(complaint.id, { response: responseText }),
// // //     onSuccess: () => {
// // //       showSuccess("Response sent — the customer has been notified.");
// // //       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
// // //       setResponseText("");
// // //     },
// // //     onError: () => showError("Failed to send response."),
// // //   });

// // //   if (!complaint) return null;

// // //   // cardClass — the one shared "section card" look every block below
// // //   // uses, matching the exact elevated style used on the Returns
// // //   // detail modal (soft drop shadow instead of a flat border) so both
// // //   // modals read as the same visual family.
// // //   const cardClass = "rounded-2xl bg-white shadow-lg shadow-gray-200/70 p-5";

// // //   return (
// // //     <Modal
// // //       isOpen={isOpen}
// // //       onClose={onClose}
// // //       title={`Complaint #CMP-${complaint.id}`}
// // //       size="lg"
// // //     >
// // //       <div className="flex flex-col gap-4">
// // //         {/* ================================================================
// // //             1. CUSTOMER — shown first, matching the Returns detail
// // //             modal's layout order, since "who filed this" is the thing
// // //             an admin needs to see before anything else.
// // //             ================================================================ */}
// // //         <div
// // //           className={`${cardClass} bg-linear-to-br from-primary-50/70 via-white to-white`}
// // //         >
// // //           {/* Loading state — spinner while the customer profile
// // //               request is in flight */}
// // //           {isCustomerLoading && (
// // //             <div className="py-8 flex items-center justify-center">
// // //               <Spinner size="md" />
// // //             </div>
// // //           )}

// // //           {/* Error state — the customer profile call failed; the
// // //               complaint itself is still fully visible below, only this
// // //               section is affected */}
// // //           {isCustomerError && !isCustomerLoading && (
// // //             <p className="text-sm text-gray-400 text-center py-4">
// // //               Couldn't load this customer's profile right now.
// // //             </p>
// // //           )}

// // //           {/* No customer attached at all (edge case) */}
// // //           {!isCustomerLoading && !isCustomerError && !complaint.customer && (
// // //             <p className="text-sm text-gray-400 text-center py-4">
// // //               No customer is linked to this complaint.
// // //             </p>
// // //           )}

// // //           {/* Loaded state — real fields only, nothing invented */}
// // //           {!isCustomerLoading && !isCustomerError && customer && (
// // //             <div className="flex flex-col gap-4">
// // //               {/* Identity row — big avatar + name + "customer since" */}
// // //               <div className="flex items-center gap-4">
// // //                 <Avatar name={customer.name} size="lg" />
// // //                 <div className="min-w-0">
// // //                   <p className="text-lg font-bold text-gray-900 truncate">
// // //                     {customer.name}
// // //                   </p>
// // //                   <p className="text-xs text-gray-400">
// // //                     Customer since {formatDate(customer.created_at)}
// // //                   </p>
// // //                 </div>
// // //               </div>

// // //               {/* Contact info — pill-shaped chips, same style as the
// // //                   Returns modal, so this reads as scannable tags rather
// // //                   than a form. Email always present; phone/address
// // //                   only shown when the backend actually returned them. */}
// // //               <div className="flex flex-wrap gap-2">
// // //                 <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
// // //                   <AiOutlineMail className="w-3.5 h-3.5 text-primary" />
// // //                   {customer.email}
// // //                 </span>
// // //                 <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
// // //                   <AiOutlinePhone className="w-3.5 h-3.5 text-primary" />
// // //                   {customer.phone || "—"}
// // //                 </span>
// // //                 {customer.address && (
// // //                   <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
// // //                     <AiOutlineEnvironment className="w-3.5 h-3.5 text-primary" />
// // //                     {customer.address}
// // //                   </span>
// // //                 )}
// // //               </div>

// // //               {/* Quick order-history metrics — same real fields the
// // //                   Customer Management page and the Returns modal
// // //                   already show, so an admin reviewing a complaint can
// // //                   immediately see whether this is a first-time buyer
// // //                   or a repeat customer. */}
// // //               <div className="grid grid-cols-2 gap-3">
// // //                 <div className="bg-white rounded-xl p-3 border border-gray-100">
// // //                   <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
// // //                     Total Orders
// // //                   </p>
// // //                   <p className="text-lg font-bold text-gray-900 mt-0.5">
// // //                     {customer.total_orders}
// // //                   </p>
// // //                 </div>
// // //                 <div className="bg-white rounded-xl p-3 border border-gray-100">
// // //                   <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
// // //                     Lifetime Value
// // //                   </p>
// // //                   <p className="text-lg font-bold text-gray-900 mt-0.5">
// // //                     {formatPrice(customer.total_spent)}
// // //                   </p>
// // //                 </div>
// // //               </div>
// // //             </div>
// // //           )}
// // //         </div>

// // //         {/* ================================================================
// // //             2. COMPLAINT OVERVIEW — type, priority, and date, grouped
// // //             into one glanceable card right under the customer.
// // //             ================================================================ */}
// // //         <div className={cardClass}>
// // //           <div className="flex items-center justify-between mb-3">
// // //             <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
// // //               <AiOutlineTag className="w-4 h-4 text-gray-400" />
// // //               Complaint #CMP-{complaint.id}
// // //             </h3>
// // //             <Badge
// // //               label={complaint.status}
// // //               status={complaint.status}
// // //               size="md"
// // //               rounded
// // //             />
// // //           </div>
// // //           <div className="flex flex-wrap items-center gap-2 mb-3">
// // //             <Badge
// // //               label={getComplaintTypeLabel(complaint.type)}
// // //               variant="gray"
// // //               size="sm"
// // //               rounded
// // //             />
// // //             <Badge
// // //               label={complaint.priority}
// // //               variant={complaint.priority === "urgent" ? "danger" : "gray"}
// // //               size="sm"
// // //               rounded
// // //             />
// // //           </div>
// // //           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
// // //             <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
// // //               <AiOutlineCalendar className="w-4 h-4 text-gray-400 shrink-0" />
// // //               <div className="min-w-0">
// // //                 <p className="text-[11px] text-gray-400">Filed</p>
// // //                 <p className="text-sm font-semibold text-gray-900">
// // //                   {formatDate(complaint.created_at)}
// // //                 </p>
// // //               </div>
// // //             </div>
// // //             {/* order_number is only present on complaints raised
// // //                 against a specific order (type: "order") — omitted
// // //                 entirely rather than shown blank for other types. */}
// // //             {complaint.order_number && (
// // //               <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
// // //                 <AiOutlineTag className="w-4 h-4 text-gray-400 shrink-0" />
// // //                 <div className="min-w-0">
// // //                   <p className="text-[11px] text-gray-400">Order</p>
// // //                   <p className="text-sm font-semibold text-gray-900 truncate">
// // //                     {complaint.order_number}
// // //                   </p>
// // //                 </div>
// // //               </div>
// // //             )}
// // //           </div>
// // //         </div>

// // //         {/* ================================================================
// // //             3. MESSAGE — the customer's original complaint text, plus
// // //             the attachment link when one was submitted with it.
// // //             ================================================================ */}
// // //         <div className={cardClass}>
// // //           <h3 className="text-sm font-semibold text-gray-900 mb-2">
// // //             Customer's Message
// // //           </h3>
// // //           <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
// // //             {complaint.message}
// // //           </p>
// // //           {complaint.attachment && (
// // //             <a
// // //               href={complaint.attachment}
// // //               target="_blank"
// // //               rel="noopener noreferrer"
// // //               className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3"
// // //             >
// // //               <AiOutlinePaperClip className="w-4 h-4" />
// // //               View Attachment
// // //             </a>
// // //           )}
// // //         </div>

// // //         {/* ================================================================
// // //             4. STATUS + RESPONSE — the real messaging path for this
// // //             module (see the top-of-file note on why no separate
// // //             notification/WhatsApp composer was added here). Wrapped in
// // //             a tinted footer card, same visual role as the Returns
// // //             modal's decision footer.
// // //             ================================================================ */}
// // //         <div className="rounded-2xl bg-gray-50 p-4 flex flex-col gap-4">
// // //           <div className="flex items-end gap-2">
// // //             <div className="flex-1">
// // //               <Select
// // //                 label="Status"
// // //                 options={STATUS_OPTIONS}
// // //                 value={status}
// // //                 onChange={(e) => setStatus(e.target.value)}
// // //               />
// // //             </div>
// // //             <Button
// // //               variant="secondary"
// // //               onClick={() => statusMutation.mutate()}
// // //               isLoading={statusMutation.isPending}
// // //             >
// // //               Update
// // //             </Button>
// // //           </div>

// // //           <div className="flex flex-col gap-2">
// // //             <Textarea
// // //               label="Admin Response"
// // //               placeholder="Type your reply to the customer..."
// // //               rows={4}
// // //               value={responseText}
// // //               onChange={(e) => setResponseText(e.target.value)}
// // //             />
// // //             <p className="text-xs text-gray-400">
// // //               Sending a response automatically notifies the customer.
// // //             </p>
// // //             <Button
// // //               variant="primary"
// // //               onClick={() => respondMutation.mutate()}
// // //               isLoading={respondMutation.isPending}
// // //               disabled={!responseText.trim()}
// // //               className="self-end"
// // //             >
// // //               Send Response
// // //             </Button>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     </Modal>
// // //   );
// // // };

// // // export default ComplaintDetailModal;
// // import { useState, useEffect } from "react";
// // import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// // import {
// //   AiOutlineMail,
// //   AiOutlinePhone,
// //   AiOutlineEnvironment,
// //   AiOutlineTag,
// //   AiOutlineCalendar,
// //   AiOutlinePaperClip,
// // } from "react-icons/ai";

// // import {
// //   updateComplaintStatus,
// //   respondToComplaint,
// // } from "../../api/complaints.api";
// // import { getCustomerDetail } from "../../api/customers.api";
// // // getCustomerDetail — API 102: GET /api/v1/admin/customers/{id}/
// // // Used ONLY when the admin opens this modal for a specific complaint.
// // // The complaint object itself (from API 55) only gives back a bare
// // // customer id and a customer_name string — no email/phone/address.
// // // Rather than inventing those fields, this modal fetches the real
// // // customer profile (which genuinely does have email/phone/address/
// // // total_orders/total_spent) the moment it opens, using the exact same
// // // endpoint the Returns detail modal and the Customer Management page
// // // already rely on.

// // import { QUERY_KEYS } from "../../constants/queryKeys";
// // import { COMPLAINT_STATUS } from "../../constants/statusTypes";
// // import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
// // import formatDate from "../../utils/formatDate";
// // import formatPrice from "../../utils/formatPrice";
// // import { showSuccess, showError } from "../ui/Toast";
// // import Modal from "../ui/Modal";
// // import Select from "../ui/Select";
// // import Textarea from "../ui/Textarea";
// // import Badge from "../ui/Badge";
// // import Button from "../ui/Button";
// // import Avatar from "../ui/Avatar";
// // import Spinner from "../ui/Spinner";

// // const STATUS_OPTIONS = [
// //   { value: COMPLAINT_STATUS.OPEN, label: "Open" },
// //   { value: COMPLAINT_STATUS.IN_PROGRESS, label: "In Review" },
// //   { value: COMPLAINT_STATUS.RESOLVED, label: "Resolved" },
// //   { value: COMPLAINT_STATUS.CLOSED, label: "Closed" },
// // ];

// // const ComplaintDetailModal = ({ isOpen, onClose, complaint }) => {
// //   const queryClient = useQueryClient();
// //   const [status, setStatus] = useState("");
// //   const [responseText, setResponseText] = useState("");

// //   useEffect(() => {
// //     if (complaint) {
// //       setStatus(complaint.status);
// //       setResponseText("");
// //     }
// //   }, [complaint]);

// //   // Fetches the real customer profile the moment a complaint is
// //   // opened — only runs when the modal is actually open and the
// //   // complaint has a real customer id attached to it.
// //   const {
// //     data: customerResponse,
// //     isLoading: isCustomerLoading,
// //     isError: isCustomerError,
// //   } = useQuery({
// //     queryKey: QUERY_KEYS.CUSTOMER_DETAIL(complaint?.customer),
// //     queryFn: ({ signal }) => getCustomerDetail(complaint.customer, signal),
// //     enabled: isOpen && !!complaint?.customer,
// //     // enabled — TanStack Query never fires this request until the
// //     // modal is open on a complaint that actually has a customer id.
// //   });

// //   const customer = customerResponse?.data;

// //   // respondMutation — a single click on "Send Response" now does BOTH
// //   // of these together, in one request/response cycle:
// //   //   1. Sends the admin's reply text to the customer (respondToComplaint)
// //   //   2. Applies whatever status is currently selected in the dropdown
// //   //      (updateComplaintStatus) — even if the admin never touched the
// //   //      dropdown, this just re-applies the complaint's existing status,
// //   //      which is harmless.
// //   // mutationFn is an async function so both calls run in sequence and
// //   // isPending/onSuccess/onError apply to the combined operation.
// //   const respondMutation = useMutation({
// //     mutationFn: async () => {
// //       await respondToComplaint(complaint.id, { response: responseText });
// //       await updateComplaintStatus(complaint.id, { status });
// //     },
// //     onSuccess: () => {
// //       showSuccess("Response sent — the customer has been notified.");
// //       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
// //       setResponseText("");
// //     },
// //     onError: () => showError("Failed to send response."),
// //   });

// //   if (!complaint) return null;

// //   // cardClass — the one shared "section card" look every block below
// //   // uses, matching the exact elevated style used on the Returns
// //   // detail modal (soft drop shadow instead of a flat border) so both
// //   // modals read as the same visual family.
// //   const cardClass = "rounded-2xl bg-white shadow-lg shadow-gray-200/70 p-5";

// //   return (
// //     <Modal
// //       isOpen={isOpen}
// //       onClose={onClose}
// //       title={`Complaint #CMP-${complaint.id}`}
// //       size="lg"
// //     >
// //       <div className="flex flex-col gap-4">
// //         {/* ================================================================
// //             1. CUSTOMER — shown first, matching the Returns detail
// //             modal's layout order, since "who filed this" is the thing
// //             an admin needs to see before anything else.
// //             ================================================================ */}
// //         <div
// //           className={`${cardClass} bg-linear-to-br from-primary-50/70 via-white to-white`}
// //         >
// //           {/* Loading state — spinner while the customer profile
// //               request is in flight */}
// //           {isCustomerLoading && (
// //             <div className="py-8 flex items-center justify-center">
// //               <Spinner size="md" />
// //             </div>
// //           )}

// //           {/* Error state — the customer profile call failed; the
// //               complaint itself is still fully visible below, only this
// //               section is affected */}
// //           {isCustomerError && !isCustomerLoading && (
// //             <p className="text-sm text-gray-400 text-center py-4">
// //               Couldn't load this customer's profile right now.
// //             </p>
// //           )}

// //           {/* No customer attached at all (edge case) */}
// //           {!isCustomerLoading && !isCustomerError && !complaint.customer && (
// //             <p className="text-sm text-gray-400 text-center py-4">
// //               No customer is linked to this complaint.
// //             </p>
// //           )}

// //           {/* Loaded state — real fields only, nothing invented */}
// //           {!isCustomerLoading && !isCustomerError && customer && (
// //             <div className="flex flex-col gap-4">
// //               {/* Identity row — big avatar + name + "customer since" */}
// //               <div className="flex items-center gap-4">
// //                 <Avatar name={customer.name} size="lg" />
// //                 <div className="min-w-0">
// //                   <p className="text-lg font-bold text-gray-900 truncate">
// //                     {customer.name}
// //                   </p>
// //                   <p className="text-xs text-gray-400">
// //                     Customer since {formatDate(customer.created_at)}
// //                   </p>
// //                 </div>
// //               </div>

// //               {/* Contact info — pill-shaped chips, same style as the
// //                   Returns modal, so this reads as scannable tags rather
// //                   than a form. Email always present; phone/address
// //                   only shown when the backend actually returned them. */}
// //               <div className="flex flex-wrap gap-2">
// //                 <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
// //                   <AiOutlineMail className="w-3.5 h-3.5 text-primary" />
// //                   {customer.email}
// //                 </span>
// //                 <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
// //                   <AiOutlinePhone className="w-3.5 h-3.5 text-primary" />
// //                   {customer.phone || "—"}
// //                 </span>
// //                 {customer.address && (
// //                   <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
// //                     <AiOutlineEnvironment className="w-3.5 h-3.5 text-primary" />
// //                     {customer.address}
// //                   </span>
// //                 )}
// //               </div>

// //               {/* Quick order-history metrics — same real fields the
// //                   Customer Management page and the Returns modal
// //                   already show, so an admin reviewing a complaint can
// //                   immediately see whether this is a first-time buyer
// //                   or a repeat customer. */}
// //               <div className="grid grid-cols-2 gap-3">
// //                 <div className="bg-white rounded-xl p-3 border border-gray-100">
// //                   <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
// //                     Total Orders
// //                   </p>
// //                   <p className="text-lg font-bold text-gray-900 mt-0.5">
// //                     {customer.total_orders}
// //                   </p>
// //                 </div>
// //                 <div className="bg-white rounded-xl p-3 border border-gray-100">
// //                   <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
// //                     Lifetime Value
// //                   </p>
// //                   <p className="text-lg font-bold text-gray-900 mt-0.5">
// //                     {formatPrice(customer.total_spent)}
// //                   </p>
// //                 </div>
// //               </div>
// //             </div>
// //           )}
// //         </div>

// //         {/* ================================================================
// //             2. COMPLAINT OVERVIEW — type, priority, and date, grouped
// //             into one glanceable card right under the customer.
// //             ================================================================ */}
// //         <div className={cardClass}>
// //           <div className="flex items-center justify-between mb-3">
// //             <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
// //               <AiOutlineTag className="w-4 h-4 text-gray-400" />
// //               Complaint #CMP-{complaint.id}
// //             </h3>
// //             <Badge
// //               label={complaint.status}
// //               status={complaint.status}
// //               size="md"
// //               rounded
// //             />
// //           </div>
// //           <div className="flex flex-wrap items-center gap-2 mb-3">
// //             <Badge
// //               label={getComplaintTypeLabel(complaint.type)}
// //               variant="gray"
// //               size="sm"
// //               rounded
// //             />
// //             <Badge
// //               label={complaint.priority}
// //               variant={complaint.priority === "urgent" ? "danger" : "gray"}
// //               size="sm"
// //               rounded
// //             />
// //           </div>
// //           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
// //             <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
// //               <AiOutlineCalendar className="w-4 h-4 text-gray-400 shrink-0" />
// //               <div className="min-w-0">
// //                 <p className="text-[11px] text-gray-400">Filed</p>
// //                 <p className="text-sm font-semibold text-gray-900">
// //                   {formatDate(complaint.created_at)}
// //                 </p>
// //               </div>
// //             </div>
// //             {/* order_number is only present on complaints raised
// //                 against a specific order (type: "order") — omitted
// //                 entirely rather than shown blank for other types. */}
// //             {complaint.order_number && (
// //               <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
// //                 <AiOutlineTag className="w-4 h-4 text-gray-400 shrink-0" />
// //                 <div className="min-w-0">
// //                   <p className="text-[11px] text-gray-400">Order</p>
// //                   <p className="text-sm font-semibold text-gray-900 truncate">
// //                     {complaint.order_number}
// //                   </p>
// //                 </div>
// //               </div>
// //             )}
// //           </div>
// //         </div>

// //         {/* ================================================================
// //             3. MESSAGE — the customer's original complaint text, plus
// //             the attachment link when one was submitted with it.
// //             ================================================================ */}
// //         <div className={cardClass}>
// //           <h3 className="text-sm font-semibold text-gray-900 mb-2">
// //             Customer's Message
// //           </h3>
// //           <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
// //             {complaint.message}
// //           </p>
// //           {complaint.attachment && (
// //             <a
// //               href={complaint.attachment}
// //               target="_blank"
// //               rel="noopener noreferrer"
// //               className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3"
// //             >
// //               <AiOutlinePaperClip className="w-4 h-4" />
// //               View Attachment
// //             </a>
// //           )}
// //         </div>

// //         {/* ================================================================
// //             4. STATUS + RESPONSE — the real messaging path for this
// //             module (see the top-of-file note on why no separate
// //             notification/WhatsApp composer was added here). Wrapped in
// //             a tinted footer card, same visual role as the Returns
// //             modal's decision footer.
// //             ================================================================ */}
// //         <div className="rounded-2xl bg-gray-50 p-4 flex flex-col gap-4">
// //           {/* Status dropdown only — no separate "Update" button anymore.
// //               Whatever status is selected here is applied automatically
// //               when "Send Response" below is clicked, together with the
// //               message. */}
// //           <Select
// //             label="Status"
// //             options={STATUS_OPTIONS}
// //             value={status}
// //             onChange={(e) => setStatus(e.target.value)}
// //           />

// //           <div className="flex flex-col gap-2">
// //             <Textarea
// //               label="Admin Response"
// //               placeholder="Type your reply to the customer..."
// //               rows={4}
// //               value={responseText}
// //               onChange={(e) => setResponseText(e.target.value)}
// //             />
// //             <p className="text-xs text-gray-400">
// //               Sending a response notifies the customer and applies the selected
// //               status above.
// //             </p>
// //             <Button
// //               variant="primary"
// //               onClick={() => respondMutation.mutate()}
// //               isLoading={respondMutation.isPending}
// //               disabled={!responseText.trim()}
// //               className="self-end"
// //             >
// //               Send Response
// //             </Button>
// //           </div>
// //         </div>
// //       </div>
// //     </Modal>
// //   );
// // };

// // export default ComplaintDetailModal;
// // PROJECT PATH: src/components/admin-complaints/ComplaintDetailModal.jsx
// // Replace the existing file at this exact path with this one.

// import { useState, useEffect } from "react";
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import {
//   AiOutlineMail,
//   AiOutlinePhone,
//   AiOutlineEnvironment,
//   AiOutlineTag,
//   AiOutlineCalendar,
//   AiOutlinePaperClip,
// } from "react-icons/ai";

// import { updateComplaintStatus } from "../../api/complaints.api";
// import { getCustomerDetail } from "../../api/customers.api";
// // getCustomerDetail — API 102: GET /api/v1/admin/customers/{id}/
// // Used ONLY when the admin opens this modal for a specific complaint.
// // The complaint object itself (from API 55) only gives back a bare
// // customer id and a customer_name string — no email/phone/address.
// // Rather than inventing those fields, this modal fetches the real
// // customer profile (which genuinely does have email/phone/address/
// // total_orders/total_spent) the moment it opens, using the exact same
// // endpoint the Returns detail modal and the Customer Management page
// // already rely on.

// import { QUERY_KEYS } from "../../constants/queryKeys";
// import { COMPLAINT_STATUS } from "../../constants/statusTypes";
// import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
// import formatDate from "../../utils/formatDate";
// import formatPrice from "../../utils/formatPrice";
// import { showSuccess, showError } from "../ui/Toast";
// import Modal from "../ui/Modal";
// import Select from "../ui/Select";
// import Badge from "../ui/Badge";
// import Button from "../ui/Button";
// import Avatar from "../ui/Avatar";
// import Spinner from "../ui/Spinner";
// import ComplaintThread from "../complaints/ComplaintThread";

// const STATUS_OPTIONS = [
//   { value: COMPLAINT_STATUS.OPEN, label: "Open" },
//   { value: COMPLAINT_STATUS.IN_PROGRESS, label: "In Review" },
//   { value: COMPLAINT_STATUS.RESOLVED, label: "Resolved" },
//   { value: COMPLAINT_STATUS.CLOSED, label: "Closed" },
// ];

// const ComplaintDetailModal = ({ isOpen, onClose, complaint }) => {
//   const queryClient = useQueryClient();
//   const [status, setStatus] = useState("");

//   useEffect(() => {
//     if (complaint) {
//       setStatus(complaint.status);
//     }
//   }, [complaint]);

//   // Fetches the real customer profile the moment a complaint is
//   // opened — only runs when the modal is actually open and the
//   // complaint has a real customer id attached to it.
//   const {
//     data: customerResponse,
//     isLoading: isCustomerLoading,
//     isError: isCustomerError,
//   } = useQuery({
//     queryKey: QUERY_KEYS.CUSTOMER_DETAIL(complaint?.customer),
//     queryFn: ({ signal }) => getCustomerDetail(complaint.customer, signal),
//     enabled: isOpen && !!complaint?.customer,
//     // enabled — TanStack Query never fires this request until the
//     // modal is open on a complaint that actually has a customer id.
//   });

//   const customer = customerResponse?.data;

//   // --------------------------------------------------
//   // UPDATE STATUS — PUT /api/v1/admin/complaints/{id}/status/
//   // --------------------------------------------------
//   // Deliberately its OWN mutation, entirely separate from the message
//   // thread below (see ComplaintThread.jsx). The old /respond/ endpoint
//   // used to silently flip status to "resolved" as a side effect of
//   // sending a reply — that bug is exactly what this separation fixes.
//   // Status now changes ONLY when the admin explicitly clicks "Update"
//   // here, never as a side effect of posting a message.
//   const statusMutation = useMutation({
//     mutationFn: () => updateComplaintStatus(complaint.id, { status }),
//     onSuccess: () => {
//       showSuccess("Status updated.");
//       queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
//     },
//     onError: () => showError("Failed to update status."),
//   });

//   if (!complaint) return null;

//   // cardClass — the one shared "section card" look every block below
//   // uses, matching the exact elevated style used on the Returns
//   // detail modal (soft drop shadow instead of a flat border) so both
//   // modals read as the same visual family.
//   const cardClass = "rounded-2xl bg-white shadow-lg shadow-gray-200/70 p-5";

//   return (
//     <Modal
//       isOpen={isOpen}
//       onClose={onClose}
//       title={`Complaint #CMP-${complaint.id}`}
//       size="lg"
//     >
//       <div className="flex flex-col gap-4">
//         {/* ================================================================
//             1. CUSTOMER — shown first, matching the Returns detail
//             modal's layout order, since "who filed this" is the thing
//             an admin needs to see before anything else.
//             ================================================================ */}
//         <div
//           className={`${cardClass} bg-linear-to-br from-primary-50/70 via-white to-white`}
//         >
//           {/* Loading state — spinner while the customer profile
//               request is in flight */}
//           {isCustomerLoading && (
//             <div className="py-8 flex items-center justify-center">
//               <Spinner size="md" />
//             </div>
//           )}

//           {/* Error state — the customer profile call failed; the
//               complaint itself is still fully visible below, only this
//               section is affected */}
//           {isCustomerError && !isCustomerLoading && (
//             <p className="text-sm text-gray-400 text-center py-4">
//               Couldn't load this customer's profile right now.
//             </p>
//           )}

//           {/* No customer attached at all (edge case) */}
//           {!isCustomerLoading && !isCustomerError && !complaint.customer && (
//             <p className="text-sm text-gray-400 text-center py-4">
//               No customer is linked to this complaint.
//             </p>
//           )}

//           {/* Loaded state — real fields only, nothing invented */}
//           {!isCustomerLoading && !isCustomerError && customer && (
//             <div className="flex flex-col gap-4">
//               {/* Identity row — big avatar + name + "customer since" */}
//               <div className="flex items-center gap-4">
//                 <Avatar name={customer.name} size="lg" />
//                 <div className="min-w-0">
//                   <p className="text-lg font-bold text-gray-900 truncate">
//                     {customer.name}
//                   </p>
//                   <p className="text-xs text-gray-400">
//                     Customer since {formatDate(customer.created_at)}
//                   </p>
//                 </div>
//               </div>

//               {/* Contact info — pill-shaped chips, same style as the
//                   Returns modal, so this reads as scannable tags rather
//                   than a form. Email always present; phone/address
//                   only shown when the backend actually returned them. */}
//               <div className="flex flex-wrap gap-2">
//                 <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
//                   <AiOutlineMail className="w-3.5 h-3.5 text-primary" />
//                   {customer.email}
//                 </span>
//                 <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
//                   <AiOutlinePhone className="w-3.5 h-3.5 text-primary" />
//                   {customer.phone || "—"}
//                 </span>
//                 {customer.address && (
//                   <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
//                     <AiOutlineEnvironment className="w-3.5 h-3.5 text-primary" />
//                     {customer.address}
//                   </span>
//                 )}
//               </div>

//               {/* Quick order-history metrics — same real fields the
//                   Customer Management page and the Returns modal
//                   already show, so an admin reviewing a complaint can
//                   immediately see whether this is a first-time buyer
//                   or a repeat customer. */}
//               <div className="grid grid-cols-2 gap-3">
//                 <div className="bg-white rounded-xl p-3 border border-gray-100">
//                   <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
//                     Total Orders
//                   </p>
//                   <p className="text-lg font-bold text-gray-900 mt-0.5">
//                     {customer.total_orders}
//                   </p>
//                 </div>
//                 <div className="bg-white rounded-xl p-3 border border-gray-100">
//                   <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
//                     Lifetime Value
//                   </p>
//                   <p className="text-lg font-bold text-gray-900 mt-0.5">
//                     {formatPrice(customer.total_spent)}
//                   </p>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>

//         {/* ================================================================
//             2. COMPLAINT OVERVIEW — type, priority, and date, grouped
//             into one glanceable card right under the customer.
//             ================================================================ */}
//         <div className={cardClass}>
//           <div className="flex items-center justify-between mb-3">
//             <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
//               <AiOutlineTag className="w-4 h-4 text-gray-400" />
//               Complaint #CMP-{complaint.id}
//             </h3>
//             <Badge
//               label={complaint.status}
//               status={complaint.status}
//               size="md"
//               rounded
//             />
//           </div>
//           <div className="flex flex-wrap items-center gap-2 mb-3">
//             <Badge
//               label={getComplaintTypeLabel(complaint.type)}
//               variant="gray"
//               size="sm"
//               rounded
//             />
//             <Badge
//               label={complaint.priority}
//               variant={complaint.priority === "urgent" ? "danger" : "gray"}
//               size="sm"
//               rounded
//             />
//           </div>
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//             <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
//               <AiOutlineCalendar className="w-4 h-4 text-gray-400 shrink-0" />
//               <div className="min-w-0">
//                 <p className="text-[11px] text-gray-400">Filed</p>
//                 <p className="text-sm font-semibold text-gray-900">
//                   {formatDate(complaint.created_at)}
//                 </p>
//               </div>
//             </div>
//             {/* order_number is only present on complaints raised
//                 against a specific order (type: "order") — omitted
//                 entirely rather than shown blank for other types. */}
//             {complaint.order_number && (
//               <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
//                 <AiOutlineTag className="w-4 h-4 text-gray-400 shrink-0" />
//                 <div className="min-w-0">
//                   <p className="text-[11px] text-gray-400">Order</p>
//                   <p className="text-sm font-semibold text-gray-900 truncate">
//                     {complaint.order_number}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* ================================================================
//             3. ORIGINAL MESSAGE — the customer's original complaint
//             text, plus the attachment link when one was submitted.
//             ================================================================ */}
//         <div className={cardClass}>
//           <h3 className="text-sm font-semibold text-gray-900 mb-2">
//             Customer's Original Message
//           </h3>
//           <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
//             {complaint.message}
//           </p>
//           {complaint.attachment && (
//             <a
//               href={complaint.attachment}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3"
//             >
//               <AiOutlinePaperClip className="w-4 h-4" />
//               View Attachment
//             </a>
//           )}
//         </div>

//         {/* ================================================================
//             4. STATUS — its own explicit control, entirely separate
//             from the message thread below. Changing status here is the
//             ONLY way this complaint's status ever changes — sending a
//             message in the thread never touches it, in either direction.
//             ================================================================ */}
//         <div className={cardClass}>
//           <div className="flex items-end gap-2">
//             <div className="flex-1">
//               <Select
//                 label="Status"
//                 options={STATUS_OPTIONS}
//                 value={status}
//                 onChange={(e) => setStatus(e.target.value)}
//               />
//             </div>
//             <Button
//               variant="secondary"
//               onClick={() => statusMutation.mutate()}
//               isLoading={statusMutation.isPending}
//               disabled={status === complaint.status}
//             >
//               Update
//             </Button>
//           </div>
//         </div>

//         {/* ================================================================
//             5. MESSAGE THREAD — the real conversation with the
//             customer. Either side can keep replying; each new message
//             notifies the other party automatically on the backend.
//             ================================================================ */}
//         <div className="rounded-2xl bg-gray-50 p-4">
//           <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
//             Conversation
//           </p>
//           <ComplaintThread complaintId={complaint.id} currentRole="admin" />
//         </div>
//       </div>
//     </Modal>
//   );
// };

// export default ComplaintDetailModal;
// PROJECT PATH: src/components/admin-complaints/ComplaintDetailModal.jsx
// Replace the existing file at this exact path with this one.

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AiOutlineMail,
  AiOutlinePhone,
  AiOutlineEnvironment,
  AiOutlineTag,
  AiOutlineCalendar,
  AiOutlinePaperClip,
} from "react-icons/ai";

import { updateComplaintStatus } from "../../api/complaints.api";
import { getCustomerDetail } from "../../api/customers.api";
// getCustomerDetail — API 102: GET /api/v1/admin/customers/{id}/
// Used ONLY when the admin opens this modal for a specific complaint.
// The complaint object itself (from API 55) only gives back a bare
// customer id and a customer_name string — no email/phone/address.
// Rather than inventing those fields, this modal fetches the real
// customer profile (which genuinely does have email/phone/address/
// total_orders/total_spent) the moment it opens, using the exact same
// endpoint the Returns detail modal and the Customer Management page
// already rely on.

import { QUERY_KEYS } from "../../constants/queryKeys";
import { COMPLAINT_STATUS } from "../../constants/statusTypes";
import getComplaintTypeLabel from "../../utils/getComplaintTypeLabel";
import formatDate from "../../utils/formatDate";
import formatPrice from "../../utils/formatPrice";
import { showSuccess, showError } from "../ui/Toast";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import Spinner from "../ui/Spinner";
import ComplaintThread from "../complaint/ComplaintThread";

const STATUS_OPTIONS = [
  { value: COMPLAINT_STATUS.OPEN, label: "Open" },
  { value: COMPLAINT_STATUS.IN_PROGRESS, label: "In Review" },
  { value: COMPLAINT_STATUS.RESOLVED, label: "Resolved" },
  { value: COMPLAINT_STATUS.CLOSED, label: "Closed" },
];

const ComplaintDetailModal = ({ isOpen, onClose, complaint }) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
    }
  }, [complaint]);

  // Fetches the real customer profile the moment a complaint is
  // opened — only runs when the modal is actually open and the
  // complaint has a real customer id attached to it.
  const {
    data: customerResponse,
    isLoading: isCustomerLoading,
    isError: isCustomerError,
  } = useQuery({
    queryKey: QUERY_KEYS.CUSTOMER_DETAIL(complaint?.customer),
    queryFn: ({ signal }) => getCustomerDetail(complaint.customer, signal),
    enabled: isOpen && !!complaint?.customer,
    // enabled — TanStack Query never fires this request until the
    // modal is open on a complaint that actually has a customer id.
  });

  const customer = customerResponse?.data;

  // --------------------------------------------------
  // UPDATE STATUS — PUT /api/v1/admin/complaints/{id}/status/
  // --------------------------------------------------
  // Deliberately its OWN mutation, entirely separate from the message
  // thread below (see ComplaintThread.jsx). The old /respond/ endpoint
  // used to silently flip status to "resolved" as a side effect of
  // sending a reply — that bug is exactly what this separation fixes.
  // Status now changes ONLY when the admin explicitly clicks "Update"
  // here, never as a side effect of posting a message.
  const statusMutation = useMutation({
    mutationFn: () => updateComplaintStatus(complaint.id, { status }),
    onSuccess: () => {
      showSuccess("Status updated.");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
    },
    onError: () => showError("Failed to update status."),
  });

  if (!complaint) return null;

  // cardClass — the one shared "section card" look every block below
  // uses, matching the exact elevated style used on the Returns
  // detail modal (soft drop shadow instead of a flat border) so both
  // modals read as the same visual family.
  const cardClass = "rounded-2xl bg-white shadow-lg shadow-gray-200/70 p-5";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Complaint #CMP-${complaint.id}`}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {/* ================================================================
            1. CUSTOMER — shown first, matching the Returns detail
            modal's layout order, since "who filed this" is the thing
            an admin needs to see before anything else.
            ================================================================ */}
        <div
          className={`${cardClass} bg-linear-to-br from-primary-50/70 via-white to-white`}
        >
          {/* Loading state — spinner while the customer profile
              request is in flight */}
          {isCustomerLoading && (
            <div className="py-8 flex items-center justify-center">
              <Spinner size="md" />
            </div>
          )}

          {/* Error state — the customer profile call failed; the
              complaint itself is still fully visible below, only this
              section is affected */}
          {isCustomerError && !isCustomerLoading && (
            <p className="text-sm text-gray-400 text-center py-4">
              Couldn't load this customer's profile right now.
            </p>
          )}

          {/* No customer attached at all (edge case) */}
          {!isCustomerLoading && !isCustomerError && !complaint.customer && (
            <p className="text-sm text-gray-400 text-center py-4">
              No customer is linked to this complaint.
            </p>
          )}

          {/* Loaded state — real fields only, nothing invented */}
          {!isCustomerLoading && !isCustomerError && customer && (
            <div className="flex flex-col gap-4">
              {/* Identity row — big avatar + name + "customer since" */}
              <div className="flex items-center gap-4">
                <Avatar name={customer.name} size="lg" />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-gray-900 truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    Customer since {formatDate(customer.created_at)}
                  </p>
                </div>
              </div>

              {/* Contact info — pill-shaped chips, same style as the
                  Returns modal, so this reads as scannable tags rather
                  than a form. Email always present; phone/address
                  only shown when the backend actually returned them. */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                  <AiOutlineMail className="w-3.5 h-3.5 text-primary" />
                  {customer.email}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                  <AiOutlinePhone className="w-3.5 h-3.5 text-primary" />
                  {customer.phone || "—"}
                </span>
                {customer.address && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-white rounded-full px-3 py-1.5 border border-gray-100">
                    <AiOutlineEnvironment className="w-3.5 h-3.5 text-primary" />
                    {customer.address}
                  </span>
                )}
              </div>

              {/* Quick order-history metrics — same real fields the
                  Customer Management page and the Returns modal
                  already show, so an admin reviewing a complaint can
                  immediately see whether this is a first-time buyer
                  or a repeat customer. */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                    Total Orders
                  </p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">
                    {customer.total_orders}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-medium">
                    Lifetime Value
                  </p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">
                    {formatPrice(customer.total_spent)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================
            2. COMPLAINT OVERVIEW — type, priority, and date, grouped
            into one glanceable card right under the customer.
            ================================================================ */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AiOutlineTag className="w-4 h-4 text-gray-400" />
              Complaint #CMP-{complaint.id}
            </h3>
            <Badge
              label={complaint.status}
              status={complaint.status}
              size="md"
              rounded
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge
              label={getComplaintTypeLabel(complaint.type)}
              variant="gray"
              size="sm"
              rounded
            />
            <Badge
              label={complaint.priority}
              variant={complaint.priority === "urgent" ? "danger" : "gray"}
              size="sm"
              rounded
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
              <AiOutlineCalendar className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-gray-400">Filed</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(complaint.created_at)}
                </p>
              </div>
            </div>
            {/* order_number is only present on complaints raised
                against a specific order (type: "order") — omitted
                entirely rather than shown blank for other types. */}
            {complaint.order_number && (
              <div className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2.5">
                <AiOutlineTag className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">Order</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {complaint.order_number}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================
            3. ORIGINAL MESSAGE — the customer's original complaint
            text, plus the attachment link when one was submitted.
            ================================================================ */}
        <div className={cardClass}>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Customer's Original Message
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
            {complaint.message}
          </p>
          {complaint.attachment && (
            <a
              href={complaint.attachment}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-3"
            >
              <AiOutlinePaperClip className="w-4 h-4" />
              View Attachment
            </a>
          )}
        </div>

        {/* ================================================================
            4. STATUS — its own explicit control, entirely separate
            from the message thread below. Changing status here is the
            ONLY way this complaint's status ever changes — sending a
            message in the thread never touches it, in either direction.
            ================================================================ */}
        <div className={cardClass}>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => statusMutation.mutate()}
              isLoading={statusMutation.isPending}
              disabled={status === complaint.status}
            >
              Update
            </Button>
          </div>
        </div>

        {/* ================================================================
            5. MESSAGE THREAD — the real conversation with the
            customer. Either side can keep replying; each new message
            notifies the other party automatically on the backend.
            ================================================================ */}
        <div className="rounded-2xl bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Conversation
          </p>
          <ComplaintThread complaintId={complaint.id} currentRole="admin" />
        </div>
      </div>
    </Modal>
  );
};

export default ComplaintDetailModal;
