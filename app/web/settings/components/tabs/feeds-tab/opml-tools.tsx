import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { useOPML } from "@/app/web/settings/hooks/use-opml";
import { OPMLImportDialog } from "./opml-import-dialog";

export const OPMLTools = memo(function OPMLTools() {
  const {
    fileInputRef,
    handleExportOPML,
    handleImportOPML,
    isDialogOpen,
    setIsDialogOpen,
    detectedFeeds,
    handleImportSelected,
  } = useOPML();

  return (
    <>
      <div className="flex justify-between items-center mt-8 mb-4">
        <h2 className="text-xl font-bold">Your Subscriptions</h2>
        <div className="flex gap-2">
          <input
            type="file"
            title="Import OPML"
            accept=".opml,.xml"
            onChange={handleImportOPML}
            ref={fileInputRef}
            className="hidden"
            id="opml-import"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import OPML
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportOPML}>
            <Download className="mr-2 h-4 w-4" />
            Export OPML
          </Button>
        </div>
      </div>
      <OPMLImportDialog
        feeds={detectedFeeds}
        onImport={handleImportSelected}
        onCancel={() => setIsDialogOpen(false)}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
});
