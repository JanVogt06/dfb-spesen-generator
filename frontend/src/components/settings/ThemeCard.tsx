import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
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
        <Card className="w-full max-w-md mx-4 sm:mx-0">
            <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="h-5 w-5"/> : <Sun className="h-5 w-5"/>}
                    Erscheinungsbild
                </CardTitle>
                <CardDescription className="text-sm">
                    Wähle dein bevorzugtes Farbschema
                </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
                <div className="grid grid-cols-3 gap-2">
                    {options.map(({value, label, icon: Icon}) => (
                        <Button
                            key={value}
                            variant={theme === value ? 'default' : 'outline'}
                            className="flex flex-col items-center gap-1 h-auto py-3"
                            onClick={() => setTheme(value)}
                        >
                            <Icon className="h-5 w-5"/>
                            <span className="text-xs">{label}</span>
                        </Button>
                    ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                    Bei "System" passt sich das Design automatisch an deine Geräte-Einstellungen an.
                </p>
            </CardContent>
        </Card>
    );
}