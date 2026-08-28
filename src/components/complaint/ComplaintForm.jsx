// Import React's useState hook for managing local component state, and useRef for referencing the hidden file input element
import { useState, useRef } from "react";
// Import the useForm hook from react-hook-form to handle form state, validation, and submission
import { useForm } from "react-hook-form";
// Import the zodResolver adapter that connects a Zod validation schema to react-hook-form
import { zodResolver } from "@hookform/resolvers/zod";
// Import the Zod library used to define and validate the shape of form data
import { z } from "zod";
// Import React Query hooks: useMutation for POST/PUT-type API calls, useQuery for fetching data, useQueryClient to access the query cache
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// Import upload and close icons from the react-icons Ant Design icon set
import { AiOutlineCloudUpload, AiOutlineClose } from "react-icons/ai";
// Import a robot icon from the react-icons Bootstrap icon set, used as a decorative header icon
import { BsRobot } from "react-icons/bs";
// Import the QUERY_KEYS constants object that stores standardized React Query cache key names
import { QUERY_KEYS } from "../../constants/queryKeys";
// Import the API function that fetches the logged-in user's own orders
import { getMyOrders } from "../../api/orders.api";
// Import the API function that sends a new complaint submission to the backend
import { submitComplaint } from "../../api/complaints.api";
// Import the COMPLAINT_TYPE constant object containing the fixed complaint category values used by the API
import { COMPLAINT_TYPE } from "../../constants/statusTypes";
// Import success and error toast notification helper functions for user feedback
import { showSuccess, showError } from "../ui/Toast";
// Import the reusable Button component so Cancel/Submit match the project's shared button styles
import Button from "../ui/Button";
// Import a utility function "cn" used to conditionally join/merge Tailwind class names
import cn from "../../utils/cn";

// Validation schema
// Define a Zod object schema describing the validation rules for every field in the complaint form
const complaintSchema = z.object({
  // "type" must be a non-empty string; if empty, show this custom error message
  type: z.string().min(1, "Please select a complaint type"),
  // "order" is an optional string field (user may or may not link a related order)
  order: z.string().optional(),
  // "subject" must be a string, required, with a minimum length of 1 and a maximum length of 200 characters.
  // .trim() first so a subject of only spaces is correctly rejected.
  subject: z
    .string()
    .trim()
    .min(1, "Subject is required")
    .max(200, "Subject too long"),
  // "message" must be a string with a minimum length of 10 characters to ensure enough detail is provided
  message: z
    .string()
    .trim()
    .min(10, "Please provide more detail (min 10 characters)")
    .max(2000, "Message is too long (max 2000 characters)"),
  // "priority" must be exactly one of these two allowed enum values
  priority: z.enum(["normal", "urgent"]),
});

// Complaint type options — API ke according
// Define a static array of complaint type options, pairing each backend constant value with a human-readable label for the dropdown
const COMPLAINT_TYPES = [
  { value: COMPLAINT_TYPE.ORDER, label: "Order Issue" },
  { value: COMPLAINT_TYPE.PAYMENT, label: "Payment Issue" },
  { value: COMPLAINT_TYPE.PRODUCT, label: "Product Issue" },
  { value: COMPLAINT_TYPE.DELIVERY, label: "Delivery Issue" },
  { value: COMPLAINT_TYPE.OTHER, label: "Other" },
];

