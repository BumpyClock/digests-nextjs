import { memo } from "react";
import { AddFeedForm } from "./add-feed-form";
import { OPMLTools } from "./opml-tools";
import { FeedList } from "./feed-list";

export const FeedsTab = memo(function FeedsTab() {
  return (
    <>
      <AddFeedForm />
      <OPMLTools />
      <FeedList />
    </>
  );
});
