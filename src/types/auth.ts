export interface Profile {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'Student' | 'Librarian';
    created_at: string;
    updated_at: string;
}

export interface LoginFormData {
    email: string;
    password: string;
}

export interface SignupFormData extends LoginFormData {
    name: string;
    confirmPassword: string;
    phone: string;
    role: 'Student' | 'Librarian'
}