// Define the ComplaintForm functional component, accepting an optional onSuccess callback prop (called after a successful submission)
const ComplaintForm = ({ onSuccess }) => {
  // Get access to the React Query client instance so we can manually invalidate/refresh cached queries later
  const queryClient = useQueryClient();
  // Create a ref pointing to the hidden native file input element, so we can trigger it programmatically (e.g., on click of the drop zone)
  const fileInputRef = useRef(null);

  // Attached files state
  // State array holding the list of files the user has attached/selected for this complaint
  const [attachedFiles, setAttachedFiles] = useState([]);
  // Boolean state tracking whether a file is currently being dragged over the drop zone (used for styling feedback)
  const [isDragging, setIsDragging] = useState(false);

  // =============================================
  // REACT HOOK FORM
  // =============================================
  // Destructure the tools provided by useForm: register (bind inputs), handleSubmit (wrap submit handler with validation), reset (clear form), and errors (validation error messages)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    // Tell react-hook-form to validate using our Zod schema via the zodResolver adapter
    resolver: zodResolver(complaintSchema),
    // Live validation (industry-standard pattern, same one Gmail/Amazon/
    // most production sites use): a field is left completely alone while
    // the user is still typing into it for the first time -- no error,
    // no matter how invalid the in-progress value looks. The first check
    // happens on "blur", i.e. the moment the user leaves that field
    // (Tab key or clicking elsewhere) -- mode: "onTouched" below. From
    // that point on, react-hook-form's default reValidateMode ("onChange")
    // takes over automatically: if the field was invalid, it re-checks on
    // every keystroke so the error clears the instant the value becomes
    // valid, without needing another blur.
    mode: "onTouched",
    // Set the initial/default values for each form field when the component first mounts
    defaultValues: {
      type: "",
      order: "",
      subject: "",
      message: "",
      priority: "normal",
    },
  });

  // =============================================
  // MY ORDERS — related order dropdown ke liye
  // API 43
  // =============================================
  // Fetch the user's own orders so they can optionally be linked to this complaint via the "Related Order" dropdown
  const { data: ordersData } = useQuery({
    // Unique cache key under which this query's data is stored/retrieved
    queryKey: QUERY_KEYS.MY_ORDERS,
    // The actual async function that performs the API call to fetch the orders
    queryFn: getMyOrders,
    // Keep this data "fresh" (won't auto-refetch) for 5 minutes (5 * 60 * 1000 ms) to avoid unnecessary network calls
    staleTime: 1000 * 60 * 5,
  });

  // Safely extract the orders array from the nested API response shape, defaulting to an empty array if data isn't available yet
  const orders = ordersData?.data?.results || [];

  // =============================================
  // SUBMIT COMPLAINT MUTATION
  // API 54 — POST /api/v1/complaints/
  // =============================================
  // Set up a mutation (a non-GET, data-changing API call) for submitting the complaint form
  const submitMutation = useMutation({
    // The function that actually performs the API call when mutate() is triggered, receiving the validated form data
    // UPDATED: "priority" and "attachment" are now real backend fields (see
    // BACKEND_SPEC_complaint_priority_attachment.md) instead of being faked
    // by concatenating text into "message". Subject is still folded into the
    // message text since the backend has no separate "subject" column.
    mutationFn: (data) =>
      submitComplaint({
        // Pass along the selected complaint type
        type: data.type,
        // Pass the related order if one was selected, otherwise send undefined so it's omitted/ignored by the API
        order: data.order || undefined,
        // Subject still has no dedicated backend column, so it's prefixed into the message body
        message: `Subject: ${data.subject}\n\n${data.message}`,
        // Real priority field now — no more "[URGENT]" text hack
        priority: data.priority,
        // Only the first attached file is sent — backend currently supports a single attachment per complaint
        attachment: attachedFiles[0] || null,
      }),

    // Callback executed when the mutation succeeds
    onSuccess: () => {
      // Show a success toast notification to the user
      showSuccess("Complaint submitted successfully!");
      // Reset all form fields back to their default values
      reset();
      // Clear the list of attached files since the complaint has been submitted
      setAttachedFiles([]);
      // Invalidate the cached complaints list so it refetches and shows the newly submitted complaint
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.COMPLAINTS });
      // Call the optional onSuccess callback passed in as a prop, if it exists (e.g., to close a modal)
      onSuccess?.();
    },

    // Callback executed when the mutation fails
    onError: (error) => {
      // Show an error toast, preferring the specific message returned by the API, falling back to a generic message
      showError(
        error?.response?.data?.message ||
          "Failed to submit complaint. Please try again.",
      );
    },
  });

  // File handlers
  // Function to validate and set the selected/dropped file into attachedFiles state
  // NOTE: backend "attachment" field supports only ONE file per complaint (see
  // BACKEND_SPEC_complaint_priority_attachment.md), so a newly picked file
  // REPLACES the previous one rather than appending to a list.
  const handleFileSelect = (files) => {
    // Convert the FileList into a real array, filter out anything larger than 10MB, and keep only the first valid file
    const valid = Array.from(files).filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length === 0) return;
    setAttachedFiles([valid[0]]);
  };

  // Function called when the user drops files onto the drag-and-drop zone
  const handleDrop = (e) => {
    // Prevent the browser's default behavior (which would normally open/navigate to the dropped file)
    e.preventDefault();
    // Turn off the "dragging" visual state since the drop has completed
    setIsDragging(false);
    // Process the dropped files using the same handler used for manually selected files
    handleFileSelect(e.dataTransfer.files);
  };

  // Function called by react-hook-form's handleSubmit once validation passes, triggering the actual API mutation
  const onSubmit = (data) => {
    submitMutation.mutate(data);
  };

  // Begin the JSX returned by this component — plain section now, no outer card wrapper
  return (
    // Vertical flex layout stacking the header and form with gap spacing between them
    <div className="flex flex-col gap-5">
      {/* Header */}
      {/* Header row: flex container aligning the robot icon and title text horizontally with small gap spacing */}
      <div className="flex items-center gap-2">
        {/* Decorative robot icon, fixed small size, primary theme color, prevented from shrinking */}
        <BsRobot className="w-4 h-4 text-primary shrink-0" />
        {/* Bold heading text for the form title */}
        <h2 className="text-base font-bold text-gray-900">
          New Complaint Form
        </h2>
      </div>

      {/* The actual HTML form element, wired to react-hook-form's handleSubmit which validates before calling onSubmit */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        // Disable native browser HTML5 validation so Zod/react-hook-form validation is the only validation in effect
        noValidate
        // Vertical flex layout for stacking form sections with gap spacing between them
        className="flex flex-col gap-4"
      >
        {/* Complaint Type + Related Order row */}
        {/* Grid container: single column on small screens, two columns side-by-side from "sm" breakpoint up, with gap spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Complaint Type */}
          {/* Vertical flex container for the complaint type label, select input, and any error message */}
          <div className="flex flex-col gap-1.5">
            {/* Label text for the complaint type field */}
            <label className="text-sm font-medium text-gray-700">
              Complaint Type
              {/* Red asterisk indicating this field is required */}
              <span className="text-danger ml-1">*</span>
            </label>
            {/* Dropdown select bound to the "type" field via react-hook-form's register function */}
            <select
              {...register("type")}
              // Conditionally combine classes: base styling always applied, plus a red border if there's a validation error, otherwise a neutral gray border with a subtle emerald hover
              className={cn(
                "w-full px-4 py-2.5 text-sm rounded-xl border bg-white",
                "text-gray-900 cursor-pointer appearance-none",
                "hover:border-primary/40",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                "transition-all",
                errors.type ? "border-danger" : "border-gray-200",
              )}
            >
              {/* Default placeholder option representing "no selection yet" */}
              <option value="">Select Type</option>
              {/* Map over the COMPLAINT_TYPES array to render one <option> per complaint type */}
              {COMPLAINT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            {/* Conditionally render a validation error message below the select if the "type" field has an error */}
            {errors.type && (
              <p className="text-xs text-danger font-medium">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Related Order */}
          {/* Vertical flex container for the related order label and dropdown */}
          <div className="flex flex-col gap-1.5">
            {/* Label text for the related order field */}
            <label className="text-sm font-medium text-gray-700">
              Related Order
              {/* Gray "(Optional)" hint text since this field isn't required */}
              <span className="text-gray-400 ml-1 font-normal">(Optional)</span>
            </label>
            {/* Dropdown select bound to the "order" field via react-hook-form's register function */}
            <select
              {...register("order")}
              className="
                w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200
                bg-white text-gray-900 cursor-pointer appearance-none
                hover:border-primary/40
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                transition-all
              "
            >
              {/* Default option representing "no order linked" */}
              <option value="">None</option>
              {/* Map over the fetched orders array to render one <option> per order, using the order number as both key and value */}
              {orders.map((order) => (
                <option key={order.order_number} value={order.order_number}>
                  {order.order_number}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject */}
        {/* Vertical flex container for the subject label, text input, and error message */}
        <div className="flex flex-col gap-1.5">
          {/* Label text for the subject field */}
          <label className="text-sm font-medium text-gray-700">
            Subject
            {/* Red asterisk indicating this field is required */}
            <span className="text-danger ml-1">*</span>
          </label>
          {/* Single-line text input bound to the "subject" field via react-hook-form's register function */}
          <input
            type="text"
            placeholder="Briefly describe the issue"
            {...register("subject")}
            // Conditionally combine classes: base styling, plus red border on validation error, otherwise neutral gray border with a subtle emerald hover
            className={cn(
              "w-full px-4 py-2.5 text-sm rounded-xl border bg-white",
              "placeholder:text-gray-300 text-gray-900",
              "hover:border-primary/40",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              "transition-all",
              errors.subject ? "border-danger" : "border-gray-200",
            )}
          />
          {/* Conditionally render a validation error message below the input if the "subject" field has an error */}
          {errors.subject && (
            <p className="text-xs text-danger font-medium">
              {errors.subject.message}
            </p>
          )}
        </div>

        {/* Detailed Message */}
        {/* Vertical flex container for the detailed message label, textarea, and error message */}
        <div className="flex flex-col gap-1.5">
          {/* Label text for the detailed message field */}
          <label className="text-sm font-medium text-gray-700">
            Detailed Message
            {/* Red asterisk indicating this field is required */}
            <span className="text-danger ml-1">*</span>
          </label>
          {/* Multi-line textarea bound to the "message" field via react-hook-form's register function */}
          <textarea
            placeholder="Please provide as much detail as possible to help us resolve this quickly."
            // Set the visible number of text rows for the textarea
            rows={5}
            {...register("message")}
            // Conditionally combine classes: base styling, non-resizable textarea, plus red border on validation error, otherwise neutral gray border with a subtle emerald hover
            className={cn(
              "w-full px-4 py-3 text-sm rounded-xl border bg-white",
              "placeholder:text-gray-300 text-gray-900 resize-none",
              "hover:border-primary/40",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
              "transition-all",
              errors.message ? "border-danger" : "border-gray-200",
            )}
          />
          {/* Conditionally render a validation error message below the textarea if the "message" field has an error */}
          {errors.message && (
            <p className="text-xs text-danger font-medium">
              {errors.message.message}
            </p>
          )}
        </div>

        {/* Attach Files */}
        {/* Vertical flex container for the entire file attachment section */}
        <div className="flex flex-col gap-2">
          {/* Label text for the file attachment section */}
          <label className="text-sm font-medium text-gray-700">
            Attach Files
          </label>

          {/* The drag-and-drop zone / clickable area for attaching files */}
          <div
            // When a dragged item moves over this area: prevent default browser behavior and mark dragging as true (for visual highlight)
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            // When the dragged item leaves this area: turn off the dragging visual state
            onDragLeave={() => setIsDragging(false)}
            // When a file is dropped onto this area: run the drop handler defined above
            onDrop={handleDrop}
            // When this area is clicked: programmatically trigger a click on the hidden file input to open the OS file picker
            onClick={() => fileInputRef.current?.click()}
            // Conditionally combine classes: base dashed-border box styling, plus a soft gradient highlight while dragging, otherwise neutral hover styles
            className={cn(
              "w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all",
              isDragging
                ? "border-primary bg-linear-to-br from-primary-50 to-white"
                : "border-gray-200 hover:border-primary/40 hover:bg-gray-50",
            )}
          >
            {/* Upload icon, with color changing based on whether a file is currently being dragged over */}
            <AiOutlineCloudUpload
              className={cn(
                "w-7 h-7 transition-colors",
                isDragging ? "text-primary" : "text-gray-300",
              )}
            />
            {/* Instructional text inviting the user to drag-and-drop or browse for files */}
            <p className="text-sm text-gray-500">
              Drag and drop files here, or{" "}
              <span className="text-primary font-medium">browse</span>
            </p>
            {/* Helper text specifying accepted file types and the maximum file size */}
            <p className="text-xs text-gray-300">
              PNG, JPG, or PDF (Max 10MB, 1 file)
            </p>
            {/* The actual native file input element, kept visually hidden but triggered programmatically via fileInputRef */}
            <input
              ref={fileInputRef}
              type="file"
              // Allow selecting multiple files at once
              multiple
              // Restrict the file picker to images and PDF files
              accept="image/*,.pdf"
              // When files are chosen through the native picker, pass them to the file selection handler
              onChange={(e) => handleFileSelect(e.target.files)}
              // Hide this native input visually since we use the styled drop zone above as the visible UI
              className="hidden"
            />
          </div>

          {/* Attached files list */}
          {/* Only render this list if there is at least one attached file */}
          {attachedFiles.length > 0 && (
            // Flex-wrap container so file "chips" wrap onto multiple lines if needed, with gap spacing and a small top margin
            <div className="flex flex-wrap gap-2 mt-1">
              {/* Map over each attached file to render a removable "chip" showing its name */}
              {attachedFiles.map((file, index) => (
                // Each chip: flex row with icon/text/button, soft gradient background, subtle border, rounded corners, padding
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-1.5 bg-linear-to-r from-primary-50 to-white border border-primary-100/70 rounded-lg"
                >
                  {/* File name text, truncated with ellipsis if it exceeds the max width */}
                  <p className="text-xs text-gray-600 max-w-30 truncate">
                    {file.name}
                  </p>
                  {/* Remove button that deletes this specific file from the attachedFiles array when clicked */}
                  <button
                    type="button"
                    onClick={() =>
                      setAttachedFiles((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                    className="text-gray-400 hover:text-danger transition-colors"
                  >
                    {/* Small "X" close icon shown inside the remove button */}
                    <AiOutlineClose className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Priority Level */}
        {/* Vertical flex container for the priority level label and radio button options */}
        <div className="flex flex-col gap-2">
          {/* Label text for the priority level section */}
          <label className="text-sm font-medium text-gray-700">
            Priority Level
          </label>
          {/* Horizontal flex row holding both radio button options with gap spacing between them */}
          <div className="flex items-center gap-4">
            {/* Normal */}
            {/* Clickable label wrapping the "Normal" radio input and its text, so clicking the text also selects the radio */}
            <label className="flex items-center gap-2 cursor-pointer">
              {/* Radio input for "normal" priority, bound to the "priority" field via react-hook-form's register function */}
              <input
                type="radio"
                value="normal"
                {...register("priority")}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              {/* Visible text label next to the "Normal" radio button */}
              <span className="text-sm text-gray-700">Normal</span>
            </label>

            {/* Urgent */}
            {/* Clickable label wrapping the "Urgent" radio input and its text */}
            <label className="flex items-center gap-2 cursor-pointer">
              {/* Radio input for "urgent" priority, bound to the same "priority" field so only one option can be selected at a time */}
              <input
                type="radio"
                value="urgent"
                {...register("priority")}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              {/* Visible text label next to the "Urgent" radio button */}
              <span className="text-sm text-gray-700">Urgent</span>
            </label>
          </div>
        </div>

        {/* Action buttons */}
        {/* Horizontal flex row holding the Cancel and Submit buttons, with gap spacing and a small top padding */}
        <div className="flex items-center gap-3 pt-1">
          {/* Cancel */}
          {/* Reusable Button component, "outline" variant, resets the entire form back to its default values when clicked, without submitting */}
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => reset()}
          >
            Cancel
          </Button>

          {/* Submit */}
          {/* Reusable Button component that triggers form validation and, if valid, submits via the mutation above */}
          <Button
            type="submit"
            size="lg"
            // Disable the button while the mutation is in progress, to prevent duplicate submissions
            isLoading={submitMutation.isPending}
            // Gradient override on top of the Button's default "bg-primary" — matches the Return Request page's buttons
            className="bg-linear-to-r from-primary to-primary-dark hover:brightness-110 shadow-lg shadow-primary/30"
          >
            Submit Complaint
          </Button>
        </div>
      </form>
    </div>
  );
};

// Export this component as the default export so it can be imported and used in other files
export default ComplaintForm;
