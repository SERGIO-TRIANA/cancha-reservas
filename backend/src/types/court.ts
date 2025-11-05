export interface Court {
    id: number;
    name: string;
    location: string;
    owner_id: number;
    capacity?: number;
    created_at: Date;
    updated_at: Date;
    status: 'active' | 'maintenance' | 'inactive';
    description?: string;
    price_per_hour?: number;
}