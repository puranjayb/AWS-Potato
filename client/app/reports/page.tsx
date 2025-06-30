"use client";
import React, { useEffect, useState, useRef, ReactNode, JSX } from "react";
import {
  Heart,
  LogOut,
  Upload,
  Download,
  FileText,
  Search,
  Calendar,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  File,
  RefreshCw,
  Image,
  Video,
  Music,
  Archive,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useLogout } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useFiles, useFileOperations, validateFile } from "@/hooks/useFile";
import { toast } from "@/utils/toast";

interface FloatingElementProps {
  delay: number;
  children: ReactNode;
  className?: string;
}

interface MousePosition {
  x: number;
  y: number;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  file_id?: string;
  error?: string;
}

interface FileMetadata {
  file_id: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  user_email: string;
  upload_status: "pending" | "uploaded" | "failed";
  processing_status: "pending" | "completed" | "failed";
  created_at: string;
  project_id?: string;
}

export default function ReportsPage(): JSX.Element {
  const { isAuthenticated, token } = useAuthStore();
  const logout = useLogout();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [mousePosition, setMousePosition] = useState<MousePosition>({
    x: 0,
    y: 0,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<
    Map<string, UploadProgress>
  >(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use real API hooks
  const {
    data: files = [],
    isLoading: loading,
    refetch: loadFiles,
  } = useFiles(token!);
  const { upload, download, delete: deleteFile } = useFileOperations();

  useEffect((): (() => void) => {
    if (!isAuthenticated) {
      router.push("/login");
      return () => {};
    }

    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent): void => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return (): void => window.removeEventListener("mousemove", handleMouseMove);
  }, [isAuthenticated, router]);

  const FloatingElement: React.FC<FloatingElementProps> = ({
    delay,
    children,
    className = "",
  }) => (
    <div
      className={`animate-float ${className}`}
      style={{
        animationDelay: `${delay}s`,
        animationDuration: "6s",
      }}
    >
      {children}
    </div>
  );

  const handleFileUpload = async (selectedFiles: FileList): Promise<void> => {
    const newProgress = new Map(uploadProgress);

    for (const file of Array.from(selectedFiles)) {
      // Validate file before upload
      const validation = validateFile(file, 50); // 50MB limit
      if (!validation.isValid) {
        toast.error(`${file.name}: ${validation.error}`);
        continue;
      }

      const progressKey = `${file.name}_${Date.now()}`;

      newProgress.set(progressKey, {
        file,
        progress: 0,
        status: "uploading",
      });
      setUploadProgress(new Map(newProgress));

      try {
        // Use real file upload
        const result = await upload.mutateAsync({
          file,
          projectId: "all",
          onProgress: (progress: number) => {
            newProgress.set(progressKey, {
              ...newProgress.get(progressKey)!,
              progress,
            });
            setUploadProgress(new Map(newProgress));
          },
        });

        // Update progress to completed
        newProgress.set(progressKey, {
          ...newProgress.get(progressKey)!,
          progress: 100,
          status: "completed",
          file_id: result.file_id,
        });
        setUploadProgress(new Map(newProgress));

        toast.success(`${file.name} uploaded successfully!`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        newProgress.set(progressKey, {
          ...newProgress.get(progressKey)!,
          status: "error",
          error: errorMessage,
        });
        setUploadProgress(new Map(newProgress));
        toast.error(`${file.name}: ${errorMessage}`);
      }
    }

    // Clear completed uploads after 3 seconds
    setTimeout(() => {
      const clearedProgress = new Map();
      for (const [key, value] of newProgress.entries()) {
        if (value.status === "uploading") {
          clearedProgress.set(key, value);
        }
      }
      setUploadProgress(clearedProgress);
    }, 3000);
  };

  const handleDownload = async (
    fileId: string,
    filename: string
  ): Promise<void> => {
    try {
      await download.mutateAsync({ fileId, filename });
      toast.success(`${filename} download started!`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Download failed";
      toast.error(`Download failed: ${errorMessage}`);
      console.error("Error downloading file:", error);
    }
  };

  const handleDelete = async (fileId: string): Promise<void> => {
    try {
      await deleteFile.mutateAsync(fileId);
      toast.success("File deleted successfully!");
      loadFiles();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Delete failed";
      toast.error(`Failed to delete file: ${errorMessage}`);
      console.error("Error deleting file:", error);
    }
  };

  const handleLogout = (): void => {
    logout();
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      // Filter allowed file types
      const allowedFiles = Array.from(droppedFiles).filter((file) => {
        const validation = validateFile(file);
        if (!validation.isValid) {
          toast.error(`${file.name}: ${validation.error}`);
          return false;
        }
        return true;
      });

      if (allowedFiles.length > 0) {
        handleFileUpload(allowedFiles as unknown as FileList);
      }
    }
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch = file.original_filename
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter = "all";
    return matchesSearch && matchesFilter;
  });

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Add 5 hours and 30 minutes for IST
    date.setHours(date.getHours() + 5);
    date.setMinutes(date.getMinutes() + 30);
    
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (
    contentType: string
  ): React.ComponentType<{ className?: string }> => {
    if (contentType.includes("pdf")) return FileText;
    if (contentType.includes("image")) return Image;
    if (contentType.includes("video")) return Video;
    if (contentType.includes("audio")) return Music;
    if (contentType.includes("zip") || contentType.includes("archive"))
      return Archive;
    return File;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse transition-all duration-1000"
          style={{
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
        <div className="absolute top-3/4 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-3000" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {([...Array(20)] as undefined[]).map((_: undefined, i: number) => (
          <FloatingElement key={i} delay={i * 0.3}>
            <div
              className="absolute w-1.5 h-1.5 bg-white/20 rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          </FloatingElement>
        ))}
      </div>

      {/* Header */}
      <header
        className={`relative z-10 transition-all duration-1000 ${
          isVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
      >
        <div className="backdrop-blur-lg bg-white/5 border-b border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-4 group" onClick={() => router.push("/")}>
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                    <Heart className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      HealthCare+
                    </h1>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-white font-medium">
                    Reports Dashboard
                  </p>
                  <p className="text-xs text-white/70">
                    Manage your medical files
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="group flex items-center space-x-2 px-4 py-2 rounded-lg backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
                  type="button"
                >
                  <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <div
          className={`mb-8 transition-all duration-1000 delay-300 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 shadow-2xl hover:shadow-green-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl" />
            <div className="relative z-10 flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-300 flex items-center">
                  🎉 Logged in successfully!
                </h2>
                <p className="text-green-200/80">
                  Welcome to your healthcare dashboard!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Progress Section */}
        {uploadProgress.size > 0 && (
          <div
            className={`mb-8 transition-all duration-1000 delay-300 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-blue-400" />
                  Upload Progress
                </h3>
                <div className="space-y-3">
                  {Array.from(uploadProgress.entries()).map(
                    ([key, progress]) => (
                      <div
                        key={key}
                        className="bg-white/5 rounded-lg p-3 border border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white font-medium truncate">
                            {progress.file.name}
                          </span>
                          <div className="flex items-center space-x-2">
                            {progress.status === "uploading" && (
                              <Clock className="w-4 h-4 text-blue-400 animate-spin" />
                            )}
                            {progress.status === "completed" && (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                            {progress.status === "error" && (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-xs text-white/70">
                              {progress.status === "uploading"
                                ? `${progress.progress}%`
                                : progress.status === "completed"
                                ? "Complete"
                                : "Error"}
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              progress.status === "completed"
                                ? "bg-green-400"
                                : progress.status === "error"
                                ? "bg-red-400"
                                : "bg-blue-400"
                            }`}
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                        {progress.error && (
                          <p className="text-xs text-red-400 mt-1">
                            {progress.error}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions Bar */}
        <div
          className={`mb-8 transition-all duration-1000 delay-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg backdrop-blur-sm bg-white/5 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 transition-all duration-300"
                  />
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex space-x-3 ml-4">
                <button
                  onClick={() => loadFiles()}
                  disabled={loading}
                  className="group flex items-center space-x-2 px-4 py-3 rounded-lg backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  <RefreshCw
                    className={`w-4 h-4 transition-transform duration-500 ${
                      loading ? "animate-spin" : "group-hover:rotate-180"
                    }`}
                  />
                  <span>{loading ? "Loading..." : "Refresh"}</span>
                </button>

                <div
                  className="group relative bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform overflow-hidden cursor-pointer"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="relative flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Upload Report</span>
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) =>
                      e.target.files && handleFileUpload(e.target.files)
                    }
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Files Grid */}
        <div
          className={`transition-all duration-1000 delay-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative p-8 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
                <div className="relative z-10">
                  <FileText className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">
                    No Reports Found
                  </h3>
                  <p className="text-white/70 mb-6">
                    {searchTerm
                      ? "Try adjusting your search or filter criteria."
                      : "Upload your first medical report to get started."}
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105"
                    type="button"
                  >
                    Upload Report
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFiles.map((file: FileMetadata, index: number) => {
                const FileIcon = getFileIcon(file.content_type);
                return (
                  <div
                    key={file.file_id}
                    className="group relative p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                    style={{ animationDelay: `${800 + index * 100}ms` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative z-10">
                      {/* File Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <FileIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate group-hover:text-blue-300 transition-colors duration-300">
                              {file.original_filename}
                            </h3>
                            <div className="flex items-center space-x-2 text-xs text-white/70">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span>•</span>
                              <span>
                                {file.content_type.split("/")[1].toUpperCase()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            file.upload_status === "uploaded"
                              ? "bg-green-400/20 text-green-300 border border-green-400/30"
                              : file.upload_status === "pending"
                              ? "bg-yellow-400/20 text-yellow-300 border border-yellow-400/30"
                              : "bg-red-400/20 text-red-300 border border-red-400/30"
                          }`}
                        >
                          {file.upload_status}
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center text-sm text-white/70">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{formatDate(file.created_at)}</span>
                        </div>
                        {file.project_id && (
                          <div className="flex items-center text-sm text-white/70">
                            <span className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                            <span className="capitalize">
                              {file.project_id.replace("-", " ")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleDownload(file.file_id, file.original_filename)
                          }
                          className="flex-1 flex items-center justify-center space-x-2 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 hover:scale-105 text-sm font-medium"
                          type="button"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>

                        <button
                          className="px-3 py-2 border border-red-400/30 text-red-300 rounded-lg hover:bg-red-400/20 transition-all duration-300 hover:scale-105"
                          type="button"
                          onClick={() => handleDelete(file.file_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div
          className={`mt-8 transition-all duration-1000 delay-900 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  {files.length}
                </div>
                <div className="text-white/70 text-sm">Total Reports</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  {formatFileSize(
                    files.reduce((sum, file) => sum + file.file_size, 0)
                  )}
                </div>
                <div className="text-white/70 text-sm">Total Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  {files.filter((f) => f.upload_status === "uploaded").length}
                </div>
                <div className="text-white/70 text-sm">
                  Successfully Uploaded
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-6px) rotate(1deg);
          }
          66% {
            transform: translateY(3px) rotate(-1deg);
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
