
export default function PreviewSelector( {handleNext, setProvider, previewVideos} ) {

  const handlePreviewSelect = (provider) => {
    console.log("check value of provider", provider);
    setProvider(provider);
    handleNext();
  };  

  return (
    <div className="flex flex-col items-center gap-6 w-[50%] max-h-screen">
      <h1 className="text-4xl text-primary">Select Your Video Preference</h1>

      <div className="grid grid-cols-2 gap-4 w-full">
        {previewVideos.map((video) => (
          <button
            key={video.provider}
            onClick={() => handlePreviewSelect(video.provider)}
            className="relative aspect-video rounded-lg overflow-hidden focus:outline-none transform transition-all duration-300 hover:scale-105 hover:shadow-[0_20px_50px_hsl(var(--primary)_/_0.5)]"
          >
            <video
              src={video.videoUrl}
              className="w-full h-full object-cover"
              muted
              autoPlay
              loop
              playsInline
            />
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center text-white text-xl font-semibold opacity-0 hover:opacity-100 transition">
              {video.provider}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
