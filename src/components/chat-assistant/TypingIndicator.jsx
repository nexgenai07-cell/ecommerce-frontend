// ============================================================
// TypingIndicator — "AI IS TYPING" 3-DOT ANIMATION
// ============================================================
// A small dark bubble containing three dots that pulse in sequence,
// shown while waiting for the AI's reply (driven by chatSlice's
// "isTyping" flag, itself driven by the WebSocket "typing" event).

const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-1 bg-gray-800 rounded-2xl rounded-bl-lg w-fit px-4 py-3">
      {/* rounded-bl-lg gives this bubble the same "message tail" shape
          as a real AI message bubble, so it visually reads as "the AI
          is about to speak" rather than a generic loading spinner */}

      {/* Three dots, each with a staggered animation-delay so they
          pulse one after another instead of all at once */}
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
    </div>
  );
};

export default TypingIndicator;
