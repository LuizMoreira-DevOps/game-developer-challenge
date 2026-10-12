export interface BrowserGameplaySample {
    readonly isRunning: boolean;
    readonly isPaused: boolean;
    readonly playerX: number;
    readonly playerY: number;
    readonly playerRotation: number;
    readonly enemyCount: number;
    readonly projectileCount: number;
}

export interface BrowserPerformanceReport {
    readonly activeSeconds: number;
    readonly frames: number;
    readonly averageFps: number;
    readonly p95FrameTimeMs: number;
    readonly maxEntityCount: number;
    readonly maxProjectileCount: number;
}

export class BrowserPerformanceDiagnostics {
    private previousFrameMs: number | null = null;
    private readonly frameTimesMs: number[] = [];
    private activeMs = 0;
    private frames = 0;
    private maxEntities = 0;
    private maxProjectiles = 0;

    public recordFrame(
        timestampMs: number,
        sample: BrowserGameplaySample,
    ): void {
        if (!sample.isRunning || sample.isPaused) {
            this.pause();
            return;
        }

        if (this.previousFrameMs !== null) {
            const delta = timestampMs - this.previousFrameMs;

            if (delta > 0 && Number.isFinite(delta)) {
                this.frameTimesMs.push(delta);
                this.activeMs += delta;
            }
        }

        this.previousFrameMs = timestampMs;
        this.frames++;

        this.maxEntities = Math.max(
            this.maxEntities,
            1 + sample.enemyCount + sample.projectileCount,
        );

        this.maxProjectiles = Math.max(
            this.maxProjectiles,
            sample.projectileCount,
        );
    }

    public pause(): void {
        this.previousFrameMs = null;
    }

    public getReport(): BrowserPerformanceReport {
        const sorted = [...this.frameTimesMs].sort((a, b) => a - b);

        const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

        return {
            activeSeconds: this.activeMs / 1000,
            frames: this.frames,
            averageFps:
                this.activeMs > 0
                    ? (this.frameTimesMs.length * 1000) / this.activeMs
                    : 0,
            p95FrameTimeMs: sorted[index] ?? 0,
            maxEntityCount: this.maxEntities,
            maxProjectileCount: this.maxProjectiles,
        };
    }
}

declare global {
    interface Window {
        __pirateBattleProfile?: BrowserPerformanceDiagnostics;
    }
}

export function getBrowserPerformanceDiagnostics(): BrowserPerformanceDiagnostics | null {
    const params = new URLSearchParams(window.location.search);

    if (params.get("profile") !== "1") {
        return null;
    }

    window.__pirateBattleProfile ??= new BrowserPerformanceDiagnostics();

    return window.__pirateBattleProfile;
}
