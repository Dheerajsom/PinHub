import { renderShareImage, shareImageParams } from "@/lib/server/share-image";

export const dynamicParams = false;
export const generateStaticParams = shareImageParams;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Board overview on PinHub, with each pin colored by role";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return renderShareImage(id, "Board overview");
}
