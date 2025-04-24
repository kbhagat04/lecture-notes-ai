export interface LectureSlide {
    id: string;
    title: string;
    content: string;
}

export interface CleanNote {
    id: string;
    title: string;
    content: string;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    data?: {
        slides: LectureSlide[];
        notes: CleanNote[];
    };
}