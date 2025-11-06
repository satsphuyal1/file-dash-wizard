import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle2, X, Loader2, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  preview?: string;
}

interface FileRecord {
  id: number;
  input_filename: string;
  output_filename: string | null;
  created_date: string;
  status: string;
}

interface ScrapRecord {
  id: string;
  status: string;
  [key: string]: any;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export const FileUpload = () => {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [fileRecords, setFileRecords] = useState<FileRecord[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);
  const [scrapRecords, setScrapRecords] = useState<ScrapRecord[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  const fetchFilesList = async () => {
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`${API_BASE_URL}/files/`);
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFileRecords(data);
    } catch (error: any) {
      toast({
        title: "Failed to load files",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };


  useEffect(() => {
    if (showFilesList) {
      fetchFilesList();
    }
  }, [showFilesList]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setUploadedFile({ file });
      setUploadSuccess(false);
      toast({
        title: "File ready",
        description: `${file.name} is ready to be uploaded`,
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const removeFile = () => {
    setUploadedFile(null);
    setUploadSuccess(false);
    toast({
      title: "File removed",
      description: "You can upload a new file now",
    });
  };

  const fetchScrapRecords = async (fileId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/files/scrap_records/${fileId}/`);
      if (!response.ok) throw new Error('Failed to fetch scrap records');
      const data = await response.json();
      setScrapRecords(data);
      
      // Check if all records have status "done"
      const allDone = data.every((record: ScrapRecord) => record.status === 'done');
      if (allDone) {
        setIsPolling(false);
        toast({
          title: "Processing complete",
          description: "All records have been processed",
        });
      }
      
      return allDone;
    } catch (error: any) {
      console.error('Error fetching scrap records:', error);
      return false;
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isPolling && currentFileId) {
      // Initial fetch
      fetchScrapRecords(currentFileId);
      
      // Poll every 2 seconds
      intervalId = setInterval(async () => {
        const allDone = await fetchScrapRecords(currentFileId);
        if (allDone && intervalId) {
          clearInterval(intervalId);
        }
      }, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPolling, currentFileId]);

  const uploadFile = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.file);

      const response = await fetch(`${API_BASE_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const data = await response.json();
      setUploadSuccess(true);
      setCurrentFileId(data.file_id || data.id);
      setIsPolling(true);
      
      toast({
        title: "File uploaded successfully",
        description: `${uploadedFile.file.name} has been uploaded and processing started`,
      });
      
      // Refresh files list if it's visible
      if (showFilesList) {
        fetchFilesList();
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload the file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = async (fileId: number, filename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/download/output/${fileId}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: `Downloading ${filename}`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TooltipProvider>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowFilesList(!showFilesList)}
            variant="outline"
            className="gap-2"
          >
            <File className="w-4 h-4" />
            {showFilesList ? 'Hide' : 'Show'} Output
          </Button>
        </div>

        {showFilesList && (
          <Card className="p-6 shadow-[var(--shadow-card)]">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground">Data Dashboard</h3>
            {isLoadingFiles ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : fileRecords.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No files available yet</p>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b-2 border-border">
                        <th className="text-left p-3 font-semibold text-card-foreground">Input File</th>
                        <th className="text-left p-3 font-semibold text-card-foreground">Output File</th>
                        <th className="text-left p-3 font-semibold text-card-foreground">Created Date</th>
                        <th className="text-left p-3 font-semibold text-card-foreground">Status</th>
                        <th className="text-center p-3 font-semibold text-card-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fileRecords.map((record) => (
                        <tr key={record.id} className="border-b border-border hover:bg-accent/5 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm font-medium text-card-foreground">
                                {record.input_filename}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-card-foreground">
                              {record.output_filename || '-'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-sm text-muted-foreground">
                              {formatDate(record.created_date)}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'Completed' 
                                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' 
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => navigate(`/file/${record.id}`)}
                                    disabled={record.status !== 'Completed'}
                                    className={`h-8 w-8 ${
                                      record.status === 'Completed' 
                                        ? 'hover:bg-primary/10 hover:text-primary' 
                                        : 'opacity-40 cursor-not-allowed'
                                    }`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{record.status === 'Completed' ? 'View Details' : 'Not Available'}</p>
                                </TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => record.output_filename && downloadFile(record.id, record.output_filename)}
                                    disabled={record.status !== 'Completed' || !record.output_filename}
                                    className={`h-8 w-8 ${
                                      record.status === 'Completed' && record.output_filename
                                        ? 'hover:bg-primary/10 hover:text-primary' 
                                        : 'opacity-40 cursor-not-allowed'
                                    }`}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{record.status === 'Completed' && record.output_filename ? 'Download' : 'Not Available'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            )}
          </Card>
        )}
      {!uploadedFile ? (
        <Card
          {...getRootProps()}
          className={`
            relative overflow-hidden cursor-pointer
            border-2 border-dashed transition-all duration-300
            ${isDragActive 
              ? 'border-[hsl(var(--upload-border))] bg-[hsl(var(--upload-hover))] shadow-[var(--shadow-upload)]' 
              : 'border-border bg-card hover:border-[hsl(var(--upload-border))] hover:bg-[hsl(var(--upload-bg))]'
            }
            ${isProcessing ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 p-4 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] shadow-[var(--shadow-upload)]">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
            
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">
              {isDragActive ? 'Drop your file here' : 'Upload Excel File'}
            </h3>
            
            <p className="text-muted-foreground mb-4 max-w-sm">
              Drag and drop your Excel file here, or click to browse
            </p>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                .xlsx
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                .xls
              </span>
              <span className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground font-medium">
                .csv
              </span>
            </div>

            {isProcessing && (
              <div className="mt-6">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 rounded-lg bg-[hsl(var(--success)/0.1)]">
                <CheckCircle2 className="w-6 h-6 text-[hsl(var(--success))]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <h4 className="font-semibold text-card-foreground truncate">
                    {uploadedFile.file.name}
                  </h4>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(uploadedFile.file.size)}
                </p>
                
                <div className="mt-4 flex gap-2">
                  <Button 
                    size="sm"
                    onClick={uploadFile}
                    disabled={isProcessing || uploadSuccess}
                    className="bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] hover:opacity-90"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : uploadSuccess ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Uploaded
                      </>
                    ) : (
                      'Upload File'
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={removeFile}
                    disabled={isProcessing}
                  >
                    Upload Different File
                  </Button>
                </div>
                
                {uploadSuccess && (
                  <div className="mt-4 p-4 rounded-lg bg-[hsl(var(--success)/0.1)] border border-[hsl(var(--success)/0.2)]">
                    <h5 className="font-semibold text-sm text-[hsl(var(--success))] mb-2">
                      Upload Successful!
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      Your file has been uploaded and is being processed.
                    </p>
                  </div>
                )}
                
                {scrapRecords.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-sm text-card-foreground">
                        Scrap Records {isPolling && <Loader2 className="inline w-3 h-3 ml-2 animate-spin" />}
                      </h5>
                      <span className="text-xs text-muted-foreground">
                        {scrapRecords.filter(r => r.status === 'done').length} / {scrapRecords.length} completed
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {scrapRecords.map((record) => (
                        <div 
                          key={record.id}
                          className="p-3 rounded-lg border border-border bg-card"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-card-foreground">ID: {record.id}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              record.status === 'done' 
                                ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' 
                                : 'bg-secondary text-secondary-foreground'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                          {Object.entries(record).map(([key, value]) => {
                            if (key === 'id' || key === 'status') return null;
                            return (
                              <div key={key} className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Button
              size="icon"
              variant="ghost"
              onClick={removeFile}
              className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
};
