"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteAdminPropertyImageAction,
  registerAdminPropertyImageAction,
} from "@/features/properties/actions/admin-property-actions";

type ExistingImage = { id: string; src: string; alt: string };

const formats = {
  "image/jpeg": { extension: "jpg", signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: "png", signature: (bytes: Uint8Array) => [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value) },
  "image/webp": { extension: "webp", signature: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" },
  "image/avif": { extension: "avif", signature: (bytes: Uint8Array) => String.fromCharCode(...bytes.slice(4, 12)).includes("ftypavif") || String.fromCharCode(...bytes.slice(4, 12)).includes("ftypavis") },
} as const;

export function PropertyImageManager({
  propertyId,
  images,
}: {
  propertyId: string;
  images: ExistingImage[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState("");

  const uploadImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setFeedback("");
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        let completed = 0;
        for (const [index, file] of Array.from(files).entries()) {
          const format = formats[file.type as keyof typeof formats];
          if (!format || file.size <= 0 || file.size > 10 * 1024 * 1024) {
            throw new Error(`${file.name}: formato o tamaño no permitido (máximo 10 MiB).`);
          }
          const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
          if (!format.signature(signature)) throw new Error(`${file.name}: el contenido no coincide con el formato declarado.`);

          const storagePath = `${propertyId}/${crypto.randomUUID()}.${format.extension}`;
          const { error: uploadError } = await supabase.storage.from("property-images").upload(storagePath, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          });
          if (uploadError) throw new Error(`${file.name}: no se pudo subir a Storage.`);

          const registration = await registerAdminPropertyImageAction({
            propertyId,
            storagePath,
            altText: file.name.replace(/\.[^.]+$/, "").slice(0, 240),
            sortOrder: images.length + index,
            isCover: images.length === 0 && index === 0,
            mimeType: file.type,
            sizeBytes: file.size,
          });
          if (registration.status === "error") {
            await supabase.storage.from("property-images").remove([storagePath]);
            throw new Error(registration.message);
          }
          completed += 1;
        }
        setFeedback(`${completed} fotografía(s) guardadas en Storage y vinculadas en la base de datos.`);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudieron cargar las fotografías.");
      }
    });
  };

  const removeImage = (imageId: string) => {
    if (!window.confirm("¿Eliminar esta fotografía de la propiedad?")) return;
    startTransition(async () => {
      const result = await deleteAdminPropertyImageAction(imageId);
      setFeedback(result.message);
      router.refresh();
    });
  };

  return (
    <div className="property-image-manager">
      <label className="property-image-manager__upload">
        Agregar fotografías
        <input
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={pending}
          multiple
          onChange={(event) => void uploadImages(event.currentTarget.files)}
          ref={inputRef}
          type="file"
        />
      </label>
      <small>JPG, PNG, WebP o AVIF · máximo 10 MiB por archivo</small>
      {images.length ? (
        <div className="property-image-manager__grid">
          {images.map((image) => (
            <figure key={image.id}>
              <Image alt={image.alt} fill sizes="150px" src={image.src} unoptimized />
              <button aria-label={`Eliminar ${image.alt}`} disabled={pending} onClick={() => removeImage(image.id)} type="button">×</button>
            </figure>
          ))}
        </div>
      ) : <p className="admin-property-empty">Sin fotografías cargadas.</p>}
      {pending ? <p role="status">Procesando fotografías…</p> : null}
      {feedback ? <p aria-live="polite" role="status">{feedback}</p> : null}
    </div>
  );
}
