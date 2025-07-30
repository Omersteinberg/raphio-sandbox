import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { Textarea } from "@/components/ui/textarea";
import MergeImageList from "../merge/MergeImageList";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import {
  generateVideos,
  reGenerateVideo,
  mergeVideos,
} from "@/services/images";
import MergeVideoList from "../merge/MergeVideoList";
import { toast } from "react-toastify";
import MergeVideoTrimmer from "../merge/MergeVideoTrimmer";
import MergeVideoDownload from "../merge/MergeVideoDownload";

const dummyVideos = [
  { video: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { video: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4" },
  { video: "https://samplelib.com/lib/preview/mp4/sample-10s.mp4" },
  { video: "https://filesamples.com/samples/video/mp4/sample_640x360.mp4" },
  {
    video:
      "https://filesamples.com/samples/video/mp4/sample_960x400_ocean_with_audio.mp4",
  },
  {
    video:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  { video: "https://media.w3.org/2010/05/sintel/trailer.mp4" },
  { video: "https://media.w3.org/2010/05/bunny/trailer.mp4" },
  { video: "https://media.w3.org/2010/05/video/movie_300.mp4" },
  {
    video:
      "https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4",
  },
];

export default function EditorView({
  images,
  setImages,
  handleRemove,
  handleReorder,
}) {
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedImageDescription, setSelectedImageDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergedVideo, setMergedVideo] = useState(null);
  const [isVideoModal, setIsVideoModal] = useState(false);

  const handleImageClick = (id) => {
    console.log("check id here description", id.active.id);
    console.log(
      "check images here description",
      images.find((image) => image.id === id.active.id)?.description
    );
    setSelectedImageId(id.active.id);
    setSelectedImageDescription(
      images.find((image) => image.id === id.active.id)?.description ?? ""
    );
  };

  const handleImageDescriptionChange = (newDescription) => {
    setSelectedImageDescription(newDescription);
    setImages((prevImages) =>
      prevImages.map((image) =>
        image.id === selectedImageId
          ? {
              ...image,
              description: newDescription,
            }
          : image
      )
    );
  };

  const handleGenerateVideos = async (images) => {
    try {
      setIsGenerating(true);
      console.log("check images before video generation", images);
      const res = await generateVideos(images);
      console.log("res:", res);
      if (res?.success === true) {
        toast.success("Successfully generated videos!");
        // update images file
        setImages(res?.result);
      }
    } catch (error) {
      console.error("Failed to generate videos:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateScene = async (imageId) => {
    try {
      setIsGenerating(true);

      const image = images.find((img) => img.id === imageId);
      const res = await reGenerateVideo(image);
      console.log("regenerate results:", res);
      if (res?.success === true) {
        toast.success("Successfully regenerated video!");
        // update video file for the specific id
        setImages(res?.videos);
      }
    } catch (error) {
      console.error("Failed to regenerate video:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMergeVideos = async () => {
    try {
      setIsGenerating(true);

      const res = await mergeVideos();
      console.log("merge results:", res);
      if (res?.success === true) {
        toast.success("Successfully merged videos!");
        setMergedVideo(res?.video);
        setIsVideoModal(true);
      }
    } catch (error) {
      console.error("Failed to merge videos:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen w-screen">
      <PanelGroup
        direction="horizontal"
        className="h-full w-full bg-transparent"
      >
        <Panel
          minSize={30}
          maxSize={70}
          defaultSize={30}
          className="bg-foreground"
        >
          {/* Nested vertical PanelGroup */}
          <PanelGroup direction="vertical" className="h-full">
            <Panel
              defaultSize={30}
              minSize={30}
              maxSize={70}
              className="flex flex-col p-4 relative"
            >
              <div className="mb-2">Editor Panel</div>

              <Textarea
                className="w-full flex-1 resize-none"
                placeholder="Edit prompt here..."
                value={selectedImageDescription}
                onChange={(e) => {
                  // update in function
                  handleImageDescriptionChange(e.target.value);
                }}
              />
            </Panel>
            <PanelResizeHandle className="h-1 bg-gray-300 cursor-row-resize" />
            <Panel className="flex flex-col h-full relative">
              <div className="p-4 ">Images / Sequence</div>
              <div className="flex-1 overflow-y-auto p-4">
                <MergeImageList
                  files={images}
                  onRemove={handleRemove}
                  onReorder={handleReorder}
                  onImageClick={handleImageClick}
                />
                {selectedImageId && (
                  <Button
                    onClick={() => handleRegenerateScene(selectedImageId)}
                    className="absolute bottom-3 right-3 text-white"
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-opacity-50" />
                        Regenerating...
                      </div>
                    ) : (
                      "Regenerate this scene"
                    )}
                  </Button>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-1 bg-gray-300 cursor-col-resize" />

        <Panel
          minSize={30}
          maxSize={70}
          className="flex flex-col p-4 relative"
        >
          <div className="flex flex-col h-full w-full">
            <div>Preview / Scene Info</div>

            {images.some((img) => img.video !== "") ? (
              <>
                <MergeVideoList
                  videos={images}
                  selectedImageId={selectedImageId}
                  setSelectedImageId={setSelectedImageId}
                />
                <div className="flex-1">
                  <MergeVideoTrimmer className="mt-4" />
                </div>

                {selectedImageId && (
                  <Button
                    onClick={() => handleMergeVideos()}
                    className="absolute bottom-3 right-3 text-white"
                    disabled={isGenerating}
                    size="lg"
                  >
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-opacity-50" />
                        Merging...
                      </div>
                    ) : (
                      "Merge videos"
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <Button
                  onClick={() => handleGenerateVideos(images)}
                  className="text-white"
                  disabled={isGenerating}
                  size="lg"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white border-opacity-50" />
                      Generating...
                    </div>
                  ) : (
                    "Generate Videos"
                  )}
                </Button>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      {isVideoModal && (
        <MergeVideoDownload
          open={isVideoModal}
          onClose={() => setIsVideoModal(false)}
          videoUrl={mergedVideo}
        />
      )}
    </div>
  );
}
