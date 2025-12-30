export type AnalyticsEventName =
    | 'scan_started'
    | 'scan_completed'
    | 'generate_started'
    | 'generate_completed'
    | 'build_started'
    | 'build_completed';

export interface ScanEventProperties {
    source: 'camera' | 'upload';
    brick_count?: number;
}

export interface GenerateEventProperties {
    input_type: 'text' | 'image';
    success: boolean;
    duration_ms?: number;
    error?: string;
}

export interface BuildEventProperties {
    model_id: string;
    steps_completed?: number;
    total_steps?: number;
}

export type AnalyticsEventProperties = {
    scan_started: ScanEventProperties;
    scan_completed: ScanEventProperties & { success: boolean };
    generate_started: GenerateEventProperties;
    generate_completed: GenerateEventProperties;
    build_started: BuildEventProperties;
    build_completed: BuildEventProperties & { success: boolean };
};
