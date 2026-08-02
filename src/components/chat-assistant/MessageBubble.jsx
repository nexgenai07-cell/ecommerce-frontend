import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// remark-gfm adds GitHub-Flavored-Markdown support (tables, strikethrough,
// task lists) — required because the backend sends pipe-style markdown
// tables and headings/bold text, which plain markdown parsing alone
// doesn't fully cover.

import {
  AiFillLike,
  AiOutlineLike,
  AiFillDislike,
  AiOutlineDislike,
} from "react-icons/ai";
import { HiSparkles } from "react-icons/hi2";

import ProductCard from "./ProductCard";
import SuggestionChips from "./SuggestionChips";
import PendingActionCard from "./PendingActionCard";
import AnalyticsChartCard from "./AnalyticsChartCard";
import cn from "../../utils/cn";

const MessageBubble = ({
  message,
  onSuggestionClick,
  onFeedback,
  onAddToCart,
  isAdmin,
}) => {
  const isUser = message.sender === "user";
  const hasProducts = Boolean(message.metadata?.products?.length);
  const pendingAction = message.metadata?.pending_action || null;
  const analytics = message.metadata?.analytics || null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        isUser ? "items-end" : "items-start",
      )}
    >
      {message.proactive && (
        <span className="flex items-center gap-1 text-[11px] text-gray-400 font-medium pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          AI started this
        </span>
      )}

      <div
        className={cn(
          // "max-w-[85%]" lives HERE now (not on the inner bubble). This
          // row's parent (the wrapper above) is a STRETCHED flex-col
          // child, so it has a genuine, definite pixel width — meaning
          // this 85% resolves correctly. Previously the 85% was applied
          // to the bubble itself, whose immediate parent (this same row)
          // did NOT have a definite width at that point (it was only
          // "fit-content"), so the browser couldn't resolve the
          // percentage properly and rendered the bubble far narrower
          // than it should've been — causing even short one-line
          // messages to wrap onto two lines.
          "flex items-end gap-2 max-w-[85%]",
          isUser && "flex-row-reverse",
        )}
      >
        {!isUser && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mb-1">
            <HiSparkles className="w-3.5 h-3.5 text-white" />
          </div>
        )}

        <div
          className={cn(
            // No width/max-width utilities here anymore — this div is a
            // normal flex item of the row above, so it automatically
            // shrinks to fit its own text content (short messages stay
            // on one line), while the row's max-w-[85%] still caps how
            // wide it's ever allowed to grow for long messages.
            "px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-br-lg"
              : "bg-gray-800 text-white rounded-2xl rounded-bl-lg",
          )}
        >
          {isUser ? (
            // The user's own messages are always plain text, typed by
            // them — rendering these as markdown would be unnecessary
            // and a potential injection surface, so they're shown as-is
            // with line breaks preserved. "break-words" lives HERE (not
            // on the outer bubble div) so it only breaks an unbreakable
            // long token (e.g. a URL) when needed, without affecting how
            // the outer bubble calculates its own width — putting it on
            // the outer div was causing short messages to wrap early.
            <p className="whitespace-pre-wrap wrap-break-word">
              {message.text}
            </p>
          ) : (
            // AI replies are rendered as markdown — this turns the
            // backend's "### heading" / "**bold**" / pipe-tables into
            // real headings, bold text, and actual tables instead of
            // showing raw markdown symbols to the user.
            <div
              className="prose prose-sm prose-invert max-w-none wrap-break-word
                prose-headings:text-white prose-headings:font-bold prose-headings:mt-3 prose-headings:mb-1.5
                prose-p:my-1.5 prose-strong:text-white prose-strong:font-semibold
                prose-table:my-2 prose-th:border prose-th:border-white/20 prose-th:px-2 prose-th:py-1 prose-th:bg-white/10
                prose-td:border prose-td:border-white/20 prose-td:px-2 prose-td:py-1
                prose-ul:my-1.5 prose-li:my-0.5 prose-hr:border-white/20 prose-hr:my-3"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.text}
              </ReactMarkdown>
            </div>
          )}

          {/* Blinking cursor — only shown while this specific message
              is still receiving streamed chunks. Rendered OUTSIDE the
              markdown block since markdown parsing needs a complete
              string — a raw cursor mid-stream could briefly break
              table/heading parsing while chunks arrive. */}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-white/70 align-middle animate-pulse" />
          )}

          {pendingAction && <PendingActionCard pendingAction={pendingAction} />}
          {analytics && <AnalyticsChartCard analytics={analytics} />}
        </div>
      </div>

      {hasProducts && (
        <div className="flex gap-2 overflow-x-auto pb-1 pl-8 max-w-full">
          {message.metadata.products.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              onAddToCart={onAddToCart}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {!isUser && !message.isStreaming && message.suggestions?.length > 0 && (
        <div className="pl-8">
          <SuggestionChips
            suggestions={message.suggestions}
            onSelect={onSuggestionClick}
          />
        </div>
      )}

      {!isUser && !message.isStreaming && (
        <div className="flex items-center gap-1.5 pl-8">
          <button
            type="button"
            aria-label="Helpful"
            onClick={() =>
              onFeedback(message.id, message.feedback === "up" ? null : "up")
            }
            className={cn(
              "p-1 rounded transition-colors",
              message.feedback === "up"
                ? "text-primary"
                : "text-gray-300 hover:text-gray-500",
            )}
          >
            {message.feedback === "up" ? (
              <AiFillLike className="w-4 h-4" />
            ) : (
              <AiOutlineLike className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            aria-label="Not helpful"
            onClick={() =>
              onFeedback(
                message.id,
                message.feedback === "down" ? null : "down",
              )
            }
            className={cn(
              "p-1 rounded transition-colors",
              message.feedback === "down"
                ? "text-danger"
                : "text-gray-300 hover:text-gray-500",
            )}
          >
            {message.feedback === "down" ? (
              <AiFillDislike className="w-4 h-4" />
            ) : (
              <AiOutlineDislike className="w-4 h-4" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
