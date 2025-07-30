import React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import MergeFloatingActionButton from "./MergeFloatingActionButton";

// Sortable image item
function SortableItem({ id, file, index, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  console.log("check id and file in SortableItem", id, file);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isDragging ? "0 10px 20px rgba(0,0,0,0.15)" : "none",
    zIndex: isDragging ? 9999 : "auto",
    touchAction: "none",
    cursor: "grab",
    height: "120px",
  };

  // Determine the image source
  const isFile = file instanceof File;
  const url = isFile
    ? URL.createObjectURL(file)
    : file;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {console.log("check id here", id);}}
      className="relative w-full rounded-md overflow-hidden group/item"
    >
      {/* Sequence Number */}
      <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {index + 1}
      </div>

      {/* Image */}
      <img
        src={url}
        alt={isFile ? file.name : `image-${index}`}
        className="object-cover w-full h-full select-none pointer-events-none"
        onLoad={() => isFile && URL.revokeObjectURL(url)}
        draggable={false}
      />

      {/* Remove Button */}
      {onRemove && (
        <MergeFloatingActionButton
          size={30}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 !text-primary rounded-full p-1 transition-opacity opacity-0 group-hover:opacity-100 pointer-events-auto"
          icon={<X className="w-4 h-4" />}
        />
      )}
    </div>
  );
}

export default function MergeImageList({ files = [], onRemove, onReorder, onImageClick }) {
  const sensors = useSensors(useSensor(PointerSensor));

  const items = files.map((f) => f.id);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      const newFiles = arrayMove(files, oldIndex, newIndex);

      if (typeof onReorder === "function") {
        onReorder(newFiles);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={onImageClick}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 group">
          {files.map(({ id, file }, index) => (
            <SortableItem
              key={id}
              id={id}
              file={file}
              index={index}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
