import React, { useRef } from "react";
import { UploadCloud } from "lucide-react";

interface HeaderProps {
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  // 1. Create a reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Function to trigger the file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 3. Function to handle the file once selected
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
      // Add your file upload or processing logic here
    }
    
    // Optional: Reset the input value so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b bg-white px-8">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            KJS International Travel and Tours
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          File: KJS_POS_Data_2023-2025.csv (Processed Feb 14, 2026)
        </span>

        {/* 4. The hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv" // Restricts selection to CSV files (optional)
          className="hidden" // Tailwind class to hide the element
        />

        {/* 5. Attach the click handler to your existing button */}
        <button 
          onClick={handleUploadClick}
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Re-upload POS Data</span>
        </button>
      </div>
    </header>
  );
};