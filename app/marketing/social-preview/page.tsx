import type { Metadata } from "next";
import { SocialPreviewGallery } from "@/components/marketing/social-preview/SocialPreviewGallery";

export const metadata: Metadata = {
  title: "WAITS Social Launch Concepts",
  description: "Private, fictional social-media launch concepts for WAITS.",
};

export default function SocialPreviewPage() {
  return <SocialPreviewGallery />;
}

