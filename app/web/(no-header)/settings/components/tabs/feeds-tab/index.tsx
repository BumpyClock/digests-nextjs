import { memo, useCallback, useRef } from "react";
import { AddFeedForm } from "./add-feed-form";
import { FeedList } from "./feed-list";
import { OPMLTools } from "./opml-tools";

export const FeedsTab = memo(function FeedsTab() {
  const feedUrlInputRef = useRef<HTMLInputElement>(null);
  const handleAddFeed = useCallback(() => {
    feedUrlInputRef.current?.focus();
  }, []);

  return (
    <>
      <AddFeedForm feedUrlInputRef={feedUrlInputRef} />
      <OPMLTools />
      <FeedList onAddFeed={handleAddFeed} />
    </>
  );
});
