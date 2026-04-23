export interface User {
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    role?: string;
}

export interface AuthResponse {
    redirect: boolean;
    token: string;
    user: User;
}

export interface ApiError {
    message: string;
    status?: number;
}
