import Image from "next/image"
import { cn } from "@/lib/utils"

/** The surrounding brand link supplies the accessible name. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/sunbur-mark.svg"
      alt=""
      aria-hidden="true"
      width={40}
      height={40}
      loading="eager"
      unoptimized
      className={cn("size-10 shrink-0", className)}
    />
  )
}
