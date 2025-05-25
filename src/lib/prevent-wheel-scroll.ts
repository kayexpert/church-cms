/**
 * Prevents mouse wheel scrolling from changing the value of number inputs
 * 
 * This function can be used as an onWheel handler for number inputs to prevent
 * accidental value changes when users scroll the page.
 * 
 * @param e - The wheel event
 */
export function preventWheelScroll(e: React.WheelEvent<HTMLInputElement>): void {
  // Prevent the default behavior (changing the input value)
  e.currentTarget.blur();
}
