"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./button";
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export function DialogContent({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className="dialog-content">
        <div className="dialog-head">
          <div>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description>
              {description ||
                "Enter the details below. All amounts are in INR."}
            </DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X size={18} />
            </Button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
