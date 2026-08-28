// Step 3 — Return Details Form
// Reason for Return dropdown
// Additional Description textarea (optional)
// NOTE: no outer card here — this renders INSIDE the single unified form card
// on ReturnRequest.jsx, so it's just a plain content section, fully responsive

// Import an image icon from the "bs" (Bootstrap) icon set, used in the section header
import { BsImage } from "react-icons/bs";
// Import a utility function "cn" used to conditionally join CSS class names together
import cn from "../../utils/cn";

// Return reasons
// Hardcoded array of selectable reasons for returning an item, used to populate the reason dropdown
const RETURN_REASONS = [
  "Item damaged or defective",
  "Wrong item received",
  "Item not as described",
  "Size or fit issue",
  "Changed my mind",
  "Item arrived too late",
  "Missing parts or accessories",
  "Other",
];

// Main functional component for step 3 of the return flow, receiving form values and their change callbacks as props
const ReturnDetailsStep = ({
  reason, // Selected reason
  onReasonChange, // Reason change callback
  description, // Additional description
  onDescriptionChange,
  errors, // Validation errors
}) => {
  // Begin returning the JSX markup for this component — plain section, no card wrapper
  return (
    // Vertical flex column holding the section header and both form fields, with gap between them
    <div className="flex flex-col gap-5">
      {/* Section header */}
      {/* Row grouping a small emerald icon with the section heading text */}
      <div className="flex items-center gap-2">
        {/* Image icon, colored emerald, shrink-0 prevents shrinking — plain icon, no boxed badge */}
        <BsImage className="w-4 h-4 text-primary shrink-0" />
        {/* Section heading text */}
        <h2 className="text-base font-bold text-gray-900">Return Details</h2>
      </div>

      {/* Reason for Return */}
      {/* Column container holding the "Reason for Return" label, dropdown, and any validation error message */}
      <div className="flex flex-col gap-1.5">
        {/* Label text for the reason dropdown, with a red asterisk marking it as required */}
        <label className="text-sm font-medium text-gray-700">
          Reason for Return
          <span className="text-danger ml-1">*</span>
        </label>
        {/* Dropdown select for choosing a return reason, controlled by the "reason" prop */}
        <select
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          // Dynamically apply a red/danger border if there's a validation error on this field, otherwise use the default gray border with a subtle emerald hover
          className={cn(
            "w-full px-4 py-2.5 text-sm rounded-xl border bg-white",
            "text-gray-900 cursor-pointer appearance-none",
            "hover:border-primary/40",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
            "transition-all",
            errors?.reason ? "border-danger" : "border-gray-200",
          )}
        >
          {/* Default placeholder option prompting the user to choose a reason */}
          <option value="">Select a reason...</option>
          {/* Loop through the RETURN_REASONS array and render an <option> for each reason */}
          {RETURN_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {/* Only render the error message paragraph if there's a validation error on the "reason" field */}
        {errors?.reason && (
          <p className="text-xs text-danger font-medium">{errors.reason}</p>
        )}
      </div>

      {/* Additional Description */}
      {/* Column container holding the optional "Additional Description" label and textarea */}
      <div className="flex flex-col gap-1.5">
        {/* Label text for the description textarea, marked as optional in lighter gray text */}
        <label className="text-sm font-medium text-gray-700">
          Additional Description
          <span className="text-gray-400 ml-1 font-normal">(Optional)</span>
        </label>
        {/* Multi-line textarea for additional free-text context about the return, controlled by the "description" prop */}
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Please provide more context about your return request..."
          rows={4}
          maxLength={1000}
          className="
            w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-white
            placeholder:text-gray-300 text-gray-900 resize-none
            hover:border-primary/40
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            transition-all
          "
        />
        {/* Soft character counter -- description is optional, so this is
            guidance rather than a hard validation error */}
        <span className="text-xs text-gray-400 self-end">
          {description.length}/1000
        </span>
      </div>
    </div>
  );
};

// Export this component as the default export so other files can import and use it
export default ReturnDetailsStep;
