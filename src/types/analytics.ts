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
    success: boolean;
    duration_ms?: number;
    error?: string;
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
    success: boolean;
    duration_ms?: number;
    error?: string;
}

export type AnalyticsEventProperties = {
    scan_started: Pick<ScanEventProperties, 'source'>;
    scan_completed: ScanEventProperties;
    generate_started: Pick<GenerateEventProperties, 'input_type'>;
    generate_completed: GenerateEventProperties;
    build_started: Pick<BuildEventProperties, 'model_id'>;
    build_completed: BuildEventProperties;
};
