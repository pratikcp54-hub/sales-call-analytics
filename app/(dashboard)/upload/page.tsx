import Link from "next/link";
import { UploadCallForm } from "@/components/upload-call-form";
import { buttonVariants } from "@/components/ui/button-variants";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Upload call",
};

export default function UploadPage() {
  return (
    <div className="p-6 lg:p-8">
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-6 inline-flex")}
      >
        <ChevronLeft className="mr-1 size-4" />
        Dashboard
      </Link>
      <UploadCallForm />
    </div>
  );
}
