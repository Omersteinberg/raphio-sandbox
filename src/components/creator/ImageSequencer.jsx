import MergeDropbox from "@/components/merge/MergeDropbox";
import MergeImageList from "@/components/merge/MergeImageList";

export default function ImageSequencer({ images, setImages, handleRemove, handleReorder }) {

  return (
    <div className="flex flex-col items-center gap-6 w-[528px] max-h-screen overflow-hidden">
      <h1 className="text-4xl text-primary">Add & Reorder Your Images</h1>
      <div className="w-full max-h-[50vh] overflow-y-auto rounded-md">
        <MergeImageList
          files={images}
          onRemove={handleRemove}
          onReorder={handleReorder}
        />
      </div>
 
      <MergeDropbox files={images} onFilesChange={setImages} />
    </div>
  );
}