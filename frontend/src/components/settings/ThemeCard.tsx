import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {useTheme} from '@/components/ThemeProvider';
import {Sun, Moon, Monitor} from 'lucide-react';

export function ThemeCard() {
    const {theme, setTheme} = useTheme();

    const options = [
        {value: 'light' as const, label: 'Hell', icon: Sun},
        {value: 'dark' as const, label: 'Dunkel', icon: Moon},
        {value: 'system' as const, label: 'System', icon: Monitor},
    ];

    return (
        <Card className="w-full">
            <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="size-4"/> : <Sun className="size-4"/>}
                    Erscheinungsbild
                </CardTitle>
                <CardDescription className="text-sm">
                    Wähle dein bevorzugtes Farbschema
                </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-dashed p-1">
                    {options.map(({value, label, icon: Icon}) => (
                        <button
                            key={value}
                            onClick={() => setTheme(value)}
                            className={`flex flex-col items-center gap-1 rounded-md px-2 py-2.5 text-xs font-medium transition-all ${
                                theme === value
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Icon className="size-4"/>
                            {label}
                        </button>
                    ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                    Bei "System" passt sich das Design automatisch an deine Geräte-Einstellungen an.
                </p>
            </CardContent>
        </Card>
    );
}