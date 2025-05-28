interface ConversionMetrics {
  fileName: string;
  fileSize: number;
  inputFormat: string;
  outputFormat: string;
  quality: string;
  duration: number;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: ConversionMetrics[] = [];
  private activeConversions = new Map<string, number>();

  startConversion(fileName: string, fileSize: number, inputFormat: string, outputFormat: string, quality: string): void {
    const startTime = Date.now();
    this.activeConversions.set(fileName, startTime);
    
    console.log(`🚀 Starting conversion: ${fileName} (${this.formatFileSize(fileSize)}) ${inputFormat} → ${outputFormat} [${quality}]`);
  }

  endConversion(fileName: string, success: boolean, error?: string): void {
    const startTime = this.activeConversions.get(fileName);
    if (!startTime) return;

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    this.activeConversions.delete(fileName);
    
    const status = success ? '✅' : '❌';
    const timeStr = this.formatDuration(duration);
    
    console.log(`${status} Conversion ${success ? 'completed' : 'failed'}: ${fileName} in ${timeStr}`);
    
    if (error) {
      console.error(`Error: ${error}`);
    }

    // Store metrics for analysis
    this.metrics.push({
      fileName,
      fileSize: 0, // Will be set when starting
      inputFormat: '',
      outputFormat: '',
      quality: '',
      duration,
      startTime,
      endTime,
      success,
      error
    });

    // Keep only last 100 conversions
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  getAverageConversionTime(outputFormat?: string, quality?: string): number {
    let filteredMetrics = this.metrics.filter(m => m.success);
    
    if (outputFormat) {
      filteredMetrics = filteredMetrics.filter(m => m.outputFormat === outputFormat);
    }
    
    if (quality) {
      filteredMetrics = filteredMetrics.filter(m => m.quality === quality);
    }

    if (filteredMetrics.length === 0) return 0;

    const totalTime = filteredMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalTime / filteredMetrics.length;
  }

  getPerformanceReport(): string {
    const totalConversions = this.metrics.length;
    const successfulConversions = this.metrics.filter(m => m.success).length;
    const successRate = totalConversions > 0 ? (successfulConversions / totalConversions * 100).toFixed(1) : '0';
    
    const avgTime = this.getAverageConversionTime();
    
    return `📊 Performance Report:
- Total conversions: ${totalConversions}
- Success rate: ${successRate}%
- Average conversion time: ${this.formatDuration(avgTime)}
- Active conversions: ${this.activeConversions.size}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

export const performanceMonitor = new PerformanceMonitor(); 