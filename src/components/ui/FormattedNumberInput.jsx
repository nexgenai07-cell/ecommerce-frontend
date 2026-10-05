// Number input that shows thousands separators while the user types.
// Wraps the shared Input component, so label, hint, error and icons work
// exactly the same way.
//
// The value and onChange work with the plain number string ("1999.5"),
// never with the separated text ("1,999.5"). This keeps form validation
// and API payloads unaffected by the display format.

import Input from "./Input";
import {
  sanitizeNumberInput,
  formatNumberWithCommas,
} from "../../utils/numberInput";

const FormattedNumberInput = ({
  value = "", // Plain number string held by the form, e.g. "1999.5"
  onChange, // Called with the plain number string after every edit
  allowDecimal = true, // When false, only whole numbers can be typed
  maxDecimals = 2, // Maximum digits kept after the decimal point
  ...inputProps // Everything else (label, error, hint, leftIcon, ref, ...) goes to Input
}) => {
  const options = { allowDecimal, maxDecimals };

  // The text shown in the field: the plain value with separators added
  const displayValue = formatNumberWithCommas(
    sanitizeNumberInput(value, options),
  );

  const handleChange = (event) => {
    const input = event.target;
    const caretPosition = input.selectionStart ?? input.value.length;

    // How many number characters (digits and the decimal point) sit
    // before the caret. Separators are ignored, because their count
    // changes whenever the text is re-formatted.
    const charactersBeforeCaret = sanitizeNumberInput(
      input.value.slice(0, caretPosition),
      options,
    ).length;

    const plainValue = sanitizeNumberInput(input.value, options);
    const formattedValue = formatNumberWithCommas(plainValue);

    onChange?.(plainValue);

    // Re-formatting moves the caret to the end of the field. Putting it
    // back after the same number of characters keeps editing in the
    // middle of a value natural.
    requestAnimationFrame(() => {
      if (document.activeElement !== input) return;

      let seen = 0;
      let position = 0;
      while (position < formattedValue.length && seen < charactersBeforeCaret) {
        if (/[\d.]/.test(formattedValue[position])) seen += 1;
        position += 1;
      }
      input.setSelectionRange(position, position);
    });
  };

  return (
    <Input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      autoComplete="off"
      {...inputProps}
      value={displayValue}
      onChange={handleChange}
    />
  );
};

export default FormattedNumberInput;
