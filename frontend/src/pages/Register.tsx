import {Link} from 'react-router-dom';
import {RegisterForm} from '@/components/auth/RegisterForm';
import {Receipt} from 'lucide-react';

export function RegisterPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
            <Link to="/" className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <Receipt className="size-4.5"/>
                </span>
                <span className="text-base font-semibold tracking-tight">TFV Spesen</span>
            </Link>
            <RegisterForm/>
        </div>
    );
}
