import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle2, X, Loader2, Download, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface UploadedFile {
  file: File;
  preview?: string;
}

interface UploadedFileInfo {
  id: string;
  filename?: string;
  name?: string;
  upload_date: string;
  size?: number;
}

interface ScrapRecord {
  id: string;
  status: string;
  [key: string]: any;
}

const API_BASE_URL = 'http://3.220.174.31:8000';

export const FileUpload = () => {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [filesList, setFilesList] = useState<UploadedFileInfo[]>([]);
  const [outputFilesList, setOutputFilesList] = useState<UploadedFileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [showFilesList, setShowFilesList] = useState(false);
  const [scrapRecords, setScrapRecords] = useState<ScrapRecord[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);

  const fetchFilesList = async () => {
    setIsLoadingFiles(true);
    try {
      const [inputResponse, outputResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/files/`),
        fetch(`${API_BASE_URL}/files/output/`)
      ]);
      
      if (!inputResponse.ok || !outputResponse.ok) throw new Error('Failed to fetch files');
      
      const inputData = await inputResponse.json();
      const outputData = await outputResponse.json();
      
      setFilesList(inputData);
      setOutputFilesList(outputData);
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

  const downloadFile = async (fileId: string, filename: string, type: 'input' | 'output' = 'input') => {
    try {
      const endpoint = type === 'output' 
        ? `${API_BASE_URL}/download/output/${fileId}` 
        : `${API_BASE_URL}/download/${fileId}/`;
      
      const response = await fetch(endpoint);
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex justify-end">
        <Button 
          onClick={() => setShowFilesList(!showFilesList)}
          variant="outline"
          className="gap-2"
        >
          <List className="w-4 h-4" />
          {showFilesList ? 'Hide' : 'Show'} Files
        </Button>
      </div>

      {showFilesList && (
        <Card className="p-6 shadow-[var(--shadow-card)]">
          <h3 className="text-lg font-semibold mb-4 text-card-foreground">Files</h3>
          {isLoadingFiles ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filesList.length === 0 && outputFilesList.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No files available yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-card-foreground">Input Files</th>
                    <th className="text-left p-3 font-semibold text-card-foreground">Output Files</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.max(filesList.length, outputFilesList.length) }).map((_, index) => (
                    <tr key={index} className="border-b border-border hover:bg-accent/5 transition-colors">
                      <td className="p-3">
                        {filesList[index] ? (
                          <button
                            onClick={() => downloadFile(filesList[index].id, filesList[index].filename || filesList[index].name || 'file', 'input')}
                            className="flex items-center gap-2 text-left hover:text-primary transition-colors w-full group"
                          >
                            <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate text-card-foreground group-hover:underline">
                                {filesList[index].filename || filesList[index].name || 'Unknown file'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(filesList[index].upload_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Download className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        {outputFilesList[index] ? (
                          <button
                            onClick={() => downloadFile(outputFilesList[index].id, outputFilesList[index].filename || outputFilesList[index].name || 'output', 'output')}
                            className="flex items-center gap-2 text-left hover:text-primary transition-colors w-full group"
                          >
                            <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate text-card-foreground group-hover:underline">
                                {outputFilesList[index].filename || outputFilesList[index].name || 'Unknown file'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(outputFilesList[index].upload_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Download className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
  );
};
