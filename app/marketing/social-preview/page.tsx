import type { Metadata } from "next";
import { SocialPreviewGallery } from "@/components/marketing/social-preview/SocialPreviewGallery";

export const metadata: Metadata = {
  title: "Come Thru Social Launch Concepts",
  description: "Private, fictional social-media launch concepts for Come Thru by WAITS.",
};

export default function SocialPreviewPage() {
  return <SocialPreviewGallery />;
}

