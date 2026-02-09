"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { GripVertical, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/index";

export type DraftAuctionImage = {
  id: string;
  blob: Blob;
  previewUrl: string;
};

type CropArea = {
  width: number;
  height: number;
  x: number;
  y: number;
};

async function createImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

function getRadianAngle(degree: number) {
  return (degree * Math.PI) / 180;
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedBlob(imageSrc: string, crop: CropArea, rotation = 0): Promise<Blob> {
  const image = await createImageElement(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  const rotRad = getRadianAngle(rotation);
  const rotated = rotateSize(image.width, image.height, rotation);

  canvas.width = Math.floor(rotated.width);
  canvas.height = Math.floor(rotated.height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) {
    throw new Error("Unable to create crop context");
  }

  const cropWidth = Math.max(1, Math.round(crop.width));
  const cropHeight = Math.max(1, Math.round(crop.height));
  const cropX = Math.min(Math.max(0, Math.round(crop.x)), Math.max(0, canvas.width - cropWidth));
  const cropY = Math.min(Math.max(0, Math.round(crop.y)), Math.max(0, canvas.height - cropHeight));

  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = "high";
  // Fill white first so transparent PNG areas don't become black in JPEG output.
  croppedCtx.fillStyle = "#ffffff";
  croppedCtx.fillRect(0, 0, cropWidth, cropHeight);

  croppedCtx.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create cropped blob"));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.92,
    );
  });
}

function SortableImage({
  image,
  onDelete,
}: {
  image: DraftAuctionImage;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
    >
      <img src={image.previewUrl} alt="Auction upload" className="aspect-square w-full object-cover" />
      <button
        type="button"
        className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
        onClick={() => onDelete(image.id)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <div
        className="absolute bottom-2 left-2 rounded-lg bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
    </div>
  );
}

export function ImageCropUploader({
  value,
  onChange,
  maxImages,
}: {
  value: DraftAuctionImage[];
  onChange: (images: DraftAuctionImage[]) => void;
  maxImages: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [workingFileUrl, setWorkingFileUrl] = useState<string | null>(null);
  const [cropping, setCropping] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState(1 / 1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [processing, setProcessing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const aspectOptions = useMemo(
    () => [
      { label: "1:1", value: 1 / 1 },
      { label: "4:5", value: 4 / 5 },
      { label: "16:9", value: 16 / 9 },
    ],
    [],
  );

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setWorkingFileUrl(url);
    setIsCropping(true);
    setZoom(1);
    setRotation(0);

    event.target.value = "";
  }, []);

  const closeCropDialog = useCallback(() => {
    if (workingFileUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(workingFileUrl);
    }

    setWorkingFileUrl(null);
    setCroppedAreaPixels(null);
    setIsCropping(false);
    setCropping({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, [workingFileUrl]);

  const confirmCrop = async () => {
    if (!workingFileUrl || !croppedAreaPixels) {
      return;
    }

    setProcessing(true);

    try {
      const blob = await getCroppedBlob(workingFileUrl, croppedAreaPixels, rotation);
      const previewUrl = URL.createObjectURL(blob);

      onChange([
        ...value,
        {
          id: uuidv4(),
          blob,
          previewUrl,
        },
      ]);

      closeCropDialog();
    } finally {
      setProcessing(false);
    }
  };

  const deleteImage = (id: string) => {
    const found = value.find((item) => item.id === id);
    if (found?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(found.previewUrl);
    }

    onChange(value.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Auction images</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={value.length >= maxImages}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          Add image
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleFileSelect}
      />

      <p className="text-xs text-slate-500">
        Upload up to {maxImages} images. Each image is cropped before upload and saved permanently.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (!over || active.id === over.id) {
            return;
          }

          const oldIndex = value.findIndex((item) => item.id === active.id);
          const newIndex = value.findIndex((item) => item.id === over.id);
          onChange(arrayMove(value, oldIndex, newIndex));
        }}
      >
        <SortableContext items={value.map((item) => item.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {value.map((image) => (
              <SortableImage key={image.id} image={image} onDelete={deleteImage} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog
        open={isCropping}
        onOpenChange={(open) => {
          if (!open) {
            closeCropDialog();
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Crop image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative h-[360px] overflow-hidden rounded-xl bg-slate-950">
              {workingFileUrl ? (
                <Cropper
                  image={workingFileUrl}
                  crop={cropping}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspect}
                  onCropChange={setCropping}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels as CropArea)}
                />
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Aspect ratio</Label>
                <div className="flex gap-2">
                  {aspectOptions.map((option) => (
                    <Button
                      key={option.label}
                      type="button"
                      variant={aspect === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAspect(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Zoom</Label>
                <RangeSlider min={1} max={3} step={0.1} value={[zoom]} onValueChange={(v) => setZoom(v[0] ?? 1)} />
              </div>

              <div className="space-y-2">
                <Label>Rotation</Label>
                <RangeSlider min={0} max={360} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0] ?? 0)} />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={closeCropDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmCrop} disabled={processing}>
              {processing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RangeSlider({
  value,
  onValueChange,
  min,
  max,
  step,
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={(event) => onValueChange([Number(event.target.value)])}
      className={cn("h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 dark:bg-slate-700")}
    />
  );
}

