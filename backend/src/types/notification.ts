export interface Notification {
    id: number;
    user_id: number;
    reservation_id?: number;
    type: 'reservation_cancelled' | 'reservation_modified' | 'general';
    title: string;
    message: string;
    is_read: boolean;
    created_at: Date;
}
