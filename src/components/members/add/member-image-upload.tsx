"use client";

import { useRef } from "react";
import { Upload, X, User, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizedMemberImage } from "@/components/members/optimized-member-image";

export interface MemberImageUploadProps {
  previewImage: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function MemberImageUpload({
  previewImage,
  onImageChange,
  onRemoveImage
}: MemberImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex justify-center py-4 border-b border-border/40 mb-2">
      <div className="flex flex-col items-center">
        <div className="relative group mb-3">
          {previewImage ? (
            <div className="relative">
              <OptimizedMemberImage
                src={previewImage}
                alt="Profile preview"
                fallbackText={<User className="h-10 w-10 text-primary/60" />}
                className="h-28 w-28 border-2 border-muted"
                size={112}
              />
              <button
                type="button"
                onClick={onRemoveImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="h-28 w-28 rounded-full bg-muted/40 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          id="profile-image"
          className="hidden"
          onChange={onImageChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          {previewImage ? "Change Photo" : "Upload Photo"}
        </Button>
      </div>
    </div>
  );
}
