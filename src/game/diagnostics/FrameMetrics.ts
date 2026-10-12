/** Lightweight, side-effect-free frame measurements for profiling. */
export interface FrameMetricsReport {
    readonly elapsedSeconds: number;
    readonly frames: number;
    readonly averageFps: number;
    readonly p95FrameTimeMs: number;
    readonly maxEntityCount: number;
}

export class FrameMetrics {
    private startedAtMs: number | null = null;
    private previousFrameAtMs: number | null = null;
    private frameTimesMs: number[] = [];
    private frames = 0;
    private maxEntityCount = 0;

    public recordFrame(timestampMs: number, entityCount: number): void {
        if (
            !Number.isFinite(timestampMs) ||
            !Number.isSafeInteger(entityCount) ||
            entityCount < 0
        ) {
            throw new RangeError("Invalid frame sample.");
        }

        if (this.previousFrameAtMs !== null) {
            if (timestampMs < this.previousFrameAtMs) {
                throw new RangeError("Frame timestamps must be monotonic.");
            }

            if (timestampMs > this.previousFrameAtMs) {
                this.frameTimesMs.push(timestampMs - this.previousFrameAtMs);
            }
        } else {
            this.startedAtMs = timestampMs;
        }

        this.previousFrameAtMs = timestampMs;
        this.frames += 1;
        this.maxEntityCount = Math.max(this.maxEntityCount, entityCount);
    }

    public getReport(): FrameMetricsReport {
        const elapsedMs =
            this.startedAtMs === null || this.previousFrameAtMs === null
                ? 0
                : this.previousFrameAtMs - this.startedAtMs;

        const sorted = [...this.frameTimesMs].sort((a, b) => a - b);
        const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

        return {
            elapsedSeconds: elapsedMs / 1000,
            frames: this.frames,
            averageFps:
                elapsedMs > 0 ? ((this.frames - 1) * 1000) / elapsedMs : 0,
            p95FrameTimeMs: sorted[p95Index] ?? 0,
            maxEntityCount: this.maxEntityCount,
        };
    }

    public reset(): void {
        this.startedAtMs = null;
        this.previousFrameAtMs = null;
        this.frameTimesMs = [];
        this.frames = 0;
        this.maxEntityCount = 0;
    }
}
